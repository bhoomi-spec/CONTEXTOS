import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ActivityEvent, ProjectContext, NavigationPage } from '../../types';
import { formatRelativeTime } from '../../utils/dateUtils';

interface ActivityHistoryPageProps {
  activities: ActivityEvent[];
  projects: ProjectContext[];
  onNavigate: (page: NavigationPage) => void;
}

export const ActivityHistoryPage: React.FC<ActivityHistoryPageProps> = ({
  activities,
  projects,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (projectFilter !== 'ALL' && act.projectId !== projectFilter) return false;
      if (typeFilter !== 'ALL') {
        if (!act.type.startsWith(typeFilter)) return false;
      }
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
      return true;
    });
  }, [activities, projectFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Filter and Search Bar */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#86AACF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by action, entity title, or description..."
              className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded pl-9 pr-3 py-2 text-[13.5px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#86AACF]">
            <span>TOTAL AUDIT EVENTS: <strong className="text-[#FFFFFF]">{activities.length}</strong></span>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-[#26425A]/60 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5">
            <span className="text-[10.5px] text-[#86AACF] uppercase">CATEGORY:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL ACTIONS</option>
              <option value="MEMORY" className="bg-[#112436]">MEMORY EVENTS</option>
              <option value="DECISION" className="bg-[#112436]">DECISION EVENTS</option>
              <option value="COMMITMENT" className="bg-[#112436]">COMMITMENT EVENTS</option>
              <option value="CONFLICT" className="bg-[#112436]">CONFLICT EVENTS</option>
              <option value="PROJECT" className="bg-[#112436]">PROJECT EVENTS</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5">
            <span className="text-[10.5px] text-[#86AACF] uppercase">CONTEXT:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL PROJECTS</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#112436]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LARGE AUDIT EVENT VELOCITY & CATEGORY HISTOGRAM */}
      {(() => {
        const total = activities.length || 1;
        const memoryCount = activities.filter((a) => a.type.startsWith('MEMORY')).length;
        const decisionCount = activities.filter((a) => a.type.startsWith('DECISION')).length;
        const commitmentCount = activities.filter((a) => a.type.startsWith('COMMITMENT')).length;
        const conflictCount = activities.filter((a) => a.type.startsWith('CONFLICT')).length;
        const projectCount = activities.filter((a) => a.type.startsWith('PROJECT')).length;

        const memoryPct = Math.round((memoryCount / total) * 100);
        const decisionPct = Math.round((decisionCount / total) * 100);
        const commitmentPct = Math.round((commitmentCount / total) * 100);
        const conflictPct = Math.round((conflictCount / total) * 100);

        const categoryData = [
          {
            key: 'MEMORY',
            label: 'MEMORIES',
            sub: 'knowledge writes',
            count: memoryCount,
            color: '#86AACF',
            pct: memoryPct
          },
          {
            key: 'DECISION',
            label: 'DECISIONS',
            sub: 'canons & DAG links',
            count: decisionCount,
            color: '#C38EB4',
            pct: decisionPct
          },
          {
            key: 'COMMITMENT',
            label: 'COMMITMENTS',
            sub: 'task lifecycle',
            count: commitmentCount,
            color: '#E1CBD7',
            pct: commitmentPct
          },
          {
            key: 'CONFLICT',
            label: 'CONFLICTS',
            sub: 'clash reconciliations',
            count: conflictCount,
            color: '#26425A',
            pct: conflictPct
          },
          {
            key: 'PROJECT',
            label: 'PROJECTS',
            sub: 'scope operations',
            count: projectCount,
            color: '#86AACF',
            pct: Math.round((projectCount / total) * 100)
          }
        ];

        const maxCatCount = Math.max(...categoryData.map((d) => d.count), 4);

        return (
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#C38EB4]"></span>
                  AUDIT EVENT VELOCITY & CATEGORY HISTOGRAM
                </h3>
                <p className="text-[12px] text-[#E1CBD7] mt-0.5">
                  Proportion and empirical count of immutable ledger operations partitioned across operational domains.
                </p>
              </div>
              <div className="font-mono text-xs text-[#86AACF] bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A]">
                SHOWING: <strong className="text-[#FFFFFF]">{filteredActivities.length}</strong> OF {activities.length} EVENTS
              </div>
            </div>

            {/* LARGE COLUMN HISTOGRAM (SVG) */}
            <div className="bg-[#0E1F2E] border border-[#26425A] rounded p-4 relative">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-[#E1CBD7] font-semibold">EVENT FREQUENCY BY DOMAIN</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#86AACF]" />
                    <span className="text-[#E1CBD7]">Memories</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#C38EB4]" />
                    <span className="text-[#E1CBD7]">Decisions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#E1CBD7]" />
                    <span className="text-[#E1CBD7]">Commitments</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#26425A]" />
                    <span className="text-[#E1CBD7]">Conflicts</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG */}
              <div className="h-44 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 170" preserveAspectRatio="none">
                  {/* Grid guidelines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 135 - pct * 115;
                    const val = Math.round(pct * maxCatCount);
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

                  {categoryData.map((d, idx) => {
                    const slotWidth = (590 - 45) / categoryData.length;
                    const colX = 45 + idx * slotWidth + slotWidth / 2;
                    const barWidth = 38;
                    const barH = (d.count / maxCatCount) * 115;
                    const barY = 135 - barH;

                    return (
                      <g key={d.key} className="group cursor-pointer">
                        <rect
                          x={colX - barWidth / 2}
                          y={barY}
                          width={barWidth}
                          height={barH}
                          fill={d.color}
                          rx="2"
                          className="transition-all hover:brightness-125"
                        >
                          <title>{`${d.label}: ${d.count} events (${d.pct}%)`}</title>
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
                          {d.sub}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Category Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs pt-0.5">
              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'MEMORY' ? 'ALL' : 'MEMORY')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  typeFilter === 'MEMORY'
                    ? 'bg-[#0C1D44] border-[#86AACF]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#86AACF]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#86AACF]" />
                    MEMORIES
                  </span>
                  <span>{memoryPct}%</span>
                </div>
                <div className="text-[20px] font-bold text-[#86AACF] leading-none">
                  {memoryCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">knowledge mutations</div>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'DECISION' ? 'ALL' : 'DECISION')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  typeFilter === 'DECISION'
                    ? 'bg-[#0C1D44] border-[#C38EB4]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#C38EB4]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#C38EB4] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C38EB4]" />
                    DECISIONS
                  </span>
                  <span>{decisionPct}%</span>
                </div>
                <div className="text-[20px] font-bold text-[#C38EB4] leading-none">
                  {decisionCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">canon updates & links</div>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'COMMITMENT' ? 'ALL' : 'COMMITMENT')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  typeFilter === 'COMMITMENT'
                    ? 'bg-[#0C1D44] border-[#E1CBD7]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#86AACF]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#E1CBD7] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E1CBD7]" />
                    COMMITMENTS
                  </span>
                  <span>{commitmentPct}%</span>
                </div>
                <div className="text-[20px] font-bold text-[#E1CBD7] leading-none">
                  {commitmentCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">task updates & SLAs</div>
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter(typeFilter === 'CONFLICT' ? 'ALL' : 'CONFLICT')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  typeFilter === 'CONFLICT'
                    ? 'bg-[#0C1D44] border-[#26425A]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#86AACF]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#26425A]" />
                    CONFLICTS
                  </span>
                  <span>{conflictPct}%</span>
                </div>
                <div className="text-[20px] font-bold text-[#FFFFFF] leading-none">
                  {conflictCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">reconciliation logs</div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Audit Stream List */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm divide-y divide-[#26425A] shadow-sm overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-[#86AACF]">
            No audit records matching criteria.
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isConflict = act.type.startsWith('CONFLICT');
            const isDecision = act.type.startsWith('DECISION');

            return (
              <div key={act.id} className="p-4 hover:bg-[#152B3F] transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded uppercase font-medium ${
                        isConflict
                          ? 'bg-[#0C1D44] text-[#C38EB4] border border-[#C38EB4]/40 font-bold'
                          : isDecision
                          ? 'bg-[#0C1D44] text-[#86AACF] border border-[#86AACF]/40'
                          : 'bg-[#0E1F2E] text-[#86AACF] border border-[#26425A]'
                      }`}
                    >
                      {act.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[14px] font-medium text-[#FFFFFF]">{act.title}</span>
                  </div>

                  <p className="text-[13px] text-[#E1CBD7] leading-relaxed max-w-3xl">
                    {act.description}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[10.5px] font-mono text-[#86AACF]">
                    <span>CONTEXT: {act.projectName}</span>
                    {act.relatedId && <span>REF: {act.relatedId}</span>}
                    <span>EVENT ID: {act.id}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-[#86AACF] block">
                    {act.timestampISO ? formatRelativeTime(act.timestampISO) : act.timestamp}
                  </span>
                  <span className="text-[10px] font-mono text-[#86AACF]/60 block mt-0.5">
                    {act.timestampISO ? act.timestampISO.slice(0, 10) : '2026-10-10'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
