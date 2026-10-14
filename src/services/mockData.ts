import { ProjectContext, Memory, Decision, Commitment, ActivityEvent, MemoryConflict } from '../types';

export const INITIAL_PROJECTS: ProjectContext[] = [
  {
    id: 'PRJ-AI-RESEARCH',
    name: 'AI Research Project',
    slug: 'ai-research',
    description: 'Investigating temporal context retention in hierarchical neural memory graphs.',
    goals: [
      'Benchmark memory decay across 100k token conversational windows',
      'Evaluate vector embeddings vs knowledge graph hybrid indexing',
      'Publish technical report for Alexa+ contextual memory pipeline'
    ],
    constraints: [
      'Latency budget under 85ms for temporal memory retrieval',
      'Privacy boundary: no raw transcripts in third-party inference'
    ],
    deadline: '2026-11-15',
    status: 'ACTIVE',
    health: 96,
    lastUpdated: '12m ago',
    lastUpdatedISO: '2026-10-10T06:23:00Z',
    accentColor: 'purple'
  },
  {
    id: 'PRJ-PRODUCT-LAUNCH',
    name: 'Product Launch',
    slug: 'product-launch',
    description: 'CONTEXTOS voice companion integration and developer preview for Amazon Developer Hackathon 2026.',
    goals: [
      'Deploy streamable MCP endpoint for AI Agent tool calls',
      'Finalize zero-latency local workspace cache',
      'Record interactive demo walkthrough for Alexa+ track'
    ],
    constraints: [
      'Zero external keys exposed on client side',
      'Full offline fallback when network is degraded'
    ],
    deadline: '2026-10-28',
    status: 'ACTIVE',
    health: 91,
    lastUpdated: '34m ago',
    lastUpdatedISO: '2026-10-10T06:01:00Z',
    accentColor: 'coral'
  },
  {
    id: 'PRJ-LEARNING-ROADMAP',
    name: 'Learning Roadmap',
    slug: 'learning-roadmap',
    description: 'Systematic study of distributed consensus, memory graph indexing, and agentic workflows.',
    goals: [
      'Master Raft and Paxos log replication mechanics',
      'Implement custom HNSW vector quantization algorithms',
      'Complete Alexa+ companion architectural spec'
    ],
    constraints: [
      'Allocate 6 hours/week dedicated study sessions'
    ],
    deadline: '2026-12-01',
    status: 'PLANNING',
    health: 88,
    lastUpdated: '2h ago',
    lastUpdatedISO: '2026-10-10T04:35:00Z',
    accentColor: 'emerald'
  }
];

export const INITIAL_MEMORIES: Memory[] = [
  {
    id: 'MEM-1041',
    title: 'Hybrid episodic graph memory chosen over raw vector store',
    content: 'Determined that pure vector cosine similarity causes associative hallucinations across temporally distinct events. Graph topology preserves causal ordering and superseding relationships.',
    type: 'DECISION',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-10-02T16:20:00Z',
    source: 'USER_EXPLICIT',
    confidence: 98,
    validity: 'CURRENT',
    relatedMemoryIds: ['MEM-1042', 'MEM-1045'],
    tags: ['architecture', 'graph-rag', 'temporal']
  },
  {
    id: 'MEM-1042',
    title: 'Latency constraint of 85ms for retrieval pipeline',
    content: 'Contextual retrieval pipeline must return scored candidate memories within 85ms to satisfy voice conversational turn deadlines in Alexa+ integration.',
    type: 'FACT',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    createdAt: '2026-09-18T14:30:00Z',
    updatedAt: '2026-09-18T14:30:00Z',
    source: 'USER_EXPLICIT',
    confidence: 95,
    validity: 'CURRENT',
    relatedMemoryIds: ['MEM-1041'],
    tags: ['latency', 'sla', 'alexa-plus']
  },
  {
    id: 'MEM-1043',
    title: 'Superseded: Initial plan to use pure Redis semantic cache',
    content: 'Original proposal was to use Redis with vector search modules for short-term memory caching. Superseded because Redis lacks native directed acyclic graph lineage tracking.',
    type: 'DECISION',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    createdAt: '2026-08-10T09:15:00Z',
    updatedAt: '2026-09-14T10:05:00Z',
    source: 'USER_EXPLICIT',
    confidence: 90,
    validity: 'SUPERSEDED',
    supersededBy: 'MEM-1041',
    relatedMemoryIds: ['MEM-1041'],
    tags: ['redis', 'deprecated', 'cache']
  },
  {
    id: 'MEM-1044',
    title: 'User prefers concise technical summaries without conversational preamble',
    content: 'The user prefers assistant answers to lead immediately with the core rationale, supporting memory IDs, and zero conversational pleasantries.',
    type: 'PREFERENCE',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    createdAt: '2026-09-22T11:45:00Z',
    updatedAt: '2026-09-22T11:45:00Z',
    source: 'CONVERSATION',
    confidence: 99,
    validity: 'CURRENT',
    relatedMemoryIds: [],
    tags: ['persona', 'preferences', 'voice-tone']
  },
  {
    id: 'MEM-1045',
    title: 'Embeddings dimension mismatch in staging pipeline',
    content: 'Decision DEC-02 specifies 768-dim embeddings for lightweight edge execution, but the document ingest pipeline is generating 1536-dim embeddings. Needs normalization.',
    type: 'INSIGHT',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    createdAt: '2026-10-06T08:20:00Z',
    updatedAt: '2026-10-08T14:10:00Z',
    source: 'AI_INFERENCE',
    confidence: 84,
    validity: 'UNCERTAIN',
    relatedMemoryIds: ['MEM-1041'],
    tags: ['embeddings', 'conflict', 'dimensions']
  },
  {
    id: 'MEM-1046',
    title: 'Zero client-side secrets architecture for server-side AI integrations',
    content: 'All communication with LLM providers or cloud vector stores must pass through server-side proxy routers with strict Bearer authentication.',
    type: 'FACT',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    createdAt: '2026-09-29T13:00:00Z',
    updatedAt: '2026-09-29T13:00:00Z',
    source: 'USER_EXPLICIT',
    confidence: 100,
    validity: 'CURRENT',
    relatedMemoryIds: ['MEM-1047'],
    tags: ['security', 'server-side', 'zero-secrets']
  },
  {
    id: 'MEM-1047',
    title: 'Streamable MCP Protocol adopted for tool execution',
    content: 'Agreed on Model Context Protocol (MCP) streamable HTTP endpoints for external agent tool invocations, allowing Alexa+ to trigger memory queries seamlessly.',
    type: 'DECISION',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    createdAt: '2026-10-01T15:30:00Z',
    updatedAt: '2026-10-01T15:30:00Z',
    source: 'USER_EXPLICIT',
    confidence: 97,
    validity: 'CURRENT',
    relatedMemoryIds: ['MEM-1046'],
    tags: ['mcp', 'tools', 'alexa-plus']
  },
  {
    id: 'MEM-1048',
    title: 'Complete 3 Raft consensus implementations by October 18',
    content: 'Commitment to finish coding the Leader Election, Log Replication, and Safety invariants in the distributed systems study track.',
    type: 'COMMITMENT',
    projectId: 'PRJ-LEARNING-ROADMAP',
    projectName: 'Learning Roadmap',
    createdAt: '2026-10-03T09:00:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
    source: 'USER_EXPLICIT',
    confidence: 100,
    validity: 'CURRENT',
    relatedMemoryIds: [],
    tags: ['distributed-systems', 'consensus']
  },
  {
    id: 'MEM-1049',
    title: 'Benchmarked HNSW search with 99.4% recall at 12ms',
    content: 'Evaluated Hierarchical Navigable Small World graphs on a 50,000 document test collection with M=16 and efSearch=64.',
    type: 'INSIGHT',
    projectId: 'PRJ-LEARNING-ROADMAP',
    projectName: 'Learning Roadmap',
    createdAt: '2026-10-05T17:15:00Z',
    updatedAt: '2026-10-05T17:15:00Z',
    source: 'CONVERSATION',
    confidence: 92,
    validity: 'CURRENT',
    relatedMemoryIds: ['MEM-1048'],
    tags: ['hnsw', 'indexing', 'benchmarks']
  },
  {
    id: 'MEM-1050',
    title: 'Sprint review with hackathon advisory group on Oct 14',
    content: 'Virtual review scheduled with hackathon mentors to demo the temporal conflict detection visualizer.',
    type: 'EVENT',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    createdAt: '2026-10-07T12:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
    source: 'USER_EXPLICIT',
    confidence: 95,
    validity: 'CURRENT',
    relatedMemoryIds: [],
    tags: ['event', 'milestone', 'mentorship']
  }
];

export const INITIAL_DECISIONS: Decision[] = [
  {
    id: 'DEC-301',
    title: 'Adopt Hybrid Episodic Graph Memory Architecture',
    rationale: 'Pure vector similarity lacks causal ordering and temporal decay tracking. Combining a directed acyclic graph for decision lineage with local vector embeddings enables exact provenance.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    createdAt: '2026-09-14T10:00:00Z',
    updatedAt: '2026-10-02T16:20:00Z',
    status: 'CURRENT',
    supersedesDecisionId: 'DEC-298',
    sourceMemoryIds: ['MEM-1041', 'MEM-1042'],
    changeExplanation: 'Superseded flat semantic caching when tests showed 28% drift in multi-turn reasoning.',
    alternativesConsidered: ['Pure Qdrant vector database', 'SQLite relational schema without graph edges'],
    impactAssessment: 'Sub-85ms search latency achieved; enables exact conflict detection between contradictory notes.'
  },
  {
    id: 'DEC-298',
    title: 'Use Redis In-Memory Semantic Cache for Fast Lookups',
    rationale: 'Wanted the lowest possible retrieval latency (<15ms) for recent conversational turns.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    createdAt: '2026-08-10T09:15:00Z',
    updatedAt: '2026-09-14T10:05:00Z',
    status: 'SUPERSEDED',
    supersededBy: 'DEC-301',
    sourceMemoryIds: ['MEM-1043'],
    changeExplanation: 'Discontinued due to lack of relational DAG support for decision dependencies.',
    alternativesConsidered: ['Memcached', 'In-process LRU cache'],
    impactAssessment: 'Decommissioned from main path. Retained only as ephemeral session scratchpad.'
  },
  {
    id: 'DEC-302',
    title: 'Standardize on Model Context Protocol (MCP) Streamable Endpoints',
    rationale: 'MCP provides a standardized JSON-RPC contract that Alexa+ and agentic AI systems can call as external tools without custom SDK lock-in.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    createdAt: '2026-10-01T15:30:00Z',
    updatedAt: '2026-10-01T15:30:00Z',
    status: 'CURRENT',
    sourceMemoryIds: ['MEM-1046', 'MEM-1047'],
    alternativesConsidered: ['Custom REST webhook API', 'GraphQL subscriptions'],
    impactAssessment: 'Ensures zero-code tool discovery for Alexa+ assistant skills.'
  },
  {
    id: 'DEC-303',
    title: 'Deterministic Retrieval First Before Generative Synthesis',
    rationale: 'Avoid hallucinated memories by querying verified local records and structuring the prompt context deterministically before delegating to LLM reasoning.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    createdAt: '2026-10-04T11:00:00Z',
    updatedAt: '2026-10-04T11:00:00Z',
    status: 'CURRENT',
    sourceMemoryIds: ['MEM-1044', 'MEM-1046'],
    alternativesConsidered: ['Zero-shot system prompting without deterministic search'],
    impactAssessment: '100% accuracy on user commitment queries and decision provenance.'
  },
  {
    id: 'DEC-304',
    title: 'PostgreSQL Relational Storage for Distributed Replicas',
    rationale: 'Study track decision to model multi-tenant memory stores with row-level security and JSONB vector attributes.',
    projectId: 'PRJ-LEARNING-ROADMAP',
    projectName: 'Learning Roadmap',
    createdAt: '2026-09-25T14:00:00Z',
    updatedAt: '2026-09-25T14:00:00Z',
    status: 'CURRENT',
    sourceMemoryIds: ['MEM-1048'],
    alternativesConsidered: ['Cassandra', 'MongoDB'],
    impactAssessment: 'Provides ACID guarantees for multi-agent write synchronization.'
  }
];

export const INITIAL_COMMITMENTS: Commitment[] = [
  {
    id: 'COM-201',
    title: 'Resolve embedding dimension conflict in ingest pipeline',
    description: 'Ensure document ingest and semantic graph both use unified 768-dim embeddings.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    dueDate: '2026-10-12',
    priority: 'HIGH',
    status: 'OPEN',
    sourceMemoryId: 'MEM-1045',
    createdAt: '2026-10-06T09:00:00Z'
  },
  {
    id: 'COM-202',
    title: 'Implement MCP tool definitions for memory search and capture',
    description: 'Write JSON Schema specs for search_memories, record_decision, and retrieve_context.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    dueDate: '2026-10-14',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    sourceMemoryId: 'MEM-1047',
    createdAt: '2026-10-02T10:00:00Z'
  },
  {
    id: 'COM-203',
    title: 'Benchmark latency budget on simulated 100k token graph',
    description: 'Run 50 iterations measuring sub-85ms response time on local memory retrieval.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    dueDate: '2026-10-09',
    priority: 'HIGH',
    status: 'OPEN', // Overdue relative to current time 2026-10-10!
    sourceMemoryId: 'MEM-1042',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'COM-204',
    title: 'Complete Raft leader election implementation and test suite',
    description: 'Implement election timer randomize logic, RequestVote RPC handlers, and term updates.',
    projectId: 'PRJ-LEARNING-ROADMAP',
    projectName: 'Learning Roadmap',
    dueDate: '2026-10-18',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    sourceMemoryId: 'MEM-1048',
    createdAt: '2026-10-03T09:30:00Z'
  },
  {
    id: 'COM-205',
    title: 'Record Alexa+ voice walkthrough video demonstration',
    description: 'Screen recording showing voice queries hitting CONTEXTOS memory intelligence engine.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    dueDate: '2026-10-25',
    priority: 'MEDIUM',
    status: 'OPEN',
    createdAt: '2026-10-05T14:00:00Z'
  },
  {
    id: 'COM-206',
    title: 'Draft architecture diagram for Alexa+ & MCP integration',
    description: 'Detailed flow chart showing user utterance -> Alexa+ -> CONTEXTOS MCP tool calls.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    dueDate: '2026-10-08',
    priority: 'LOW',
    status: 'COMPLETED',
    createdAt: '2026-09-30T16:00:00Z',
    completedAt: '2026-10-08T17:30:00Z'
  }
];

export const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'ACT-901',
    type: 'CONFLICT_DETECTED',
    title: 'Conflict Detected: Embedding Dimension Inconsistency',
    description: 'DEC-02 expects 768-dim embeddings, but incoming documents flagged 1536-dim vectors.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    timestamp: '14m ago',
    timestampISO: '2026-10-10T06:21:00Z',
    relatedId: 'MEM-1045',
    severity: 'alert'
  },
  {
    id: 'ACT-902',
    type: 'COMMITMENT_COMPLETED',
    title: 'Commitment Completed: MCP Architecture Flow',
    description: 'Finalized architectural diagram for MCP agentic tool interface.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    timestamp: '2h ago',
    timestampISO: '2026-10-10T04:35:00Z',
    relatedId: 'COM-206',
    severity: 'success'
  },
  {
    id: 'ACT-903',
    type: 'DECISION_UPDATED',
    title: 'Decision Recorded: MCP Streamable Protocol',
    description: 'Adopted standardized Model Context Protocol for zero-overhead Alexa+ integration.',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    timestamp: '5h ago',
    timestampISO: '2026-10-10T01:35:00Z',
    relatedId: 'DEC-302',
    severity: 'info'
  },
  {
    id: 'ACT-904',
    type: 'MEMORY_CREATED',
    title: 'Memory Captured: HNSW 99.4% Recall Benchmark',
    description: 'Stored empirical results from local vector quantization testing.',
    projectId: 'PRJ-LEARNING-ROADMAP',
    projectName: 'Learning Roadmap',
    timestamp: '1d ago',
    timestampISO: '2026-10-09T06:35:00Z',
    relatedId: 'MEM-1049',
    severity: 'info'
  },
  {
    id: 'ACT-905',
    type: 'DECISION_SUPERSEDED',
    title: 'Decision Superseded: Redis Semantic Cache',
    description: 'DEC-298 marked superseded by DEC-301 due to absence of causal DAG lineage.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    timestamp: '2d ago',
    timestampISO: '2026-10-08T06:35:00Z',
    relatedId: 'DEC-301',
    severity: 'warning'
  },
  {
    id: 'ACT-906',
    type: 'CONTEXT_LINKED',
    title: 'Context Linked: Alexa+ track dependencies',
    description: 'Tied latency budget constraint (MEM-1042) to MCP tool response SLA (MEM-1047).',
    projectId: 'PRJ-PRODUCT-LAUNCH',
    projectName: 'Product Launch',
    timestamp: '3d ago',
    timestampISO: '2026-10-07T06:35:00Z',
    relatedId: 'MEM-1042',
    severity: 'info'
  }
];

export const INITIAL_CONFLICTS: MemoryConflict[] = [
  {
    id: 'CONF-01',
    title: 'Embedding Dimension Inconsistency',
    description: 'Memory MEM-1041 specifies lightweight 768-dimension vectors for edge runtime, but ingest configuration MEM-1045 generated 1536-dimension embeddings.',
    projectId: 'PRJ-AI-RESEARCH',
    projectName: 'AI Research Project',
    memoryIdA: 'MEM-1041',
    memoryIdB: 'MEM-1045',
    status: 'UNRESOLVED',
    detectedAt: '2026-10-08T14:10:00Z',
    severity: 'confirmed',
    conflictType: 'PARAMETER',
    recommendedAction: 'Standardize ingest configuration on 768-dim models or mark MEM-1045 as superseded.'
  }
];
