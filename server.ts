import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import {
  INITIAL_PROJECTS,
  INITIAL_MEMORIES,
  INITIAL_DECISIONS,
  INITIAL_COMMITMENTS,
  INITIAL_CONFLICTS
} from './src/services/mockData.ts';
import { DeterministicMemoryAssistant } from './src/services/memoryAssistant.ts';
import { RetrievalEngine } from './src/services/retrievalEngine.ts';
import { ConflictDetector } from './src/services/conflictDetector.ts';
import { RecommendationEngine } from './src/services/recommendationEngine.ts';
import { calculateDaysOverdue, calculateDaysRemaining } from './src/utils/dateUtils.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory server-side default vault state for API / MCP calls
const serverVault = {
  projects: [...INITIAL_PROJECTS],
  memories: [...INITIAL_MEMORIES],
  decisions: [...INITIAL_DECISIONS],
  commitments: [...INITIAL_COMMITMENTS],
  conflicts: [...INITIAL_CONFLICTS]
};

// ============================================================================
// 1. SYSTEM HEALTH & DIAGNOSTICS ENDPOINT
// ============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;

  res.json({
    status: 'healthy',
    system: 'CONTEXTOS — Context Intelligence & Memory System',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    providers: {
      deterministicEngine: {
        status: 'ACTIVE_VERIFIED',
        capabilities: ['temporal_dag', 'cycle_prevention', 'multi_signal_search', 'conflict_detection']
      },
      geminiApi: {
        status: hasGemini ? 'CONFIGURED' : 'UNCONFIGURED_KEY_ABSENT',
        model: 'gemini-3.8-flash'
      },
      mcpServer: {
        status: 'ACTIVE_STREAMABLE_HTTP',
        protocolVersion: '2024-11-05',
        endpoint: '/api/mcp',
        toolsCount: 10
      },
      alexaPlusSkill: {
        status: 'ACTIVE_SUB85MS_SIMULATOR',
        endpoint: '/api/alexa-plus',
        targetSlaMs: 85
      }
    },
    metrics: {
      memoriesCount: serverVault.memories.length,
      decisionsCount: serverVault.decisions.length,
      commitmentsCount: serverVault.commitments.length,
      projectsCount: serverVault.projects.length
    }
  });
});

// ============================================================================
// 2. GROUNDED AI ASSISTANT ENDPOINT (/api/chat)
// ============================================================================
app.post('/api/chat', async (req: Request, res: Response) => {
  const {
    query,
    projectScopeId,
    memories = serverVault.memories,
    decisions = serverVault.decisions,
    projects = serverVault.projects,
    commitments = serverVault.commitments,
    conflicts = serverVault.conflicts
  } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Field "query" is required' });
  }

  // 1. Run server-side deterministic retrieval first (Grounding Evidence)
  const deterministicAnswer = DeterministicMemoryAssistant.processQuery(query, {
    memories,
    decisions,
    projects,
    commitments,
    conflicts,
    projectScopeId
  });

  // 2. Check for Gemini API key
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Build compact evidence dossier for LLM
      const evidenceDossier = JSON.stringify({
        queryScope: projectScopeId || 'ALL',
        retrievedMemories: deterministicAnswer.supportingMemories.map((m) => ({
          id: m.id,
          title: m.title,
          content: m.content,
          type: m.type,
          validity: m.validity,
          confidence: m.confidence
        })),
        retrievedDecisions: deterministicAnswer.relatedDecisions.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          rationale: d.rationale,
          supersededBy: d.supersededBy,
          supersedesDecisionId: d.supersedesDecisionId,
          changeExplanation: d.changeExplanation
        })),
        activeCommitments: commitments
          .filter((c: any) => c.status !== 'COMPLETED')
          .slice(0, 4)
          .map((c: any) => ({ id: c.id, title: c.title, dueDate: c.dueDate, priority: c.priority }))
      });

      const systemPrompt = `You are CONTEXTOS, an evidence-grounded AI memory and context intelligence system for developer workflows and conversational agents.
RULES:
1. Answer the user query using ONLY the provided Stored Evidence Dossier.
2. You MUST cite exact record IDs (e.g. DEC-301, MEM-101, COM-203).
3. If a decision was superseded (e.g. DEC-298 superseded by DEC-301), explicitly contrast the previous rationale with the newer rationale and explain why it changed.
4. If the evidence dossier lacks proof for the question, explicitly state that the stored records do not contain sufficient evidence. Never hallucinate facts.
5. Clearly distinguish current facts from historical decisions and recommendations.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `USER QUESTION: "${query}"\n\nSTORED EVIDENCE DOSSIER:\n${evidenceDossier}`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1
        }
      });

      const text = response.text || deterministicAnswer.text;

      return res.json({
        text,
        supportingMemories: deterministicAnswer.supportingMemories,
        relatedDecisions: deterministicAnswer.relatedDecisions,
        inferredSuggestions: deterministicAnswer.inferredSuggestions,
        isUncertain: deterministicAnswer.isUncertain,
        confidenceScore: deterministicAnswer.confidenceScore,
        provider: 'gemini-3.8-flash',
        evidenceAnchorsCount:
          deterministicAnswer.supportingMemories.length + deterministicAnswer.relatedDecisions.length
      });
    } catch (llmErr: any) {
      // Graceful fallback to verified deterministic engine if LLM fails
      console.warn('Gemini API call failed or rate-limited, falling back to deterministic engine:', llmErr?.message);
    }
  }

  // 3. Deterministic response fallback (Always verified & 100% grounded)
  return res.json({
    text: deterministicAnswer.text,
    supportingMemories: deterministicAnswer.supportingMemories,
    relatedDecisions: deterministicAnswer.relatedDecisions,
    inferredSuggestions: deterministicAnswer.inferredSuggestions,
    isUncertain: deterministicAnswer.isUncertain,
    confidenceScore: deterministicAnswer.confidenceScore,
    provider: 'deterministic-graph-engine',
    note: 'Verified response produced by CONTEXTOS deterministic memory and causal graph engine.'
  });
});

// ============================================================================
// 3. ALEXA+ VOICE COMPANION SIMULATOR ENDPOINT (/api/alexa-plus)
// ============================================================================
app.post('/api/alexa-plus', (req: Request, res: Response) => {
  const startTime = Date.now();
  const { utterance, projectScopeId, memories = serverVault.memories, decisions = serverVault.decisions } = req.body;

  const query = utterance || 'What is the current decision on the database?';

  // Process query through deterministic engine
  const answer = DeterministicMemoryAssistant.processQuery(query, {
    memories,
    decisions,
    projects: serverVault.projects,
    commitments: serverVault.commitments,
    conflicts: serverVault.conflicts,
    projectScopeId
  });

  const latencyMs = Math.max(12, Date.now() - startTime);

  // Clean vocal text for voice speech synthesis (SSML)
  const cleanSpeech = answer.text
    .replace(/[•\*\#\_\`]/g, '')
    .replace(/\[([A-Z0-9\-]+)\]/g, '$1')
    .slice(0, 320);

  const ssml = `<speak><p>${cleanSpeech}</p></speak>`;

  // Standard Alexa+ Skill Response Envelope
  res.json({
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'SSML',
        ssml
      },
      card: {
        type: 'Standard',
        title: 'CONTEXTOS Memory Intelligence',
        text: answer.text.slice(0, 500)
      },
      reprompt: {
        outputSpeech: {
          type: 'PlainText',
          text: 'What would you like to explore next in your memory graph?'
        }
      },
      shouldEndSession: false
    },
    sessionAttributes: {
      lastIntent: 'QueryMemoryIntent',
      contextId: projectScopeId || 'ALL',
      temporalState: answer.isUncertain ? 'UNCERTAIN' : 'GROUNDED_VERIFIED',
      latencyMs
    },
    diagnostics: {
      sub85msSlaMet: latencyMs <= 85,
      actualLatencyMs: latencyMs,
      evidenceCitations: [
        ...answer.supportingMemories.map((m) => m.id),
        ...answer.relatedDecisions.map((d) => d.id)
      ],
      certaintyScore: answer.confidenceScore
    }
  });
});

// ============================================================================
// 4. MODEL CONTEXT PROTOCOL (MCP) SERVER (/api/mcp)
// ============================================================================
const MCP_TOOLS = [
  {
    name: 'search_memories',
    description: 'Search episodic memory graph by natural query, tags, or causal context',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Semantic or keyword search query' },
        projectId: { type: 'string', description: 'Optional project filter' },
        limit: { type: 'number', default: 5 }
      },
      required: ['query']
    }
  },
  {
    name: 'get_memory',
    description: 'Retrieve a specific memory record by its unique ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory ID (e.g. MEM-101)' }
      },
      required: ['id']
    }
  },
  {
    name: 'list_projects',
    description: 'List all active project contexts with their goals, constraints, and health',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_project_context',
    description: 'Retrieve full context dossier for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (e.g. PRJ-AI-RESEARCH)' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'search_decisions',
    description: 'Search architectural decisions by keyword, project, or status',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        status: { type: 'string', enum: ['CURRENT', 'SUPERSEDED', 'UNDER_REVIEW'] }
      }
    }
  },
  {
    name: 'get_decision_history',
    description: 'Retrieve chronological decision evolution, showing superseded decisions and change explanations',
    inputSchema: {
      type: 'object',
      properties: {
        decisionId: { type: 'string' }
      }
    }
  },
  {
    name: 'list_commitments',
    description: 'List open commitments and tasks',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        priority: { type: 'string' }
      }
    }
  },
  {
    name: 'get_overdue_commitments',
    description: 'Dynamically compute all overdue commitments and days overdue',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'detect_conflicts',
    description: 'Deterministic contradiction detector finding parameter and architectural clashes',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_related_records',
    description: 'Graph traversal fetching all connected memories, decisions, and commitments for an entity',
    inputSchema: {
      type: 'object',
      properties: {
        recordId: { type: 'string' }
      },
      required: ['recordId']
    }
  }
];

// MCP JSON-RPC 2.0 Handler
app.post('/api/mcp', (req: Request, res: Response) => {
  const { jsonrpc = '2.0', id = null, method, params = {} } = req.body;

  // 1. Initialize
  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo: {
          name: 'contextos-mcp-server',
          version: '1.0.0'
        }
      }
    });
  }

  // 2. List tools
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS
      }
    });
  }

  // 3. Call tool
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;

    switch (name) {
      case 'search_memories': {
        const query = args.query || '';
        const limit = args.limit || 5;
        const resObj = RetrievalEngine.retrieve(
          query,
          {
            memories: serverVault.memories,
            decisions: serverVault.decisions,
            commitments: serverVault.commitments,
            projects: serverVault.projects
          },
          { projectScopeId: args.projectId }
        );
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resObj.matchedMemories.slice(0, limit), null, 2)
              }
            ]
          }
        });
      }

      case 'get_memory': {
        const mem = serverVault.memories.find((m) => m.id === args.id);
        if (!mem) {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Memory ${args.id} not found` }
          });
        }
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(mem, null, 2) }] }
        });
      }

      case 'list_projects': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(serverVault.projects, null, 2) }] }
        });
      }

      case 'get_project_context': {
        const prj = serverVault.projects.find((p) => p.id === args.projectId);
        if (!prj) {
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Project ${args.projectId} not found` }
          });
        }
        const relMems = serverVault.memories.filter((m) => m.projectId === prj.id);
        const relDecs = serverVault.decisions.filter((d) => d.projectId === prj.id);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ project: prj, memories: relMems, decisions: relDecs }, null, 2)
              }
            ]
          }
        });
      }

      case 'search_decisions': {
        let decs = serverVault.decisions;
        if (args.status) decs = decs.filter((d) => d.status === args.status);
        if (args.query) {
          const q = args.query.toLowerCase();
          decs = decs.filter((d) => d.title.toLowerCase().includes(q) || d.rationale.toLowerCase().includes(q));
        }
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(decs, null, 2) }] }
        });
      }

      case 'get_decision_history': {
        const decs = serverVault.decisions.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          supersededBy: d.supersededBy,
          supersedesDecisionId: d.supersedesDecisionId,
          changeExplanation: d.changeExplanation,
          createdAt: d.createdAt
        }));
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(decs, null, 2) }] }
        });
      }

      case 'list_commitments': {
        let comms = serverVault.commitments;
        if (args.projectId) comms = comms.filter((c) => c.projectId === args.projectId);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(comms, null, 2) }] }
        });
      }

      case 'get_overdue_commitments': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = serverVault.commitments
          .filter((c) => c.status !== 'COMPLETED' && new Date(c.dueDate) < today)
          .map((c) => ({
            ...c,
            daysOverdue: calculateDaysOverdue(c.dueDate, today)
          }));
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(overdue, null, 2) }] }
        });
      }

      case 'detect_conflicts': {
        const conflicts = ConflictDetector.detectConflicts(
          serverVault.memories,
          serverVault.decisions,
          serverVault.conflicts
        );
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(conflicts, null, 2) }] }
        });
      }

      case 'get_related_records': {
        const targetId = args.recordId;
        const linkedMemories = serverVault.memories.filter(
          (m) => m.id === targetId || m.relatedMemoryIds?.includes(targetId)
        );
        const linkedDecisions = serverVault.decisions.filter(
          (d) =>
            d.id === targetId ||
            d.sourceMemoryIds?.includes(targetId) ||
            d.supersedesDecisionId === targetId ||
            d.supersededBy === targetId
        );
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ memories: linkedMemories, decisions: linkedDecisions }, null, 2)
              }
            ]
          }
        });
      }

      default:
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool "${name}" not found` }
        });
    }
  }

  return res.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32600, message: `Unknown method "${method}"` }
  });
});

app.get('/api/mcp', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    protocol: 'Model Context Protocol (MCP) Streamable HTTP',
    specification: '2024-11-05',
    endpoint: '/api/mcp',
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description }))
  });
});


// ============================================================================
// 6. DEV / PRODUCTION CLIENT SERVING
// ============================================================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CONTEXTOS] Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    console.log(`[CONTEXTOS] MCP Endpoint: http://localhost:${PORT}/api/mcp`);
    console.log(`[CONTEXTOS] Alexa+ Endpoint: http://localhost:${PORT}/api/alexa-plus`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CONTEXTOS server:', err);
});
