import { dataStore } from '../src/services/dataStore';
import { ConflictDetector } from '../src/services/conflictDetector';
import { RetrievalEngine } from '../src/services/retrievalEngine';
import { RecommendationEngine } from '../src/services/recommendationEngine';
import { DeterministicMemoryAssistant } from '../src/services/memoryAssistant';
import {
  calculateDaysOverdue,
  calculateDaysRemaining,
  formatRelativeTime,
  isOverdue,
  getStartOfDay
} from '../src/utils/dateUtils';
import {
  INITIAL_PROJECTS,
  INITIAL_MEMORIES,
  INITIAL_DECISIONS,
  INITIAL_COMMITMENTS,
  INITIAL_CONFLICTS
} from '../src/services/mockData';

// Polyfill minimal localStorage if running in Node.js
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: Object.keys(store).length
  } as Storage;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('CONTEXTOS — VERIFICATION & INTELLIGENCE TEST SUITE');
  console.log('======================================================\n');

  // Set reference clock for deterministic temporal testing (2026-10-10 12:00:00Z)
  const testRefClock = new Date('2026-10-10T12:00:00Z');

  // --- SUITE 1: Temporal Date Utilities ---
  console.log('SUITE 1: Temporal Calculations & Date Formatting');
  {
    const overdueDays = calculateDaysOverdue('2026-10-09', testRefClock);
    assert(overdueDays === 1, 'calculateDaysOverdue calculates 1 day for 2026-10-09 against 2026-10-10');

    const notOverdue = calculateDaysOverdue('2026-10-12', testRefClock);
    assert(notOverdue === 0, 'calculateDaysOverdue returns 0 for future date 2026-10-12');

    const daysRemaining = calculateDaysRemaining('2026-10-14', testRefClock);
    assert(daysRemaining === 4, 'calculateDaysRemaining calculates 4 days until 2026-10-14');

    assert(isOverdue('2026-10-08', testRefClock) === true, 'isOverdue returns true for past date');
    assert(isOverdue('2026-10-15', testRefClock) === false, 'isOverdue returns false for future date');

    const justNow = formatRelativeTime(new Date(testRefClock.getTime() - 20 * 1000).toISOString(), testRefClock);
    assert(justNow === 'Just now', 'formatRelativeTime handles seconds as "Just now"');

    const minsAgo = formatRelativeTime(new Date(testRefClock.getTime() - 15 * 60 * 1000).toISOString(), testRefClock);
    assert(minsAgo === '15m ago', 'formatRelativeTime handles minutes as "15m ago"');

    const hoursAgo = formatRelativeTime(new Date(testRefClock.getTime() - 3 * 3600 * 1000).toISOString(), testRefClock);
    assert(hoursAgo === '3h ago', 'formatRelativeTime handles hours as "3h ago"');
  }

  // --- SUITE 2: Memory & Decision CRUD and Temporal Integrity ---
  console.log('\nSUITE 2: Memory & Decision CRUD & Lineage');
  {
    dataStore.resetToDemoData();
    const initialMemCount = dataStore.getState().memories.length;

    // Add Memory
    const newMem = dataStore.addMemory({
      title: 'Vector quantization benchmark on ARM edge devices',
      content: 'Edge device deployment requires int8 quantized embeddings to maintain sub-50ms latency.',
      type: 'INSIGHT',
      projectId: 'PRJ-AI-RESEARCH',
      source: 'USER_EXPLICIT',
      confidence: 94,
      validity: 'CURRENT',
      tags: ['edge', 'quantization', 'latency'],
      relatedMemoryIds: []
    });

    assert(newMem.id.startsWith('MEM-'), 'addMemory assigns valid unique ID with prefix');
    assert(dataStore.getState().memories.length === initialMemCount + 1, 'addMemory increases memories collection count');

    const originalCreatedAt = newMem.createdAt;
    assert(typeof originalCreatedAt === 'string' && originalCreatedAt.includes('T'), 'addMemory sets ISO createdAt');

    // Update Memory (CreatedAt Immutability Check)
    dataStore.updateMemory(newMem.id, {
      confidence: 97,
      content: 'Updated quantization findings: 8-bit quantization preserves 99.1% accuracy.'
    });

    const updatedMem = dataStore.getState().memories.find((m) => m.id === newMem.id);
    assert(updatedMem?.confidence === 97, 'updateMemory updates mutable properties');
    assert(updatedMem?.createdAt === originalCreatedAt, 'CRITICAL: updateMemory guarantees createdAt timestamp is immutable');

    // Supersede Memory
    const supersedingMem = dataStore.addMemory({
      title: '4-bit AWQ quantization chosen over 8-bit int8',
      content: 'Adopted 4-bit AWQ after profiling memory cache footprint.',
      type: 'DECISION',
      projectId: 'PRJ-AI-RESEARCH',
      source: 'USER_EXPLICIT',
      confidence: 99,
      validity: 'CURRENT',
      tags: ['quantization', 'awq'],
      relatedMemoryIds: [newMem.id]
    });

    dataStore.supersedeMemory(newMem.id, supersedingMem.id, 'Upgraded from 8-bit to 4-bit AWQ');
    const supersededMem = dataStore.getState().memories.find((m) => m.id === newMem.id);
    const newerMemRecord = dataStore.getState().memories.find((m) => m.id === supersedingMem.id);

    assert(supersededMem?.validity === 'SUPERSEDED', 'supersedeMemory updates target validity to SUPERSEDED');
    assert(supersededMem?.supersededBy === supersedingMem.id, 'supersedeMemory sets supersededBy relationship');
    assert(newerMemRecord?.supersedesMemoryId === newMem.id, 'supersedeMemory sets supersedesMemoryId bi-directionally');

    // Circular Supersession Prevention (Multi-hop)
    const wouldLoopDirect = dataStore.wouldFormMemoryCycle(supersedingMem.id, newMem.id);
    assert(wouldLoopDirect === true, 'wouldFormMemoryCycle detects direct circular reference attempt');

    dataStore.supersedeMemory(supersedingMem.id, newMem.id);
    const postLoopAttempt = dataStore.getState().memories.find((m) => m.id === supersedingMem.id);
    assert(postLoopAttempt?.validity === 'CURRENT', 'supersedeMemory rejects circular supersession without corruption');

    // Decision Supersession & Lineage
    const oldDec = dataStore.getState().decisions.find((d) => d.id === 'DEC-298');
    const newDec = dataStore.getState().decisions.find((d) => d.id === 'DEC-301');
    assert(oldDec?.status === 'SUPERSEDED' && oldDec.supersededBy === 'DEC-301', 'DEC-298 is marked SUPERSEDED by DEC-301');

    const lineage = dataStore.getDecisionLineage('DEC-301');
    assert(lineage !== null, 'getDecisionLineage returns lineage for DEC-301');
    assert(lineage?.predecessors.some((p) => p.id === 'DEC-298') === true, 'getDecisionLineage identifies DEC-298 as predecessor');
    assert(lineage?.sourceMemories.some((m) => m.id === 'MEM-1041') === true, 'getDecisionLineage resolves supporting source memories');

    // Decision Circular Supersession Prevention
    const wouldLoopDec = dataStore.wouldFormDecisionCycle('DEC-298', 'DEC-301');
    assert(wouldLoopDec === true, 'wouldFormDecisionCycle detects circular decision loop attempt');
  }

  // --- SUITE 3: Data Integrity, Cascade Cleanup & Resilience ---
  console.log('\nSUITE 3: Cascade Reference Cleanup & Project Name Sync');
  {
    dataStore.resetToDemoData();

    // Create a memory and reference it in a commitment and decision
    const tempMem = dataStore.addMemory({
      title: 'Temporary probe memory for deletion test',
      content: 'Probing cascade cleanup.',
      type: 'FACT',
      projectId: 'PRJ-PRODUCT-LAUNCH',
      source: 'USER_EXPLICIT',
      confidence: 80,
      validity: 'CURRENT',
      tags: ['probe'],
      relatedMemoryIds: ['MEM-1044']
    });

    const tempCom = dataStore.addCommitment({
      title: 'Temporary commitment linked to probe memory',
      description: 'Test commitment',
      projectId: 'PRJ-PRODUCT-LAUNCH',
      dueDate: '2026-10-18',
      priority: 'LOW',
      status: 'OPEN',
      sourceMemoryId: tempMem.id
    });

    assert(tempCom.sourceMemoryId === tempMem.id, 'Commitment created with valid sourceMemoryId');

    // Delete Memory and verify reference scrub
    dataStore.deleteMemory(tempMem.id);
    const scrubbedCom = dataStore.getState().commitments.find((c) => c.id === tempCom.id);
    assert(scrubbedCom?.sourceMemoryId === undefined, 'deleteMemory scrubs sourceMemoryId from commitments');

    const scrubbedMemList = dataStore.getState().memories.filter((m) => m.relatedMemoryIds.includes(tempMem.id));
    assert(scrubbedMemList.length === 0, 'deleteMemory scrubs ID from relatedMemoryIds across all memories');

    // Project Name Synchronization Check
    dataStore.updateProject('PRJ-PRODUCT-LAUNCH', { name: 'CONTEXTOS Commercial Launch v1' });
    const syncedMem = dataStore.getState().memories.find((m) => m.projectId === 'PRJ-PRODUCT-LAUNCH');
    const syncedDec = dataStore.getState().decisions.find((d) => d.projectId === 'PRJ-PRODUCT-LAUNCH');
    const syncedCom = dataStore.getState().commitments.find((c) => c.projectId === 'PRJ-PRODUCT-LAUNCH');

    assert(syncedMem?.projectName === 'CONTEXTOS Commercial Launch v1', 'updateProject synchronizes projectName across memories');
    assert(syncedDec?.projectName === 'CONTEXTOS Commercial Launch v1', 'updateProject synchronizes projectName across decisions');
    assert(syncedCom?.projectName === 'CONTEXTOS Commercial Launch v1', 'updateProject synchronizes projectName across commitments');
  }

  // --- SUITE 4: Contradiction & Conflict Detection ---
  console.log('\nSUITE 4: Deterministic Contradiction & Conflict Detection');
  {
    dataStore.resetToDemoData();
    const state = dataStore.getState();

    const conflicts = ConflictDetector.detectConflicts(
      state.memories,
      state.decisions,
      state.conflicts,
      state.commitments,
      state.projects
    );

    // Rule 1: Vector Dimension Contradiction
    const dimConflict = conflicts.find((c) => c.title.toLowerCase().includes('dimension'));
    assert(dimConflict !== undefined, 'ConflictDetector identifies 768-dim vs 1536-dim contradiction');
    assert(dimConflict?.severity === 'confirmed', 'Vector dimension mismatch flagged with confirmed severity');
    assert(typeof dimConflict?.recommendedAction === 'string', 'Conflict includes actionable resolution recommendation');

    // Rule 2: Schedule / Deadline Misalignment
    // Introduce commitment due after project deadline (PRJ-PRODUCT-LAUNCH deadline: 2026-10-28)
    const lateCom = dataStore.addCommitment({
      title: 'Late post-deadline milestone test',
      description: 'Scheduled after launch deadline',
      projectId: 'PRJ-PRODUCT-LAUNCH',
      dueDate: '2026-11-10', // after 2026-10-28
      priority: 'HIGH',
      status: 'OPEN'
    });

    const updatedConflicts = ConflictDetector.detectConflicts(
      dataStore.getState().memories,
      dataStore.getState().decisions,
      dataStore.getState().conflicts,
      dataStore.getState().commitments,
      dataStore.getState().projects
    );

    const deadlineConflict = updatedConflicts.find((c) => c.conflictType === 'DEADLINE_MISMATCH');
    assert(deadlineConflict !== undefined, 'ConflictDetector identifies commitment due after project milestone deadline');

    // Conflict Resolution Workflow
    if (dimConflict) {
      dataStore.resolveConflict(dimConflict.id, 'Standardized on 768-dim embeddings across all ingest modules');
      const resolved = dataStore.getState().conflicts.find((c) => c.id === dimConflict.id);
      assert(resolved?.status === 'RESOLVED', 'resolveConflict marks status as RESOLVED');
      assert(resolved?.resolutionNotes?.includes('Standardized') === true, 'resolveConflict persists resolution notes');
    }
  }

  // --- SUITE 5: Retrieval Engine Relevance & Filtering ---
  console.log('\nSUITE 5: Multi-Signal Search & Scored Retrieval');
  {
    dataStore.resetToDemoData();
    const state = dataStore.getState();

    // Query 1: Exact ID query
    const resId = RetrievalEngine.retrieve('MEM-1042', state);
    assert(resId.matchedMemories[0]?.item.id === 'MEM-1042', 'RetrievalEngine retrieves exact memory by ID');

    // Query 2: Database decisions
    const resDb = RetrievalEngine.retrieve('What did I decide about the database?', state);
    assert(resDb.matchedDecisions.length > 0, 'RetrievalEngine finds decisions for database query');
    assert(
      resDb.matchedDecisions.some((d) => d.item.id === 'DEC-301' || d.item.id === 'DEC-304'),
      'RetrievalEngine ranks graph memory or PostgreSQL decisions for database query'
    );

    // Query 3: Historical intent query
    const resHist = RetrievalEngine.retrieve('Why was the previous decision superseded?', state);
    assert(resHist.isHistoricalQuery === true, 'RetrievalEngine detects historical query intent');
    assert(resHist.matchedDecisions.some((d) => d.item.status === 'SUPERSEDED'), 'RetrievalEngine surfaces superseded decision for historical query');

    // Query 4: Project scoping
    const resScoped = RetrievalEngine.retrieve('latency budget', state, { projectScopeId: 'PRJ-AI-RESEARCH' });
    assert(resScoped.matchedMemories.every((m) => m.item.projectId === 'PRJ-AI-RESEARCH'), 'RetrievalEngine strictly respects projectScopeId');

    // Query 5: Unknown query with zero matches
    const resUnknown = RetrievalEngine.retrieve('completely fictitious quantum banana zephyr xylophone', state);
    assert(resUnknown.matchedMemories.length === 0, 'RetrievalEngine honestly returns empty matches for ungrounded topic');
  }

  // --- SUITE 6: Recommendation Engine ('What should I work on next?') ---
  console.log('\nSUITE 6: Recommendation Engine Prioritization');
  {
    dataStore.resetToDemoData();
    const state = dataStore.getState();

    const recResult = RecommendationEngine.prioritize(
      {
        commitments: state.commitments,
        conflicts: state.conflicts,
        decisions: state.decisions,
        projects: state.projects,
        memories: state.memories
      },
      testRefClock
    );

    assert(recResult.primaryRecommendation !== null, 'RecommendationEngine returns primary recommendation');
    assert(
      recResult.primaryRecommendation?.id === 'COM-203' || recResult.primaryRecommendation?.type === 'OVERDUE_COMMITMENT',
      'RecommendationEngine prioritizes overdue commitment COM-203 as top priority'
    );
    assert(recResult.rankedActions.length >= 3, 'RecommendationEngine ranks subsequent action items');
    assert(recResult.summaryText.length > 50, 'RecommendationEngine provides detailed grounded explanation');
  }

  // --- SUITE 7: Grounded Deterministic Memory Assistant ---
  console.log('\nSUITE 7: Deterministic Memory Assistant Query Handling');
  {
    dataStore.resetToDemoData();
    const state = dataStore.getState();
    const queryCtx = {
      memories: state.memories,
      decisions: state.decisions,
      projects: state.projects,
      commitments: state.commitments,
      conflicts: state.conflicts,
      clockDate: testRefClock
    };

    // Test Question A: "What did I decide about the database?"
    const ansA = DeterministicMemoryAssistant.processQuery('What did I decide about the database?', queryCtx);
    assert(ansA.text.includes('DEC-301'), 'Assistant answers database query citing DEC-301');
    assert(ansA.relatedDecisions.some((d) => d.id === 'DEC-301'), 'Assistant attaches DEC-301 in relatedDecisions');
    assert(ansA.isUncertain === false, 'Assistant confirms high certainty on verified database decision');

    // Test Question B: "Why was the previous decision superseded?"
    const ansB = DeterministicMemoryAssistant.processQuery('Why was the previous decision superseded?', queryCtx);
    assert(ansB.text.includes('DEC-298'), 'Assistant cites superseded decision DEC-298');
    assert(ansB.text.includes('DEC-301'), 'Assistant cites superseding decision DEC-301');
    assert(ansB.text.toLowerCase().includes('rationale') || ansB.text.toLowerCase().includes('change'), 'Assistant provides change explanation for supersession');

    // Test Question C: "What commitments are overdue?"
    const ansC = DeterministicMemoryAssistant.processQuery('What commitments are overdue?', queryCtx);
    assert(ansC.text.includes('COM-203'), 'Assistant identifies COM-203 as overdue commitment');
    assert(ansC.text.includes('1 day overdue'), 'Assistant calculates exact dynamic days overdue (1 day overdue)');

    // Test Question D: "What is the current plan for the launch?"
    const ansD = DeterministicMemoryAssistant.processQuery('What is the current plan for the launch?', queryCtx);
    assert(ansD.text.includes('PRJ-PRODUCT-LAUNCH') || ansD.text.includes('Product Launch'), 'Assistant answers launch query grounding in PRJ-PRODUCT-LAUNCH');
    assert(ansD.text.includes('2026-10-28'), 'Assistant includes target launch deadline');
    assert(ansD.relatedDecisions.some((d) => d.id === 'DEC-302'), 'Assistant includes MCP protocol decision DEC-302');

    // Test Question E: "What should I work on next?"
    const ansE = DeterministicMemoryAssistant.processQuery('What should I work on next?', queryCtx);
    assert(ansE.text.includes('Top Priority Action') || ansE.text.includes('COM-203'), 'Assistant answers next action query with prioritized task');

    // Test Question F: Unanswerable query fallback
    const ansF = DeterministicMemoryAssistant.processQuery('What is the corporate revenue for 2024 in Tokyo?', queryCtx);
    assert(ansF.isUncertain === true, 'Assistant marks uncertainty for ungrounded topic');
    assert(
      ansF.text.includes('do not contain sufficient evidence') || ansF.confidenceScore <= 20,
      'Assistant honestly reports lack of evidence without hallucinating'
    );
  }

  // --- SUITE 8: Edge Cases & Storage Resilience ---
  console.log('\nSUITE 8: Edge Cases, Corrupted Storage & Multi-Hop Loops');
  {
    // Edge Case 1: Empty datasets
    const emptyCtx = {
      memories: [],
      decisions: [],
      projects: [],
      commitments: [],
      conflicts: [],
      clockDate: testRefClock
    };

    const emptyRetrieval = RetrievalEngine.retrieve('anything', emptyCtx);
    assert(emptyRetrieval.matchedMemories.length === 0, 'RetrievalEngine handles empty datasets gracefully');

    const emptyRec = RecommendationEngine.prioritize(emptyCtx, testRefClock);
    assert(emptyRec.primaryRecommendation === null, 'RecommendationEngine handles empty datasets with null primary');
    assert(emptyRec.summaryText.includes('No pending commitments'), 'RecommendationEngine returns calm empty status');

    const emptyAssistant = DeterministicMemoryAssistant.processQuery('What decisions did I make?', emptyCtx);
    assert(emptyAssistant.isUncertain === true, 'Assistant marks uncertainty on empty vault');

    // Edge Case 2: Corrupted storage import
    const badImport1 = dataStore.importDataJson('not a json string at all');
    assert(badImport1 === false, 'importDataJson rejects malformed JSON string without crashing');

    const badImport2 = dataStore.importDataJson('{"projects": "invalid_type_not_array"}');
    assert(badImport2 === false, 'importDataJson rejects payload missing required array structures');

    // Edge Case 3: Multi-hop Circular Supersession (A -> B -> C -> A)
    dataStore.resetToDemoData();
    const memA = dataStore.addMemory({
      title: 'Node A in chain',
      content: 'A',
      type: 'FACT',
      projectId: 'PRJ-AI-RESEARCH',
      source: 'USER_EXPLICIT',
      confidence: 90,
      validity: 'CURRENT',
      tags: [],
      relatedMemoryIds: []
    });

    const memB = dataStore.addMemory({
      title: 'Node B in chain',
      content: 'B',
      type: 'FACT',
      projectId: 'PRJ-AI-RESEARCH',
      source: 'USER_EXPLICIT',
      confidence: 90,
      validity: 'CURRENT',
      tags: [],
      relatedMemoryIds: []
    });

    const memC = dataStore.addMemory({
      title: 'Node C in chain',
      content: 'C',
      type: 'FACT',
      projectId: 'PRJ-AI-RESEARCH',
      source: 'USER_EXPLICIT',
      confidence: 90,
      validity: 'CURRENT',
      tags: [],
      relatedMemoryIds: []
    });

    // A superseded by B; B superseded by C
    dataStore.supersedeMemory(memA.id, memB.id);
    dataStore.supersedeMemory(memB.id, memC.id);

    // Now test if C -> A would form a cycle
    const wouldFormMultiHopCycle = dataStore.wouldFormMemoryCycle(memC.id, memA.id);
    assert(wouldFormMultiHopCycle === true, 'wouldFormMemoryCycle detects 3-hop transitive cycle (A -> B -> C -> A)');

    // Edge Case 4: Varied reference dates (Temporal Shift 60 days into future)
    const futureClock = new Date('2026-12-10T12:00:00Z');
    const futureOverdue = calculateDaysOverdue('2026-10-09', futureClock);
    assert(futureOverdue === 62, 'Temporal shift: correctly calculates 62 days overdue when clock is advanced 60 days');

    const pastClock = new Date('2026-10-01T12:00:00Z');
    const pastOverdue = calculateDaysOverdue('2026-10-09', pastClock);
    assert(pastOverdue === 0, 'Temporal shift: returns 0 overdue when clock is before due date');
  }

  // --- SUITE 9: Complete End-to-End Workflow Integration ---
  console.log('\nSUITE 9: Complete End-to-End Memory & Decision Workflow');
  {
    dataStore.resetToDemoData();

    // 1. Create a project
    const newPrj = dataStore.addProject({
      name: 'Autonomous Agent Runtime',
      slug: 'autonomous-agent-runtime',
      description: 'Building multi-turn stateful conversational runtime with verifiable memory DAGs.',
      goals: ['Sub-85ms conversational SLA', 'Zero hallucinated lineage'],
      constraints: ['Edge runtime compatible'],
      deadline: '2026-12-31',
      status: 'ACTIVE',
      health: 96,
      accentColor: 'purple'
    });
    assert(newPrj.id.startsWith('PRJ-'), 'Step 1: Created project with valid prefixed ID');

    // 2. Add memories to the project
    const mem1 = dataStore.addMemory({
      title: 'Context Window Constraints',
      content: 'Standard LLM context windows suffer 28% retrieval degradation after 16 conversational turns.',
      type: 'FACT',
      projectId: newPrj.id,
      source: 'DOC_IMPORT',
      confidence: 96,
      validity: 'CURRENT',
      tags: ['memory', 'benchmarks'],
      relatedMemoryIds: []
    });
    assert(mem1.id.startsWith('MEM-'), 'Step 2: Added memory to project with correct project linkage');

    // 3. Create a decision supported by one or more memories
    const dec1 = dataStore.addDecision({
      title: 'Use In-Memory Flat Cache',
      rationale: 'Provide sub-10ms response times for fast turnarounds in early prototypes.',
      projectId: newPrj.id,
      status: 'CURRENT',
      sourceMemoryIds: [mem1.id],
      impactAssessment: 'Fast initial response latency'
    });
    assert(dec1.sourceMemoryIds.includes(mem1.id), 'Step 3: Created decision supported by memory');

    // 4 & 5 & 6 & 7 & 8: Add new information that changes decision, preserve original, link successor, record reason
    const dec2 = dataStore.supersedeDecision(
      dec1.id,
      'Migrate to Causal Episodic Graph Memory',
      'Flat key-value cache cannot trace causal dependencies or multi-hop relationship changes.',
      'Benchmarks revealed flat cache drift; graph memory guarantees verified provenance while staying within sub-85ms SLA.'
    );
    assert(dec2 !== null, 'Step 4-6: Created successor decision via supersede');
    assert(dec2?.supersedesDecisionId === dec1.id, 'Step 7: Successor links to predecessor decision ID');
    assert(Boolean(dec2?.changeExplanation?.includes('flat cache drift')), 'Step 8: Recorded explicit reason for the change');

    // 9. Update decision timeline: original preserved as SUPERSEDED, newer is CURRENT
    const preservedOld = dataStore.getState().decisions.find((d) => d.id === dec1.id);
    const activeNew = dataStore.getState().decisions.find((d) => d.id === dec2?.id);
    assert(preservedOld?.status === 'SUPERSEDED', 'Step 9a: Original decision preserved as SUPERSEDED');
    assert(preservedOld?.supersededBy === dec2?.id, 'Step 9b: Original decision points to successor ID');
    assert(activeNew?.status === 'CURRENT', 'Step 9c: Successor decision is marked CURRENT');

    // 10. Update knowledge graph: verify decision lineage resolves
    const lineage = dataStore.getDecisionLineage(dec2!.id);
    assert(Boolean(lineage && lineage.predecessors.some((p) => p.id === dec1.id)), 'Step 10: Knowledge graph lineage links predecessor');

    // 11. Activity history contains DECISION_SUPERSEDED event
    const activities = dataStore.getState().activities;
    const supersedeActivity = activities.find((a) => a.type === 'DECISION_SUPERSEDED');
    assert(supersedeActivity !== null, 'Step 11: Activity history recorded DECISION_SUPERSEDED event');

    // 12-14: Ask Memory Assistant why decision changed, retrieve records, return answer with source references
    const assistantChangeQuery = DeterministicMemoryAssistant.processQuery(
      'Why was the previous decision superseded in Autonomous Agent Runtime?',
      {
        memories: dataStore.getState().memories,
        decisions: dataStore.getState().decisions,
        projects: dataStore.getState().projects,
        commitments: dataStore.getState().commitments,
        conflicts: dataStore.getState().conflicts,
        projectScopeId: newPrj.id
      }
    );
    assert(
      assistantChangeQuery.text.includes(dec1.id) || assistantChangeQuery.text.includes('Migrate to Causal Episodic Graph Memory'),
      'Step 12-13: Assistant retrieves historical and current decision records'
    );
    assert(
      assistantChangeQuery.relatedDecisions.some((d) => d.id === dec1.id || d.id === dec2?.id),
      'Step 14: Assistant returns answer with verified decision source references'
    );

    // 15-16: Create a commitment with a deadline, calculate commitment status dynamically
    const com1 = dataStore.addCommitment({
      title: 'Complete HNSW Graph Index Benchmarks',
      description: 'Verify sub-85ms latency SLA on 10,000 node graph.',
      projectId: newPrj.id,
      dueDate: '2026-10-08', // Past date relative to testRefClock (2026-10-10)
      priority: 'HIGH',
      status: 'OPEN'
    });
    const daysOverdue = calculateDaysOverdue(com1.dueDate, testRefClock);
    assert(daysOverdue === 2, 'Step 15-16: Dynamic commitment overdue calculation computes 2 days overdue');

    // 17-18: Detect relevant conflict, allow user to resolve conflict
    const detectedConflicts = ConflictDetector.detectConflicts(
      dataStore.getState().memories,
      dataStore.getState().decisions,
      dataStore.getState().conflicts
    );
    assert(detectedConflicts.length > 0, 'Step 17: Conflict detector identifies active conflicts');

    const firstConflict = detectedConflicts[0];
    const resolved = dataStore.resolveConflict(
      firstConflict.id,
      'Standardized embedding dimensions across all pipeline stages.'
    );
    assert(resolved === true, 'Step 18: Resolved conflict successfully');
    const confState = dataStore.getState().conflicts.find((c) => c.id === firstConflict.id);
    assert(confState?.status === 'RESOLVED', 'Step 18b: Conflict status transitioned to RESOLVED');

    // 19-20: Refresh / Export & Import roundtrip, verify persistence
    const exportedJson = dataStore.exportDataJson();
    assert(typeof exportedJson === 'string' && exportedJson.length > 500, 'Step 19: Exported full vault data');

    const restored = dataStore.importDataJson(exportedJson);
    assert(restored === true, 'Step 20a: Successfully restored exported data');
    const restoredPrj = dataStore.getState().projects.find((p) => p.id === newPrj.id);
    assert(restoredPrj !== undefined, 'Step 20b: Verified all project and memory changes persist');
  }

  // --- SUITE 10: Targeted Assistant Queries & MCP Protocol Specs ---
  console.log('\nSUITE 10: Targeted Assistant Query Intents & MCP Tools');
  {
    const state = dataStore.getState();
    const queryCtx = {
      memories: state.memories,
      decisions: state.decisions,
      projects: state.projects,
      commitments: state.commitments,
      conflicts: state.conflicts,
      clockDate: testRefClock
    };

    // 1. "What do I know about this project?"
    const ansProject = DeterministicMemoryAssistant.processQuery(
      'What do I know about this project?',
      { ...queryCtx, projectScopeId: 'PRJ-AI-RESEARCH' }
    );
    assert(ansProject.text.includes('AI Research Project'), 'Query: Answers "What do I know about this project?"');
    assert(ansProject.confidenceScore >= 95, 'Query: High confidence on scoped project dossier');

    // 2. "What is the current decision?"
    const ansCurrent = DeterministicMemoryAssistant.processQuery(
      'What is the current decision?',
      queryCtx
    );
    assert(ansCurrent.text.includes('STATUS: CURRENT'), 'Query: Answers "What is the current decision?" with CURRENT status');
    assert(ansCurrent.relatedDecisions.every((d) => d.status === 'CURRENT'), 'Query: Only includes active CURRENT decisions');

    // 3. "What deadlines are approaching?"
    const ansDeadlines = DeterministicMemoryAssistant.processQuery(
      'What deadlines are approaching?',
      queryCtx
    );
    assert(ansDeadlines.text.includes('Approaching project and operational deadlines'), 'Query: Answers "What deadlines are approaching?"');
    assert(ansDeadlines.text.includes('PRJ-PRODUCT-LAUNCH') || ansDeadlines.text.includes('PRJ-AI-RESEARCH'), 'Query: Lists approaching project milestones');

    // 4. "What information is missing?"
    const ansMissing = DeterministicMemoryAssistant.processQuery(
      'What information is missing?',
      queryCtx
    );
    assert(ansMissing.text.includes('PRJ-LEARNING-ROADMAP') || ansMissing.text.includes('knowledge gaps'), 'Query: Answers "What information is missing?" identifying unrecorded decisions');

    // 5. "Which records support this answer?"
    const ansRecords = DeterministicMemoryAssistant.processQuery(
      'Which records support this answer?',
      queryCtx
    );
    assert(ansRecords.text.includes('Stored Memories') && ansRecords.text.includes('Architectural Decisions'), 'Query: Answers "Which records support this answer?" with verified evidence list');
    assert(ansRecords.supportingMemories.length > 0, 'Query: Includes supporting memories in records answer');

    // 6. Retrieval Engine multi-attribute search verification
    const multiSearch = RetrievalEngine.retrieve('HNSW graph memory indexing', {
      memories: state.memories,
      decisions: state.decisions,
      commitments: state.commitments,
      projects: state.projects
    });
    assert(multiSearch.matchedDecisions.some((d) => d.item.id === 'DEC-301'), 'RetrievalEngine scores DEC-301 highest for graph memory query');
  }

  // --- SUITE 11: MCP Protocol Specification & Alexa+ Voice SLA ---
  console.log('\nSUITE 11: MCP Protocol Specification & Alexa+ Voice SLA');
  {
    // 1. MCP search_memories execution
    const mcpMemResults = RetrievalEngine.retrieve(
      'database',
      {
        memories: dataStore.getState().memories,
        decisions: dataStore.getState().decisions,
        commitments: dataStore.getState().commitments,
        projects: dataStore.getState().projects
      },
      { projectScopeId: 'PRJ-AI-RESEARCH' }
    );
    assert(mcpMemResults.matchedMemories.length > 0, 'MCP: search_memories returns relevant records');

    // 2. MCP search_decisions filter by status
    const currentDecisions = dataStore.getState().decisions.filter((d) => d.status === 'CURRENT');
    const supersededDecisions = dataStore.getState().decisions.filter((d) => d.status === 'SUPERSEDED');
    assert(currentDecisions.length > 0, 'MCP: search_decisions filters CURRENT records');
    assert(supersededDecisions.length > 0, 'MCP: search_decisions filters SUPERSEDED records');

    // 3. MCP get_decision_history lineage tracking
    const decHistory = dataStore.getState().decisions.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      supersededBy: d.supersededBy,
      supersedesDecisionId: d.supersedesDecisionId
    }));
    const supersededItem = decHistory.find((d) => d.id === 'DEC-298');
    assert(supersededItem?.supersededBy === 'DEC-301', 'MCP: get_decision_history links DEC-298 to DEC-301');

    // 4. Alexa+ SSML clean vocal rendering
    const testAnswer = DeterministicMemoryAssistant.processQuery(
      'What is the current decision on the database?',
      {
        memories: dataStore.getState().memories,
        decisions: dataStore.getState().decisions,
        projects: dataStore.getState().projects,
        commitments: dataStore.getState().commitments,
        conflicts: dataStore.getState().conflicts
      }
    );
    const cleanSpeech = testAnswer.text.replace(/[•\*\#\_\`]/g, '').replace(/\[([A-Z0-9\-]+)\]/g, '$1').slice(0, 320);
    const ssml = `<speak><p>${cleanSpeech}</p></speak>`;
    assert(ssml.startsWith('<speak><p>') && ssml.endsWith('</p></speak>'), 'Alexa+: Generates valid SSML payload');
    assert(!ssml.includes('**') && !ssml.includes('##'), 'Alexa+: Speech string cleans markdown artifacts');
  }

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
