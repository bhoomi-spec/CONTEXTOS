import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  ArrowRight,
  Target,
  Shield,
  ChevronLeft,
  Edit3
} from 'lucide-react';
import {
  ProjectContext,
  Memory,
  Decision,
  Commitment,
  ActivityEvent,
  ProjectStatus
} from '../../types';

interface ProjectsPageProps {
  projects: ProjectContext[];
  memories: Memory[];
  decisions: Decision[];
  commitments: Commitment[];
  activities: ActivityEvent[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onAddProject: (project: Omit<ProjectContext, 'id' | 'lastUpdated'>) => void;
  onUpdateProject: (id: string, updates: Partial<ProjectContext>) => void;
  onToggleCommitment: (id: string) => void;
  onOpenCapture: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  memories,
  decisions,
  commitments,
  activities,
  selectedProjectId,
  onSelectProject,
  onAddProject,
  onUpdateProject,
  onToggleCommitment,
  onOpenCapture
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MEMORIES' | 'DECISIONS' | 'COMMITMENTS' | 'ACTIVITY'>('OVERVIEW');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // New Project Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalsStr, setGoalsStr] = useState('');
  const [constraintsStr, setConstraintsStr] = useState('');
  const [deadline, setDeadline] = useState('2026-11-30');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [accentColor, setAccentColor] = useState<ProjectContext['accentColor']>('purple');

  // Edit Project Form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGoalsStr, setEditGoalsStr] = useState('');
  const [editConstraintsStr, setEditConstraintsStr] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('ACTIVE');

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const projectMemories = memories.filter((m) => m.projectId === selectedProjectId);
  const projectDecisions = decisions.filter((d) => d.projectId === selectedProjectId);
  const projectCommitments = commitments.filter((c) => c.projectId === selectedProjectId);
  const projectActivities = activities.filter((a) => a.projectId === selectedProjectId);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditOpen) setIsEditOpen(false);
        else if (isCreateOpen) setIsCreateOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditOpen, isCreateOpen]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const goals = goalsStr.split('\n').map((g) => g.trim()).filter(Boolean);
    const constraints = constraintsStr.split('\n').map((c) => c.trim()).filter(Boolean);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    onAddProject({
      name: name.trim(),
      slug,
      description: description.trim(),
      goals: goals.length > 0 ? goals : ['Establish contextual operational baseline'],
      constraints: constraints.length > 0 ? constraints : ['Standard latency budget'],
      deadline,
      status,
      health: 95,
      accentColor
    });

    setName('');
    setDescription('');
    setGoalsStr('');
    setConstraintsStr('');
    setIsCreateOpen(false);
  };

  const startEditProject = (p: ProjectContext) => {
    setEditName(p.name);
    setEditDescription(p.description);
    setEditGoalsStr(p.goals.join('\n'));
    setEditConstraintsStr(p.constraints.join('\n'));
    setEditDeadline(p.deadline);
    setEditStatus(p.status);
    setIsEditOpen(true);
  };

  const handleSaveEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !editName.trim()) return;
    const goals = editGoalsStr.split('\n').map((g) => g.trim()).filter(Boolean);
    const constraints = editConstraintsStr.split('\n').map((c) => c.trim()).filter(Boolean);
    onUpdateProject(selectedProject.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      deadline: editDeadline,
      status: editStatus,
      goals: goals.length > 0 ? goals : selectedProject.goals,
      constraints: constraints.length > 0 ? constraints : selectedProject.constraints
    });
    setIsEditOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* If no project selected: Project Catalog Grid */}
      {!selectedProject ? (
        <>
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 flex items-center justify-between shadow-sm">
            <div className="text-[13px] text-[#86AACF] font-mono">
              TOTAL SCOPED CONTEXTS: <strong className="text-[#FFFFFF]">{projects.length}</strong>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4]/60 hover:border-[#C38EB4] text-[#FFFFFF] text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4 text-[#C38EB4]" />
              <span>NEW CONTEXT</span>
            </button>
          </div>

          {/* LARGE PROJECT RECORD COMPARATIVE HISTOGRAM (SVG) */}
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#86AACF]"></span>
                  CONTEXT RECORD VOLUMES & CAPACITY HISTOGRAM
                </h3>
                <p className="text-[12px] text-[#E1CBD7] mt-0.5">
                  Side-by-side empirical distribution of memories, architectural canons, and open commitments per scoped project context.
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#86AACF]"></span>
                  <span className="text-[#E1CBD7]">Memories</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#C38EB4]"></span>
                  <span className="text-[#E1CBD7]">Decisions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#E1CBD7]"></span>
                  <span className="text-[#E1CBD7]">Open Tasks</span>
                </div>
              </div>
            </div>

            {/* LARGE GROUPED BAR SVG CHART */}
            <div className="bg-[#0E1F2E] border border-[#26425A] rounded p-4 relative">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-[#E1CBD7] font-semibold">COMPARATIVE CONTEXT FOOTPRINT</span>
                <span className="text-[#86AACF]">{projects.length} ACTIVE PROJECT DOMAINS</span>
              </div>

              {(() => {
                const projectStats = projects.map((p) => {
                  const pMems = memories.filter((m) => m.projectId === p.id).length;
                  const pDecs = decisions.filter((d) => d.projectId === p.id).length;
                  const pComs = commitments.filter((c) => c.projectId === p.id && c.status !== 'COMPLETED').length;
                  return {
                    id: p.id,
                    name: p.name,
                    health: p.health,
                    memories: pMems,
                    decisions: pDecs,
                    commitments: pComs,
                    total: pMems + pDecs + pComs
                  };
                });

                const maxMetric = Math.max(
                  ...projectStats.flatMap((p) => [p.memories, p.decisions, p.commitments]),
                  4
                );

                return (
                  <div className="h-48 w-full">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                      {/* Grid guidelines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const y = 145 - pct * 125;
                        const val = Math.round(pct * maxMetric);
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

                      {/* Grouped 3 bars per project */}
                      {projectStats.map((p, idx) => {
                        const groupWidth = (590 - 45) / projectStats.length;
                        const groupX = 45 + idx * groupWidth;
                        const barW = 14;
                        const gap = 3;
                        const center = groupX + groupWidth / 2;

                        const b1X = center - barW * 1.5 - gap;
                        const b2X = center - barW * 0.5;
                        const b3X = center + barW * 0.5 + gap;

                        const h1 = (p.memories / maxMetric) * 125;
                        const h2 = (p.decisions / maxMetric) * 125;
                        const h3 = (p.commitments / maxMetric) * 125;

                        return (
                          <g key={p.id} className="group cursor-pointer" onClick={() => onSelectProject(p.id)}>
                            {/* Bar 1: Memories */}
                            <rect
                              x={b1X}
                              y={145 - h1}
                              width={barW}
                              height={h1}
                              fill="#86AACF"
                              rx="1.5"
                              className="transition-all hover:brightness-125"
                            >
                              <title>{`${p.name} - ${p.memories} Memories`}</title>
                            </rect>
                            {p.memories > 0 && (
                              <text x={b1X + barW / 2} y={145 - h1 - 3} textAnchor="middle" fill="#86AACF" fontSize="8" fontFamily="monospace">
                                {p.memories}
                              </text>
                            )}

                            {/* Bar 2: Decisions */}
                            <rect
                              x={b2X}
                              y={145 - h2}
                              width={barW}
                              height={h2}
                              fill="#C38EB4"
                              rx="1.5"
                              className="transition-all hover:brightness-125"
                            >
                              <title>{`${p.name} - ${p.decisions} Decisions`}</title>
                            </rect>
                            {p.decisions > 0 && (
                              <text x={b2X + barW / 2} y={145 - h2 - 3} textAnchor="middle" fill="#C38EB4" fontSize="8" fontFamily="monospace">
                                {p.decisions}
                              </text>
                            )}

                            {/* Bar 3: Commitments */}
                            <rect
                              x={b3X}
                              y={145 - h3}
                              width={barW}
                              height={h3}
                              fill="#E1CBD7"
                              rx="1.5"
                              className="transition-all hover:brightness-125"
                            >
                              <title>{`${p.name} - ${p.commitments} Tasks`}</title>
                            </rect>
                            {p.commitments > 0 && (
                              <text x={b3X + barW / 2} y={145 - h3 - 3} textAnchor="middle" fill="#E1CBD7" fontSize="8" fontFamily="monospace">
                                {p.commitments}
                              </text>
                            )}

                            {/* Label */}
                            <text x={center} y="160" textAnchor="middle" fill="#E1CBD7" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                              {p.id}
                            </text>
                            <text x={center} y="172" textAnchor="middle" fill="#86AACF" fontSize="8" fontFamily="monospace">
                              {p.health}% HEALTH
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>

            {/* Quick Context Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {projects.map((p) => {
                const pMems = memories.filter((m) => m.projectId === p.id).length;
                const pDecs = decisions.filter((d) => d.projectId === p.id).length;
                const pComs = commitments.filter((c) => c.projectId === p.id && c.status !== 'COMPLETED').length;
                return (
                  <div
                    key={`summary-${p.id}`}
                    onClick={() => onSelectProject(p.id)}
                    className="p-3 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#86AACF] transition-all cursor-pointer font-mono text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#C38EB4] font-bold">{p.id}</span>
                        <span className="text-[#FFFFFF]">{p.name}</span>
                      </div>
                      <div className="text-[10px] text-[#86AACF] mt-1">
                        {pMems} mems · {pDecs} decs · {pComs} tasks
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#86AACF] text-[11px] font-bold">{p.health}%</span>
                      <span className="text-[9px] text-[#86AACF] block">HEALTH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((prj) => {
              const pMemCount = memories.filter((m) => m.projectId === prj.id).length;
              const pDecCount = decisions.filter((d) => d.projectId === prj.id).length;
              const pComCount = commitments.filter((c) => c.projectId === prj.id && c.status !== 'COMPLETED').length;

              const statusBg =
                prj.status === 'ACTIVE'
                  ? 'text-[#C38EB4] bg-[#0C1D44] border-[#C38EB4]/40'
                  : prj.status === 'STABLE'
                  ? 'text-[#86AACF] bg-[#0C1D44] border-[#86AACF]/40'
                  : 'text-[#E1CBD7] bg-[#112436] border-[#26425A]';

              return (
                <div
                  key={prj.id}
                  onClick={() => onSelectProject(prj.id)}
                  className="bg-[#112436] hover:bg-[#152B3F] border border-[#26425A] hover:border-[#86AACF] rounded-sm p-4 transition-colors cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10.5px] font-mono text-[#86AACF]">{prj.id}</span>
                      <span className={`text-[9.5px] font-mono px-2 py-0.2 rounded border uppercase font-medium ${statusBg}`}>
                        {prj.status}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-medium text-[#FFFFFF] tracking-tight group-hover:text-white transition-colors">
                      {prj.name}
                    </h3>

                    <p className="text-[13px] text-[#E1CBD7] mt-1.5 line-clamp-2 leading-relaxed">
                      {prj.description}
                    </p>

                    {/* Stats metrics inside card */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#26425A] bg-[#0E1F2E] p-2 rounded">
                      <div className="text-center">
                        <div className="text-[9.5px] font-mono text-[#86AACF]">MEMORIES</div>
                        <div className="text-[14px] font-mono text-[#FFFFFF] mt-0.5">{pMemCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9.5px] font-mono text-[#86AACF]">DECISIONS</div>
                        <div className="text-[14px] font-mono text-[#C38EB4] mt-0.5">{pDecCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9.5px] font-mono text-[#86AACF]">OPEN SLA</div>
                        <div className="text-[14px] font-mono text-[#86AACF] mt-0.5">{pComCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#26425A] flex items-center justify-between text-[11px] font-mono text-[#86AACF] group-hover:text-[#FFFFFF]">
                    <span>INSPECT CONTEXT</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[#C38EB4]" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Project Detail View with 5 Tabs */
        <div className="space-y-4">
          {/* Top navigation back bar */}
          <div className="flex items-center justify-between bg-[#112436] border border-[#26425A] rounded-sm p-3 shadow-sm">
            <button
              onClick={() => onSelectProject(null)}
              className="flex items-center gap-1.5 text-xs font-mono text-[#86AACF] hover:text-[#FFFFFF] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ALL CONTEXTS</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#0C1D44] text-[#C38EB4] border border-[#26425A]">
                {selectedProject.id}
              </span>
              <span className="text-[14px] font-medium text-[#FFFFFF]">
                {selectedProject.name}
              </span>
            </div>

            <button
              onClick={onOpenCapture}
              className="text-[11px] font-mono text-[#C38EB4] hover:text-[#FFFFFF] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>CAPTURE MEMORY</span>
            </button>
          </div>

          {/* Project Summary Banner */}
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-[19px] font-medium text-[#FFFFFF] tracking-tight">
                  {selectedProject.name}
                </h2>
                <p className="text-[13px] text-[#E1CBD7] mt-1 leading-relaxed max-w-2xl">
                  {selectedProject.description}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A]">
                  <span className="text-[9.5px] text-[#86AACF] block uppercase">HEALTH</span>
                  <span className="text-[#FFFFFF] font-bold text-[14px]">{selectedProject.health}%</span>
                </div>
                <div className="bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A]">
                  <span className="text-[9.5px] text-[#86AACF] block uppercase">DEADLINE</span>
                  <span className="text-[#C38EB4] font-bold text-[14px]">{selectedProject.deadline}</span>
                </div>
                <button
                  onClick={() => startEditProject(selectedProject)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0C1D44] hover:bg-[#152B3F] text-[#86AACF] hover:text-[#FFFFFF] border border-[#26425A] hover:border-[#C38EB4]/60 transition-colors"
                  title="Edit Context Metadata"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#C38EB4]" />
                  <span>EDIT</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex items-center gap-1 border-b border-[#26425A] mt-4 pt-1">
              {(
                [
                  { id: 'OVERVIEW', label: 'Overview & Constraints', count: null },
                  { id: 'MEMORIES', label: 'Memories', count: projectMemories.length },
                  { id: 'DECISIONS', label: 'Decisions', count: projectDecisions.length },
                  { id: 'COMMITMENTS', label: 'Commitments', count: projectCommitments.length },
                  { id: 'ACTIVITY', label: 'Activity', count: projectActivities.length }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-[12px] font-mono transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'border-[#C38EB4] text-[#FFFFFF] font-medium bg-[#0C1D44]'
                      : 'border-transparent text-[#86AACF] hover:text-[#FFFFFF]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#0E1F2E] text-[#86AACF]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Areas */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Goals */}
              <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#C38EB4] uppercase mb-3 font-medium">
                  <Target className="w-4 h-4" />
                  <span>Strategic Goals</span>
                </div>
                <ul className="space-y-2">
                  {selectedProject.goals.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#E1CBD7] leading-relaxed">
                      <span className="text-[#C38EB4] font-bold mt-0.5">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Constraints */}
              <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#86AACF] uppercase mb-3 font-medium">
                  <Shield className="w-4 h-4" />
                  <span>Operational Constraints</span>
                </div>
                <ul className="space-y-2">
                  {selectedProject.constraints.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#E1CBD7] leading-relaxed">
                      <span className="text-[#86AACF] font-bold mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'MEMORIES' && (
            <div className="space-y-2">
              {projectMemories.length === 0 ? (
                <div className="p-8 text-center text-[12px] text-[#86AACF] font-mono bg-[#112436] rounded-sm border border-[#26425A]">
                  No memories associated with this context yet.
                </div>
              ) : (
                projectMemories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 bg-[#112436] border border-[#26425A] rounded-sm text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[#C38EB4] font-bold text-[11px]">{mem.id}</span>
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-[#0C1D44] text-[#86AACF]">
                          {mem.type}
                        </span>
                        <span className="text-[#FFFFFF] font-medium text-[13.5px]">{mem.title}</span>
                      </div>
                      <p className="text-[#E1CBD7] text-[12.5px] leading-relaxed mt-0.5">{mem.content}</p>
                    </div>
                    <span className="text-[10.5px] font-mono text-[#86AACF] shrink-0">
                      {mem.confidence}% conf
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'DECISIONS' && (
            <div className="space-y-2.5">
              {projectDecisions.length === 0 ? (
                <div className="p-8 text-center text-[12px] text-[#86AACF] font-mono bg-[#112436] rounded-sm border border-[#26425A]">
                  No decisions recorded for this context yet.
                </div>
              ) : (
                projectDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-3.5 bg-[#112436] border border-[#26425A] rounded-sm text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#C38EB4] font-bold text-[11px]">{dec.id}</span>
                        <span className="text-[#FFFFFF] font-medium text-[13.5px]">{dec.title}</span>
                      </div>
                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-[#0C1D44] text-[#86AACF] border border-[#26425A]">
                        {dec.status}
                      </span>
                    </div>
                    <p className="text-[#E1CBD7] text-[12.5px] leading-relaxed bg-[#0E1F2E] p-2.5 rounded border border-[#26425A]">
                      {dec.rationale}
                    </p>
                    {dec.changeExplanation && (
                      <div className="text-[11px] font-mono text-[#C38EB4]">
                        CHANGE: {dec.changeExplanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'COMMITMENTS' && (
            <div className="space-y-2">
              {projectCommitments.length === 0 ? (
                <div className="p-8 text-center text-[12px] text-[#86AACF] font-mono bg-[#112436] rounded-sm border border-[#26425A]">
                  No commitments tracked for this context.
                </div>
              ) : (
                projectCommitments.map((com) => {
                  const isDone = com.status === 'COMPLETED';
                  return (
                    <div
                      key={com.id}
                      className="p-3 bg-[#112436] border border-[#26425A] rounded-sm flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => onToggleCommitment(com.id)}
                          className="w-3.5 h-3.5 rounded bg-[#0E1F2E] border-[#26425A] accent-[#86AACF] cursor-pointer"
                        />
                        <div>
                          <span className={`text-[13px] font-medium ${isDone ? 'line-through text-[#86AACF]' : 'text-[#FFFFFF]'}`}>
                            {com.title}
                          </span>
                          <div className="text-[10px] font-mono text-[#86AACF] mt-0.5">
                            DUE: {com.dueDate} · PRIORITY: {com.priority}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-mono px-2 py-0.2 rounded bg-[#0C1D44] text-[#E1CBD7]">
                        {com.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'ACTIVITY' && (
            <div className="bg-[#112436] border border-[#26425A] rounded-sm divide-y divide-[#26425A] overflow-hidden shadow-sm">
              {projectActivities.length === 0 ? (
                <div className="p-8 text-center text-[12px] text-[#86AACF] font-mono">
                  No activity logged yet for this context.
                </div>
              ) : (
                projectActivities.map((act) => (
                  <div key={act.id} className="p-3 text-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-[#0C1D44] text-[#86AACF] uppercase border border-[#26425A]">
                          {act.type}
                        </span>
                        <span className="text-[#FFFFFF] font-medium text-[13px]">{act.title}</span>
                      </div>
                      <p className="text-[#E1CBD7] mt-0.5 text-[12.5px]">{act.description}</p>
                    </div>
                    <span className="text-[10.5px] font-mono text-[#86AACF] shrink-0">{act.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE NEW PROJECT CONTEXT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-3 flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4" />
              CREATE PROJECT CONTEXT
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Context Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Distributed Consensus Engine"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope, mandate, and intended deliverable..."
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-3 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-3 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="STABLE">STABLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Strategic Goals (one per line)
                </label>
                <textarea
                  rows={2}
                  value={goalsStr}
                  onChange={(e) => setGoalsStr(e.target.value)}
                  placeholder="Benchmark sub-85ms latency&#10;Deploy MCP tool contracts"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Constraints (one per line)
                </label>
                <textarea
                  rows={2}
                  value={constraintsStr}
                  onChange={(e) => setConstraintsStr(e.target.value)}
                  placeholder="Zero client-side secrets&#10;Sub-85ms response SLA"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
                >
                  Create Context
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT CONTEXT MODAL */}
      {isEditOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-3 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              EDIT CONTEXT: {selectedProject.id}
            </h3>

            <form onSubmit={handleSaveEditProject} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Context Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-3 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-3 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  >
                    <option value="ACTIVE" className="bg-[#112436]">ACTIVE</option>
                    <option value="PLANNING" className="bg-[#112436]">PLANNING</option>
                    <option value="STABLE" className="bg-[#112436]">STABLE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Strategic Goals (one per line)
                </label>
                <textarea
                  rows={2}
                  value={editGoalsStr}
                  onChange={(e) => setEditGoalsStr(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Constraints (one per line)
                </label>
                <textarea
                  rows={2}
                  value={editConstraintsStr}
                  onChange={(e) => setEditConstraintsStr(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
                >
                  Save Context
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
