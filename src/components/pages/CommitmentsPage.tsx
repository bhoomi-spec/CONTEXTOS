import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit3
} from 'lucide-react';
import { Commitment, CommitmentPriority, ProjectContext, Memory } from '../../types';
import { calculateDaysOverdue, calculateDaysRemaining } from '../../utils/dateUtils';

interface CommitmentsPageProps {
  commitments: Commitment[];
  projects: ProjectContext[];
  memories: Memory[];
  onAddCommitment: (com: Omit<Commitment, 'id' | 'createdAt'>) => void;
  onToggleCommitment: (id: string) => void;
  onUpdateCommitment: (id: string, updates: Partial<Commitment>) => void;
  onDeleteCommitment: (id: string) => void;
}

export const CommitmentsPage: React.FC<CommitmentsPageProps> = ({
  commitments,
  projects,
  memories,
  onAddCommitment,
  onToggleCommitment,
  onUpdateCommitment,
  onDeleteCommitment
}) => {
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'PRJ-AI-RESEARCH');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [priority, setPriority] = useState<CommitmentPriority>('HIGH');

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<CommitmentPriority>('HIGH');

  const startEdit = (c: Commitment) => {
    setEditingCommitment(c);
    setEditTitle(c.title);
    setEditDescription(c.description || '');
    setEditProjectId(c.projectId);
    setEditDueDate(c.dueDate);
    setEditPriority(c.priority);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingCommitment) setEditingCommitment(null);
        else if (isAddOpen) setIsAddOpen(false);
        else if (confirmDeleteId) setConfirmDeleteId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCommitment, isAddOpen, confirmDeleteId]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommitment || !editTitle.trim()) return;
    onUpdateCommitment(editingCommitment.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      projectId: editProjectId,
      dueDate: editDueDate,
      priority: editPriority
    });
    setEditingCommitment(null);
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filtered = commitments.filter((c) => {
    if (filterProject !== 'ALL' && c.projectId !== filterProject) return false;
    if (filterPriority !== 'ALL' && c.priority !== filterPriority) return false;
    return true;
  });

  const overdue = filtered.filter((c) => {
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
    return new Date(c.dueDate) < startOfToday;
  });

  const upcoming = filtered.filter((c) => {
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') return false;
    return new Date(c.dueDate) >= startOfToday;
  });

  const completed = filtered.filter((c) => c.status === 'COMPLETED');

  const totalOpen = overdue.length + upcoming.length;
  const completionRate =
    commitments.length > 0
      ? Math.round((completed.length / commitments.length) * 100)
      : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddCommitment({
      title: title.trim(),
      description: description.trim(),
      projectId,
      dueDate,
      priority,
      status: 'OPEN'
    });

    setTitle('');
    setDescription('');
    setIsAddOpen(false);
  };

  const getPriorityBadge = (p: CommitmentPriority) => {
    switch (p) {
      case 'HIGH':
        return 'text-[#C38EB4] bg-[#0C1D44] border-[#C38EB4]/40';
      case 'MEDIUM':
        return 'text-[#86AACF] bg-[#0C1D44] border-[#86AACF]/40';
      case 'LOW':
        return 'text-[#E1CBD7] bg-[#112436] border-[#26425A]';
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 card-hover-fx shadow-sm">
          <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-1 flex items-center justify-between">
            <span>TOTAL OPEN</span>
            <Clock className="w-3.5 h-3.5 text-[#86AACF]" />
          </div>
          <div className="text-[28px] font-normal text-[#FFFFFF] font-mono tabular-nums">{totalOpen}</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">active tracking</div>
        </div>

        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 card-hover-fx shadow-sm">
          <div className="text-[10.5px] font-mono text-[#C38EB4] uppercase mb-1 flex items-center justify-between">
            <span>OVERDUE SLA</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#C38EB4]" />
          </div>
          <div className="text-[28px] font-normal text-[#C38EB4] font-mono tabular-nums">{overdue.length}</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">requires intervention</div>
        </div>

        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 card-hover-fx shadow-sm">
          <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-1 flex items-center justify-between">
            <span>UPCOMING</span>
            <Calendar className="w-3.5 h-3.5 text-[#86AACF]" />
          </div>
          <div className="text-[28px] font-normal text-[#FFFFFF] font-mono tabular-nums">{upcoming.length}</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">within sprint window</div>
        </div>

        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 card-hover-fx shadow-sm">
          <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-1 flex items-center justify-between">
            <span>COMPLETION RATE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#86AACF]" />
          </div>
          <div className="text-[28px] font-normal text-[#86AACF] font-mono tabular-nums">{completionRate}%</div>
          <div className="text-[11px] font-mono text-[#86AACF] mt-0.5">{completed.length} completed</div>
        </div>
      </div>

      {/* LARGE COMMITMENT SLA & DEADLINE HORIZON HISTOGRAM */}
      {(() => {
        const total = commitments.length || 1;
        const openTasks = [...overdue, ...upcoming];
        const overdueCount = overdue.length;
        const upcomingCount = upcoming.length;
        const otherActiveCount = Math.max(0, openTasks.length - overdueCount - upcomingCount);
        const completedCount = completed.length;

        const overduePct = Math.round((overdueCount / total) * 100);
        const upcomingPct = Math.round((upcomingCount / total) * 100);
        const activePct = Math.round((otherActiveCount / total) * 100);
        const completedPct = Math.round((completedCount / total) * 100);

        // Buckets across time horizons
        const buckets = [
          {
            label: 'OVERDUE SLA',
            sub: '< 0 days',
            items: overdue,
            accent: '#C38EB4'
          },
          {
            label: 'DUE 48H',
            sub: '0 - 2 days',
            items: openTasks.filter((c) => {
              const diff = (new Date(c.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return diff >= 0 && diff <= 2;
            }),
            accent: '#C38EB4'
          },
          {
            label: 'DUE 7D',
            sub: '3 - 7 days',
            items: openTasks.filter((c) => {
              const diff = (new Date(c.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return diff > 2 && diff <= 7;
            }),
            accent: '#86AACF'
          },
          {
            label: 'DUE 14D',
            sub: '8 - 14 days',
            items: openTasks.filter((c) => {
              const diff = (new Date(c.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return diff > 7 && diff <= 14;
            }),
            accent: '#86AACF'
          },
          {
            label: 'DUE 30D+',
            sub: '> 14 days',
            items: openTasks.filter((c) => {
              const diff = (new Date(c.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
              return diff > 14;
            }),
            accent: '#26425A'
          },
          {
            label: 'COMPLETED',
            sub: 'audited',
            items: completed,
            accent: '#E1CBD7'
          }
        ];

        const bucketData = buckets.map((b) => {
          const high = b.items.filter((c) => c.priority === 'HIGH').length;
          const med = b.items.filter((c) => c.priority === 'MEDIUM').length;
          const low = b.items.filter((c) => c.priority === 'LOW').length;
          return {
            ...b,
            total: b.items.length,
            high,
            med,
            low
          };
        });

        const maxBucketCount = Math.max(...bucketData.map((b) => b.total), 4);

        return (
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#C38EB4]"></span>
                  COMMITMENT SLA & DEADLINE HORIZON HISTOGRAM
                </h3>
                <p className="text-[12px] text-[#E1CBD7] mt-0.5">
                  Analytical distribution across urgency intervals and priority stacks (High, Medium, Low).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs text-[#86AACF] bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A]">
                  OPEN QUEUE: <span className="text-[#FFFFFF] font-bold">{openTasks.length}</span> / {commitments.length}
                </div>
              </div>
            </div>

            {/* LARGE COLUMN HISTOGRAM (SVG) */}
            <div className="bg-[#0E1F2E] border border-[#26425A] rounded p-4 relative">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-[#E1CBD7] font-semibold">DEADLINE HORIZON CAPACITY</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#C38EB4]" />
                    <span className="text-[#E1CBD7]">High Priority</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#86AACF]" />
                    <span className="text-[#E1CBD7]">Medium Priority</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#26425A]" />
                    <span className="text-[#E1CBD7]">Low Priority</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="h-48 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                  {/* Grid guidelines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 145 - pct * 125;
                    const val = Math.round(pct * maxBucketCount);
                    return (
                      <g key={i}>
                        <line x1="45" y1={y} x2="590" y2={y} stroke="#26425A" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                        <text x="35" y={y + 3.5} textAnchor="end" fill="#86AACF" fontSize="9" fontFamily="monospace">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Y-Axis Line */}
                  <line x1="45" y1="20" x2="45" y2="145" stroke="#26425A" strokeWidth="1" />
                  {/* X-Axis Baseline */}
                  <line x1="45" y1="145" x2="590" y2="145" stroke="#26425A" strokeWidth="1" />

                  {/* Columns */}
                  {bucketData.map((b, idx) => {
                    const slotWidth = (590 - 45) / bucketData.length;
                    const colX = 45 + idx * slotWidth + slotWidth / 2;
                    const barWidth = 26;

                    const lowHeight = (b.low / maxBucketCount) * 125;
                    const medHeight = (b.med / maxBucketCount) * 125;
                    const highHeight = (b.high / maxBucketCount) * 125;

                    const lowY = 145 - lowHeight;
                    const medY = lowY - medHeight;
                    const highY = medY - highHeight;

                    return (
                      <g key={b.label} className="group cursor-pointer">
                        {/* Low Priority (Base) */}
                        {b.low > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={lowY}
                            width={barWidth}
                            height={lowHeight}
                            fill="#26425A"
                            rx="1.5"
                            className="transition-all hover:brightness-125"
                          >
                            <title>{`${b.label} Low: ${b.low}`}</title>
                          </rect>
                        )}

                        {/* Medium Priority (Middle) */}
                        {b.med > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={medY}
                            width={barWidth}
                            height={medHeight}
                            fill="#86AACF"
                            rx="1.5"
                            className="transition-all hover:brightness-110"
                          >
                            <title>{`${b.label} Medium: ${b.med}`}</title>
                          </rect>
                        )}

                        {/* High Priority (Top) */}
                        {b.high > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={highY}
                            width={barWidth}
                            height={highHeight}
                            fill="#C38EB4"
                            rx="1.5"
                            className="transition-all hover:brightness-110"
                          >
                            <title>{`${b.label} High: ${b.high}`}</title>
                          </rect>
                        )}

                        {/* Total Count Label Above Bar */}
                        <text
                          x={colX}
                          y={Math.min(highY, medY, lowY) - 5}
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
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {b.label}
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
                          {b.sub}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Interactive Grid: Visuals + Values + Deadline Windows */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 font-mono text-xs">
              {/* Overdue */}
              <button
                type="button"
                onClick={() => setFilterPriority(filterPriority === 'HIGH' ? 'ALL' : 'HIGH')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#C38EB4] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#C38EB4] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C38EB4]" />
                    OVERDUE SLA
                  </span>
                  <span>{overduePct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#C38EB4] leading-none">
                  {overdueCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF] mt-1">breached deadline</div>
              </button>

              {/* Upcoming in 7 Days */}
              <button
                type="button"
                onClick={() => setFilterPriority('ALL')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#86AACF] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#86AACF]" />
                    UPCOMING (7D)
                  </span>
                  <span>{upcomingPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#86AACF] leading-none">
                  {upcomingCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF] mt-1">due within 7 days</div>
              </button>

              {/* Active Later Horizon */}
              <button
                type="button"
                onClick={() => setFilterPriority('ALL')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#26425A] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#26425A]" />
                    ACTIVE HORIZON
                  </span>
                  <span>{activePct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#FFFFFF] leading-none">
                  {otherActiveCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF] mt-1">in-flight queue</div>
              </button>

              {/* Completed Tasks */}
              <button
                type="button"
                onClick={() => setFilterPriority('ALL')}
                className="p-2.5 rounded bg-[#0E1F2E] border border-[#26425A] hover:border-[#E1CBD7] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-[#E1CBD7] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E1CBD7]" />
                    COMPLETED
                  </span>
                  <span>{completedPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#E1CBD7] leading-none">
                  {completedCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF] mt-1">resolved & audited</div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Control bar */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">CONTEXT:</span>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL CONTEXTS</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#112436]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">PRIORITY:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL PRIORITIES</option>
              <option value="HIGH" className="bg-[#112436]">HIGH</option>
              <option value="MEDIUM" className="bg-[#112436]">MEDIUM</option>
              <option value="LOW" className="bg-[#112436]">LOW</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4]/60 hover:border-[#C38EB4] text-[#FFFFFF] text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 text-[#C38EB4]" />
          <span>ADD COMMITMENT</span>
        </button>
      </div>

      {/* SECTION 1: OVERDUE COMMITMENTS */}
      {overdue.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-[#C38EB4] uppercase font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>OVERDUE COMMITMENTS ({overdue.length})</span>
          </div>

          <div className="space-y-2">
            {overdue.map((c) => (
              <div
                key={c.id}
                className="bg-[#112436] border border-[#C38EB4]/50 hover:border-[#C38EB4] rounded-sm p-4 flex items-start justify-between gap-3 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleCommitment(c.id)}
                    className="w-4 h-4 rounded bg-[#0E1F2E] border-[#26425A] accent-[#C38EB4] cursor-pointer mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-[#FFFFFF]">{c.title}</span>
                      <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className="text-[10.5px] font-mono text-[#C38EB4] bg-[#0C1D44] px-1.5 py-0.2 rounded border border-[#C38EB4]/40 font-semibold">
                        DUE: {c.dueDate} ({calculateDaysOverdue(c.dueDate, now)}d OVERDUE)
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[13px] text-[#E1CBD7] mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10.5px] font-mono text-[#86AACF]">
                      <span>CONTEXT: {c.projectName}</span>
                      <span>ID: {c.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-[#86AACF] hover:text-[#FFFFFF] p-1.5 transition-colors"
                    title="Edit Commitment"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="text-[#86AACF] hover:text-[#C38EB4] p-1.5 transition-colors"
                    title="Delete Commitment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: UPCOMING COMMITMENTS */}
      <div className="space-y-2.5">
        <div className="text-[11px] font-mono tracking-wider text-[#86AACF] uppercase font-medium">
          UPCOMING COMMITMENTS ({upcoming.length})
        </div>

        {upcoming.length === 0 ? (
          <div className="p-8 text-center text-[12.5px] text-[#86AACF] font-mono bg-[#112436] rounded-sm border border-[#26425A]">
            No upcoming commitments pending.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((c) => (
              <div
                key={c.id}
                className="bg-[#112436] hover:bg-[#152B3F] border border-[#26425A] rounded-sm p-4 flex items-start justify-between gap-3 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggleCommitment(c.id)}
                    className="w-4 h-4 rounded bg-[#0E1F2E] border-[#26425A] accent-[#86AACF] cursor-pointer mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-[#FFFFFF]">{c.title}</span>
                      <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className="text-[10.5px] font-mono text-[#86AACF]">
                        DUE: {c.dueDate} (in {calculateDaysRemaining(c.dueDate, now)}d)
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[13px] text-[#E1CBD7] mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10.5px] font-mono text-[#86AACF]">
                      <span>CONTEXT: {c.projectName}</span>
                      <span>ID: {c.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-[#86AACF] hover:text-[#FFFFFF] p-1.5 transition-colors"
                    title="Edit Commitment"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    className="text-[#86AACF] hover:text-[#C38EB4] p-1.5 transition-colors"
                    title="Delete Commitment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: COMPLETED ARCHIVE */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono tracking-wider text-[#86AACF] uppercase font-medium">
          COMPLETED ARCHIVE ({completed.length})
        </div>

        <div className="space-y-1.5 opacity-80 hover:opacity-100 transition-opacity">
          {completed.map((c) => (
            <div
              key={c.id}
              className="bg-[#0E1F2E] border border-[#26425A] rounded-sm p-3 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => onToggleCommitment(c.id)}
                  className="w-4 h-4 rounded bg-[#0E1F2E] border-[#26425A] accent-[#86AACF] cursor-pointer"
                />
                <span className="line-through text-[#86AACF] text-[13px]">{c.title}</span>
                <span className="text-[10.5px] font-mono text-[#86AACF]">({c.projectName})</span>
              </div>
              <span className="text-[9.5px] font-mono text-[#86AACF] bg-[#0C1D44] px-2 py-0.5 rounded border border-[#26425A]">COMPLETED</span>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE COMMITMENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-3 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" />
              RECORD ACTIONABLE COMMITMENT
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Commitment Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Run 50 iterations on sub-85ms latency budget"
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specific deliverables and pass/fail criterion..."
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Context
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
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
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  >
                    <option value="HIGH" className="bg-[#112436]">HIGH</option>
                    <option value="MEDIUM" className="bg-[#112436]">MEDIUM</option>
                    <option value="LOW" className="bg-[#112436]">LOW</option>
                  </select>
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
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8] transition-colors shadow-sm"
                >
                  Add Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMMITMENT MODAL */}
      {editingCommitment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-md p-5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#C38EB4] font-bold mb-3 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              EDIT COMMITMENT: {editingCommitment.id}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                  Commitment Title *
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
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Context
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
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
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none"
                  >
                    <option value="HIGH" className="bg-[#112436]">HIGH</option>
                    <option value="MEDIUM" className="bg-[#112436]">MEDIUM</option>
                    <option value="LOW" className="bg-[#112436]">LOW</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                <button
                  type="button"
                  onClick={() => setEditingCommitment(null)}
                  className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8] transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#112436] border border-[#C38EB4]/60 rounded-md p-5 shadow-2xl space-y-3">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#C38EB4]">
              REMOVE COMMITMENT
            </h3>
            <p className="text-[13px] text-[#E1CBD7] leading-relaxed">
              Are you sure you want to delete this commitment record?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#26425A]">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCommitment(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-3.5 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8] transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
