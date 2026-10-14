import React, { useState, useMemo } from 'react';
import {
  BrainCircuit,
  FolderGit2,
  GitCommit,
  CheckSquare,
  Activity,
  ArrowRight,
  ShieldAlert,
  Search,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ProjectContext,
  ActivityEvent,
  MemoryConflict,
  NavigationPage,
  Memory,
  Decision,
  Commitment
} from '../../types';
import { formatRelativeTime, calculateDaysOverdue, calculateDaysRemaining } from '../../utils/dateUtils';
import { ActivityHeatmap } from '../common/ActivityHeatmap';

interface MissionControlPageProps {
  metrics: {
    totalMemories: number;
    activeProjectsCount: number;
    recordedDecisions: number;
    openCommitmentsCount: number;
    overdueCommitmentsCount: number;
    totalUpdates: number;
    unresolvedConflictsCount: number;
  };
  projects: ProjectContext[];
  activities: ActivityEvent[];
  conflicts: MemoryConflict[];
  memories?: Memory[];
  decisions?: Decision[];
  commitments?: Commitment[];
  onOpenProject: (projectId: string) => void;
  onOpenCapture: () => void;
  onNavigate: (page: NavigationPage) => void;
  onResolveConflict: (conflictId: string, notes: string) => void;
}

export const MissionControlPage: React.FC<MissionControlPageProps> = ({
  metrics,
  projects,
  activities,
  conflicts,
  memories = [],
  decisions = [],
  commitments = [],
  onOpenProject,
  onOpenCapture,
  onNavigate,
  onResolveConflict
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'ALL' | '30D' | '7D'>('ALL');
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'MEMORIES' | 'DECISIONS' | 'CONFLICTS'>('ALL');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    date: string;
    memories: number;
    decisionsAndTasks: number;
    x: number;
    y1: number;
    y2: number;
  } | null>(null);

  const activeConflicts = conflicts.filter((c) => c.status === 'UNRESOLVED');

  // Compute Current vs Superseded decisions
  const currentDecisionsCount = decisions.filter((d) => d.status === 'CURRENT').length;

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedProjectFilter !== 'ALL' && act.projectId !== selectedProjectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !act.title.toLowerCase().includes(q) &&
          !act.description.toLowerCase().includes(q) &&
          !act.projectName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (activityFilter === 'MEMORIES') return act.type.startsWith('MEMORY');
      if (activityFilter === 'DECISIONS') return act.type.startsWith('DECISION');
      if (activityFilter === 'CONFLICTS') return act.type.startsWith('CONFLICT');
      return true;
    });
  }, [activities, selectedProjectFilter, searchQuery, activityFilter]);

  // Memory status distribution from real data
  const memoryStats = useMemo(() => {
    const total = memories.length || 1;
    const current = memories.filter((m) => m.validity === 'CURRENT').length;
    const superseded = memories.filter((m) => m.validity === 'SUPERSEDED').length;
    const uncertain = memories.filter((m) => m.validity === 'UNCERTAIN').length;
    const archived = memories.filter((m) => m.validity === 'ARCHIVED').length;
    return {
      current,
      superseded,
      uncertain,
      archived,
      currentPct: Math.round((current / total) * 100),
      supersededPct: Math.round((superseded / total) * 100),
      uncertainPct: Math.round((uncertain / total) * 100),
      archivedPct: Math.round((archived / total) * 100)
    };
  }, [memories]);

  // Commitment status distribution from real data
  const commitmentStats = useMemo(() => {
    const total = commitments.length || 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completed = commitments.filter((c) => c.status === 'COMPLETED').length;
    const overdue = commitments.filter((c) => c.status !== 'COMPLETED' && new Date(c.dueDate) < today).length;
    const open = commitments.filter((c) => c.status !== 'COMPLETED' && new Date(c.dueDate) >= today).length;

    return {
      total: commitments.length,
      completed,
      overdue,
      open,
      completedPct: Math.round((completed / total) * 100),
      overduePct: Math.round((overdue / total) * 100),
      openPct: Math.round((open / total) * 100)
    };
  }, [commitments]);

  // Aggregate daily activity timeline from real store records for Area Chart
  const chartData = useMemo(() => {
    // 1. Gather all events from activities, memories, decisions, commitments
    const memoryEventsByDate = new Map<string, number>();
    const decisionEventsByDate = new Map<string, number>();

    // Count activities matching project filter
    activities.forEach((act) => {
      if (selectedProjectFilter !== 'ALL' && act.projectId !== selectedProjectFilter) return;
      const dateStr = act.timestampISO ? act.timestampISO.slice(0, 10) : '2026-10-10';
      if (act.type.startsWith('MEMORY')) {
        memoryEventsByDate.set(dateStr, (memoryEventsByDate.get(dateStr) || 0) + 1);
      } else if (act.type.startsWith('DECISION') || act.type.startsWith('COMMITMENT')) {
        decisionEventsByDate.set(dateStr, (decisionEventsByDate.get(dateStr) || 0) + 1);
      }
    });

    // Supplement with direct memory records
    const knownActivityRelatedIds = new Set(activities.map((a) => a.relatedId).filter(Boolean));

    memories.forEach((mem) => {
      if (selectedProjectFilter !== 'ALL' && mem.projectId !== selectedProjectFilter) return;
      if (!knownActivityRelatedIds.has(mem.id)) {
        const dateStr = mem.createdAt.slice(0, 10);
        memoryEventsByDate.set(dateStr, (memoryEventsByDate.get(dateStr) || 0) + 1);
      }
    });

    // Supplement with direct decisions
    decisions.forEach((dec) => {
      if (selectedProjectFilter !== 'ALL' && dec.projectId !== selectedProjectFilter) return;
      if (!knownActivityRelatedIds.has(dec.id)) {
        const dateStr = dec.createdAt.slice(0, 10);
        decisionEventsByDate.set(dateStr, (decisionEventsByDate.get(dateStr) || 0) + 1);
      }
    });

    // Supplement with direct commitments
    commitments.forEach((com) => {
      if (selectedProjectFilter !== 'ALL' && com.projectId !== selectedProjectFilter) return;
      if (!knownActivityRelatedIds.has(com.id)) {
        const dateStr = com.createdAt.slice(0, 10);
        decisionEventsByDate.set(dateStr, (decisionEventsByDate.get(dateStr) || 0) + 1);
      }
    });

    // 2. Establish contiguous chronological date range
    const allKnownDates = new Set<string>([
      ...memoryEventsByDate.keys(),
      ...decisionEventsByDate.keys()
    ]);

    // Reference today date
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    allKnownDates.add(todayStr);

    const sortedKnownDates = Array.from(allKnownDates).sort();
    const latestDateStr = sortedKnownDates[sortedKnownDates.length - 1] || '2026-10-10';
    const latestDate = new Date(latestDateStr + 'T12:00:00Z');

    let dayCount = 7;
    if (timeRange === '7D') {
      dayCount = 7;
    } else if (timeRange === '30D') {
      dayCount = 30;
    } else {
      // ALL: compute days from earliest known date to latestDate, min 7
      const earliestDateStr = sortedKnownDates[0] || '2026-10-04';
      const earliestDate = new Date(earliestDateStr + 'T12:00:00Z');
      const diffDays = Math.max(7, Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 3600 * 24)) + 1);
      dayCount = Math.min(diffDays, 60);
    }

    // Build contiguous array of days
    const result: { date: string; label: string; memories: number; decisionsAndTasks: number }[] = [];
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(latestDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().slice(0, 10);
      const mCount = memoryEventsByDate.get(dStr) || 0;
      const dCount = decisionEventsByDate.get(dStr) || 0;
      result.push({
        date: dStr,
        label: dStr.slice(5), // MM-DD
        memories: mCount,
        decisionsAndTasks: dCount
      });
    }

    return result;
  }, [activities, memories, decisions, commitments, selectedProjectFilter, timeRange]);

  // Area Chart SVG calculations
  const chartSvg = useMemo(() => {
    if (chartData.length < 2) return null;

    const width = 800;
    const height = 180;
    const padX = 40;
    const padY = 24;

    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.memories, d.decisionsAndTasks)),
      4
    );

    const stepX = (width - padX * 2) / (chartData.length - 1);

    const pointsSeries1 = chartData.map((d, i) => {
      const x = padX + i * stepX;
      const y = height - padY - (d.memories / maxVal) * (height - padY * 2);
      return { x, y, val: d.memories, date: d.date };
    });

    const pointsSeries2 = chartData.map((d, i) => {
      const x = padX + i * stepX;
      const y = height - padY - (d.decisionsAndTasks / maxVal) * (height - padY * 2);
      return { x, y, val: d.decisionsAndTasks, date: d.date };
    });

    // Generate smooth SVG path (cubic bezier)
    const createSmoothPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return '';
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cp1x = curr.x + (next.x - curr.x) / 2;
        const cp1y = curr.y;
        const cp2x = curr.x + (next.x - curr.x) / 2;
        const cp2y = next.y;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      }
      return path;
    };

    const path1 = createSmoothPath(pointsSeries1);
    const path2 = createSmoothPath(pointsSeries2);

    const area1 = `${path1} L ${pointsSeries1[pointsSeries1.length - 1].x} ${height - padY} L ${pointsSeries1[0].x} ${height - padY} Z`;
    const area2 = `${path2} L ${pointsSeries2[pointsSeries2.length - 1].x} ${height - padY} L ${pointsSeries2[0].x} ${height - padY} Z`;

    return {
      width,
      height,
      pointsSeries1,
      pointsSeries2,
      path1,
      path2,
      area1,
      area2,
      maxVal
    };
  }, [chartData]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* TOP FILTER & SEARCH TOOLBAR */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#86AACF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity, context changes, or decisions..."
            className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-1.5 pl-9 text-xs text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#86AACF] font-mono">
            <span>CONTEXT:</span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-[#0E1F2E] border border-[#26425A] text-[#FFFFFF] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#86AACF]"
            >
              <option value="ALL">ALL PROJECTS</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-[#0E1F2E] border border-[#26425A] rounded p-0.5 text-[11px] font-mono">
            {(['ALL', '30D', '7D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  timeRange === r
                    ? 'bg-[#0C1D44] text-[#FFFFFF] font-medium border border-[#C38EB4]/60'
                    : 'text-[#86AACF] hover:text-[#FFFFFF]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE CONFLICT BANNER IF PRESENT */}
      {activeConflicts.length > 0 && (
        <div className="bg-[#112436] border border-[#C38EB4]/80 rounded-sm p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#0C1D44] text-[#C38EB4] shrink-0 mt-0.5 border border-[#26425A]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#FFFFFF]">
                  Temporal Conflict Detected: {activeConflicts[0].title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0C1D44] text-[#C38EB4] border border-[#C38EB4]/40 font-semibold">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-[13px] text-[#E1CBD7] mt-1 max-w-2xl leading-relaxed">
                {activeConflicts[0].description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onResolveConflict(
                  activeConflicts[0].id,
                  'Normalized embeddings pipeline: standardized on 768-dim models for edge latency compliance.'
                );
              }}
              className="px-3 py-1.5 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4] text-[#FFFFFF] text-xs font-semibold transition-colors"
            >
              Resolve & Standardize (768-dim)
            </button>
            <button
              onClick={() => onNavigate('conflicts')}
              className="px-2.5 py-1.5 text-xs text-[#86AACF] hover:text-[#FFFFFF] transition-colors"
            >
              View All ({activeConflicts.length}) →
            </button>
          </div>
        </div>
      )}

      {/* METRIC CARDS ROW (Exact data-store values) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Card 1: TOTAL MEMORIES */}
        <div
          onClick={() => onNavigate('memory-explorer')}
          className="bg-[#112436] border border-[#26425A] hover:border-[#86AACF] transition-all rounded-sm p-3.5 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#86AACF] uppercase mb-1.5">
            <div className="flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-[#86AACF]" />
              <span>MEMORIES</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span>
          </div>
          <div className="text-[28px] font-medium tracking-tight text-[#FFFFFF] font-mono tabular-nums leading-tight">
            {metrics.totalMemories}
          </div>
          <div className="text-[10px] font-mono text-[#86AACF] mt-1 truncate">
            {memoryStats.current} current · {memoryStats.superseded} superseded
          </div>
        </div>

        {/* Card 2: CURRENT DECISIONS */}
        <div
          onClick={() => onNavigate('decision-timeline')}
          className="bg-[#112436] border border-[#26425A] hover:border-[#C38EB4] transition-all rounded-sm p-3.5 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#86AACF] uppercase mb-1.5">
            <div className="flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-[#C38EB4]" />
              <span>DECISIONS</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C38EB4]"></span>
          </div>
          <div className="text-[28px] font-medium tracking-tight text-[#FFFFFF] font-mono tabular-nums leading-tight">
            {currentDecisionsCount}
          </div>
          <div className="text-[10px] font-mono text-[#86AACF] mt-1 truncate">
            {decisions.length} total in DAG
          </div>
        </div>

        {/* Card 3: OPEN COMMITMENTS */}
        <div
          onClick={() => onNavigate('commitments')}
          className="bg-[#112436] border border-[#26425A] hover:border-[#86AACF] transition-all rounded-sm p-3.5 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#86AACF] uppercase mb-1.5">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[#86AACF]" />
              <span>COMMITMENTS</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span>
          </div>
          <div className="text-[28px] font-medium tracking-tight text-[#FFFFFF] font-mono tabular-nums leading-tight">
            {metrics.openCommitmentsCount}
          </div>
          <div className="text-[10px] font-mono text-[#86AACF] mt-1 truncate">
            {commitmentStats.completed} completed
          </div>
        </div>

        {/* Card 4: OVERDUE COMMITMENTS */}
        <div
          onClick={() => onNavigate('commitments')}
          className="bg-[#112436] border border-[#26425A] hover:border-[#C38EB4] transition-all rounded-sm p-3.5 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#C38EB4] uppercase mb-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C38EB4]" />
              <span>OVERDUE</span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${metrics.overdueCommitmentsCount > 0 ? 'bg-[#C38EB4]' : 'bg-[#26425A]'}`}></span>
          </div>
          <div className="text-[28px] font-medium tracking-tight text-[#FFFFFF] font-mono tabular-nums leading-tight flex items-baseline gap-1">
            <span>{metrics.overdueCommitmentsCount}</span>
            {metrics.overdueCommitmentsCount > 0 && (
              <span className="text-[11px] font-mono text-[#C38EB4] font-semibold">URGENT</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-[#86AACF] mt-1 truncate">
            requires triage
          </div>
        </div>

        {/* Card 5: UNRESOLVED CONFLICTS */}
        <div
          onClick={() => onNavigate('conflicts')}
          className="bg-[#112436] border border-[#26425A] hover:border-[#C38EB4] transition-all rounded-sm p-3.5 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#86AACF] uppercase mb-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#C38EB4]" />
              <span>CONFLICTS</span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${metrics.unresolvedConflictsCount > 0 ? 'bg-[#C38EB4]' : 'bg-[#86AACF]'}`}></span>
          </div>
          <div className="text-[28px] font-medium tracking-tight text-[#FFFFFF] font-mono tabular-nums leading-tight">
            {metrics.unresolvedConflictsCount}
          </div>
          <div className="text-[10px] font-mono text-[#86AACF] mt-1 truncate">
            contradictions flagged
          </div>
        </div>

        {/* Card 6: ACTIVE PROJECTS */}
        <div
          onClick={() => onNavigate('projects')}
          className="bg-[#112436] border border-[#26425A] hover:border-[#86AACF] transition-all rounded-sm p-3.5 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-[#86AACF] uppercase mb-1.5">
            <div className="flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-[#86AACF]" />
              <span>PROJECTS</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span>
          </div>
          <div className="text-[28px] font-medium tracking-tight text-[#FFFFFF] font-mono tabular-nums leading-tight">
            {metrics.activeProjectsCount}
          </div>
          <div className="text-[10px] font-mono text-[#86AACF] mt-1 truncate">
            {projects.length} contexts tracked
          </div>
        </div>
      </div>

      {/* MAIN VISUALIZATION: CONTEXT ACTIVITY SMOOTH AREA CHART */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#C38EB4]" />
              <h2 className="text-[14px] font-medium font-mono uppercase tracking-wider text-[#FFFFFF]">
                CONTEXT ACTIVITY & TEMPORAL EVOLUTION
              </h2>
            </div>
            <p className="text-[12px] text-[#E1CBD7] mt-0.5">
              Trends for memory creation, decision supersessions, and commitment updates over time.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C38EB4]"></span>
              <span className="text-[#E1CBD7]">Memories & Facts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#86AACF]"></span>
              <span className="text-[#E1CBD7]">Decisions & Tasks</span>
            </div>
          </div>
        </div>

        {/* SVG Area Chart */}
        {chartSvg ? (
          <div className="relative w-full overflow-hidden select-none">
            <svg
              viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`}
              className="w-full h-48 overflow-visible"
            >
              <defs>
                <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C38EB4" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#C38EB4" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#86AACF" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#86AACF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="20" x2="760" y2="20" stroke="#26425A" strokeDasharray="3 3" />
              <line x1="40" y1="80" x2="760" y2="80" stroke="#26425A" strokeDasharray="3 3" />
              <line x1="40" y1="140" x2="760" y2="140" stroke="#26425A" strokeDasharray="3 3" />
              <line x1="40" y1="160" x2="760" y2="160" stroke="#26425A" />

              {/* Area Fills */}
              <path d={chartSvg.area1} fill="url(#roseGradient)" />
              <path d={chartSvg.area2} fill="url(#blueGradient)" />

              {/* Stroke Lines */}
              <path d={chartSvg.path1} fill="none" stroke="#C38EB4" strokeWidth="2.2" strokeLinecap="round" />
              <path d={chartSvg.path2} fill="none" stroke="#86AACF" strokeWidth="2" strokeLinecap="round" />

              {/* Data points & interactive hit areas */}
              {chartSvg.pointsSeries1.map((p, i) => (
                <g key={`pt1-${i}`}>
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#C38EB4" stroke="#0E1F2E" strokeWidth="1.5" />
                  <circle
                    cx={p.x}
                    cy={chartSvg.pointsSeries2[i].y}
                    r="3.5"
                    fill="#86AACF"
                    stroke="#0E1F2E"
                    strokeWidth="1.5"
                  />
                  {/* Invisible broad hover hit rect */}
                  <rect
                    x={p.x - 18}
                    y={0}
                    width={36}
                    height={chartSvg.height}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredDataPoint({
                        date: p.date,
                        memories: p.val,
                        decisionsAndTasks: chartSvg.pointsSeries2[i].val,
                        x: p.x,
                        y1: p.y,
                        y2: chartSvg.pointsSeries2[i].y
                      })
                    }
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  />
                </g>
              ))}

              {/* X Axis Date Labels */}
              {chartData.map((d, i) => {
                if (chartData.length > 8 && i % 2 !== 0 && i !== chartData.length - 1) return null;
                const x = 40 + i * ((chartSvg.width - 80) / (chartData.length - 1));
                return (
                  <text
                    key={`lbl-${i}`}
                    x={x}
                    y={chartSvg.height - 4}
                    fill="#86AACF"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                );
              })}
            </svg>

            {/* Interactive Tooltip Overlay */}
            {hoveredDataPoint && (
              <div
                className="absolute z-20 pointer-events-none p-2 rounded bg-[#0C1D44] border border-[#26425A] shadow-xl text-xs font-mono text-[#FFFFFF]"
                style={{
                  left: `${(hoveredDataPoint.x / chartSvg.width) * 100}%`,
                  top: '10px',
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="font-semibold text-[#E1CBD7] pb-1 border-b border-[#26425A]">
                  {hoveredDataPoint.date}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[#C38EB4]">
                  <span>Memories:</span>
                  <span className="font-bold">{hoveredDataPoint.memories}</span>
                </div>
                <div className="flex items-center gap-2 text-[#86AACF]">
                  <span>Decisions/Tasks:</span>
                  <span className="font-bold">{hoveredDataPoint.decisionsAndTasks}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-xs font-mono text-[#86AACF]">
            Insufficient historical date records to generate continuous area trend.
          </div>
        )}
      </div>

      {/* CALENDAR-BASED ACTIVITY HEATMAP COMPONENT */}
      <ActivityHeatmap
        activities={activities}
        memories={memories}
        decisions={decisions}
        commitments={commitments}
        weeksToShow={12}
      />

      {/* COMPACT DISTRIBUTIONS (Memory Status & Commitment Breakdown) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Memory Status Breakdown */}
        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#FFFFFF] uppercase font-semibold">MEMORY STATUS DISTRIBUTION</span>
            <span className="text-[#86AACF]">{metrics.totalMemories} RECORDS</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#0E1F2E] h-2.5 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${memoryStats.currentPct}%` }}
              className="bg-[#86AACF] h-full"
              title={`Current: ${memoryStats.current}`}
            />
            <div
              style={{ width: `${memoryStats.supersededPct}%` }}
              className="bg-[#26425A] h-full"
              title={`Superseded: ${memoryStats.superseded}`}
            />
            <div
              style={{ width: `${memoryStats.uncertainPct}%` }}
              className="bg-[#C38EB4] h-full"
              title={`Uncertain: ${memoryStats.uncertain}`}
            />
            <div
              style={{ width: `${memoryStats.archivedPct}%` }}
              className="bg-[#E1CBD7] h-full"
              title={`Archived: ${memoryStats.archived}`}
            />
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#86AACF]"></span>
              <span className="text-[#E1CBD7]">Current ({memoryStats.current})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#26425A]"></span>
              <span className="text-[#E1CBD7]">Super ({memoryStats.superseded})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C38EB4]"></span>
              <span className="text-[#E1CBD7]">Uncert ({memoryStats.uncertain})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E1CBD7]"></span>
              <span className="text-[#E1CBD7]">Arch ({memoryStats.archived})</span>
            </div>
          </div>
        </div>

        {/* Commitment Status Breakdown */}
        <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#FFFFFF] uppercase font-semibold">COMMITMENT STATUS BREAKDOWN</span>
            <span className="text-[#86AACF]">{commitmentStats.total} TOTAL TASKS</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#0E1F2E] h-2.5 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${commitmentStats.openPct}%` }}
              className="bg-[#86AACF] h-full"
              title={`Open: ${commitmentStats.open}`}
            />
            <div
              style={{ width: `${commitmentStats.overduePct}%` }}
              className="bg-[#C38EB4] h-full"
              title={`Overdue: ${commitmentStats.overdue}`}
            />
            <div
              style={{ width: `${commitmentStats.completedPct}%` }}
              className="bg-[#26425A] h-full"
              title={`Completed: ${commitmentStats.completed}`}
            />
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#86AACF]"></span>
              <span className="text-[#E1CBD7]">Open ({commitmentStats.open})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C38EB4]"></span>
              <span className="text-[#E1CBD7]">Overdue ({commitmentStats.overdue})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#26425A]"></span>
              <span className="text-[#E1CBD7]">Done ({commitmentStats.completed})</span>
            </div>
          </div>
        </div>
      </div>

      {/* STAR DIVIDER */}
      <div className="star-divider py-1">
        <span className="text-xs text-[#86AACF]">✦</span>
      </div>

      {/* TWO-COLUMN SUPPORTING PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT SECTION: ACTIVE CONTEXTS & HEALTH (~62% width) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono tracking-widest text-[#86AACF] uppercase font-medium">
              ACTIVE CONTEXTS & HEALTH
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="text-[11px] font-mono text-[#C38EB4] hover:underline flex items-center gap-1"
            >
              ALL CONTEXTS →
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((project) => {
              const statusColor =
                project.status === 'ACTIVE'
                  ? 'text-[#C38EB4]'
                  : project.status === 'STABLE'
                  ? 'text-[#86AACF]'
                  : 'text-[#E1CBD7]';

              const dotBg =
                project.status === 'ACTIVE'
                  ? 'bg-[#C38EB4]'
                  : project.status === 'STABLE'
                  ? 'bg-[#86AACF]'
                  : 'bg-[#26425A]';

              return (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="bg-[#112436] border border-[#26425A] hover:border-[#86AACF] rounded-sm p-4 transition-colors cursor-pointer group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-medium text-[#FFFFFF] tracking-tight group-hover:text-white transition-colors">
                          {project.name}
                        </h3>
                        <span className="text-[10px] font-mono text-[#86AACF]">({project.id})</span>
                      </div>
                      <p className="text-[13px] text-[#E1CBD7] mt-1 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10.5px] font-mono tracking-wider uppercase shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotBg}`}></span>
                      <span className={statusColor}>{project.status}</span>
                    </div>
                  </div>

                  {/* Health Bar */}
                  <div className="mt-3 w-full bg-[#0E1F2E] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#86AACF] h-full rounded-full transition-all"
                      style={{ width: `${project.health}%` }}
                    />
                  </div>

                  {/* Metadata and Action Row */}
                  <div className="mt-2.5 pt-2 border-t border-[#26425A]/60 flex items-center justify-between text-[11px] font-mono text-[#86AACF]">
                    <div className="flex items-center gap-4">
                      <span>HEALTH: <strong className="text-[#FFFFFF] tabular-nums">{project.health}%</strong></span>
                      <span>DEADLINE: <strong className="text-[#E1CBD7]">{project.deadline}</strong></span>
                      <span>UPDATED: <strong className="text-[#E1CBD7]">{project.lastUpdatedISO ? formatRelativeTime(project.lastUpdatedISO) : project.lastUpdated}</strong></span>
                    </div>

                    <div className="flex items-center gap-1 text-[#C38EB4] group-hover:translate-x-0.5 transition-transform">
                      <span>OPEN CONTEXT</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SECTION: RECENT ACTIVITY STREAM (~38% width) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-mono tracking-widest text-[#86AACF] uppercase font-medium">
              RECENT MEMORY ACTIVITY
            </div>
            <div className="flex items-center gap-1">
              {(['ALL', 'MEMORIES', 'DECISIONS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                    activityFilter === filter
                      ? 'bg-[#0C1D44] text-[#FFFFFF] border border-[#26425A]'
                      : 'text-[#86AACF] hover:text-[#FFFFFF]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Vertical Activity Timeline */}
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 relative shadow-sm">
            <div className="relative pl-5 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-[1px] before:bg-[#26425A] space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-[#86AACF] font-mono">
                  No activity matching filter.
                </div>
              ) : (
                filteredActivities.slice(0, 6).map((act) => {
                  const isConflict = act.type.startsWith('CONFLICT');
                  const isDecision = act.type.startsWith('DECISION');

                  return (
                    <div key={act.id} className="relative group text-left">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-5 top-1.5 w-2 h-2 rounded-full border ${
                          isConflict
                            ? 'bg-[#C38EB4] border-[#C38EB4]'
                            : isDecision
                            ? 'bg-[#86AACF] border-[#86AACF]'
                            : 'bg-[#26425A] border-[#86AACF]'
                        }`}
                      />

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-medium bg-[#0C1D44] text-[#86AACF] border border-[#26425A]">
                            {act.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-[#86AACF] shrink-0">
                            {act.timestampISO ? formatRelativeTime(act.timestampISO) : act.timestamp}
                          </span>
                        </div>

                        <h4 className="text-[13px] font-medium text-[#FFFFFF] line-clamp-1">
                          {act.title}
                        </h4>

                        <p className="text-[12px] text-[#E1CBD7] mt-0.5 line-clamp-2 leading-relaxed">
                          {act.description}
                        </p>

                        <div className="mt-1 text-[10px] font-mono text-[#86AACF]">
                          CONTEXT: {act.projectName}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
