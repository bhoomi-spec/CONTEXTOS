import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Info,
  Filter,
  FileText
} from 'lucide-react';
import { MemoryConflict, Memory, Decision, NavigationPage } from '../../types';

interface ConflictsPageProps {
  conflicts: MemoryConflict[];
  memories: Memory[];
  decisions: Decision[];
  onResolveConflict: (conflictId: string, notes: string) => void;
  onDismissConflict: (conflictId: string, notes?: string) => void;
  onNavigate: (page: NavigationPage) => void;
}

export const ConflictsPage: React.FC<ConflictsPageProps> = ({
  conflicts,
  memories,
  decisions,
  onResolveConflict,
  onDismissConflict,
  onNavigate
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(conflicts[0]?.id || null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const filteredConflicts = conflicts.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  const selectedConflict = conflicts.find((c) => c.id === selectedConflictId) || null;

  const memA = selectedConflict ? memories.find((m) => m.id === selectedConflict.memoryIdA) : null;
  const memB = selectedConflict ? memories.find((m) => m.id === selectedConflict.memoryIdB) : null;

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConflict) return;
    const notes = resolutionNotes.trim() || 'Standardized architecture to resolve contradictory parameters.';
    onResolveConflict(selectedConflict.id, notes);
    setIsResolving(false);
    setResolutionNotes('');
  };

  const handleDismiss = () => {
    if (!selectedConflict) return;
    onDismissConflict(selectedConflict.id, 'Dismissed by operator after inspection.');
  };

  const unresolvedCount = conflicts.filter((c) => c.status === 'UNRESOLVED').length;
  const resolvedCount = conflicts.filter((c) => c.status === 'RESOLVED').length;
  const confirmedCount = conflicts.filter((c) => c.severity === 'confirmed' || c.status === 'UNRESOLVED').length;
  const potentialCount = conflicts.filter((c) => c.severity === 'potential').length;
  const totalCount = conflicts.length || 1;

  const confirmedPct = Math.round((confirmedCount / totalCount) * 100);
  const potentialPct = Math.round((potentialCount / totalCount) * 100);
  const resolvedPct = Math.round((resolvedCount / totalCount) * 100);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm">
          <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-1 flex items-center justify-between">
            <span>TOTAL CONFLICTS FLAGGED</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#86AACF]" />
          </div>
          <div className="text-[28px] font-normal text-[#FFFFFF] font-mono tabular-nums">{conflicts.length}</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">detected by deterministic engine</div>
        </div>

        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm">
          <div className="text-[10.5px] font-mono text-[#C38EB4] uppercase mb-1 flex items-center justify-between">
            <span>UNRESOLVED CLASHES</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#C38EB4]" />
          </div>
          <div className="text-[28px] font-normal text-[#C38EB4] font-mono tabular-nums">{unresolvedCount}</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">action required</div>
        </div>

        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm">
          <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-1 flex items-center justify-between">
            <span>RESOLVED CLASHES</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#86AACF]" />
          </div>
          <div className="text-[28px] font-normal text-[#86AACF] font-mono tabular-nums">{resolvedCount}</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">archived with resolution rationale</div>
        </div>
      </div>

      {/* LARGE SEVERITY & PROJECT CLASH DENSITY HISTOGRAM */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#C38EB4]"></span>
              SEVERITY & CONTEXT CLASH DENSITY HISTOGRAM
            </h3>
            <p className="text-[12px] text-[#E1CBD7] mt-0.5">
              Empirical breakdown of high-severity contradictions vs potential parameter drift across scoped projects.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A] text-[#86AACF]">
              RESOLUTION RATE: <span className="text-[#86AACF] font-bold">{resolvedPct}%</span>
            </div>
          </div>
        </div>

        {/* Large SVG Chart */}
        <div className="bg-[#0E1F2E] border border-[#26425A] rounded p-4 relative">
          <div className="flex items-center justify-between text-xs font-mono mb-3">
            <span className="text-[#E1CBD7] font-semibold">CLASH FREQUENCY BY SEVERITY & SCOPE</span>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#C38EB4]" />
                <span className="text-[#E1CBD7]">Confirmed Clash</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#86AACF]" />
                <span className="text-[#E1CBD7]">Potential Drift</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#26425A]" />
                <span className="text-[#E1CBD7]">Resolved Audit</span>
              </div>
            </div>
          </div>

          {/* SVG Canvas */}
          {(() => {
            // Group conflicts by severity and project
            const chartData = [
              {
                label: 'CONFIRMED',
                count: confirmedCount,
                color: '#C38EB4',
                desc: 'high severity'
              },
              {
                label: 'POTENTIAL',
                count: potentialCount,
                color: '#86AACF',
                desc: 'parameter drift'
              },
              {
                label: 'RESOLVED',
                count: resolvedCount,
                color: '#26425A',
                desc: 'audit archived'
              },
              {
                label: 'UNRESOLVED',
                count: unresolvedCount,
                color: '#E1CBD7',
                desc: 'active triage'
              }
            ];

            const maxVal = Math.max(...chartData.map((d) => d.count), 4);

            return (
              <div className="h-44 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 170" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 135 - pct * 115;
                    const val = Math.round(pct * maxVal);
                    return (
                      <g key={i}>
                        <line x1="45" y1={y} x2="590" y2={y} stroke="#26425A" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                        <text x="35" y={y + 3.5} textAnchor="end" fill="#86AACF" fontSize="9" fontFamily="monospace">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  <line x1="45" y1="20" x2="45" y2="135" stroke="#26425A" strokeWidth="1" />
                  <line x1="45" y1="135" x2="590" y2="135" stroke="#26425A" strokeWidth="1" />

                  {chartData.map((d, idx) => {
                    const slotWidth = (590 - 45) / chartData.length;
                    const colX = 45 + idx * slotWidth + slotWidth / 2;
                    const barWidth = 36;
                    const barH = (d.count / maxVal) * 115;
                    const barY = 135 - barH;

                    return (
                      <g key={d.label} className="group cursor-pointer">
                        <rect
                          x={colX - barWidth / 2}
                          y={barY}
                          width={barWidth}
                          height={barH}
                          fill={d.color}
                          rx="2"
                          className="transition-all hover:brightness-125"
                        >
                          <title>{`${d.label}: ${d.count} (${d.desc})`}</title>
                        </rect>
                        <text
                          x={colX}
                          y={barY - 5}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {d.count}
                        </text>
                        <text
                          x={colX}
                          y="150"
                          textAnchor="middle"
                          fill="#E1CBD7"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {d.label}
                        </text>
                        <text
                          x={colX}
                          y="162"
                          textAnchor="middle"
                          fill="#86AACF"
                          fontSize="8"
                          fontFamily="monospace"
                          opacity="0.8"
                        >
                          {d.desc}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
        </div>

        {/* Legend with Actual Values & Visual Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded bg-[#0E1F2E] border border-[#26425A]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#C38EB4]"></span>
            <div>
              <span className="text-[10px] text-[#86AACF] uppercase block">CONFIRMED SEVERITY</span>
              <span className="text-[#C38EB4] font-bold text-[15px]">{confirmedCount}</span>
              <span className="text-[10px] text-[#86AACF] ml-1">({confirmedPct}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded bg-[#0E1F2E] border border-[#26425A]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#86AACF]"></span>
            <div>
              <span className="text-[10px] text-[#86AACF] uppercase block">POTENTIAL DRIFT</span>
              <span className="text-[#86AACF] font-bold text-[15px]">{potentialCount}</span>
              <span className="text-[10px] text-[#86AACF] ml-1">({potentialPct}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded bg-[#0E1F2E] border border-[#26425A]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#E1CBD7]"></span>
            <div>
              <span className="text-[10px] text-[#86AACF] uppercase block">UNRESOLVED TOTAL</span>
              <span className="text-[#FFFFFF] font-bold text-[15px]">{unresolvedCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded bg-[#0E1F2E] border border-[#26425A]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#26425A]"></span>
            <div>
              <span className="text-[10px] text-[#86AACF] uppercase block">RECONCILED TOTAL</span>
              <span className="text-[#86AACF] font-bold text-[15px]">{resolvedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">STATUS FILTER:</span>
          {(['ALL', 'UNRESOLVED', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                statusFilter === st
                  ? 'bg-[#0C1D44] text-[#FFFFFF] border border-[#C38EB4]/60'
                  : 'text-[#86AACF] hover:text-[#FFFFFF]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono text-[#86AACF]">
          SHOWING {filteredConflicts.length} OF {conflicts.length} CONFLICTS
        </div>
      </div>

      {/* Split View: List on Left, Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Conflict Cards */}
        <div className="lg:col-span-7 space-y-3">
          {filteredConflicts.length === 0 ? (
            <div className="bg-[#112436] border border-[#26425A] rounded-sm p-8 text-center text-xs font-mono text-[#86AACF]">
              No conflicts found matching current filter.
            </div>
          ) : (
            filteredConflicts.map((c) => {
              const isSelected = c.id === selectedConflictId;
              const isUnresolved = c.status === 'UNRESOLVED';

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedConflictId(c.id)}
                  className={`cursor-pointer rounded-sm p-4 border transition-colors text-left ${
                    isSelected
                      ? 'bg-[#0C1D44] border-[#C38EB4] shadow-sm'
                      : 'bg-[#112436] hover:bg-[#152B3F] border-[#26425A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#C38EB4] font-semibold">{c.id}</span>
                      <span
                        className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium ${
                          isUnresolved
                            ? 'text-[#C38EB4] bg-[#0C1D44] border-[#C38EB4]/40 font-bold'
                            : 'text-[#86AACF] bg-[#0E1F2E] border-[#26425A]'
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.conflictType && (
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-[#0E1F2E] text-[#86AACF] border border-[#26425A]">
                          {c.conflictType}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#86AACF]">
                      {c.projectName || 'General'}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-medium text-[#FFFFFF] tracking-tight">
                    {c.title}
                  </h3>

                  <p className="text-[12.5px] text-[#E1CBD7] mt-1 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-[#26425A]/60 flex items-center justify-between text-[10.5px] font-mono text-[#86AACF]">
                    <span>RECORDS: {c.memoryIdA} vs {c.memoryIdB}</span>
                    <span>DETECTED: {c.detectedAt ? c.detectedAt.slice(0, 10) : '2026-10-10'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Conflict Detail Inspector & Action Panel */}
        <div className="lg:col-span-5">
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sticky top-28 shadow-sm space-y-4">
            {selectedConflict ? (
              <div className="space-y-4">
                <div className="border-b border-[#26425A] pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-mono font-bold text-[#C38EB4]">
                      {selectedConflict.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        selectedConflict.status === 'UNRESOLVED'
                          ? 'bg-[#0C1D44] text-[#C38EB4] border-[#C38EB4]/40 font-bold'
                          : 'bg-[#0E1F2E] text-[#86AACF] border-[#26425A]'
                      }`}
                    >
                      {selectedConflict.status}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-medium text-[#FFFFFF] leading-snug">
                    {selectedConflict.title}
                  </h3>
                </div>

                <div className="bg-[#0E1F2E] p-3 rounded border border-[#26425A] text-xs text-[#E1CBD7] leading-relaxed">
                  <span className="text-[10px] font-mono text-[#86AACF] uppercase block mb-1">
                    CONTRADICTION ANALYSIS:
                  </span>
                  {selectedConflict.description}
                </div>

                {/* Evidence Comparison: Record A vs Record B */}
                <div className="space-y-2">
                  <span className="text-[10.5px] font-mono text-[#86AACF] uppercase block font-medium">
                    CONTRADICTING EVIDENCE:
                  </span>

                  <div className="p-2.5 rounded bg-[#0C1D44] border border-[#26425A] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#C38EB4]">
                      <span>{selectedConflict.memoryIdA}</span>
                      <span>{memA?.type || 'RECORD'}</span>
                    </div>
                    <div className="text-[12.5px] text-[#FFFFFF] font-medium">{memA?.title || selectedConflict.memoryIdA}</div>
                    <div className="text-[11.5px] text-[#E1CBD7] leading-relaxed">{memA?.content || 'Source memory content'}</div>
                  </div>

                  <div className="p-2.5 rounded bg-[#0C1D44] border border-[#26425A] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#86AACF]">
                      <span>{selectedConflict.memoryIdB}</span>
                      <span>{memB?.type || 'RECORD'}</span>
                    </div>
                    <div className="text-[12.5px] text-[#FFFFFF] font-medium">{memB?.title || selectedConflict.memoryIdB}</div>
                    <div className="text-[11.5px] text-[#E1CBD7] leading-relaxed">{memB?.content || 'Contradicting record content'}</div>
                  </div>
                </div>

                {/* Recommended Resolution Action */}
                {selectedConflict.recommendedAction && (
                  <div className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] text-xs text-[#E1CBD7]">
                    <span className="text-[10px] font-mono text-[#86AACF] uppercase block mb-0.5">
                      RECOMMENDED ACTION:
                    </span>
                    {selectedConflict.recommendedAction}
                  </div>
                )}

                {/* Resolution Notes if Resolved */}
                {selectedConflict.status === 'RESOLVED' && selectedConflict.resolutionNotes && (
                  <div className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] text-xs text-[#86AACF]">
                    <span className="text-[10px] font-mono text-[#E1CBD7] uppercase block mb-0.5 font-bold">
                      RESOLUTION AUDIT LOG:
                    </span>
                    {selectedConflict.resolutionNotes}
                  </div>
                )}

                {/* Action Controls for Unresolved */}
                {selectedConflict.status === 'UNRESOLVED' && (
                  <div className="pt-2 border-t border-[#26425A] space-y-3">
                    {!isResolving ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsResolving(true)}
                          className="flex-1 py-1.5 px-3 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8] transition-colors shadow-sm"
                        >
                          Resolve & Reconcile
                        </button>
                        <button
                          onClick={handleDismiss}
                          className="py-1.5 px-3 rounded bg-[#0C1D44] hover:bg-[#152B3F] text-[#86AACF] border border-[#26425A] text-xs font-medium transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleResolve} className="space-y-2">
                        <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase">
                          Resolution Audit Rationale:
                        </label>
                        <textarea
                          rows={3}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Document standardized parameter choice or reconciliation decision..."
                          className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded p-2 text-xs text-[#FFFFFF] focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsResolving(false)}
                            className="px-2.5 py-1 text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-[#C38EB4] text-[#0C1D44] rounded text-xs font-semibold hover:bg-[#D5A5C8]"
                          >
                            Confirm Resolution
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-[#86AACF]">
                <Info className="w-5 h-5 mx-auto mb-2 text-[#86AACF]" />
                Select a conflict from the list to inspect contradictory records and perform reconciliation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
