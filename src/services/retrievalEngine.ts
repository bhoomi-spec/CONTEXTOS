import { Memory, Decision, Commitment, ProjectContext, MemorySource, ValidityStatus, DecisionStatus } from '../types';

export interface ScoredRecord<T> {
  item: T;
  score: number;
  matchReasons: string[];
}

export interface RetrievalResult {
  query: string;
  normalizedTokens: string[];
  isHistoricalQuery: boolean;
  isDecisionQuery: boolean;
  isCommitmentQuery: boolean;
  isConflictQuery: boolean;
  matchedMemories: ScoredRecord<Memory>[];
  matchedDecisions: ScoredRecord<Decision>[];
  matchedCommitments: ScoredRecord<Commitment>[];
  matchedProjects: ScoredRecord<ProjectContext>[];
}

export interface RetrievalOptions {
  projectScopeId?: string;
  includeSuperseded?: boolean;
  limit?: number;
  now?: Date;
  timeRange?: {
    startDate?: string;
    endDate?: string;
    withinDays?: number;
  };
  filterDecisionStatus?: DecisionStatus | 'ALL';
  filterSourceType?: MemorySource | 'ALL';
  filterValidity?: ValidityStatus | 'ALL';
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'i', 'my', 'me', 'we', 'our',
  'you', 'your', 'what', 'which', 'who', 'how', 'why', 'when', 'where',
  'about', 'this', 'do', 'did', 'have', 'had', 'should', 'can', 'could',
  'tell', 'give', 'show', 'list', 'please'
]);

const HISTORICAL_KEYWORDS = new Set([
  'previous', 'previously', 'earlier', 'past', 'history', 'superseded',
  'changed', 'change', 'changes', 'before', 'prior', 'evolved', 'evolution',
  'former', 'abandoned', 'deprecated', 'replaced', 'switched'
]);

const DECISION_KEYWORDS = new Set([
  'decision', 'decisions', 'decided', 'rationale', 'architecture',
  'architectural', 'chosen', 'choose', 'choice', 'approach', 'strategy',
  'decide'
]);

const DATABASE_KEYWORDS = new Set([
  'database', 'db', 'storage', 'sql', 'cache', 'postgres', 'postgresql',
  'redis', 'graph', 'nosql', 'rdbms', 'schema', 'backend', 'table', 'tables'
]);

const LAUNCH_KEYWORDS = new Set([
  'launch', 'product', 'release', 'deploy', 'mcp', 'preview', 'hackathon',
  'voice', 'alexa', 'alexa+', 'demo', 'timeline'
]);

const COMMITMENT_KEYWORDS = new Set([
  'commitment', 'commitments', 'task', 'tasks', 'todo', 'todos',
  'due', 'overdue', 'deadline', 'deadlines', 'action', 'actions', 'sla',
  'work on', 'next step', 'priorities', 'priority', 'upcoming'
]);

const CONFLICT_KEYWORDS = new Set([
  'conflict', 'conflicts', 'contradict', 'contradiction', 'contradictions',
  'discrepancy', 'discrepancies', 'mismatch', 'inconsistent', 'inconsistency',
  'opposing', 'incompatible'
]);

export class RetrievalEngine {
  /**
   * Tokenizes and normalizes text into cleaned query tokens
   */
  public static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  }

  /**
   * Checks if query expresses interest in historical or superseded context
   */
  public static isHistorical(query: string): boolean {
    const rawTokens = query.toLowerCase().split(/\s+/);
    return rawTokens.some((t) => HISTORICAL_KEYWORDS.has(t.replace(/[^a-z]/g, '')));
  }

  /**
   * Core multi-signal retrieval function
   */
  public static retrieve(
    query: string,
    dataset: {
      memories: Memory[];
      decisions: Decision[];
      commitments: Commitment[];
      projects: ProjectContext[];
    },
    options: RetrievalOptions = {}
  ): RetrievalResult {
    const trimmedQuery = query.trim();
    const queryTokens = this.tokenize(trimmedQuery);
    const queryLower = trimmedQuery.toLowerCase();
    const isHistorical = this.isHistorical(trimmedQuery);
    const isDecisionQuery = queryLower.includes('decision') || queryLower.includes('decide') || queryTokens.some((t) => DECISION_KEYWORDS.has(t));
    const isCommitmentQuery = queryLower.includes('commitment') || queryLower.includes('overdue') || queryTokens.some((t) => COMMITMENT_KEYWORDS.has(t));
    const isConflictQuery = queryLower.includes('conflict') || queryTokens.some((t) => CONFLICT_KEYWORDS.has(t));
    const isDatabaseQuery = queryTokens.some((t) => DATABASE_KEYWORDS.has(t)) || queryLower.includes('database');
    const isLaunchQuery = queryTokens.some((t) => LAUNCH_KEYWORDS.has(t)) || queryLower.includes('launch');
    const now = options.now || new Date();

    const scope = options.projectScopeId && options.projectScopeId !== 'ALL' ? options.projectScopeId : undefined;

    // Filter by project scope if provided
    let poolMemories = scope ? dataset.memories.filter((m) => m.projectId === scope) : dataset.memories;
    let poolDecisions = scope ? dataset.decisions.filter((d) => d.projectId === scope) : dataset.decisions;
    let poolCommitments = scope ? dataset.commitments.filter((c) => c.projectId === scope) : dataset.commitments;
    let poolProjects = dataset.projects;

    // Apply explicit multi-attribute filters from options
    if (options.filterValidity && options.filterValidity !== 'ALL') {
      poolMemories = poolMemories.filter((m) => m.validity === options.filterValidity);
    }
    if (options.filterSourceType && options.filterSourceType !== 'ALL') {
      poolMemories = poolMemories.filter((m) => m.source === options.filterSourceType);
    }
    if (options.filterDecisionStatus && options.filterDecisionStatus !== 'ALL') {
      poolDecisions = poolDecisions.filter((d) => d.status === options.filterDecisionStatus);
    }

    // Apply time range filter if specified
    if (options.timeRange) {
      const { startDate, endDate, withinDays } = options.timeRange;
      if (withinDays !== undefined && withinDays > 0) {
        const cutoff = new Date(now.getTime() - withinDays * 24 * 60 * 60 * 1000);
        poolMemories = poolMemories.filter((m) => new Date(m.createdAt) >= cutoff);
        poolDecisions = poolDecisions.filter((d) => new Date(d.createdAt) >= cutoff);
        poolCommitments = poolCommitments.filter((c) => new Date(c.createdAt) >= cutoff);
      }
      if (startDate) {
        const start = new Date(startDate);
        poolMemories = poolMemories.filter((m) => new Date(m.createdAt) >= start);
        poolDecisions = poolDecisions.filter((d) => new Date(d.createdAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        poolMemories = poolMemories.filter((m) => new Date(m.createdAt) <= end);
        poolDecisions = poolDecisions.filter((d) => new Date(d.createdAt) <= end);
      }
    }

    // 1. Score Memories
    const scoredMemories: ScoredRecord<Memory>[] = [];
    for (const mem of poolMemories) {
      const { score, reasons } = this.scoreMemory(mem, queryTokens, queryLower, isHistorical, isDatabaseQuery, isLaunchQuery, now, scope);
      if (score > 0) {
        scoredMemories.push({ item: mem, score, matchReasons: reasons });
      }
    }
    scoredMemories.sort((a, b) => b.score - a.score);

    // 2. Score Decisions
    const scoredDecisions: ScoredRecord<Decision>[] = [];
    for (const dec of poolDecisions) {
      const { score, reasons } = this.scoreDecision(dec, queryTokens, queryLower, isHistorical, isDatabaseQuery, isLaunchQuery, now, scope);
      if (score > 0) {
        scoredDecisions.push({ item: dec, score, matchReasons: reasons });
      }
    }
    scoredDecisions.sort((a, b) => b.score - a.score);

    // 3. Score Commitments
    const scoredCommitments: ScoredRecord<Commitment>[] = [];
    for (const com of poolCommitments) {
      const { score, reasons } = this.scoreCommitment(com, queryTokens, queryLower, now, scope);
      if (score > 0) {
        scoredCommitments.push({ item: com, score, matchReasons: reasons });
      }
    }
    scoredCommitments.sort((a, b) => b.score - a.score);

    // 4. Score Projects
    const scoredProjects: ScoredRecord<ProjectContext>[] = [];
    for (const prj of poolProjects) {
      const { score, reasons } = this.scoreProject(prj, queryTokens, queryLower);
      if (score > 0) {
        scoredProjects.push({ item: prj, score, matchReasons: reasons });
      }
    }
    scoredProjects.sort((a, b) => b.score - a.score);

    const limit = options.limit || 20;

    return {
      query: trimmedQuery,
      normalizedTokens: queryTokens,
      isHistoricalQuery: isHistorical,
      isDecisionQuery,
      isCommitmentQuery,
      isConflictQuery,
      matchedMemories: scoredMemories.slice(0, limit),
      matchedDecisions: scoredDecisions.slice(0, limit),
      matchedCommitments: scoredCommitments.slice(0, limit),
      matchedProjects: scoredProjects.slice(0, limit)
    };
  }

  private static scoreMemory(
    mem: Memory,
    tokens: string[],
    queryLower: string,
    isHistorical: boolean,
    isDatabaseQuery: boolean,
    isLaunchQuery: boolean,
    now: Date,
    scope?: string
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const titleLower = mem.title.toLowerCase();
    const contentLower = mem.content.toLowerCase();
    const tagsLower = mem.tags.map((t) => t.toLowerCase());
    const idLower = mem.id.toLowerCase();

    // Exact ID match
    if (queryLower.includes(idLower)) {
      score += 100;
      reasons.push('exact_id_match');
    }

    // Exact phrase in title or content
    if (queryLower.length > 3 && titleLower.includes(queryLower)) {
      score += 60;
      reasons.push('exact_phrase_in_title');
    } else if (queryLower.length > 3 && contentLower.includes(queryLower)) {
      score += 35;
      reasons.push('exact_phrase_in_content');
    }

    // Database semantic intent
    if (isDatabaseQuery) {
      const mentionsDb =
        titleLower.includes('graph') ||
        titleLower.includes('vector') ||
        titleLower.includes('redis') ||
        titleLower.includes('database') ||
        contentLower.includes('graph') ||
        contentLower.includes('vector') ||
        contentLower.includes('redis') ||
        contentLower.includes('postgres') ||
        tagsLower.includes('architecture');
      if (mentionsDb) {
        score += 25;
        reasons.push('database_domain_boost');
      }
    }

    // Launch semantic intent
    if (isLaunchQuery) {
      if (mem.projectId === 'PRJ-PRODUCT-LAUNCH' || titleLower.includes('launch') || contentLower.includes('launch') || contentLower.includes('mcp')) {
        score += 25;
        reasons.push('launch_domain_boost');
      }
    }

    // Token matching
    let tokenMatchesInTitle = 0;
    let tokenMatchesInContent = 0;
    let tokenMatchesInTags = 0;

    for (const t of tokens) {
      if (titleLower.includes(t)) {
        tokenMatchesInTitle++;
      }
      if (contentLower.includes(t)) {
        tokenMatchesInContent++;
      }
      if (tagsLower.some((tag) => tag.includes(t))) {
        tokenMatchesInTags++;
      }
    }

    if (tokenMatchesInTitle > 0) {
      score += tokenMatchesInTitle * 18;
      reasons.push(`title_tokens_${tokenMatchesInTitle}`);
    }
    if (tokenMatchesInContent > 0) {
      score += tokenMatchesInContent * 8;
      reasons.push(`content_tokens_${tokenMatchesInContent}`);
    }
    if (tokenMatchesInTags > 0) {
      score += tokenMatchesInTags * 14;
      reasons.push(`tag_tokens_${tokenMatchesInTags}`);
    }

    // If query has tokens but none matched, drop out unless domain match occurred
    if (tokens.length > 0 && tokenMatchesInTitle === 0 && tokenMatchesInContent === 0 && tokenMatchesInTags === 0 && !queryLower.includes(idLower)) {
      if (isDatabaseQuery && reasons.includes('database_domain_boost')) {
        // keep domain match
      } else if (isLaunchQuery && reasons.includes('launch_domain_boost')) {
        // keep domain match
      } else if (mem.projectName && queryLower.includes(mem.projectName.toLowerCase())) {
        score += 15;
        reasons.push('project_name_match');
      } else {
        return { score: 0, reasons: [] };
      }
    }

    // Validity / Temporal weighting
    if (isHistorical) {
      // User asked about history/superseded records
      if (mem.validity === 'SUPERSEDED' || mem.supersededBy || mem.supersedesMemoryId) {
        score += 35;
        reasons.push('historical_relevance_boost');
      }
    } else {
      // Current records preferred
      if (mem.validity === 'CURRENT') {
        score += 15;
      } else if (mem.validity === 'SUPERSEDED') {
        score -= 20;
      } else if (mem.validity === 'ARCHIVED') {
        score -= 30;
      }
    }

    // Confidence factor
    score += (mem.confidence / 100) * 10;

    // Recency factor (up to 10 points within 30 days)
    const ageDays = (now.getTime() - new Date(mem.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (!isNaN(ageDays) && ageDays >= 0) {
      score += Math.max(0, 10 - ageDays * 0.3);
    }

    // Explicit project scope match
    if (scope && mem.projectId === scope) {
      score += 10;
    }

    return { score: Math.round(score), reasons };
  }

  private static scoreDecision(
    dec: Decision,
    tokens: string[],
    queryLower: string,
    isHistorical: boolean,
    isDatabaseQuery: boolean,
    isLaunchQuery: boolean,
    now: Date,
    scope?: string
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const titleLower = dec.title.toLowerCase();
    const rationaleLower = dec.rationale.toLowerCase();
    const changeExplanationLower = (dec.changeExplanation || '').toLowerCase();
    const idLower = dec.id.toLowerCase();

    // Exact ID match
    if (queryLower.includes(idLower)) {
      score += 100;
      reasons.push('exact_id_match');
    }

    // Exact phrase in title or rationale
    if (queryLower.length > 3 && titleLower.includes(queryLower)) {
      score += 60;
      reasons.push('exact_phrase_in_title');
    } else if (queryLower.length > 3 && rationaleLower.includes(queryLower)) {
      score += 35;
      reasons.push('exact_phrase_in_rationale');
    }

    // Database semantic intent
    if (isDatabaseQuery) {
      const mentionsDb =
        titleLower.includes('graph') ||
        titleLower.includes('vector') ||
        titleLower.includes('redis') ||
        titleLower.includes('postgres') ||
        titleLower.includes('database') ||
        rationaleLower.includes('graph') ||
        rationaleLower.includes('vector') ||
        rationaleLower.includes('redis') ||
        rationaleLower.includes('postgres') ||
        rationaleLower.includes('relational');
      if (mentionsDb) {
        score += 40;
        reasons.push('database_decision_boost');
      }
    }

    // Launch semantic intent
    if (isLaunchQuery) {
      if (dec.projectId === 'PRJ-PRODUCT-LAUNCH' || titleLower.includes('mcp') || titleLower.includes('launch')) {
        score += 35;
        reasons.push('launch_decision_boost');
      }
    }

    // General decision intent boost
    if (queryLower.includes('decision') || queryLower.includes('decide') || queryLower.includes('architecture')) {
      score += 25;
      reasons.push('decision_intent_boost');
    }

    // Token matching
    let tokenMatchesInTitle = 0;
    let tokenMatchesInRationale = 0;
    let tokenMatchesInChange = 0;

    for (const t of tokens) {
      if (titleLower.includes(t)) tokenMatchesInTitle++;
      if (rationaleLower.includes(t)) tokenMatchesInRationale++;
      if (changeExplanationLower.includes(t)) tokenMatchesInChange++;
    }

    if (tokenMatchesInTitle > 0) {
      score += tokenMatchesInTitle * 18;
      reasons.push(`title_tokens_${tokenMatchesInTitle}`);
    }
    if (tokenMatchesInRationale > 0) {
      score += tokenMatchesInRationale * 10;
      reasons.push(`rationale_tokens_${tokenMatchesInRationale}`);
    }
    if (tokenMatchesInChange > 0) {
      score += tokenMatchesInChange * 15;
      reasons.push(`change_tokens_${tokenMatchesInChange}`);
    }

    // Check fallback
    if (tokens.length > 0 && tokenMatchesInTitle === 0 && tokenMatchesInRationale === 0 && !queryLower.includes(idLower)) {
      if (isDatabaseQuery && reasons.includes('database_decision_boost')) {
        // Keep domain boost
      } else if (isLaunchQuery && reasons.includes('launch_decision_boost')) {
        // Keep launch boost
      } else if (queryLower.includes('decision') && (!scope || dec.projectId === scope)) {
        score += 10;
      } else {
        return { score: 0, reasons: [] };
      }
    }

    // Historical weighting
    if (isHistorical) {
      if (dec.status === 'SUPERSEDED' || dec.supersedesDecisionId || dec.supersededBy || dec.changeExplanation) {
        score += 40;
        reasons.push('superseded_lineage_boost');
      }
    } else {
      if (dec.status === 'CURRENT') {
        score += 15;
      } else if (dec.status === 'SUPERSEDED') {
        score -= 15;
      }
    }

    // Recency
    const ageDays = (now.getTime() - new Date(dec.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (!isNaN(ageDays) && ageDays >= 0) {
      score += Math.max(0, 10 - ageDays * 0.25);
    }

    if (scope && dec.projectId === scope) {
      score += 10;
    }

    return { score: Math.round(score), reasons };
  }

  private static scoreCommitment(
    com: Commitment,
    tokens: string[],
    queryLower: string,
    now: Date,
    scope?: string
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const titleLower = com.title.toLowerCase();
    const descLower = com.description.toLowerCase();
    const idLower = com.id.toLowerCase();

    if (queryLower.includes(idLower)) {
      score += 100;
      reasons.push('exact_id_match');
    }

    const isCommitmentIntent =
      queryLower.includes('commitment') ||
      queryLower.includes('task') ||
      queryLower.includes('overdue') ||
      queryLower.includes('work on') ||
      queryLower.includes('next');

    if (isCommitmentIntent) {
      score += 20;
      reasons.push('commitment_intent_match');
    }

    // Overdue boost if query asks about overdue
    const isOverdue = (com.status === 'OPEN' || com.status === 'IN_PROGRESS') && new Date(com.dueDate) < now;
    if (queryLower.includes('overdue') && isOverdue) {
      score += 50;
      reasons.push('overdue_item_boost');
    }

    for (const t of tokens) {
      if (titleLower.includes(t)) {
        score += 16;
        reasons.push(`title_match_${t}`);
      }
      if (descLower.includes(t)) {
        score += 8;
        reasons.push(`desc_match_${t}`);
      }
    }

    if (score === 0 && !isCommitmentIntent) {
      return { score: 0, reasons: [] };
    }

    // Priority boost
    if (com.priority === 'HIGH') score += 15;
    else if (com.priority === 'MEDIUM') score += 8;

    // Completed downweight unless specifically queried
    if (com.status === 'COMPLETED') {
      score -= 25;
    }

    return { score: Math.round(score), reasons };
  }

  private static scoreProject(
    prj: ProjectContext,
    tokens: string[],
    queryLower: string
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    const nameLower = prj.name.toLowerCase();
    const slugLower = prj.slug.toLowerCase();
    const idLower = prj.id.toLowerCase();

    if (queryLower.includes(idLower) || queryLower.includes(nameLower) || queryLower.includes(slugLower)) {
      score += 80;
      reasons.push('direct_project_name_match');
    }

    for (const t of tokens) {
      if (nameLower.includes(t)) {
        score += 15;
      }
      if (prj.description.toLowerCase().includes(t)) {
        score += 6;
      }
    }

    return { score: Math.round(score), reasons };
  }
}

