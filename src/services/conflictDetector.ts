import { Memory, Decision, Commitment, ProjectContext, MemoryConflict, ConflictCategory } from '../types';
import { calculateDaysRemaining } from '../utils/dateUtils';

export interface ConflictCandidate {
  conflict: MemoryConflict;
  confidence: number;
}

export class ConflictDetector {
  /**
   * Deterministically analyzes memories, decisions, commitments, and projects
   * to identify candidate contradictions, stale evidence, and constraint divergences.
   */
  public static detectConflicts(
    memories: Memory[],
    decisions: Decision[],
    existingConflicts: MemoryConflict[] = [],
    commitments: Commitment[] = [],
    projects: ProjectContext[] = []
  ): MemoryConflict[] {
    const activeConflicts: MemoryConflict[] = [...existingConflicts];
    const existingPairs = new Set(
      existingConflicts.map((c) => `${c.memoryIdA}_${c.memoryIdB}`)
    );

    // Group memories by projectId
    const projectMap = new Map<string, Memory[]>();
    for (const mem of memories) {
      if (mem.validity === 'ARCHIVED') continue;
      const list = projectMap.get(mem.projectId) || [];
      list.push(mem);
      projectMap.set(mem.projectId, list);
    }

    // 1. Check for specific parameter / dimension contradictions within each project
    projectMap.forEach((mems, projectId) => {
      for (let i = 0; i < mems.length; i++) {
        for (let j = i + 1; j < mems.length; j++) {
          const a = mems[i];
          const b = mems[j];

          // Skip if one already supersedes the other
          if (a.supersededBy === b.id || b.supersededBy === a.id) continue;
          if (a.supersedesMemoryId === b.id || b.supersedesMemoryId === a.id) continue;
          if (a.validity === 'SUPERSEDED' || b.validity === 'SUPERSEDED') continue;

          const pairKey1 = `${a.id}_${b.id}`;
          const pairKey2 = `${b.id}_${a.id}`;
          if (existingPairs.has(pairKey1) || existingPairs.has(pairKey2)) continue;

          const textA = `${a.title} ${a.content}`.toLowerCase();
          const textB = `${b.title} ${b.content}`.toLowerCase();

          // Check A: Embedding dimension contradictions (768 vs 1536)
          const hasDimA = textA.includes('768') || textA.includes('1536') || textA.includes('dimension') || textA.includes('embedding');
          const hasDimB = textB.includes('768') || textB.includes('1536') || textB.includes('dimension') || textB.includes('embedding');

          if (hasDimA && hasDimB) {
            const has768A = textA.includes('768');
            const has1536A = textA.includes('1536');
            const has768B = textB.includes('768');
            const has1536B = textB.includes('1536');

            if ((has768A && has1536B) || (has1536A && has768B)) {
              const conflictId = `CONF-${a.id}-${b.id}`;
              activeConflicts.push({
                id: conflictId,
                title: 'Embeddings dimension mismatch (768-dim vs 1536-dim)',
                description: `Memory ${a.id} ("${a.title}") and Memory ${b.id} ("${b.title}") specify conflicting vector dimensions (768 vs 1536) without a resolved supersession relationship.`,
                projectId,
                projectName: a.projectName || b.projectName || 'Active Project',
                memoryIdA: a.id,
                memoryIdB: b.id,
                status: 'UNRESOLVED',
                detectedAt: new Date().toISOString(),
                severity: 'confirmed',
                conflictType: 'PARAMETER',
                recommendedAction: 'Standardize the ingest configuration on 768-dim models or mark the conflicting record as superseded.'
              });
              existingPairs.add(pairKey1);
              continue;
            }
          }

          // Check B: Conflicting Latency / SLA budgets (e.g. 85ms vs conflicting constraint)
          const hasLatencyA = textA.includes('latency') || textA.includes('sla') || textA.includes('ms');
          const hasLatencyB = textB.includes('latency') || textB.includes('sla') || textB.includes('ms');
          if (hasLatencyA && hasLatencyB) {
            const matchMsA = textA.match(/(\d+)\s*ms/);
            const matchMsB = textB.match(/(\d+)\s*ms/);
            if (matchMsA && matchMsB && matchMsA[1] !== matchMsB[1]) {
              const conflictId = `CONF-${a.id}-${b.id}`;
              activeConflicts.push({
                id: conflictId,
                title: `Conflicting latency constraints (${matchMsA[1]}ms vs ${matchMsB[1]}ms)`,
                description: `Memory ${a.id} specifies a ${matchMsA[1]}ms latency budget while Memory ${b.id} specifies ${matchMsB[1]}ms. Both records are marked CURRENT in ${a.projectName}.`,
                projectId,
                projectName: a.projectName || 'Active Project',
                memoryIdA: a.id,
                memoryIdB: b.id,
                status: 'UNRESOLVED',
                detectedAt: new Date().toISOString(),
                severity: 'potential',
                conflictType: 'LATENCY_SLA',
                recommendedAction: 'Unify latency SLA targets to satisfy strict conversational voice deadline (85ms).'
              });
              existingPairs.add(pairKey1);
              continue;
            }
          }

          // Check C: Conflicting Storage Backends without supersession (e.g. Redis vs Graph Memory)
          const mentionsRedisA = textA.includes('redis') && !textA.includes('superseded');
          const mentionsGraphB = (textB.includes('graph memory') || textB.includes('hnsw')) && textB.includes('over raw');
          const mentionsRedisB = textB.includes('redis') && !textB.includes('superseded');
          const mentionsGraphA = (textA.includes('graph memory') || textA.includes('hnsw')) && textA.includes('over raw');

          if ((mentionsRedisA && mentionsGraphB) || (mentionsRedisB && mentionsGraphA)) {
            if (a.validity === 'CURRENT' && b.validity === 'CURRENT') {
              const conflictId = `CONF-${a.id}-${b.id}`;
              activeConflicts.push({
                id: conflictId,
                title: 'Conflicting core storage architectures concurrently active',
                description: `Records ${a.id} and ${b.id} both claim active status for conflicting memory topologies (Redis cache vs Graph memory) without a traceable supersession link.`,
                projectId,
                projectName: a.projectName || 'Active Project',
                memoryIdA: a.id,
                memoryIdB: b.id,
                status: 'UNRESOLVED',
                detectedAt: new Date().toISOString(),
                severity: 'confirmed',
                conflictType: 'STORAGE_ARCHITECTURE',
                recommendedAction: 'Mark the older flat cache record as SUPERSEDED by the graph architecture decision.'
              });
              existingPairs.add(pairKey1);
              continue;
            }
          }

          // Check D: Mutually Exclusive Preferences
          if (a.type === 'PREFERENCE' && b.type === 'PREFERENCE') {
            const conciseA = textA.includes('concise') || textA.includes('brief') || textA.includes('no preamble');
            const verboseB = textB.includes('verbose') || textB.includes('detailed step-by-step') || textB.includes('elaborate');
            const verboseA = textA.includes('verbose') || textA.includes('detailed step-by-step') || textA.includes('elaborate');
            const conciseB = textB.includes('concise') || textB.includes('brief') || textB.includes('no preamble');

            if ((conciseA && verboseB) || (verboseA && conciseB)) {
              const conflictId = `CONF-${a.id}-${b.id}`;
              activeConflicts.push({
                id: conflictId,
                title: 'Contradictory user persona preferences',
                description: `Memory ${a.id} specifies concise summaries while ${b.id} requests verbose elaboration without an explicit contextual modifier.`,
                projectId,
                projectName: a.projectName || 'Active Project',
                memoryIdA: a.id,
                memoryIdB: b.id,
                status: 'UNRESOLVED',
                detectedAt: new Date().toISOString(),
                severity: 'potential',
                conflictType: 'MUTUALLY_EXCLUSIVE',
                recommendedAction: 'Define contextual rules (e.g., concise for voice, detailed for technical reports) or supersede the older preference.'
              });
              existingPairs.add(pairKey1);
              continue;
            }
          }
        }
      }
    });

    // 2. Cross-check Decisions against Memories (Stale or Superseded Evidence)
    for (const dec of decisions) {
      if (dec.status !== 'CURRENT') continue;
      for (const memId of dec.sourceMemoryIds) {
        const mem = memories.find((m) => m.id === memId);
        if (mem && (mem.validity === 'SUPERSEDED' || mem.validity === 'UNCERTAIN')) {
          const pairKey = `${dec.id}_${mem.id}`;
          if (!existingPairs.has(pairKey)) {
            activeConflicts.push({
              id: `CONF-${dec.id}-${mem.id}`,
              title: `Decision ${dec.id} relies on ${mem.validity.toLowerCase()} evidence (${mem.id})`,
              description: `Architectural Decision "${dec.title}" (${dec.id}) lists ${mem.id} as supporting evidence, but ${mem.id} is currently marked as ${mem.validity}.`,
              projectId: dec.projectId,
              projectName: dec.projectName || 'Active Project',
              memoryIdA: dec.id,
              memoryIdB: mem.id,
              status: 'UNRESOLVED',
              detectedAt: new Date().toISOString(),
              severity: 'potential',
              conflictType: 'STALE_EVIDENCE',
              recommendedAction: `Update Decision ${dec.id} to reference verified active memories or review its rationale.`
            });
            existingPairs.add(pairKey);
          }
        }
      }
    }

    // 3. Cross-check Commitments against Project Deadlines (Schedule Misalignment)
    if (commitments.length > 0 && projects.length > 0) {
      const projectMapById = new Map(projects.map((p) => [p.id, p]));
      for (const com of commitments) {
        if (com.status === 'COMPLETED' || com.status === 'CANCELLED') continue;
        const prj = projectMapById.get(com.projectId);
        if (!prj || !prj.deadline || !com.dueDate) continue;

        const prjDeadline = new Date(prj.deadline);
        const comDue = new Date(com.dueDate);

        if (!isNaN(prjDeadline.getTime()) && !isNaN(comDue.getTime()) && comDue > prjDeadline) {
          const pairKey = `${com.id}_${prj.id}`;
          if (!existingPairs.has(pairKey)) {
            activeConflicts.push({
              id: `CONF-${com.id}-${prj.id}`,
              title: `Commitment due date exceeds project milestone deadline`,
              description: `Commitment "${com.title}" (${com.id}) is due on ${com.dueDate}, which is after project "${prj.name}" deadline of ${prj.deadline}.`,
              projectId: prj.id,
              projectName: prj.name,
              memoryIdA: com.id,
              memoryIdB: prj.id,
              status: 'UNRESOLVED',
              detectedAt: new Date().toISOString(),
              severity: 'potential',
              conflictType: 'DEADLINE_MISMATCH',
              recommendedAction: `Reschedule commitment ${com.id} before ${prj.deadline} or extend project milestone deadline.`
            });
            existingPairs.add(pairKey);
          }
        }
      }
    }

    return activeConflicts;
  }
}

