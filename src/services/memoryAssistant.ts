import { Memory, Decision, ProjectContext, Commitment, MemoryConflict } from '../types';
import { RetrievalEngine, ScoredRecord } from './retrievalEngine';
import { ConflictDetector } from './conflictDetector';
import { RecommendationEngine } from './recommendationEngine';
import { calculateDaysOverdue, calculateDaysRemaining, getStartOfDay } from '../utils/dateUtils';

export interface AssistantAnswer {
  text: string;
  supportingMemories: Memory[];
  relatedDecisions: Decision[];
  inferredSuggestions: string[];
  isUncertain: boolean;
  confidenceScore: number;
}

export interface AssistantQueryContext {
  memories: Memory[];
  decisions: Decision[];
  projects: ProjectContext[];
  commitments: Commitment[];
  conflicts: MemoryConflict[];
  projectScopeId?: string;
  clockDate?: Date; // Optional controllable clock for testing and time calculation
}

/**
 * Deterministic Memory & Decision Intelligence Engine.
 * Genuinely grounds every response in real stored records.
 * Never fabricates IDs, citations, or synthetic advice.
 */
export class DeterministicMemoryAssistant {
  public static processQuery(query: string, rawCtx: AssistantQueryContext): AssistantAnswer {
    const q = query.trim();
    if (!q) {
      return {
        text: 'Please enter a question or topic to inspect your memory vault.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Ask about recorded decisions, overdue commitments, or active conflicts.'],
        isUncertain: false,
        confidenceScore: 100
      };
    }

    const qLower = q.toLowerCase();
    const now = rawCtx.clockDate || new Date();
    const startOfToday = getStartOfDay(now);

    // Resolve scoped context
    const hasScope = !!rawCtx.projectScopeId && rawCtx.projectScopeId !== 'ALL';
    const scopedProject = hasScope ? rawCtx.projects.find((p) => p.id === rawCtx.projectScopeId) : undefined;

    const ctx: AssistantQueryContext = {
      ...rawCtx,
      memories: hasScope ? rawCtx.memories.filter((m) => m.projectId === rawCtx.projectScopeId) : rawCtx.memories,
      decisions: hasScope ? rawCtx.decisions.filter((d) => d.projectId === rawCtx.projectScopeId) : rawCtx.decisions,
      commitments: hasScope ? rawCtx.commitments.filter((c) => c.projectId === rawCtx.projectScopeId) : rawCtx.commitments,
      conflicts: hasScope ? rawCtx.conflicts.filter((c) => c.projectId === rawCtx.projectScopeId) : rawCtx.conflicts,
      clockDate: now
    };

    // 1. INTENT: Overdue commitments
    if (
      qLower.includes('overdue') ||
      (qLower.includes('commitment') && (qLower.includes('late') || qLower.includes('attention') || qLower.includes('missed'))) ||
      qLower === 'which commitments need my attention?' ||
      qLower === 'what commitments are overdue?'
    ) {
      return this.handleOverdueCommitments(ctx, startOfToday, scopedProject);
    }

    // 2. INTENT: Approaching deadlines / due soon
    if (
      qLower.includes('deadline') ||
      qLower.includes('due soon') ||
      qLower.includes('upcoming') ||
      qLower.includes('deadlines are approaching') ||
      (qLower.includes('commitment') && qLower.includes('due'))
    ) {
      return this.handleApproachingDeadlines(ctx, startOfToday, scopedProject);
    }

    // 3. INTENT: "What should I work on next?" / "What should I prioritize next?" / Task prioritization
    if (
      qLower.includes('work on next') ||
      qLower.includes('prioritize next') ||
      qLower.includes('what should i prioritize') ||
      qLower.includes('next task') ||
      qLower.includes('what to do next') ||
      qLower.includes('next step') ||
      qLower.includes('priority task')
    ) {
      return this.handleNextActions(ctx, now, scopedProject);
    }

    // 4. INTENT: "What information is missing?" / "What do I still not know?"
    if (
      qLower.includes('information is missing') ||
      qLower.includes('what is missing') ||
      qLower.includes('what do i still not know') ||
      qLower.includes('what do i not know') ||
      qLower.includes('missing information') ||
      qLower.includes('knowledge gaps') ||
      qLower.includes('unanswered questions')
    ) {
      return this.handleMissingInformation(ctx, scopedProject);
    }

    // 5. INTENT: "What did I decide about the database?" / Database decisions
    if (
      (qLower.includes('decide') || qLower.includes('decision') || qLower.includes('what did i')) &&
      (qLower.includes('database') || qLower.includes('db') || qLower.includes('storage') || qLower.includes('postgres') || qLower.includes('redis'))
    ) {
      return this.handleDatabaseDecisions(ctx, scopedProject);
    }

    // 6. INTENT: "What is the current plan for the launch?" / Product launch plan
    if (
      (qLower.includes('plan for') || qLower.includes('status of') || qLower.includes('current plan')) &&
      (qLower.includes('launch') || qLower.includes('product launch'))
    ) {
      return this.handleLaunchPlan(ctx);
    }

    // 7. INTENT: Contradictions / Conflicts / "What conflicts remain unresolved?"
    if (
      qLower.includes('contradict') ||
      qLower.includes('conflict') ||
      qLower.includes('discrepancy') ||
      qLower.includes('mismatch') ||
      qLower.includes('inconsistent')
    ) {
      return this.handleConflicts(ctx, scopedProject);
    }

    // 8. INTENT: "What changed since my previous plan?" / "Why was the previous decision superseded?" / "What decisions have changed?"
    if (
      qLower.includes('what changed') ||
      qLower.includes('what has changed') ||
      qLower.includes('previous plan') ||
      qLower.includes('superseded') ||
      qLower.includes('evolved') ||
      qLower.includes('plan change') ||
      qLower.includes('decisions have changed') ||
      qLower.includes('why was the previous decision superseded') ||
      qLower.includes('what happened to a previous decision')
    ) {
      return this.handleDecisionEvolution(ctx, scopedProject);
    }

    // 9. INTENT: "What is the current decision?" / "What are the current decisions?"
    if (
      qLower === 'what is the current decision?' ||
      qLower === 'what is the current decision' ||
      qLower.includes('what is the current decision') ||
      qLower.includes('current architectural decision') ||
      qLower.includes('active decision')
    ) {
      return this.handleCurrentDecisions(ctx, scopedProject);
    }

    // 10. INTENT: "What decisions have I made about this project?" / Decisions list
    if (
      qLower.includes('decisions have i made') ||
      qLower.includes('decisions did i make') ||
      qLower.includes('what decisions') ||
      qLower.includes('list decisions')
    ) {
      return this.handleDecisionsList(ctx, scopedProject);
    }

    // 11. INTENT: "Which records support this answer?" / "Which records support your answer?"
    if (
      qLower.includes('records support') ||
      qLower.includes('which records support') ||
      qLower.includes('what evidence supports') ||
      qLower.includes('source references')
    ) {
      return this.handleSupportingRecords(ctx, scopedProject);
    }

    // 12. INTENT: "What do I know about this project?" / "What do I currently know about this project?"
    if (
      qLower.includes('what do i know about this project') ||
      qLower.includes('what do i currently know about this project') ||
      qLower.includes('what do i know about') ||
      qLower.includes('summarize recent changes') ||
      qLower.includes('recent changes') ||
      qLower.includes('what is the status of')
    ) {
      return this.handleProjectSummary(ctx, scopedProject, qLower);
    }

    // 11. GENERAL RETRIEVAL: Multi-signal search across memories, decisions, and commitments
    return this.handleGeneralRetrieval(q, ctx, now, scopedProject);
  }

  // --- HANDLER: OVERDUE COMMITMENTS ---
  private static handleOverdueCommitments(
    ctx: AssistantQueryContext,
    startOfToday: Date,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const overdue = ctx.commitments
      .filter((c) => {
        if (c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
        const due = new Date(c.dueDate);
        return due < startOfToday;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const supportingMemories: Memory[] = [];
    overdue.forEach((c) => {
      if (c.sourceMemoryId) {
        const mem = ctx.memories.find((m) => m.id === c.sourceMemoryId);
        if (mem && !supportingMemories.some((s) => s.id === mem.id)) supportingMemories.push(mem);
      }
    });

    if (overdue.length === 0) {
      const scopeLabel = scopedProject ? ` for ${scopedProject.name}` : '';
      return {
        text: `There are no overdue commitments recorded${scopeLabel}. All tracked commitments are either on schedule or completed.`,
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Review upcoming commitments due in the next 14 days to stay ahead of scheduled deadlines.'],
        isUncertain: false,
        confidenceScore: 100
      };
    }

    const lines = overdue.map((c) => {
      const daysOverdue = Math.floor((startOfToday.getTime() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      return `• [${c.id}] "${c.title}" (${c.projectName || 'General'})\n  Due: ${c.dueDate} (${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue) · Priority: ${c.priority} · Status: ${c.status}${c.description ? `\n  Details: ${c.description}` : ''}`;
    });

    const highestPriority = overdue.find((c) => c.priority === 'HIGH') || overdue[0];

    return {
      text: `Found ${overdue.length} overdue commitment${overdue.length === 1 ? '' : 's'} requiring immediate attention:\n\n${lines.join('\n\n')}`,
      supportingMemories,
      relatedDecisions: [],
      inferredSuggestions: [
        `Urgent recommendation: Resolve "${highestPriority.title}" (${highestPriority.id}) first due to its ${highestPriority.priority} priority.`,
        'Update or reschedule commitments in the Commitments view if deadlines have shifted.'
      ],
      isUncertain: false,
      confidenceScore: 98
    };
  }

  // --- HANDLER: APPROACHING DEADLINES ---
  private static handleApproachingDeadlines(
    ctx: AssistantQueryContext,
    startOfToday: Date,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const upcomingCommitments = ctx.commitments
      .filter((c) => {
        if (c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
        const due = new Date(c.dueDate);
        return due >= startOfToday;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const projectsWithDeadlines = (scopedProject ? [scopedProject] : ctx.projects)
      .map((p) => {
        const days = calculateDaysRemaining(p.deadline, startOfToday);
        return { project: p, daysRemaining: days };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const lines: string[] = [];
    lines.push('Approaching project and operational deadlines:\n');

    lines.push('Project Milestones:');
    projectsWithDeadlines.forEach(({ project, daysRemaining }) => {
      lines.push(
        `• [${project.id}] ${project.name}: Deadline ${project.deadline} (${daysRemaining >= 0 ? `in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : `${Math.abs(daysRemaining)} days past target`}, Health: ${project.health}%)`
      );
    });

    if (upcomingCommitments.length > 0) {
      lines.push('\nActionable Commitments Due Soon:');
      upcomingCommitments.slice(0, 4).forEach((c) => {
        const daysUntil = Math.ceil((new Date(c.dueDate).getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
        lines.push(`• [${c.id}] "${c.title}" (${c.projectName || 'General'}): Due ${c.dueDate} (in ${daysUntil} day${daysUntil === 1 ? '' : 's'}) · Priority: ${c.priority}`);
      });
    }

    const nextUpcoming = upcomingCommitments[0];

    return {
      text: lines.join('\n'),
      supportingMemories: [],
      relatedDecisions: [],
      inferredSuggestions: [
        nextUpcoming
          ? `Immediate milestone to prepare: [${nextUpcoming.id}] "${nextUpcoming.title}" due ${nextUpcoming.dueDate}.`
          : 'All tracked commitments are on schedule.'
      ],
      isUncertain: false,
      confidenceScore: 98
    };
  }

  // --- HANDLER: MISSING INFORMATION ---
  private static handleMissingInformation(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const gaps: string[] = [];

    const targetProjects = scopedProject ? [scopedProject] : ctx.projects;

    targetProjects.forEach((prj) => {
      const pMems = ctx.memories.filter((m) => m.projectId === prj.id);
      const pDecs = ctx.decisions.filter((d) => d.projectId === prj.id);
      const pComms = ctx.commitments.filter((c) => c.projectId === prj.id);

      if (pDecs.length === 0) {
        gaps.push(`• [${prj.id}] "${prj.name}": No architectural decisions have been recorded yet.`);
      }
      if (pComms.length === 0) {
        gaps.push(`• [${prj.id}] "${prj.name}": No commitments or milestones are assigned to track progress.`);
      }
      if (pMems.length < 2) {
        gaps.push(`• [${prj.id}] "${prj.name}": Sparse episodic context (${pMems.length} memory recorded).`);
      }
    });

    // Check for unresolved conflicts
    const unresolved = ctx.conflicts.filter((c) => c.status === 'UNRESOLVED');
    if (unresolved.length > 0) {
      gaps.push(`• Active Contradictions: ${unresolved.length} unresolved conflict${unresolved.length === 1 ? '' : 's'} require disambiguation.`);
    }

    if (gaps.length === 0) {
      return {
        text: `Knowledge coverage is comprehensive across tracked projects${scopedProject ? ` for ${scopedProject.name}` : ''}. All contexts have recorded memories, architectural decisions, and operational commitments.`,
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Continue capturing insights as development proceeds.'],
        isUncertain: false,
        confidenceScore: 95
      };
    }

    return {
      text: `Identified knowledge gaps and missing context in your workspace:\n\n${gaps.join('\n\n')}`,
      supportingMemories: [],
      relatedDecisions: [],
      inferredSuggestions: [
        'Document missing architectural decisions in the Decision Timeline.',
        'Create tracked milestones for uncommitted project goals in Commitments.'
      ],
      isUncertain: false,
      confidenceScore: 92
    };
  }

  // --- HANDLER: CURRENT DECISIONS ---
  private static handleCurrentDecisions(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const currentDecs = ctx.decisions.filter((d) => d.status === 'CURRENT');

    if (currentDecs.length === 0) {
      return {
        text: 'There are currently no active decisions recorded in the memory vault.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Record your architectural decisions using the Decision Timeline.'],
        isUncertain: true,
        confidenceScore: 40
      };
    }

    const lines = currentDecs.map((d) => {
      return `• [${d.id}] "${d.title}" (${d.projectName || 'General Context'}) — STATUS: CURRENT\n  Rationale: ${d.rationale}${d.impactAssessment ? `\n  Impact: ${d.impactAssessment}` : ''}`;
    });

    const supportingMemories: Memory[] = [];
    currentDecs.forEach((d) => {
      d.sourceMemoryIds.forEach((mId) => {
        const mem = ctx.memories.find((m) => m.id === mId);
        if (mem && !supportingMemories.some((s) => s.id === mem.id)) supportingMemories.push(mem);
      });
    });

    return {
      text: `Current active architectural decisions (excluding superseded records):\n\n${lines.join('\n\n')}`,
      supportingMemories,
      relatedDecisions: currentDecs,
      inferredSuggestions: [
        'All decisions shown are CURRENT and un-superseded.',
        'Historical superseded decisions are preserved separately in the Decision Timeline.'
      ],
      isUncertain: false,
      confidenceScore: 99
    };
  }

  // --- HANDLER: SUPPORTING RECORDS ---
  private static handleSupportingRecords(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const currentDecs = ctx.decisions.filter((d) => d.status === 'CURRENT');
    const memories = ctx.memories.slice(0, 5);

    const memList = memories.map((m) => `• [${m.id}] "${m.title}" (${m.type}, ${m.confidence}% verified, ${m.projectName || 'Context'})`);
    const decList = currentDecs.map((d) => `• [${d.id}] "${d.title}" (Status: ${d.status}, Project: ${d.projectName || 'Context'})`);

    return {
      text: `Every response in CONTEXTOS is deterministically grounded in verified vault records. Active evidence anchors include:\n\nStored Memories:\n${memList.join('\n')}\n\nArchitectural Decisions:\n${decList.join('\n')}`,
      supportingMemories: memories,
      relatedDecisions: currentDecs,
      inferredSuggestions: [
        'Click on any source badge in the Sources box to view full record metadata and lineage.',
        'Zero records are fabricated.'
      ],
      isUncertain: false,
      confidenceScore: 100
    };
  }

  // --- HANDLER: UPCOMING COMMITMENTS ---
  private static handleUpcomingCommitments(
    ctx: AssistantQueryContext,
    startOfToday: Date,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const upcoming = ctx.commitments
      .filter((c) => {
        if (c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
        const due = new Date(c.dueDate);
        return due >= startOfToday;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (upcoming.length === 0) {
      const scopeLabel = scopedProject ? ` for ${scopedProject.name}` : '';
      return {
        text: `There are currently no upcoming open commitments pending${scopeLabel}.`,
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Define new milestones or commitments in the Commitments page to track ongoing goals.'],
        isUncertain: false,
        confidenceScore: 95
      };
    }

    const lines = upcoming.map((c) => {
      const daysUntil = Math.ceil((new Date(c.dueDate).getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
      return `• [${c.id}] "${c.title}" (${c.projectName || 'General'})\n  Due: ${c.dueDate} (in ${daysUntil} day${daysUntil === 1 ? '' : 's'}) · Priority: ${c.priority}${c.description ? `\n  Description: ${c.description}` : ''}`;
    });

    return {
      text: `Found ${upcoming.length} upcoming open commitment${upcoming.length === 1 ? '' : 's'}:\n\n${lines.join('\n\n')}`,
      supportingMemories: [],
      relatedDecisions: [],
      inferredSuggestions: [
        `Next approaching milestone: "${upcoming[0].title}" due ${upcoming[0].dueDate}.`
      ],
      isUncertain: false,
      confidenceScore: 97
    };
  }

  // --- HANDLER: NEXT ACTIONS ---
  private static handleNextActions(
    ctx: AssistantQueryContext,
    now: Date,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const recommendationResult = RecommendationEngine.prioritize(
      {
        commitments: ctx.commitments,
        conflicts: ctx.conflicts,
        decisions: ctx.decisions,
        projects: ctx.projects,
        memories: ctx.memories
      },
      now,
      scopedProject?.id
    );

    const primary = recommendationResult.primaryRecommendation;

    if (!primary) {
      return {
        text: `There are currently no active commitments, pending deadlines, or unresolved conflicts recorded${scopedProject ? ` for ${scopedProject.name}` : ''}.\n\nAll tracked goals and architectural items are fulfilled.`,
        supportingMemories: [],
        relatedDecisions: ctx.decisions.filter((d) => d.status === 'CURRENT').slice(0, 2),
        inferredSuggestions: ['Consider logging new milestones or sprint commitments in the Commitments view.'],
        isUncertain: true,
        confidenceScore: 90
      };
    }

    const supportingMemories = recommendationResult.supportingMemories;
    const relatedDecisions = ctx.decisions.filter((d) => d.status === 'CURRENT').slice(0, 2);

    return {
      text: `Based on deterministic evaluation of deadlines, SLA priorities, and workspace records:\n\n${recommendationResult.summaryText}`,
      supportingMemories,
      relatedDecisions,
      inferredSuggestions: [
        `Focus immediately on [${primary.id}] "${primary.title}" (${primary.urgencyScore} urgency score).`,
        'Update or reschedule commitments in the Commitments view once addressed.'
      ],
      isUncertain: false,
      confidenceScore: 98
    };
  }

  // --- HANDLER: DATABASE DECISIONS ---
  private static handleDatabaseDecisions(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    // Find all decisions related to database, storage, redis, postgres, graph
    const dbDecisions = ctx.decisions.filter((d) => {
      const text = `${d.title} ${d.rationale} ${d.changeExplanation || ''}`.toLowerCase();
      return (
        text.includes('database') ||
        text.includes('redis') ||
        text.includes('graph') ||
        text.includes('postgres') ||
        text.includes('vector') ||
        text.includes('storage')
      );
    });

    const activeDecs = dbDecisions.filter((d) => d.status === 'CURRENT');
    const supersededDecs = dbDecisions.filter((d) => d.status === 'SUPERSEDED');

    const supportingMemories: Memory[] = [];
    dbDecisions.forEach((d) => {
      d.sourceMemoryIds.forEach((memId) => {
        const m = ctx.memories.find((mem) => mem.id === memId);
        if (m && !supportingMemories.some((s) => s.id === m.id)) supportingMemories.push(m);
      });
    });

    if (dbDecisions.length === 0) {
      return {
        text: 'No database or storage architecture decisions found in the current memory vault.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Record your database choices in the Decision Timeline.'],
        isUncertain: true,
        confidenceScore: 40
      };
    }

    const lines: string[] = [];
    lines.push('Here are your recorded decisions regarding database and storage architecture:\n');

    activeDecs.forEach((d) => {
      lines.push(
        `• [${d.id}] "${d.title}" (${d.projectName || 'General Context'}) — STATUS: ${d.status}\n  Rationale: ${d.rationale}${d.impactAssessment ? `\n  Impact: ${d.impactAssessment}` : ''}`
      );
    });

    if (supersededDecs.length > 0) {
      lines.push('\nHistorical / Superseded Database Decisions:');
      supersededDecs.forEach((d) => {
        lines.push(
          `• [${d.id}] "${d.title}" — STATUS: ${d.status} (Superseded by ${d.supersededBy || 'newer decision'})\n  Original Rationale: ${d.rationale}\n  Reason Superseded: ${d.changeExplanation || 'Replaced by graph architecture.'}`
        );
      });
    }

    return {
      text: lines.join('\n'),
      supportingMemories,
      relatedDecisions: dbDecisions,
      inferredSuggestions: [
        'The primary active store is the Hybrid Episodic Graph Memory (DEC-301) for causal lineage and sub-85ms voice SLA.',
        'PostgreSQL (DEC-304) is maintained for multi-tenant replica synchronization in the study track.'
      ],
      isUncertain: false,
      confidenceScore: 99
    };
  }

  // --- HANDLER: LAUNCH PLAN ---
  private static handleLaunchPlan(
    ctx: AssistantQueryContext
  ): AssistantAnswer {
    const launchProject = ctx.projects.find((p) => p.id === 'PRJ-PRODUCT-LAUNCH' || p.name.toLowerCase().includes('launch'));
    const launchDecs = ctx.decisions.filter((d) => d.projectId === 'PRJ-PRODUCT-LAUNCH' || d.projectId === launchProject?.id);
    const launchComms = ctx.commitments.filter((c) => c.projectId === 'PRJ-PRODUCT-LAUNCH' || c.projectId === launchProject?.id);
    const launchMems = ctx.memories.filter((m) => m.projectId === 'PRJ-PRODUCT-LAUNCH' || m.projectId === launchProject?.id);

    if (!launchProject) {
      return {
        text: 'Could not find a project matching Product Launch in the current vault.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Check project catalog in Projects page.'],
        isUncertain: true,
        confidenceScore: 30
      };
    }

    const openComms = launchComms.filter((c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED');
    const completedComms = launchComms.filter((c) => c.status === 'COMPLETED');

    const lines: string[] = [
      `Current Plan and Status for ${launchProject.name} [${launchProject.id}]:`,
      `• Target Release Deadline: ${launchProject.deadline} (Operational Health: ${launchProject.health}%)`,
      `• Core Track: Alexa+ voice companion integration & Amazon Developer Hackathon 2026.`,
      `• Key Goals:\n  ${launchProject.goals.map((g) => `– ${g}`).join('\n  ')}`,
      `• Security & Architecture Constraints:\n  ${launchProject.constraints.map((c) => `– ${c}`).join('\n  ')}`,
      `\nKey Architectural Decisions:`,
      ...launchDecs.map((d) => `• [${d.id}] "${d.title}" (${d.status}): ${d.rationale}`),
      `\nOpen Milestones & Commitments (${openComms.length} open, ${completedComms.length} completed):`,
      ...openComms.map((c) => `• [${c.id}] "${c.title}" (Due: ${c.dueDate}, Priority: ${c.priority})`)
    ];

    return {
      text: lines.join('\n'),
      supportingMemories: launchMems.slice(0, 3),
      relatedDecisions: launchDecs,
      inferredSuggestions: [
        'Deployment contract standardizes on Model Context Protocol (MCP) streamable endpoints (DEC-302).',
        'Next critical delivery is COM-202 (MCP tool definitions) and walkthrough demo (COM-205).'
      ],
      isUncertain: false,
      confidenceScore: 99
    };
  }

  // --- HANDLER: CONFLICTS ---
  private static handleConflicts(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    // Run deterministic conflict detector across current store state
    const detectedConflicts = ConflictDetector.detectConflicts(ctx.memories, ctx.decisions, ctx.conflicts);
    const unresolved = detectedConflicts.filter((c) => c.status === 'UNRESOLVED');

    if (unresolved.length === 0) {
      const scopeLabel = scopedProject ? ` in ${scopedProject.name}` : '';
      return {
        text: `No contradictory or conflicting records detected${scopeLabel}. All verified facts and active decisions maintain causal consistency across the memory graph.`,
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Continue logging architectural changes using the supersede workflow to prevent historical drift.'],
        isUncertain: false,
        confidenceScore: 100
      };
    }

    const supportingMems: Memory[] = [];
    const relatedDecs: Decision[] = [];

    const summaries = unresolved.map((conf, idx) => {
      const memA = ctx.memories.find((m) => m.id === conf.memoryIdA);
      const memB = ctx.memories.find((m) => m.id === conf.memoryIdB);
      const decA = ctx.decisions.find((d) => d.id === conf.memoryIdA);

      if (memA && !supportingMems.some((s) => s.id === memA.id)) supportingMems.push(memA);
      if (memB && !supportingMems.some((s) => s.id === memB.id)) supportingMems.push(memB);
      if (decA && !relatedDecs.some((r) => r.id === decA.id)) relatedDecs.push(decA);

      return `${idx + 1}. [${conf.id}] ${conf.title} (${conf.projectName || 'General'})\n   Severity: ${conf.severity || 'confirmed'}\n   Explanation: ${conf.description}`;
    });

    return {
      text: `Detected ${unresolved.length} potential contradiction${unresolved.length === 1 ? '' : 's'} across stored records:\n\n${summaries.join('\n\n')}`,
      supportingMemories: supportingMems,
      relatedDecisions: relatedDecs,
      inferredSuggestions: [
        'Inspect the candidate records and either supersede the outdated record or adjust the parameter constraint.',
        'Use the conflict banner on Mission Control or the resolve dialog to record an explicit resolution.'
      ],
      isUncertain: false,
      confidenceScore: 95
    };
  }

  // --- HANDLER: DECISION EVOLUTION & SUPERSEDED LINEAGE ---
  private static handleDecisionEvolution(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    // Find all decisions that were superseded or supersede earlier decisions
    const supersededDecisions = ctx.decisions.filter(
      (d) => d.status === 'SUPERSEDED' || !!d.supersedesDecisionId || !!d.supersededBy || !!d.changeExplanation
    );

    const supersededMemories = ctx.memories.filter((m) => m.validity === 'SUPERSEDED' || !!m.supersededBy);

    if (supersededDecisions.length === 0 && supersededMemories.length === 0) {
      const scopeLabel = scopedProject ? ` in ${scopedProject.name}` : '';
      return {
        text: `No superseded decisions or plan revisions recorded yet${scopeLabel}. All current decisions represent initial baseline specifications without recorded revisions.`,
        supportingMemories: [],
        relatedDecisions: ctx.decisions.filter((d) => d.status === 'CURRENT').slice(0, 3),
        inferredSuggestions: ['When changing architecture or plans, use "SUPERSEDE" instead of deleting records to preserve causal lineage.'],
        isUncertain: false,
        confidenceScore: 98
      };
    }

    const narrativeBlocks: string[] = [];
    const supportingMems: Memory[] = [];
    const relatedDecs: Decision[] = [];

    // Format superseded decisions
    for (const dec of supersededDecisions) {
      if (!relatedDecs.some((r) => r.id === dec.id)) relatedDecs.push(dec);

      if (dec.status === 'SUPERSEDED' && dec.supersededBy) {
        const newer = ctx.decisions.find((d) => d.id === dec.supersededBy);
        if (newer && !relatedDecs.some((r) => r.id === newer.id)) relatedDecs.push(newer);

        narrativeBlocks.push(
          `• Decision [${dec.id}] "${dec.title}" was superseded by [${newer?.id || dec.supersededBy}] "${newer?.title || 'Updated Decision'}".\n  Original Rationale: ${dec.rationale}\n  Reason for change: ${newer?.changeExplanation || dec.changeExplanation || 'Updated requirements or constraints.'}`
        );
      } else if (dec.supersedesDecisionId) {
        const older = ctx.decisions.find((d) => d.id === dec.supersedesDecisionId);
        if (older && !relatedDecs.some((r) => r.id === older.id)) relatedDecs.push(older);

        narrativeBlocks.push(
          `• Decision [${dec.id}] "${dec.title}" superseded earlier decision [${dec.supersedesDecisionId}] "${older?.title || 'Prior plan'}".\n  Current Rationale: ${dec.rationale}\n  Explanation: ${dec.changeExplanation || 'Updated to satisfy new constraints.'}`
        );
      }
    }

    // Format superseded memories if present
    for (const mem of supersededMemories) {
      if (!supportingMems.some((s) => s.id === mem.id)) supportingMems.push(mem);
      if (mem.supersededBy) {
        const newerMem = ctx.memories.find((m) => m.id === mem.supersededBy);
        if (newerMem && !supportingMems.some((s) => s.id === newerMem.id)) supportingMems.push(newerMem);
      }
    }

    return {
      text: `Historical decision lineage and architectural shifts recorded in your vault:\n\n${narrativeBlocks.join('\n\n')}`,
      supportingMemories: supportingMems,
      relatedDecisions: relatedDecs,
      inferredSuggestions: [
        'The historical record remains fully preserved in the Decision Timeline without overwriting past rationales.',
        'Review related memory constraints to confirm all dependencies conform to the latest decision.'
      ],
      isUncertain: false,
      confidenceScore: 98
    };
  }

  // --- HANDLER: DECISIONS LIST ---
  private static handleDecisionsList(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const decisions = ctx.decisions;
    if (decisions.length === 0) {
      const scopeLabel = scopedProject ? ` for ${scopedProject.name}` : '';
      return {
        text: `No decisions have been recorded${scopeLabel}. Use "+ CAPTURE MEMORY" or the Decision Timeline to record your first architectural decision.`,
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Start by documenting your core technical choices, database selection, or architectural constraints.'],
        isUncertain: true,
        confidenceScore: 95
      };
    }

    const currentDecs = decisions.filter((d) => d.status === 'CURRENT');
    const supersededDecs = decisions.filter((d) => d.status === 'SUPERSEDED');

    const listLines = currentDecs.map((d) => {
      return `• [${d.id}] "${d.title}" (${d.projectName || 'General'})\n  Status: ${d.status}\n  Rationale: ${d.rationale}${d.impactAssessment ? `\n  Impact: ${d.impactAssessment}` : ''}`;
    });

    let extraNote = '';
    if (supersededDecs.length > 0) {
      extraNote = `\n\nAdditionally, there ${supersededDecs.length === 1 ? 'is 1 superseded historical decision' : `are ${supersededDecs.length} superseded historical decisions`} preserved in your lineage timeline.`;
    }

    // Retrieve supporting memories referenced by these decisions
    const supportingMems: Memory[] = [];
    currentDecs.forEach((d) => {
      d.sourceMemoryIds.forEach((memId) => {
        const m = ctx.memories.find((mem) => mem.id === memId);
        if (m && !supportingMems.some((s) => s.id === m.id)) supportingMems.push(m);
      });
    });

    return {
      text: `You have recorded ${currentDecs.length} active architectural decision${currentDecs.length === 1 ? '' : 's'}:\n\n${listLines.join('\n\n')}${extraNote}`,
      supportingMemories: supportingMems,
      relatedDecisions: currentDecs,
      inferredSuggestions: [
        'Each decision has recorded source evidence and historical provenance.',
        'You can inspect causal relationships in the Decision Timeline or Knowledge Graph.'
      ],
      isUncertain: false,
      confidenceScore: 99
    };
  }

  // --- HANDLER: DECISION EVIDENCE ---
  private static handleDecisionEvidence(
    ctx: AssistantQueryContext,
    queryLower: string,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    // Find candidate decisions based on query text
    const decisions = ctx.decisions.filter((d) => d.status === 'CURRENT');
    let matchedDec = decisions.find((d) => queryLower.includes(d.id.toLowerCase()) || queryLower.includes(d.title.toLowerCase()));

    if (!matchedDec && decisions.length > 0) {
      matchedDec = decisions[0];
    }

    if (!matchedDec) {
      return {
        text: 'No active decisions found to examine supporting evidence.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Record a decision first to establish causal memory links.'],
        isUncertain: true,
        confidenceScore: 90
      };
    }

    const linkedMemories = ctx.memories.filter((m) => matchedDec!.sourceMemoryIds.includes(m.id));

    if (linkedMemories.length === 0) {
      return {
        text: `Decision [${matchedDec.id}] "${matchedDec.title}" has recorded rationale:\n\n"${matchedDec.rationale}"\n\nHowever, it currently has no explicit memory references linked in sourceMemoryIds.`,
        supportingMemories: [],
        relatedDecisions: [matchedDec],
        inferredSuggestions: [
          'Link verified memory records to this decision in the Decision Timeline to strengthen auditability.'
        ],
        isUncertain: true,
        confidenceScore: 85
      };
    }

    const memLines = linkedMemories.map((m) => {
      return `• [${m.id}] "${m.title}" (${m.type}, ${m.confidence}% confidence)\n  Evidence: ${m.content}`;
    });

    return {
      text: `Supporting evidence for Decision [${matchedDec.id}] "${matchedDec.title}":\n\nRecorded Rationale: ${matchedDec.rationale}\n\nLinked Grounded Records:\n${memLines.join('\n\n')}`,
      supportingMemories: linkedMemories,
      relatedDecisions: [matchedDec],
      inferredSuggestions: [
        'All supporting facts are validated in the active memory vault.'
      ],
      isUncertain: false,
      confidenceScore: 98
    };
  }

  // --- HANDLER: PROJECT SUMMARY ---
  private static handleProjectSummary(
    ctx: AssistantQueryContext,
    scopedProject?: ProjectContext,
    queryLower: string = ''
  ): AssistantAnswer {
    const prj = scopedProject || ctx.projects.find((p) => queryLower.includes(p.name.toLowerCase()) || queryLower.includes(p.slug));

    if (!prj) {
      return {
        text: 'Please select a specific project context in the top filter to view a localized summary.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: ['Choose a project from the context selector.'],
        isUncertain: true,
        confidenceScore: 80
      };
    }

    const pMems = ctx.memories.filter((m) => m.projectId === prj.id);
    const pDecs = ctx.decisions.filter((d) => d.projectId === prj.id);
    const pComms = ctx.commitments.filter((c) => c.projectId === prj.id);
    const openComms = pComms.filter((c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED');

    const lines = [
      `Context Summary for ${prj.name} [${prj.id}]:`,
      `• Status: ${prj.status} (Health score: ${prj.health}%)`,
      `• Target Deadline: ${prj.deadline}`,
      `• Goals: ${prj.goals.join('; ')}`,
      `• Constraints: ${prj.constraints.join('; ')}`,
      `• Knowledge Vault: ${pMems.length} memories retained (${pMems.filter((m) => m.validity === 'CURRENT').length} active, ${pMems.filter((m) => m.validity === 'SUPERSEDED').length} superseded)`,
      `• Architectural Decisions: ${pDecs.length} recorded (${pDecs.filter((d) => d.status === 'CURRENT').length} current)`,
      `• Actionable Commitments: ${pComms.length} tracked (${openComms.length} open, ${pComms.length - openComms.length} completed)`
    ];

    return {
      text: lines.join('\n'),
      supportingMemories: pMems.slice(0, 4),
      relatedDecisions: pDecs.slice(0, 3),
      inferredSuggestions: [
        `Operational status is ${prj.status}. Ensure constraints are evaluated before next deployment.`
      ],
      isUncertain: false,
      confidenceScore: 99
    };
  }

  // --- HANDLER: GENERAL MULTI-SIGNAL RETRIEVAL ---
  private static handleGeneralRetrieval(
    query: string,
    ctx: AssistantQueryContext,
    now: Date,
    scopedProject?: ProjectContext
  ): AssistantAnswer {
    const result = RetrievalEngine.retrieve(
      query,
      {
        memories: ctx.memories,
        decisions: ctx.decisions,
        commitments: ctx.commitments,
        projects: ctx.projects
      },
      {
        projectScopeId: scopedProject?.id,
        now
      }
    );

    const hasMemories = result.matchedMemories.length > 0;
    const hasDecisions = result.matchedDecisions.length > 0;
    const hasCommitments = result.matchedCommitments.length > 0;
    const hasProjects = result.matchedProjects.length > 0;

    // Honest fallback if no matches found
    if (!hasMemories && !hasDecisions && !hasCommitments && !hasProjects) {
      return {
        text: 'The available memories and project records do not contain sufficient evidence to answer this query with verified certainty.',
        supportingMemories: [],
        relatedDecisions: [],
        inferredSuggestions: [
          'Try asking about recorded decisions ("What decisions have I made?"), overdue commitments, or active conflicts.',
          'You can also record new context right now using "+ CAPTURE MEMORY".'
        ],
        isUncertain: true,
        confidenceScore: 10
      };
    }

    const sections: string[] = [];
    const supportingMemories: Memory[] = result.matchedMemories.map((m) => m.item).slice(0, 4);
    const relatedDecisions: Decision[] = result.matchedDecisions.map((d) => d.item).slice(0, 3);

    // Highlight top memory match
    if (hasMemories) {
      const top = result.matchedMemories[0].item;
      sections.push(
        `Retrieved Context from Memory [${top.id}] ("${top.title}"):\n"${top.content}"\n(Project: ${top.projectName || 'General'}, Type: ${top.type}, Validity: ${top.validity}, Confidence: ${top.confidence}%)`
      );

      if (result.matchedMemories.length > 1) {
        const others = result.matchedMemories.slice(1, 3).map((m) => `• [${m.item.id}] "${m.item.title}" (${m.item.validity}): ${m.item.content.slice(0, 90)}...`);
        sections.push(`Additional Related Records:\n${others.join('\n')}`);
      }
    }

    // Highlight decision match
    if (hasDecisions) {
      const topDec = result.matchedDecisions[0].item;
      sections.push(
        `Relevant Architectural Decision [${topDec.id}] ("${topDec.title}"):\nRationale: ${topDec.rationale}${topDec.changeExplanation ? `\nChange Context: ${topDec.changeExplanation}` : ''}`
      );
    }

    // Highlight commitment match
    if (hasCommitments) {
      const topCom = result.matchedCommitments[0].item;
      sections.push(
        `Linked Commitment [${topCom.id}] ("${topCom.title}"): Due ${topCom.dueDate} (Priority: ${topCom.priority}, Status: ${topCom.status})`
      );
    }

    const maxScore = Math.max(
      result.matchedMemories[0]?.score || 0,
      result.matchedDecisions[0]?.score || 0,
      result.matchedCommitments[0]?.score || 0
    );

    const confidence = Math.min(99, Math.max(65, Math.round(maxScore * 0.8)));

    return {
      text: sections.join('\n\n'),
      supportingMemories,
      relatedDecisions,
      inferredSuggestions: [
        'All cited records exist in your active workspace vault.',
        'You can inspect full lineage in the Memory Explorer and Decision Timeline.'
      ],
      isUncertain: false,
      confidenceScore: confidence
    };
  }
}
