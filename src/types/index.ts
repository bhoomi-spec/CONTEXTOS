export type MemoryType = 'FACT' | 'DECISION' | 'PREFERENCE' | 'COMMITMENT' | 'INSIGHT' | 'EVENT';

export type MemorySource = 'USER_EXPLICIT' | 'CONVERSATION' | 'AI_INFERENCE' | 'DOC_IMPORT' | 'SYSTEM';

export type ValidityStatus = 'CURRENT' | 'SUPERSEDED' | 'UNCERTAIN' | 'ARCHIVED';

export interface Memory {
  id: string; // e.g. MEM-1042
  title: string;
  content: string;
  type: MemoryType;
  projectId: string;
  projectName?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  source: MemorySource;
  confidence: number; // 0 - 100
  validity: ValidityStatus;
  relatedMemoryIds: string[];
  tags: string[];
  supersededBy?: string;
  supersedesMemoryId?: string;
}

export type DecisionStatus = 'CURRENT' | 'SUPERSEDED' | 'UNDER_REVIEW';

export interface Decision {
  id: string; // e.g. DEC-301
  title: string;
  rationale: string;
  projectId: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;
  status: DecisionStatus;
  supersededBy?: string;
  supersedesDecisionId?: string;
  sourceMemoryIds: string[];
  changeExplanation?: string;
  alternativesConsidered?: string[];
  impactAssessment?: string;
  auditAuthor?: string;
}

export type ProjectStatus = 'ACTIVE' | 'PLANNING' | 'STABLE' | 'PAUSED' | 'ARCHIVED';

export interface ProjectContext {
  id: string; // e.g. PRJ-AI-RESEARCH
  name: string;
  slug: string;
  description: string;
  goals: string[];
  constraints: string[];
  deadline: string;
  status: ProjectStatus;
  health: number; // percentage
  lastUpdated: string;
  lastUpdatedISO?: string;
  accentColor: 'coral' | 'purple' | 'emerald' | 'amber' | 'pink' | 'cyan';
}

export type CommitmentPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CommitmentStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Commitment {
  id: string; // e.g. COM-204
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  dueDate: string;
  priority: CommitmentPriority;
  status: CommitmentStatus;
  sourceMemoryId?: string;
  createdAt: string;
  completedAt?: string;
}

export type ActivityEventType =
  | 'MEMORY_CREATED'
  | 'MEMORY_UPDATED'
  | 'MEMORY_SUPERSEDED'
  | 'DECISION_UPDATED'
  | 'DECISION_SUPERSEDED'
  | 'CONTEXT_LINKED'
  | 'PROJECT_UPDATED'
  | 'COMMITMENT_COMPLETED'
  | 'COMMITMENT_CREATED'
  | 'COMMITMENT_UPDATED'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_RESOLVED'
  | 'CONFLICT_DISMISSED';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  timestamp: string;
  timestampISO?: string;
  relatedId?: string;
  severity?: 'info' | 'success' | 'warning' | 'alert';
}

export type ConflictCategory =
  | 'PARAMETER'
  | 'LATENCY_SLA'
  | 'STORAGE_ARCHITECTURE'
  | 'STALE_EVIDENCE'
  | 'MUTUALLY_EXCLUSIVE'
  | 'DEADLINE_MISMATCH';

export interface MemoryConflict {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  memoryIdA: string;
  memoryIdB: string;
  status: 'UNRESOLVED' | 'RESOLVED';
  detectedAt: string;
  resolutionNotes?: string;
  severity?: 'potential' | 'confirmed';
  conflictType?: ConflictCategory;
  recommendedAction?: string;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  supportingMemoryIds?: string[];
  relatedDecisionIds?: string[];
  inferredSuggestions?: string[];
  isUncertain?: boolean;
}

export type NavigationPage =
  | 'mission-control'
  | 'memory-explorer'
  | 'knowledge-graph'
  | 'decision-timeline'
  | 'projects'
  | 'commitments'
  | 'conflicts'
  | 'activity'
  | 'assistant'
  | 'settings';
