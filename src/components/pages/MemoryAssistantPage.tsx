import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  BrainCircuit,
  GitCommit,
  CheckSquare,
  AlertTriangle,
  Lightbulb,
  Cpu,
  Layers,
  ArrowRight,
  BookOpen,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  Filter,
  Clock,
  FolderGit2
} from 'lucide-react';
import {
  ProjectContext,
  Memory,
  Decision,
  Commitment,
  MemoryConflict,
  NavigationPage
} from '../../types';
import {
  DeterministicMemoryAssistant,
  AssistantAnswer
} from '../../services/memoryAssistant';

interface MemoryAssistantPageProps {
  projects: ProjectContext[];
  memories: Memory[];
  decisions: Decision[];
  commitments: Commitment[];
  conflicts: MemoryConflict[];
  onOpenMemory?: (id: string) => void;
  onNavigate?: (page: NavigationPage) => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  answer?: AssistantAnswer;
  provider?: string;
}

export const MemoryAssistantPage: React.FC<MemoryAssistantPageProps> = ({
  projects,
  memories,
  decisions,
  commitments,
  conflicts,
  onOpenMemory,
  onNavigate
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string>('ALL');
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);
  const [selectedMemoryDetail, setSelectedMemoryDetail] = useState<Memory | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSendQuery = (queryText: string) => {
    const q = queryText.trim();
    if (!q || isProcessing) return;

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const runQuery = async () => {
      let answer: AssistantAnswer;
      let providerName = 'deterministic-graph-engine';

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            projectScopeId: selectedContextId,
            memories,
            decisions,
            projects,
            commitments,
            conflicts
          })
        });

        if (res.ok) {
          const data = await res.json();
          answer = {
            text: data.text,
            supportingMemories: data.supportingMemories || [],
            relatedDecisions: data.relatedDecisions || [],
            inferredSuggestions: data.inferredSuggestions || [],
            isUncertain: data.isUncertain ?? false,
            confidenceScore: data.confidenceScore ?? 95
          };
          providerName = data.provider || 'deterministic-graph-engine';
        } else {
          throw new Error('API route unavailable');
        }
      } catch (_err) {
        // Deterministic engine fallback
        answer = DeterministicMemoryAssistant.processQuery(q, {
          memories,
          decisions,
          projects,
          commitments,
          conflicts,
          projectScopeId: selectedContextId
        });
        providerName = 'deterministic-graph-engine';
      }

      const assistantMsg: MessageItem = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: answer.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        answer,
        provider: providerName
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);
    };

    runQuery();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery(inputQuery);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(140, Math.max(44, e.target.scrollHeight))}px`;
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInputQuery('');
    setSelectedMemoryDetail(null);
  };

  const suggestedQuestions = [
    { index: '01', question: 'What decisions have I made about my current project?' },
    { index: '02', question: 'What has changed since my previous plan?' },
    { index: '03', question: 'Which commitments need my attention?' },
    { index: '04', question: 'What should I work on next?' }
  ];

  // Latest assistant response determines contextual records
  const latestAssistantMessage = [...messages].reverse().find((m) => m.sender === 'assistant' && m.answer);
  const activeAnswer = latestAssistantMessage?.answer;

  const relevantMemories = activeAnswer?.supportingMemories?.length
    ? activeAnswer.supportingMemories
    : selectedContextId !== 'ALL'
    ? memories.filter((m) => m.projectId === selectedContextId).slice(0, 4)
    : memories.slice(0, 3);

  const relevantDecisions = activeAnswer?.relatedDecisions?.length
    ? activeAnswer.relatedDecisions
    : selectedContextId !== 'ALL'
    ? decisions.filter((d) => d.projectId === selectedContextId).slice(0, 3)
    : decisions.filter((d) => d.status === 'CURRENT').slice(0, 3);

  const relevantCommitments = selectedContextId !== 'ALL'
    ? commitments.filter((c) => c.projectId === selectedContextId && c.status !== 'COMPLETED').slice(0, 3)
    : commitments.filter((c) => c.status !== 'COMPLETED').slice(0, 3);

  const activeProject = projects.find((p) => p.id === selectedContextId);

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] w-full overflow-hidden bg-[#0E1F2E]">
      {/* A. ASSISTANT HEADER */}
      <div className="bg-[#112436] border-b border-[#26425A] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#C38EB4] font-medium">
              IX — CONTEXT INTELLIGENCE
            </span>
            <span className="text-[#26425A]">·</span>
            <span className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#86AACF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span>
              LOCAL RETRIEVAL · DETERMINISTIC
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h2 className="text-[18px] font-medium text-[#FFFFFF] tracking-tight">
              Memory Assistant
            </h2>
            <span className="text-[13px] text-[#E1CBD7] hidden md:inline">
              — Understand your history. Connect decisions. Find your next step.
            </span>
          </div>
        </div>

        {/* Controls: Context Selector & Actions */}
        <div className="flex items-center gap-2">
          {/* Context Selector */}
          <div className="flex items-center gap-1.5 bg-[#0C1D44] border border-[#26425A] rounded px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#86AACF]" />
            <select
              value={selectedContextId}
              onChange={(e) => setSelectedContextId(e.target.value)}
              className="bg-transparent text-[#FFFFFF] text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">All Memories & Contexts</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#112436]">
                  Context: {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* New Conversation Button */}
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#26425A] text-[#E1CBD7] hover:text-[#FFFFFF] text-xs transition-colors"
              title="Reset current conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Query</span>
            </button>
          )}

          {/* Context Panel Toggle */}
          <button
            onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors ${
              isContextPanelOpen
                ? 'bg-[#0C1D44] text-[#C38EB4] border-[#26425A]'
                : 'bg-[#112436] text-[#86AACF] hover:text-[#FFFFFF] border-[#26425A]'
            }`}
            title={isContextPanelOpen ? 'Collapse context panel' : 'Open context panel'}
          >
            {isContextPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Context Panel</span>
          </button>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* MAIN CONVERSATION AREA */}
        <div className={`flex flex-col flex-1 h-full bg-[#0E1F2E] relative transition-all ${isContextPanelOpen ? 'lg:max-w-[76%]' : 'w-full'}`}>
          {/* Scrollable Conversation Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {messages.length === 0 ? (
              /* EMPTY STATE */
              <div className="max-w-2xl mx-auto my-auto pt-8 pb-12 text-center space-y-6">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#C38EB4]/10 blur-md"></div>
                  <div className="relative w-12 h-12 rounded-xl bg-[#112436] border border-[#26425A] flex items-center justify-center text-[#C38EB4] shadow-inner">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#86AACF] border border-[#0E1F2E]"></div>
                </div>

                <div>
                  <h3 className="text-[21px] font-medium text-[#FFFFFF] tracking-tight">
                    Start with your context.
                  </h3>
                  <p className="text-[13.5px] text-[#E1CBD7] mt-1.5 max-w-lg mx-auto leading-relaxed">
                    Your decisions, memories, and commitments are connected. Ask a question to discover what matters next.
                  </p>
                </div>

                {/* LARGE CONTEXT RETRIEVAL INDEX & GROUNDING HISTOGRAM (SVG) */}
                <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 text-left shadow-sm space-y-3 max-w-xl mx-auto">
                  <div className="flex items-center justify-between pb-2 border-b border-[#26425A] text-xs font-mono">
                    <span className="text-[#FFFFFF] uppercase font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#86AACF]" />
                      RETRIEVAL INDEX FOOTPRINT
                    </span>
                    <span className="text-[#86AACF]">
                      {memories.length + decisions.length + commitments.length + conflicts.length} TOTAL NODES
                    </span>
                  </div>

                  {/* SVG Chart */}
                  {(() => {
                    const indexData = [
                      { label: 'MEMORIES', count: memories.length, color: '#86AACF', sub: 'epistemic facts' },
                      { label: 'DECISIONS', count: decisions.length, color: '#C38EB4', sub: 'active canons' },
                      { label: 'COMMITMENTS', count: commitments.length, color: '#E1CBD7', sub: 'tracked SLAs' },
                      { label: 'CLASH GUARDS', count: conflicts.length, color: '#26425A', sub: 'conflict rules' }
                    ];
                    const maxVal = Math.max(...indexData.map((d) => d.count), 4);

                    return (
                      <div className="h-36 w-full">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 130" preserveAspectRatio="none">
                          {[0, 0.5, 1].map((pct, i) => {
                            const y = 95 - pct * 75;
                            const val = Math.round(pct * maxVal);
                            return (
                              <g key={i}>
                                <line x1="35" y1={y} x2="490" y2={y} stroke="#26425A" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                                <text x="28" y={y + 3.5} textAnchor="end" fill="#86AACF" fontSize="8" fontFamily="monospace">
                                  {val}
                                </text>
                              </g>
                            );
                          })}

                          <line x1="35" y1="15" x2="35" y2="95" stroke="#26425A" strokeWidth="1" />
                          <line x1="35" y1="95" x2="490" y2="95" stroke="#26425A" strokeWidth="1" />

                          {indexData.map((d, idx) => {
                            const slotWidth = (490 - 35) / indexData.length;
                            const colX = 35 + idx * slotWidth + slotWidth / 2;
                            const barW = 32;
                            const barH = (d.count / maxVal) * 75;
                            const barY = 95 - barH;

                            return (
                              <g key={d.label}>
                                <rect
                                  x={colX - barW / 2}
                                  y={barY}
                                  width={barW}
                                  height={barH}
                                  fill={d.color}
                                  rx="2"
                                  className="transition-all hover:brightness-125"
                                >
                                  <title>{`${d.label}: ${d.count} (${d.sub})`}</title>
                                </rect>
                                <text
                                  x={colX}
                                  y={barY - 4}
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="9"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {d.count}
                                </text>
                                <text
                                  x={colX}
                                  y="110"
                                  textAnchor="middle"
                                  fill="#E1CBD7"
                                  fontSize="8.5"
                                  fontFamily="monospace"
                                >
                                  {d.label}
                                </text>
                                <text
                                  x={colX}
                                  y="122"
                                  textAnchor="middle"
                                  fill="#86AACF"
                                  fontSize="7.5"
                                  fontFamily="monospace"
                                  opacity="0.8"
                                >
                                  {d.sub}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                {/* 4 Clickable Suggested Question Cards */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                  {suggestedQuestions.map((item) => (
                    <button
                      key={item.index}
                      onClick={() => handleSendQuery(item.question)}
                      className="p-3.5 rounded-sm bg-[#112436] hover:bg-[#152B3F] border border-[#26425A] hover:border-[#86AACF] text-left transition-colors group flex items-start justify-between gap-2 shadow-sm"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-[#86AACF] block mb-1">
                          {item.index}
                        </span>
                        <span className="text-[13px] text-[#FFFFFF] leading-snug block">
                          {item.question}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#86AACF] group-hover:text-[#C38EB4] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </button>
                  ))}
                </div>

                <div className="text-[11px] font-mono text-[#86AACF] pt-1">
                  Deterministic graph search · Zero conversational fluff · Verified source lineage
                </div>
              </div>
            ) : (
              /* CONVERSATION VIEW */
              <div className="space-y-6 max-w-[760px] mx-auto">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const ans = msg.answer;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Sender label & timestamp */}
                      <div className="flex items-center gap-2 text-[10.5px] font-mono text-[#86AACF] px-1">
                        <span className={isUser ? 'text-[#86AACF] font-medium' : 'text-[#C38EB4] font-medium'}>
                          {isUser ? 'OPERATOR' : 'CONTEXTOS'}
                        </span>
                        <span>·</span>
                        <span>{msg.timestamp}</span>
                        {ans && (
                          <>
                            <span>·</span>
                            <span className="text-[#86AACF]">{ans.confidenceScore}% CERTAINTY</span>
                            {msg.provider && (
                              <>
                                <span>·</span>
                                <span className="text-[#86AACF] uppercase">
                                  {msg.provider === 'gemini-3.8-flash'
                                    ? 'GEMINI 3.8 FLASH · GROUNDED'
                                    : 'DETERMINISTIC · GRAPH LINEAGE'}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Message Content Body */}
                      <div
                        className={`rounded-sm p-4 text-[14px] leading-relaxed ${
                          isUser
                            ? 'bg-[#0C1D44] text-[#FFFFFF] border border-[#26425A] max-w-xl'
                            : 'bg-[#112436] text-[#FFFFFF] border border-[#26425A] w-full shadow-sm'
                        }`}
                      >
                        <div className="whitespace-pre-line font-sans leading-relaxed text-[#E1CBD7]">
                          {msg.text}
                        </div>

                        {/* SOURCES & GROUNDED EVIDENCE */}
                        {ans && !isUser && (
                          <div className="mt-4 pt-3.5 border-t border-[#26425A]/60 space-y-3.5">
                            {/* Sources Box */}
                            {ans.supportingMemories && ans.supportingMemories.length > 0 && (
                              <div>
                                <div className="text-[10.5px] font-mono tracking-wider uppercase text-[#86AACF] mb-2 flex items-center gap-1.5 font-medium">
                                  <BookOpen className="w-3.5 h-3.5 text-[#C38EB4]" />
                                  <span>SOURCES ({ans.supportingMemories.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {ans.supportingMemories.map((mem) => (
                                    <div
                                      key={mem.id}
                                      onClick={() => setSelectedMemoryDetail(mem)}
                                      className="p-2.5 rounded bg-[#0E1F2E] hover:bg-[#0C1D44] border border-[#26425A] hover:border-[#86AACF] cursor-pointer transition-colors text-left group"
                                    >
                                      <div className="flex items-center justify-between text-[10px] font-mono text-[#86AACF] mb-1">
                                        <span className="font-semibold text-[#C38EB4]">{mem.id}</span>
                                        <span className="px-1.5 py-0.2 rounded bg-[#112436] text-[#E1CBD7]">
                                          {mem.type}
                                        </span>
                                      </div>
                                      <div className="text-[12.5px] font-medium text-[#FFFFFF] truncate">
                                        {mem.title}
                                      </div>
                                      <div className="text-[10.5px] font-mono text-[#86AACF] mt-1 flex items-center justify-between">
                                        <span className="truncate">{mem.projectName || 'Context'}</span>
                                        <span>{new Date(mem.updatedAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Causal Decisions Provenance */}
                            {ans.relatedDecisions && ans.relatedDecisions.length > 0 && (
                              <div>
                                <div className="text-[10.5px] font-mono tracking-wider uppercase text-[#86AACF] mb-2 flex items-center gap-1.5 font-medium">
                                  <GitCommit className="w-3.5 h-3.5 text-[#86AACF]" />
                                  <span>RELATED DECISIONS</span>
                                </div>
                                <div className="space-y-1.5">
                                  {ans.relatedDecisions.map((dec) => (
                                    <div
                                      key={dec.id}
                                      className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] text-[12.5px] flex items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className="font-mono text-[#C38EB4] text-[10.5px] font-bold shrink-0">{dec.id}</span>
                                        <span className="text-[#FFFFFF] truncate">{dec.title}</span>
                                      </div>
                                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-[#0C1D44] text-[#86AACF] uppercase shrink-0">
                                        {dec.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Inferred Suggestions (Demarcated from facts) */}
                            {ans.inferredSuggestions && ans.inferredSuggestions.length > 0 && (
                              <div className="p-3 rounded bg-[#0C1D44] border border-[#26425A]">
                                <div className="text-[10.5px] font-mono tracking-wider uppercase text-[#C38EB4] mb-1.5 flex items-center gap-1.5 font-medium">
                                  <Lightbulb className="w-3.5 h-3.5 text-[#C38EB4]" />
                                  <span>INFERRED SUGGESTIONS (DEMARCATED FROM VERIFIED FACTS)</span>
                                </div>
                                <ul className="space-y-1">
                                  {ans.inferredSuggestions.map((sug, i) => (
                                    <li key={i} className="text-[13px] text-[#E1CBD7] flex items-start gap-2">
                                      <span className="text-[#C38EB4] font-bold">›</span>
                                      <span>{sug}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-[12.5px] font-mono text-[#C38EB4] p-3 rounded-sm bg-[#112436] border border-[#26425A] w-fit">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-[#C38EB4]" />
                    <span>Searching memory vault & verifying causal consistency...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* MESSAGE COMPOSER ANCHORED AT BOTTOM */}
          <div className="p-4 bg-[#112436] border-t border-[#26425A] shrink-0 shadow-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(inputQuery);
              }}
              className="max-w-[760px] mx-auto bg-[#0E1F2E] border border-[#26425A] focus-within:border-[#C38EB4] rounded-sm p-2.5 transition-colors shadow-sm"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputQuery}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask CONTEXTOS about your memories, decisions, or commitments..."
                className="w-full bg-transparent text-[13.5px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none resize-none min-h-[38px] max-h-[140px] px-1 font-sans"
              />

              <div className="flex items-center justify-between pt-1 border-t border-[#26425A]/40 mt-1 text-[10.5px] font-mono text-[#86AACF]">
                <span>Enter to send · Shift+Enter for new line</span>

                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isProcessing}
                  className="px-3.5 py-1.5 rounded bg-[#C38EB4] hover:bg-[#D5A5C8] disabled:opacity-40 text-[#0C1D44] font-semibold text-[12px] transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>SEND</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RELEVANT CONTEXT PANEL */}
        {isContextPanelOpen && (
          <aside className="w-72 lg:w-80 border-l border-[#26425A] bg-[#0E1F2E] flex flex-col h-full shrink-0 overflow-hidden shadow-sm">
            {/* Context Panel Header */}
            <div className="h-12 px-4 border-b border-[#26425A] flex items-center justify-between bg-[#112436]">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#C38EB4]" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#FFFFFF] font-medium">
                  RELEVANT CONTEXT
                </span>
              </div>
              <button
                onClick={() => setIsContextPanelOpen(false)}
                className="text-[#86AACF] hover:text-[#FFFFFF] p-1 rounded hover:bg-[#152B3F] transition-colors"
                title="Collapse context panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Context Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Active Context Scoping Banner */}
              {activeProject && (
                <div className="p-3 rounded bg-[#112436] border border-[#26425A] space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#C38EB4]">CURRENT CONTEXT</div>
                  <div className="text-[13.5px] font-medium text-[#FFFFFF]">{activeProject.name}</div>
                  <div className="text-[12px] text-[#E1CBD7] line-clamp-2 leading-relaxed">
                    {activeProject.description}
                  </div>
                </div>
              )}

              {/* 1. Relevant Memories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10.5px] font-mono uppercase tracking-widest text-[#86AACF] font-medium flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-[#86AACF]" />
                    <span>RELEVANT MEMORIES ({relevantMemories.length})</span>
                  </div>
                </div>
                {relevantMemories.length === 0 ? (
                  <div className="p-3.5 text-center text-[11px] text-[#86AACF] font-mono bg-[#112436] rounded border border-[#26425A]">
                    No memories found.
                  </div>
                ) : (
                  <div className="divide-y divide-[#26425A]/60 border border-[#26425A] rounded bg-[#112436] overflow-hidden">
                    {relevantMemories.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMemoryDetail(m)}
                        className="p-3 hover:bg-[#152B3F] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#86AACF] mb-1">
                          <span className="text-[#C38EB4] font-semibold">{m.id}</span>
                          <span className="px-1.5 py-0.2 rounded bg-[#0E1F2E] text-[#E1CBD7]">
                            {m.type}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-medium text-[#FFFFFF] line-clamp-1">
                          {m.title}
                        </h4>
                        <p className="text-[12px] text-[#E1CBD7] mt-0.5 line-clamp-1 leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Related Decisions */}
              <div>
                <div className="text-[10.5px] font-mono uppercase tracking-widest text-[#86AACF] font-medium mb-2 flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-[#C38EB4]" />
                  <span>RELATED DECISIONS ({relevantDecisions.length})</span>
                </div>
                {relevantDecisions.length === 0 ? (
                  <div className="p-3.5 text-center text-[11px] text-[#86AACF] font-mono bg-[#112436] rounded border border-[#26425A]">
                    No decision records linked.
                  </div>
                ) : (
                  <div className="divide-y divide-[#26425A]/60 border border-[#26425A] rounded bg-[#112436] overflow-hidden">
                    {relevantDecisions.map((d) => (
                      <div key={d.id} className="p-3">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#86AACF] mb-1">
                          <span className="text-[#C38EB4] font-semibold">{d.id}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0E1F2E] text-[#86AACF]">
                            {d.status}
                          </span>
                        </div>
                        <div className="text-[13px] font-medium text-[#FFFFFF]">
                          {d.title}
                        </div>
                        <p className="text-[12px] text-[#E1CBD7] mt-0.5 line-clamp-1 leading-relaxed">
                          {d.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Active Commitments */}
              <div>
                <div className="text-[10.5px] font-mono uppercase tracking-widest text-[#86AACF] font-medium mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#86AACF]" />
                  <span>ACTIVE COMMITMENTS ({relevantCommitments.length})</span>
                </div>
                {relevantCommitments.length === 0 ? (
                  <div className="p-3.5 text-center text-[11px] text-[#86AACF] font-mono bg-[#112436] rounded border border-[#26425A]">
                    All commitments completed.
                  </div>
                ) : (
                  <div className="divide-y divide-[#26425A]/60 border border-[#26425A] rounded bg-[#112436] overflow-hidden">
                    {relevantCommitments.map((c) => (
                      <div key={c.id} className="p-2.5 text-xs">
                        <div className="text-[13px] font-medium text-[#FFFFFF]">{c.title}</div>
                        <div className="text-[10px] font-mono text-[#86AACF] mt-0.5">
                          DUE: {c.dueDate} · {c.priority} PRIORITY
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Memory Detail Modal */}
      {selectedMemoryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#26425A] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono font-bold text-[#C38EB4]">
                  {selectedMemoryDetail.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0C1D44] text-[#86AACF] border border-[#26425A]">
                  {selectedMemoryDetail.type}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0E1F2E] text-[#86AACF]">
                  {selectedMemoryDetail.validity}
                </span>
              </div>
              <button
                onClick={() => setSelectedMemoryDetail(null)}
                className="text-[#86AACF] hover:text-[#FFFFFF] text-xs font-mono p-1"
              >
                ✕ CLOSE
              </button>
            </div>

            <div>
              <h3 className="text-[15px] font-medium text-[#FFFFFF] leading-snug">
                {selectedMemoryDetail.title}
              </h3>
              <p className="text-[13.5px] text-[#E1CBD7] mt-2.5 leading-relaxed bg-[#0E1F2E] p-3 rounded border border-[#26425A]">
                {selectedMemoryDetail.content}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-[#0C1D44] p-2.5 rounded border border-[#26425A]">
              <div>
                <span className="text-[10px] font-mono text-[#86AACF] block uppercase">PROJECT</span>
                <span className="text-[#FFFFFF] font-medium">{selectedMemoryDetail.projectName}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#86AACF] block uppercase">CONFIDENCE</span>
                <span className="text-[#86AACF] font-mono font-medium">{selectedMemoryDetail.confidence}% Verified</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#86AACF] block uppercase">SOURCE</span>
                <span className="text-[#E1CBD7] font-mono">{selectedMemoryDetail.source}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#86AACF] block uppercase">LAST UPDATED</span>
                <span className="text-[#E1CBD7] font-mono">{new Date(selectedMemoryDetail.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
              <button
                onClick={() => setSelectedMemoryDetail(null)}
                className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
              >
                Close
              </button>
              {onNavigate && (
                <button
                  onClick={() => {
                    setSelectedMemoryDetail(null);
                    onNavigate('memory-explorer');
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4]/50 text-[#FFFFFF] text-xs font-medium transition-colors"
                >
                  View in Memory Explorer →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
