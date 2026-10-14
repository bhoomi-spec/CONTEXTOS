import { Commitment, MemoryConflict, Decision, ProjectContext, Memory } from '../types';
import { calculateDaysOverdue, calculateDaysRemaining, getStartOfDay } from '../utils/dateUtils';

export interface ActionRecommendation {
  id: string;
  type: 'OVERDUE_COMMITMENT' | 'UNRESOLVED_CONFLICT' | 'UPCOMING_COMMITMENT' | 'DECISION_REVIEW';
  title: string;
  projectName: string;
  projectId: string;
  urgencyScore: number;
  reason: string;
  dueDate?: string;
  priorityBadge?: string;
  sourceMemoryId?: string;
}

export interface RecommendationResult {
  primaryRecommendation: ActionRecommendation | null;
  rankedActions: ActionRecommendation[];
  summaryText: string;
  supportingMemories: Memory[];
  relatedDecisions: Decision[];
}

export class RecommendationEngine {
  /**
   * Computes a deterministic, weighted priority sequence for "What should I work on next?"
   * Factors:
   * 1. Overdue status (highest urgency: baseline 100 + 15/day overdue)
   * 2. Commitment priority (HIGH +35, MEDIUM +20, LOW +10)
   * 3. Proximity to deadline (due in 0-2 days +30, 3-7 days +15)
   * 4. Project health factor (lower health projects get boost +15 because they need triage)
   * 5. Unresolved architectural conflicts (blockers: 85-95 score)
   */
  public static prioritize(
    dataset: {
      commitments: Commitment[];
      conflicts: MemoryConflict[];
      decisions: Decision[];
      projects: ProjectContext[];
      memories: Memory[];
    },
    clockDate?: Date,
    projectScopeId?: string
  ): RecommendationResult {
    const now = clockDate || new Date();
    const startOfToday = getStartOfDay(now);

    const scope = projectScopeId && projectScopeId !== 'ALL' ? projectScopeId : undefined;
    const poolCommitments = scope ? dataset.commitments.filter((c) => c.projectId === scope) : dataset.commitments;
    const poolConflicts = scope ? dataset.conflicts.filter((c) => c.projectId === scope) : dataset.conflicts;
    const poolProjects = dataset.projects;
    const projectMap = new Map(poolProjects.map((p) => [p.id, p]));

    const actions: ActionRecommendation[] = [];

    // 1. Evaluate Commitments
    for (const com of poolCommitments) {
      if (com.status === 'COMPLETED' || com.status === 'CANCELLED') continue;

      const prj = projectMap.get(com.projectId);
      const isOverdueItem = new Date(com.dueDate) < startOfToday;
      const daysOverdue = calculateDaysOverdue(com.dueDate, now);
      const daysRemaining = calculateDaysRemaining(com.dueDate, now);

      let score = 0;
      let reason = '';

      const priorityBonus = com.priority === 'HIGH' ? 35 : com.priority === 'MEDIUM' ? 20 : 10;
      const healthAdjustment = prj ? Math.max(0, Math.round((100 - prj.health) * 0.25)) : 0;

      if (isOverdueItem) {
        score = 120 + daysOverdue * 12 + priorityBonus + healthAdjustment;
        reason = `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} (Due ${com.dueDate}) · Priority: ${com.priority} in ${com.projectName || 'General'}.`;
        actions.push({
          id: com.id,
          type: 'OVERDUE_COMMITMENT',
          title: com.title,
          projectName: com.projectName || prj?.name || 'General',
          projectId: com.projectId,
          urgencyScore: score,
          reason,
          dueDate: com.dueDate,
          priorityBadge: com.priority,
          sourceMemoryId: com.sourceMemoryId
        });
      } else {
        // Upcoming
        let proximityScore = 0;
        if (daysRemaining <= 1) proximityScore = 40;
        else if (daysRemaining <= 3) proximityScore = 25;
        else if (daysRemaining <= 7) proximityScore = 15;
        else proximityScore = Math.max(0, 10 - daysRemaining * 0.3);

        score = 40 + proximityScore + priorityBonus + healthAdjustment;
        reason = `Approaching deadline in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (Due ${com.dueDate}) · Priority: ${com.priority}.`;

        actions.push({
          id: com.id,
          type: 'UPCOMING_COMMITMENT',
          title: com.title,
          projectName: com.projectName || prj?.name || 'General',
          projectId: com.projectId,
          urgencyScore: score,
          reason,
          dueDate: com.dueDate,
          priorityBadge: com.priority,
          sourceMemoryId: com.sourceMemoryId
        });
      }
    }

    // 2. Evaluate Unresolved Conflicts
    const unresolvedConflicts = poolConflicts.filter((c) => c.status === 'UNRESOLVED');
    for (const conf of unresolvedConflicts) {
      const isConfirmed = conf.severity === 'confirmed';
      const score = isConfirmed ? 110 : 85;
      const reason = `Architectural conflict: ${conf.title} requires operator resolution. Recommended action: ${conf.recommendedAction || 'Inspect and standardize conflicting records.'}`;

      actions.push({
        id: conf.id,
        type: 'UNRESOLVED_CONFLICT',
        title: conf.title,
        projectName: conf.projectName || 'General',
        projectId: conf.projectId,
        urgencyScore: score,
        reason,
        priorityBadge: isConfirmed ? 'CRITICAL' : 'WARNING'
      });
    }

    // Rank all actions descending by urgency score
    actions.sort((a, b) => b.urgencyScore - a.urgencyScore);

    const primaryRecommendation = actions[0] || null;

    // Gather grounded evidence
    const supportingMemories: Memory[] = [];
    const relatedDecisions: Decision[] = [];

    if (primaryRecommendation?.sourceMemoryId) {
      const mem = dataset.memories.find((m) => m.id === primaryRecommendation.sourceMemoryId);
      if (mem) supportingMemories.push(mem);
    }

    // Generate deterministic explanation
    let summaryText = '';
    if (!primaryRecommendation) {
      summaryText = 'No pending commitments, overdue deadlines, or active conflicts detected in this context scope. All tracked goals are up to date.';
    } else {
      const parts: string[] = [];
      parts.push(`Top Priority Action: [${primaryRecommendation.id}] "${primaryRecommendation.title}" (${primaryRecommendation.projectName})`);
      parts.push(`Rationale: ${primaryRecommendation.reason}`);

      if (actions.length > 1) {
        parts.push('\nSubsequent Action Items:');
        actions.slice(1, 4).forEach((item, idx) => {
          parts.push(`${idx + 2}. [${item.id}] "${item.title}" — ${item.reason}`);
        });
      }

      summaryText = parts.join('\n');
    }

    return {
      primaryRecommendation,
      rankedActions: actions,
      summaryText,
      supportingMemories,
      relatedDecisions
    };
  }
}
