# CONTEXTOS — Context Intelligence & Memory System

> **Tagline**: *"Remember what matters. Understand what changed. Act with context."*

CONTEXTOS is an evidence-grounded context intelligence and temporal memory platform engineered for complex software architecture, developer decisions, and conversational AI companions. Unlike conventional chatbots that treat memory as a flat cache or context window appendage, CONTEXTOS models knowledge as a **directed causal acyclic graph (DAG)** that tracks decision supersession, timestamped facts, dynamic commitment deadlines, and semantic conflicts with full provenance and source citation.

Built for the **Amazon Developer Hackathon 2026** (supporting the **Alexa+** voice assistant track and the **Model Context Protocol (MCP)** specification), with optional server-side **Google Gemini** grounding and 100% deterministic local intelligence requiring zero external paid subscriptions.

---

## 1. Core Capabilities

1. **Temporal Memory Engine & DAG Lineage**:
   - Preserves historical records when decisions change.
   - Strictly enforces cycle prevention ($A \to B \to C \not\to A$).
   - Immutable ISO creation timestamps (`createdAt`, `createdAtISO`) and dynamic relative time formatting.
   - Lifecycle states: `CURRENT`, `SUPERSEDED`, `UNCERTAIN`, `ARCHIVED`.

2. **Decision Evolution & Supersession**:
   - When a decision evolves (e.g. migrating from Redis key-value cache `DEC-298` to Causal Graph Memory `DEC-301`), the predecessor decision is preserved as `SUPERSEDED` and explicitly linked to the successor decision with recorded change rationale.

3. **Deterministic Memory Assistant & Hybrid AI Grounding**:
   - Distinguishes current vs. historical data, uncertain facts, inferences, and knowledge gaps.
   - Answers ten core architectural and operational questions with verified source references.
   - Server-side grounding proxy (`/api/chat`): Provides an Evidence Dossier to Google Gemini (`gemini-3.8-flash`) when configured, with an instant, verified fallback to the deterministic engine.

4. **Dynamic Commitment & Deadline Monitoring**:
   - Automatically computes overdue days relative to the current clock date.
   - Tracks priority levels (`HIGH`, `MEDIUM`, `LOW`) and project milestones.

5. **Deterministic Conflict & Contradiction Detection**:
   - Identifies vector dimension mismatches (e.g. 768-dim embeddings vs. 1536-dim vector index) and commitment delivery deadlines exceeding project milestones.
   - Supports 1-click resolution and audit trail logging.

6. **Model Context Protocol (MCP) Streamable HTTP Server (`/api/mcp`)**:
   - Full JSON-RPC 2.0 implementation adhering to MCP Specification `2024-11-05`.
   - Exposes 10 real tools: `search_memories`, `get_memory`, `list_projects`, `get_project_context`, `search_decisions`, `get_decision_history`, `list_commitments`, `get_overdue_commitments`, `detect_conflicts`, `get_related_records`.

7. **Alexa+ Sub-85ms Voice Companion Simulator (`/api/alexa-plus`)**:
   - Real-time conversational agent endpoint returning Alexa Skills Kit (ASK) response envelopes.
   - Renders clean SSML vocal tags (`<speak><p>...</p></speak>`), structured visual cards, reprompts, session attributes, and latency diagnostics meeting the sub-85ms SLA.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Motion.
- **Backend**: Node.js, Express 4, tsx runtime.
- **AI SDK**: `@google/genai` (Google GenAI TypeScript SDK) running server-side (`server.ts`).
- **Protocols & Standards**: Model Context Protocol (MCP JSON-RPC 2.0 Streamable HTTP), Alexa Skills Kit (ASK SSML).
- **Testing**: Dedicated test harness running 105 automated unit and end-to-end integration tests via `tsx tests/contextos.test.ts`.

---

## 3. Architecture

```
                                  ┌─────────────────────────────┐
                                  │   Alexa+ Voice Simulator   │  (ASK SSML, <85ms SLA)
                                  └──────────────┬──────────────┘
                                                 │
┌───────────────────────────┐     ┌──────────────┴──────────────┐     ┌────────────────────────────┐
│   Cursor / Claude / IDE   │────▶│    Model Context Protocol   │◀────│ CONTEXTOS React Web UI     │
│   (MCP JSON-RPC 2.0)      │     │      Streamable HTTP        │     │ (Mission Control, Graph,   │
└───────────────────────────┘     │        (/api/mcp)           │     │  Timeline, Assistant)      │
                                  └──────────────┬──────────────┘     └─────────────┬──────────────┘
                                                 │                                  │
                                  ┌──────────────┴──────────────┐                   │
                                  │   Express Server: server.ts  │◀──────────────────┘
                                  │   (/api/chat, /api/health)  │
                                  └──────────────┬──────────────┘
                                                 │
                    ┌────────────────────────────┴───────────────────────────┐
                    │                                                        │
     ┌──────────────▼─────────────┐                           ┌──────────────▼─────────────┐
     │ Grounded LLM Provider      │                           │ Deterministic Graph Engine  │
     │ - Google Gemini 3.8 Flash  │                           │ - Causal DAG Lineage        │
     │ (Server-side proxy only)   │                           │ - Cycle Prevention (DFS)    │
     └────────────────────────────┘                           │ - Conflict Detector         │
                                                              │ - Scored Multi-Signal Search│
                                                              └────────────────────────────┘
```

---

## 4. Prerequisites & Installation

### Prerequisites
- Node.js version 18.x or higher (Node 20+ recommended)
- npm version 9.x or higher

### Installation
Clone or navigate to the project directory and install dependencies:

```bash
npm install
```

---

## 5. Configuration & Environment Variables

Copy `.env.example` to `.env` (or let AI Studio inject values automatically):

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local HTTP server port | `3000` |
| `GEMINI_API_KEY` | Google Gemini API key for server-side `/api/chat` grounding | Injected in AI Studio |

*Zero Paid Cloud Requirement: CONTEXTOS does not require AWS credentials or paid subscriptions. All core engines run 100% locally with high precision.*

---

## 6. Running the Application

### Development Mode (Full-Stack Express + Vite)
```bash
npm run dev
```
Starts the server at `http://localhost:3000` with hot client serving and live API endpoints:
- Web Application: `http://localhost:3000`
- System Diagnostics: `http://localhost:3000/api/health`
- MCP Streamable HTTP: `http://localhost:3000/api/mcp`
- Alexa+ Endpoint: `http://localhost:3000/api/alexa-plus`

---

## 7. Model Context Protocol (MCP) Setup

CONTEXTOS exposes a Streamable HTTP MCP server at `/api/mcp`.

### Configure with Claude Desktop or Cursor
Add the following to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "contextos": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### Available MCP Tools:
1. `search_memories`: Semantic and keyword search across memories.
2. `get_memory`: Fetch specific memory record by ID (e.g. `MEM-101`).
3. `list_projects`: Return all registered project contexts.
4. `get_project_context`: Return comprehensive project dossier with memories and decisions.
5. `search_decisions`: Filter decisions by status (`CURRENT`, `SUPERSEDED`) or keywords.
6. `get_decision_history`: Retrieve chronological decision lineage with supersede links.
7. `list_commitments`: Filter commitments by project and priority.
8. `get_overdue_commitments`: Return commitments with calculated days overdue.
9. `detect_conflicts`: Run deterministic contradiction analysis across stored records.
10. `get_related_records`: Traverse graph edges for an entity ID.

---

## 8. Alexa+ Implementation & Verification Status

- **Status**: Implemented as high-performance sub-85ms voice assistant simulator (`/api/alexa-plus`) with full ASK envelope compliance and integrated live tester in the Settings page.
- **Speech Synthesis**: Cleans markdown formatting into clean vocal text wrapped in `<speak><p>...</p></speak>` SSML tags.
- **Target SLA**: Benchmarked under 85ms processing latency.

---

## 10. Demonstration Guide (Under 3 Minutes)

Follow this 9-step reproducible walkthrough for hackathon and technical evaluation:

- **Scene 1 (Project & Decision Creation)**: Navigate to **Projects**, select **AI Research Project**. Switch to **Decision Timeline** and view `DEC-298` (In-Memory Flat Cache).
- **Scene 2 (Supersede Decision)**: In **Decision Timeline**, click **"Supersede Decision"** on `DEC-298`. Enter title: *"Migrate to Causal Episodic Graph Memory"*, state reason: *"Flat cache cannot trace causal lineage"*, and submit.
- **Scene 3 (Preservation & Lineage)**: Observe that `DEC-298` is preserved as `SUPERSEDED` with strikethrough styling and linked directly to the new `CURRENT` decision `DEC-301`.
- **Scene 4 & 5 (Ask Memory Assistant)**: Go to **Memory Assistant**. Select *"Why did the database decision change?"* or type *"What decisions have changed?"*. Observe the response citing `DEC-298` and `DEC-301` with clickable source badges opening the records.
- **Scene 6 (Commitment Deadlines)**: Navigate to **Commitments**. Observe `COM-203` dynamically flagged as **1 day overdue** relative to reference clock.
- **Scene 7 (Conflict Detection)**: Go to **Mission Control**. Observe the detected vector dimension conflict (`MEM-102` 768-dim vs `DEC-301` 1536-dim). Click **"Resolve & Standardize"** and view resolution logged in **Activity History**.
- **Scene 8 (Persistence)**: Refresh the browser window. Verify that all changes (superseded decision, resolved conflict, updated project) remain intact in local storage.
- **Scene 9 (Alexa+ & MCP Diagnostics)**: Navigate to **Settings**. Run the **MCP Tool Execution Test** and the **Alexa+ Skill Voice Test** to inspect real JSON-RPC and SSML payloads in real time.
