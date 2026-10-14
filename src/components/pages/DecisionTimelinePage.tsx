import React, { useState } from 'react';
import {
  GitCommit,
  GitBranch,
  Plus,
  ArrowRight,
  Clock,
  History,
  Edit3
} from 'lucide-react';
import { Decision, ProjectContext, Memory } from '../../types';

interface DecisionTimelinePageProps {
  decisions: Decision[];
  projects: ProjectContext[];
  memories: Memory[];
  onAddDecision: (dec: Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSupersedeDecision: (oldId: string, newTitle: string, newRationale: string, changeExplanation: string) => void;
  onUpdateDecision?: (id: string, updates: Partial<Decision>) => void;
}

export const DecisionTimelinePage: React.FC<DecisionTimelinePageProps> = ({
  decisions,
  projects,
  memories = [],
  onAddDecision,
  onSupersedeDecision,
  onUpdateDecision
}) => {
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [supersedeTargetId, setSupersedeTargetId] = useState<string | null>(null);
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);

  // New Decision form state
  const [newTitle, setNewTitle] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newProjectId, setNewProjectId] = useState(projects[0]?.id || 'PRJ-AI-RESEARCH');
  const [newImpact, setNewImpact] = useState('');
  const [newSourceMemoryIds, setNewSourceMemoryIds] = useState<string[]>([]);

  // Edit Decision form state
  const [editTitle, setEditTitle] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [editImpact, setEditImpact] = useState('');

  // Supersede form state
  const [superNewTitle, setSuperNewTitle] = useState('');
  const [superNewRationale, setSuperNewRationale] = useState('');
  const [superChangeExplanation, setSuperChangeExplanation] = useState('');

  const startEditDecision = (d: Decision) => {
    setEditingDecisionId(d.id);
    setEditTitle(d.title);
    setEditRationale(d.rationale);
    setEditImpact(d.impactAssessment || '');
  };

  const handleSaveEditDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDecisionId || !editTitle.trim() || !editRationale.trim()) return;
    onUpdateDecision?.(editingDecisionId, {
      title: editTitle.trim(),
      rationale: editRationale.trim(),
      impactAssessment: editImpact.trim() || undefined
    });
    setEditingDecisionId(null);
  };

  const filteredDecisions = decisions
    .filter((d) => {
      if (filterProject !== 'ALL' && d.projectId !== filterProject) return false;
      if (filterStatus !== 'ALL' && d.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingDecisionId) setEditingDecisionId(null);
        else if (supersedeTargetId) setSupersedeTargetId(null);
        else if (isAddOpen) setIsAddOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingDecisionId, supersedeTargetId, isAddOpen]);

  const handleCreateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newRationale.trim()) return;

    onAddDecision({
      title: newTitle.trim(),
      rationale: newRationale.trim(),
      projectId: newProjectId,
      status: 'CURRENT',
      sourceMemoryIds: newSourceMemoryIds,
      impactAssessment: newImpact.trim() || undefined
    });

    setNewTitle('');
    setNewRationale('');
    setNewImpact('');
    setNewSourceMemoryIds([]);
    setIsAddOpen(false);
  };

  const handleExecuteSupersede = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supersedeTargetId || !superNewTitle.trim() || !superNewRationale.trim() || !superChangeExplanation.trim())
      return;

    onSupersedeDecision(
      supersedeTargetId,
      superNewTitle.trim(),
      superNewRationale.trim(),
      superChangeExplanation.trim()
    );

    setSuperNewTitle('');
    setSuperNewRationale('');
    setSuperChangeExplanation('');
    setSupersedeTargetId(null);
  };

  const targetDecision = decisions.find((d) => d.id === supersedeTargetId);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Filter and Controls Bar */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">CONTEXT:</span>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL PROJECTS</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#112436]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">STATUS:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL STATUSES</option>
              <option value="CURRENT" className="bg-[#112436]">CURRENT</option>
              <option value="SUPERSEDED" className="bg-[#112436]">SUPERSEDED</option>
              <option value="UNDER_REVIEW" className="bg-[#112436]">UNDER REVIEW</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4]/60 hover:border-[#C38EB4] text-[#FFFFFF] text-xs font-medium transition-colors"
        >
          <Plus className="w-4 h-4 text-[#C38EB4]" />
          <span>RECORD DECISION</span>
        </button>
      </div>

      {/* LARGE DECISION LINEAGE & PROVENANCE GRAPH (SVG) */}
      {(() => {
        const total = decisions.length || 1;
        const currentCount = decisions.filter((d) => d.status === 'CURRENT').length;
        const supersededCount = decisions.filter((d) => d.status === 'SUPERSEDED').length;
        const underReviewCount = decisions.filter((d) => d.status === 'UNDER_REVIEW').length;

        const currentPct = Math.round((currentCount / total) * 100);
        const supersededPct = Math.round((supersededCount / total) * 100);
        const reviewPct = Math.round((underReviewCount / total) * 100);

        const linkedChainsCount = decisions.filter((d) => d.supersededBy || d.supersedesDecisionId).length;

        // Group decisions by project or category for column histogram
        const projectBuckets = projects.map((p) => {
          const pDecs = decisions.filter((d) => d.projectId === p.id);
          const pCurrent = pDecs.filter((d) => d.status === 'CURRENT').length;
          const pSuperseded = pDecs.filter((d) => d.status === 'SUPERSEDED').length;
          const pReview = pDecs.filter((d) => d.status === 'UNDER_REVIEW').length;
          return {
            id: p.id,
            name: p.name,
            total: pDecs.length,
            current: pCurrent,
            superseded: pSuperseded,
            review: pReview
          };
        });

        const maxProjectDecs = Math.max(...projectBuckets.map((b) => b.total), 3);

        return (
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#C38EB4]"></span>
                  DECISION EVOLUTION & SUPERSESSION PROVENANCE GRAPH
                </h3>
                <p className="text-[12px] text-[#E1CBD7] mt-0.5">
                  Visual causal lineage tracking active governing canons, historical supersessions, and linked branches.
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A] text-[#86AACF]">
                  CONNECTED CHAINS: <span className="text-[#C38EB4] font-bold">{linkedChainsCount}</span> DAG LINKS
                </div>
              </div>
            </div>

            {/* LARGE COLUMN HISTOGRAM BY CONTEXT (SVG) */}
            <div className="bg-[#0E1F2E] border border-[#26425A] rounded p-4 relative">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-[#E1CBD7] font-semibold">DECISION VOLUME & LINEAGE STATUS BY PROJECT</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#86AACF]" />
                    <span className="text-[#E1CBD7]">Active Canon</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#26425A]" />
                    <span className="text-[#E1CBD7]">Superseded</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#C38EB4]" />
                    <span className="text-[#E1CBD7]">Under Review</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG */}
              <div className="h-48 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 145 - pct * 125;
                    const val = Math.round(pct * maxProjectDecs);
                    return (
                      <g key={i}>
                        <line x1="45" y1={y} x2="590" y2={y} stroke="#26425A" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                        <text x="35" y={y + 3.5} textAnchor="end" fill="#86AACF" fontSize="9" fontFamily="monospace">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  <line x1="45" y1="20" x2="45" y2="145" stroke="#26425A" strokeWidth="1" />
                  <line x1="45" y1="145" x2="590" y2="145" stroke="#26425A" strokeWidth="1" />

                  {projectBuckets.map((b, idx) => {
                    const slotWidth = (590 - 45) / projectBuckets.length;
                    const colX = 45 + idx * slotWidth + slotWidth / 2;
                    const barWidth = 32;

                    const curHeight = (b.current / maxProjectDecs) * 125;
                    const superHeight = (b.superseded / maxProjectDecs) * 125;
                    const revHeight = (b.review / maxProjectDecs) * 125;

                    const curY = 145 - curHeight;
                    const superY = curY - superHeight;
                    const revY = superY - revHeight;

                    return (
                      <g key={b.id} className="group cursor-pointer">
                        {/* Current Active Canon (Base) */}
                        {b.current > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={curY}
                            width={barWidth}
                            height={curHeight}
                            fill="#86AACF"
                            rx="2"
                            className="transition-all hover:brightness-110"
                          >
                            <title>{`${b.name}: ${b.current} Active Canons`}</title>
                          </rect>
                        )}

                        {/* Superseded Stack */}
                        {b.superseded > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={superY}
                            width={barWidth}
                            height={superHeight}
                            fill="#26425A"
                            rx="2"
                            className="transition-all hover:brightness-125"
                          >
                            <title>{`${b.name}: ${b.superseded} Superseded Revisions`}</title>
                          </rect>
                        )}

                        {/* Under Review Stack */}
                        {b.review > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={revY}
                            width={barWidth}
                            height={revHeight}
                            fill="#C38EB4"
                            rx="2"
                            className="transition-all hover:brightness-110"
                          >
                            <title>{`${b.name}: ${b.review} Under Review`}</title>
                          </rect>
                        )}

                        {/* Total Count Label Above Bar */}
                        <text
                          x={colX}
                          y={Math.min(curY, superY, revY) - 5}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {b.total}
                        </text>

                        {/* X-Axis Label */}
                        <text
                          x={colX}
                          y="160"
                          textAnchor="middle"
                          fill="#E1CBD7"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {b.id}
                        </text>
                        <text
                          x={colX}
                          y="172"
                          textAnchor="middle"
                          fill="#86AACF"
                          fontSize="8"
                          fontFamily="monospace"
                          opacity="0.8"
                        >
                          {b.name.slice(0, 12)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Metric Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              {/* Current Canons */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'CURRENT' ? 'ALL' : 'CURRENT')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#86AACF] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#86AACF]" />
                    CURRENT ACTIVE CANON
                  </span>
                  <span>{currentPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#86AACF] leading-none">
                  {currentCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">active governing choices</div>
              </button>

              {/* Superseded History */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'SUPERSEDED' ? 'ALL' : 'SUPERSEDED')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#26425A] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#26425A]" />
                    SUPERSEDED REVISIONS
                  </span>
                  <span>{supersededPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#FFFFFF] leading-none">
                  {supersededCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">preserved historical rationale</div>
              </button>

              {/* Lineage Chains */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'UNDER_REVIEW' ? 'ALL' : 'UNDER_REVIEW')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#C38EB4] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#C38EB4] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C38EB4]" />
                    CONNECTED CHAINS / REVIEW
                  </span>
                  <span>{reviewPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#C38EB4] leading-none">
                  {underReviewCount > 0 ? `${underReviewCount} review · ` : ''}{linkedChainsCount} DAG
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">provenance chain links</div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Decision Lineage Timeline */}
      <div className="relative pl-6 md:pl-8 before:absolute before:left-3 md:before:left-4 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#26425A] space-y-5">
        {filteredDecisions.length === 0 ? (
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-8 text-center text-[13px] text-[#86AACF] font-mono">
            No decisions found matching criteria.
          </div>
        ) : (
          filteredDecisions.map((dec) => {
            const isSuperseded = dec.status === 'SUPERSEDED';
            const supersedingDecision = dec.supersededBy
              ? decisions.find((d) => d.id === dec.supersededBy)
              : null;
            const supersededEarlier = dec.supersedesDecisionId
              ? decisions.find((d) => d.id === dec.supersedesDecisionId)
              : null;

            return (
              <div key={dec.id} className="relative group">
                {/* Node icon along timeline */}
                <div
                  className={`absolute -left-6 md:-left-8 top-3.5 w-5 h-5 rounded-full border flex items-center justify-center transition-transform ${
                    isSuperseded
                      ? 'bg-[#0E1F2E] border-[#26425A] text-[#86AACF]'
                      : 'bg-[#0C1D44] border-[#C38EB4] text-[#C38EB4]'
                  }`}
                >
                  <GitCommit className="w-2.5 h-2.5" />
                </div>

                {/* Card Container */}
                <div
                  className={`rounded-sm border p-4 transition-colors ${
                    isSuperseded
                      ? 'bg-[#112436]/60 border-[#26425A] opacity-75 hover:opacity-100'
                      : 'bg-[#112436] hover:bg-[#152B3F] border-[#26425A]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#26425A]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-mono font-bold text-[#C38EB4]">{dec.id}</span>
                      <span
                        className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium ${
                          isSuperseded
                            ? 'text-[#E1CBD7]/50 bg-[#0E1F2E] border-[#26425A] line-through'
                            : 'text-[#86AACF] bg-[#0C1D44] border-[#86AACF]/40'
                        }`}
                      >
                        {dec.status}
                      </span>
                      <span className="text-[10.5px] font-mono text-[#86AACF]">
                        {dec.projectName || 'Workspace'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-mono text-[#86AACF] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(dec.createdAt).toLocaleDateString()}
                      </span>

                      <button
                        onClick={() => startEditDecision(dec)}
                        className="px-2 py-0.5 rounded bg-[#0E1F2E] hover:bg-[#152B3F] text-[#86AACF] hover:text-[#FFFFFF] border border-[#26425A] text-[10.5px] font-mono transition-colors flex items-center gap-1"
                        title="Edit Decision Details"
                      >
                        <Edit3 className="w-3 h-3 text-[#C38EB4]" />
                        <span>EDIT</span>
                      </button>

                      {!isSuperseded && (
                        <button
                          onClick={() => setSupersedeTargetId(dec.id)}
                          className="px-2 py-0.5 rounded bg-[#0C1D44] hover:bg-[#152B3F] text-[#C38EB4] hover:text-[#FFFFFF] border border-[#26425A] hover:border-[#C38EB4] text-[10.5px] font-mono transition-colors"
                        >
                          SUPERSEDE THIS →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Rationale */}
                  <h3
                    className={`text-[15px] font-medium tracking-tight ${
                      isSuperseded ? 'text-[#86AACF]/60 line-through' : 'text-[#FFFFFF]'
                    }`}
                  >
                    {dec.title}
                  </h3>

                  <div className="mt-2 text-[13.5px] text-[#E1CBD7] leading-relaxed bg-[#0E1F2E] p-3 rounded border border-[#26425A]">
                    <span className="text-[10.5px] font-mono text-[#86AACF] uppercase block mb-0.5">
                      ORIGINAL RATIONALE:
                    </span>
                    {dec.rationale}
                  </div>

                  {/* Lineage Info: Explanation of what changed */}
                  {dec.changeExplanation && (
                    <div className="mt-2.5 p-2.5 rounded bg-[#0C1D44] border border-[#26425A] text-[13px] text-[#FFFFFF]">
                      <span className="text-[10.5px] font-mono text-[#C38EB4] uppercase block font-semibold mb-0.5">
                        EXPLANATION OF CHANGE:
                      </span>
                      {dec.changeExplanation}
                    </div>
                  )}

                  {/* Superseded Reference Box */}
                  {isSuperseded && supersedingDecision && (
                    <div className="mt-2.5 p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] flex items-center justify-between text-[13px] text-[#E1CBD7]">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-[#C38EB4]" />
                        <span>
                          Superseded by <strong className="text-[#FFFFFF] font-mono">{supersedingDecision.id}</strong>: "{supersedingDecision.title}"
                        </span>
                      </div>
                      <span className="text-[10.5px] font-mono text-[#86AACF]">
                        {new Date(supersedingDecision.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Evolved From Earlier Decision */}
                  {supersededEarlier && (
                    <div className="mt-2 p-2 rounded bg-[#0E1F2E] border border-[#26425A] text-[11px] font-mono text-[#86AACF] flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-[#C38EB4]" />
                      <span>Evolved from earlier decision {supersededEarlier.id}: "{supersededEarlier.title}"</span>
                    </div>
                  )}

                  {/* Impact Assessment */}
                  {dec.impactAssessment && (
                    <div className="mt-2.5 p-2.5 rounded bg-[#0C1D44] border border-[#26425A] text-[12.5px] text-[#E1CBD7]">
                      <span className="text-[10px] font-mono text-[#86AACF] uppercase block font-semibold mb-0.5">
                        IMPACT ASSESSMENT:
                      </span>
                      {dec.impactAssessment}
                    </div>
                  )}

                  {/* Supporting Evidence Memories */}
                  {dec.sourceMemoryIds && dec.sourceMemoryIds.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#26425A]/60 flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#86AACF]">
                      <span className="uppercase text-[#86AACF]">SUPPORTING EVIDENCE:</span>
                      {dec.sourceMemoryIds.map((mId) => {
                        const mem = memories.find((m) => m.id === mId);
                        return (
                          <span
                            key={mId}
                            title={mem ? `${mem.title}: ${mem.content}` : mId}
                            className="px-1.5 py-0.5 rounded bg-[#0C1D44] text-[#86AACF] border border-[#26425A]"
                          >
                            {mId}{mem ? ` · ${mem.title.slice(0, 36)}...` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE DECISION MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-3 flex items-center gap-1.5">
              <GitCommit className="w-4 h-4" />
              RECORD ARCHITECTURAL DECISION
            </h3>
            <form onSubmit={handleCreateDecision} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Decision Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Adopt hybrid HNSW graph memory indexing"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Associated Project Context
                </label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#112436]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Rationale & Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="Document why this choice was made, constraints weighed, and trade-offs accepted..."
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Impact Assessment (Optional)
                </label>
                <input
                  type="text"
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  placeholder="e.g. Decreases conversational drift by 28% while maintaining sub-85ms latency"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Supporting Evidence Memories (Optional)
                </label>
                <div className="max-h-28 overflow-y-auto bg-[#0E1F2E] border border-[#26425A] rounded p-2 space-y-1.5">
                  {memories.filter((m) => m.projectId === newProjectId).length === 0 ? (
                    <div className="text-[11px] font-mono text-[#86AACF]">No memories in this project context yet.</div>
                  ) : (
                    memories
                      .filter((m) => m.projectId === newProjectId)
                      .map((mem) => (
                        <label
                          key={mem.id}
                          className="flex items-center gap-2 text-xs text-[#E1CBD7] hover:text-[#FFFFFF] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={newSourceMemoryIds.includes(mem.id)}
                            onChange={(e) => {
                              if (e.target.checked) setNewSourceMemoryIds([...newSourceMemoryIds, mem.id]);
                              else setNewSourceMemoryIds(newSourceMemoryIds.filter((id) => id !== mem.id));
                            }}
                            className="rounded border-[#26425A] bg-[#0E1F2E] text-[#C38EB4]"
                          />
                          <span className="font-mono text-[10px] text-[#C38EB4]">{mem.id}</span>
                          <span className="truncate">{mem.title}</span>
                        </label>
                      ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
                >
                  Record Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPERSEDE DECISION MODAL */}
      {supersedeTargetId && targetDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-2 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" />
              SUPERSEDE DECISION: {targetDecision.id}
            </h3>
            <p className="text-[13px] text-[#E1CBD7] mb-3 leading-relaxed">
              Updating architectural direction for <strong className="text-[#FFFFFF] font-mono">{targetDecision.title}</strong>. The previous decision will be preserved as superseded in the causal timeline.
            </p>

            <form onSubmit={handleExecuteSupersede} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  New Superseding Title *
                </label>
                <input
                  type="text"
                  required
                  value={superNewTitle}
                  onChange={(e) => setSuperNewTitle(e.target.value)}
                  placeholder="e.g. Upgrade to Standardized MCP Tool Protocol"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  New Rationale *
                </label>
                <textarea
                  rows={2}
                  required
                  value={superNewRationale}
                  onChange={(e) => setSuperNewRationale(e.target.value)}
                  placeholder="Explain the new architecture..."
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Explanation of What Changed & Why *
                </label>
                <textarea
                  rows={2}
                  required
                  value={superChangeExplanation}
                  onChange={(e) => setSuperChangeExplanation(e.target.value)}
                  placeholder="e.g. Superseded flat cache because tests revealed 28% drift across multi-turn reasoning..."
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                <button
                  type="button"
                  onClick={() => setSupersedeTargetId(null)}
                  className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
                >
                  Supersede & Preserve History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT DECISION MODAL */}
      {editingDecisionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-2 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              EDIT DECISION: {editingDecisionId}
            </h3>
            <p className="text-[13px] text-[#E1CBD7] mb-3 leading-relaxed">
              Update decision title, rationale, and impact assessment while preserving causal lineage and history.
            </p>

            <form onSubmit={handleSaveEditDecision} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Rationale *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editRationale}
                  onChange={(e) => setEditRationale(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Impact Assessment
                </label>
                <input
                  type="text"
                  value={editImpact}
                  onChange={(e) => setEditImpact(e.target.value)}
                  placeholder="e.g. 35% reduction in cross-turn drift, zero regression"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                <button
                  type="button"
                  onClick={() => setEditingDecisionId(null)}
                  className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
