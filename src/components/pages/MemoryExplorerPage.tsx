import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  Tag,
  Clock,
  Check
} from 'lucide-react';
import { Memory, MemoryType, ValidityStatus, ProjectContext, MemorySource } from '../../types';

interface MemoryExplorerPageProps {
  memories: Memory[];
  projects: ProjectContext[];
  onAddMemory: () => void;
  onUpdateMemory: (id: string, updates: Partial<Memory>) => void;
  onDeleteMemory: (id: string) => void;
  onSupersedeMemory: (targetId: string, supersedingId: string, reason?: string) => void;
}

export const MemoryExplorerPage: React.FC<MemoryExplorerPageProps> = ({
  memories,
  projects,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedValidity, setSelectedValidity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'OLDEST' | 'CONFIDENCE' | 'TITLE'>('RECENT');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(memories[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<MemoryType>('FACT');
  const [editValidity, setEditValidity] = useState<ValidityStatus>('CURRENT');
  const [editConfidence, setEditConfidence] = useState(90);

  const selectedMemory = memories.find((m) => m.id === selectedMemoryId) || null;

  const handleStartEdit = (mem: Memory) => {
    setEditTitle(mem.title);
    setEditContent(mem.content);
    setEditType(mem.type);
    setEditValidity(mem.validity);
    setEditConfidence(mem.confidence);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedMemory) return;
    onUpdateMemory(selectedMemory.id, {
      title: editTitle,
      content: editContent,
      type: editType,
      validity: editValidity,
      confidence: editConfidence
    });
    setIsEditing(false);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDeleteId) setConfirmDeleteId(null);
        else if (isEditing) setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDeleteId, isEditing]);

  const filteredMemories = useMemo(() => {
    return memories
      .filter((m) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            m.title.toLowerCase().includes(q) ||
            m.content.toLowerCase().includes(q) ||
            m.id.toLowerCase().includes(q) ||
            m.tags.some((t) => t.toLowerCase().includes(q));
          if (!matches) return false;
        }

        if (selectedType !== 'ALL' && m.type !== selectedType) return false;
        if (selectedProject !== 'ALL' && m.projectId !== selectedProject) return false;
        if (selectedValidity !== 'ALL' && m.validity !== selectedValidity) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'RECENT') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (sortBy === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'CONFIDENCE') return b.confidence - a.confidence;
        if (sortBy === 'TITLE') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [memories, searchQuery, selectedType, selectedProject, selectedValidity, sortBy]);

  const getTypeBadge = (type: MemoryType) => {
    switch (type) {
      case 'DECISION':
        return 'text-[#C38EB4] bg-[#0C1D44] border-[#C38EB4]/40';
      case 'FACT':
        return 'text-[#86AACF] bg-[#112436] border-[#26425A]';
      case 'PREFERENCE':
        return 'text-[#E1CBD7] bg-[#112436] border-[#26425A]';
      case 'COMMITMENT':
        return 'text-[#86AACF] bg-[#0C1D44] border-[#86AACF]/40';
      case 'INSIGHT':
        return 'text-[#C38EB4] bg-[#112436] border-[#C38EB4]/30';
      case 'EVENT':
        return 'text-[#E1CBD7] bg-[#0C1D44] border-[#26425A]';
    }
  };

  const getValidityBadge = (validity: ValidityStatus) => {
    switch (validity) {
      case 'CURRENT':
        return 'text-[#86AACF] bg-[#0C1D44] border-[#86AACF]/40';
      case 'SUPERSEDED':
        return 'text-[#E1CBD7]/50 bg-[#0E1F2E] border-[#26425A] line-through';
      case 'UNCERTAIN':
        return 'text-[#C38EB4] bg-[#0C1D44] border-[#C38EB4]/40';
      case 'ARCHIVED':
        return 'text-[#86AACF]/50 bg-[#0E1F2E] border-[#26425A]';
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto">
      {/* Top Search & Filter Bar */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 space-y-3 shadow-sm">
        {/* Row 1: Search & Action Button */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#86AACF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories by title, description, tag, or ID (e.g. MEM-1041)..."
              className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded pl-9 pr-3 py-2 text-[13.5px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddMemory}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4]/60 hover:border-[#C38EB4] text-[#FFFFFF] text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4 text-[#C38EB4]" />
              <span>NEW MEMORY</span>
            </button>
          </div>
        </div>

        {/* Row 2: Clean Scan Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-[#26425A]/60 text-xs">
          {/* Type */}
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">TYPE:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL TYPES</option>
              <option value="FACT" className="bg-[#112436]">FACT</option>
              <option value="DECISION" className="bg-[#112436]">DECISION</option>
              <option value="PREFERENCE" className="bg-[#112436]">PREFERENCE</option>
              <option value="COMMITMENT" className="bg-[#112436]">COMMITMENT</option>
              <option value="INSIGHT" className="bg-[#112436]">INSIGHT</option>
              <option value="EVENT" className="bg-[#112436]">EVENT</option>
            </select>
          </div>

          {/* Context */}
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">CONTEXT:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL CONTEXTS</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#112436]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">STATUS:</span>
            <select
              value={selectedValidity}
              onChange={(e) => setSelectedValidity(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#112436]">ALL STATUSES</option>
              <option value="CURRENT" className="bg-[#112436]">CURRENT</option>
              <option value="SUPERSEDED" className="bg-[#112436]">SUPERSEDED</option>
              <option value="UNCERTAIN" className="bg-[#112436]">UNCERTAIN</option>
              <option value="ARCHIVED" className="bg-[#112436]">ARCHIVED</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1.5">
            <span className="text-[10.5px] font-mono text-[#86AACF] uppercase">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 bg-transparent text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
            >
              <option value="RECENT" className="bg-[#112436]">RECENTLY UPDATED</option>
              <option value="OLDEST" className="bg-[#112436]">OLDEST FIRST</option>
              <option value="CONFIDENCE" className="bg-[#112436]">HIGHEST CONFIDENCE</option>
              <option value="TITLE" className="bg-[#112436]">TITLE (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* LARGE MEMORY KNOWLEDGE CLASSIFICATION & VALIDITY HISTOGRAM (NO DONUT CHARTS) */}
      {(() => {
        const total = memories.length || 1;
        const currentCount = memories.filter((m) => m.validity === 'CURRENT').length;
        const supersededCount = memories.filter((m) => m.validity === 'SUPERSEDED').length;
        const uncertainCount = memories.filter((m) => m.validity === 'UNCERTAIN').length;
        const archivedCount = memories.filter((m) => m.validity === 'ARCHIVED').length;

        const currentPct = Math.round((currentCount / total) * 100);
        const supersededPct = Math.round((supersededCount / total) * 100);
        const uncertainPct = Math.round((uncertainCount / total) * 100);
        const archivedPct = Math.round((archivedCount / total) * 100);

        const memoryTypes: MemoryType[] = ['FACT', 'DECISION', 'PREFERENCE', 'COMMITMENT', 'INSIGHT', 'EVENT'];
        const typeData = memoryTypes.map((type) => {
          const typeMemories = memories.filter((m) => m.type === type);
          const current = typeMemories.filter((m) => m.validity === 'CURRENT').length;
          const inactive = typeMemories.length - current;
          const avgConfidence = typeMemories.length > 0
            ? Math.round(typeMemories.reduce((acc, m) => acc + m.confidence, 0) / typeMemories.length)
            : 0;
          return {
            type,
            total: typeMemories.length,
            current,
            inactive,
            avgConfidence
          };
        });

        const maxTypeCount = Math.max(...typeData.map((d) => d.total), 4);

        return (
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#26425A]">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-semibold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#86AACF]"></span>
                  KNOWLEDGE CLASSIFICATION & VALIDITY HISTOGRAM
                </h3>
                <p className="text-[12px] text-[#E1CBD7] mt-0.5">
                  Analytical distribution across epistemic types, active validity states, and average confidence levels.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs text-[#86AACF] bg-[#0E1F2E] px-3 py-1.5 rounded border border-[#26425A]">
                  TOTAL IN VAULT: <span className="text-[#FFFFFF] font-bold">{memories.length}</span>
                </div>
              </div>
            </div>

            {/* LARGE COLUMN HISTOGRAM (SVG) */}
            <div className="bg-[#0E1F2E] border border-[#26425A] rounded p-4 relative">
              <div className="flex items-center justify-between text-xs font-mono mb-3">
                <span className="text-[#E1CBD7] font-semibold">TYPE VOLUME BREAKDOWN</span>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#86AACF]" />
                    <span className="text-[#E1CBD7]">Current Valid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#C38EB4]" />
                    <span className="text-[#E1CBD7]">Superseded / Other</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E1CBD7]" />
                    <span className="text-[#86AACF]">Avg Confidence %</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="h-48 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                  {/* Grid horizontal guidelines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = 145 - pct * 125;
                    const val = Math.round(pct * maxTypeCount);
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

                  {/* Grouped Columns per Memory Type */}
                  {typeData.map((d, idx) => {
                    const slotWidth = (590 - 45) / typeData.length;
                    const colX = 45 + idx * slotWidth + slotWidth / 2;
                    const barWidth = 24;

                    const curHeight = (d.current / maxTypeCount) * 125;
                    const inactHeight = (d.inactive / maxTypeCount) * 125;
                    const curY = 145 - curHeight;
                    const inactY = curY - inactHeight;

                    // Confidence dot position
                    const confY = 145 - (d.avgConfidence / 100) * 125;

                    return (
                      <g key={d.type} className="group cursor-pointer">
                        {/* Inactive Stack (Top) */}
                        {d.inactive > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={inactY}
                            width={barWidth}
                            height={inactHeight}
                            fill="#C38EB4"
                            opacity="0.85"
                            rx="2"
                            className="transition-all hover:opacity-100"
                          >
                            <title>{`${d.type}: ${d.inactive} Superseded/Archived`}</title>
                          </rect>
                        )}

                        {/* Current Stack (Bottom) */}
                        {d.current > 0 && (
                          <rect
                            x={colX - barWidth / 2}
                            y={curY}
                            width={barWidth}
                            height={curHeight}
                            fill="#86AACF"
                            rx="2"
                            className="transition-all hover:brightness-110"
                          >
                            <title>{`${d.type}: ${d.current} Current Valid`}</title>
                          </rect>
                        )}

                        {/* Total Count Label Above Bar */}
                        <text
                          x={colX}
                          y={Math.min(curY, inactY) - 5}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {d.total}
                        </text>

                        {/* Confidence Indicator Marker */}
                        {d.total > 0 && (
                          <circle
                            cx={colX}
                            cy={confY}
                            r="3"
                            fill="#E1CBD7"
                            stroke="#0E1F2E"
                            strokeWidth="1.5"
                          >
                            <title>{`Avg Confidence: ${d.avgConfidence}%`}</title>
                          </circle>
                        )}

                        {/* X-Axis Label */}
                        <text
                          x={colX}
                          y="162"
                          textAnchor="middle"
                          fill="#E1CBD7"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {d.type}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Exact Values & Distribution Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 w-full font-mono">
              {/* Current */}
              <button
                type="button"
                onClick={() => setSelectedValidity(selectedValidity === 'CURRENT' ? 'ALL' : 'CURRENT')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedValidity === 'CURRENT'
                    ? 'bg-[#0C1D44] border-[#86AACF]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#86AACF]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#86AACF]" />
                    CURRENT
                  </span>
                  <span>{currentPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#86AACF] leading-none">
                  {currentCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">active canon facts</div>
              </button>

              {/* Superseded */}
              <button
                type="button"
                onClick={() => setSelectedValidity(selectedValidity === 'SUPERSEDED' ? 'ALL' : 'SUPERSEDED')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedValidity === 'SUPERSEDED'
                    ? 'bg-[#0C1D44] border-[#26425A]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#86AACF]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#86AACF] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#26425A]" />
                    SUPERSEDED
                  </span>
                  <span>{supersededPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#FFFFFF] leading-none">
                  {supersededCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">historical direction</div>
              </button>

              {/* Uncertain */}
              <button
                type="button"
                onClick={() => setSelectedValidity(selectedValidity === 'UNCERTAIN' ? 'ALL' : 'UNCERTAIN')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedValidity === 'UNCERTAIN'
                    ? 'bg-[#0C1D44] border-[#C38EB4]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#C38EB4]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#C38EB4] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C38EB4]" />
                    UNCERTAIN
                  </span>
                  <span>{uncertainPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#C38EB4] leading-none">
                  {uncertainCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">needs verification</div>
              </button>

              {/* Archived */}
              <button
                type="button"
                onClick={() => setSelectedValidity(selectedValidity === 'ARCHIVED' ? 'ALL' : 'ARCHIVED')}
                className={`p-2.5 rounded text-left border transition-colors cursor-pointer ${
                  selectedValidity === 'ARCHIVED'
                    ? 'bg-[#0C1D44] border-[#E1CBD7]'
                    : 'bg-[#0E1F2E] border-[#26425A] hover:border-[#86AACF]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-[#E1CBD7] uppercase mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E1CBD7]" />
                    ARCHIVED
                  </span>
                  <span>{archivedPct}%</span>
                </div>
                <div className="text-[22px] font-bold text-[#E1CBD7] leading-none">
                  {archivedCount}
                </div>
                <div className="text-[9.5px] text-[#86AACF]/80 mt-1">quarantined memory</div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Main Split Layout: List on Left, Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Memory List */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#86AACF] px-1 font-medium">
            <span>RESULTS ({filteredMemories.length})</span>
            <span>ACTIVE VAULT RECORDS</span>
          </div>

          {filteredMemories.length === 0 ? (
            <div className="bg-[#112436] border border-[#26425A] rounded-sm p-10 text-center text-[13px] text-[#86AACF] font-mono">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#86AACF]" />
              No memories found matching your search or filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMemories.map((mem) => {
                const isSelected = mem.id === selectedMemoryId;
                return (
                  <div
                    key={mem.id}
                    onClick={() => {
                      setSelectedMemoryId(mem.id);
                      setIsEditing(false);
                    }}
                    className={`cursor-pointer rounded-sm p-3.5 border transition-colors text-left ${
                      isSelected
                        ? 'bg-[#0C1D44] border-[#C38EB4] shadow-sm'
                        : 'bg-[#112436] hover:bg-[#152B3F] border-[#26425A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#C38EB4] font-semibold">
                          {mem.id}
                        </span>
                        <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase ${getTypeBadge(mem.type)}`}>
                          {mem.type}
                        </span>
                        <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border uppercase ${getValidityBadge(mem.validity)}`}>
                          {mem.validity}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-mono text-[#86AACF]">
                        {mem.confidence}% conf
                      </span>
                    </div>

                    <h4 className="text-[14px] font-medium text-[#FFFFFF] tracking-tight line-clamp-1">
                      {mem.title}
                    </h4>

                    <p className="text-[13px] text-[#E1CBD7] mt-1 line-clamp-2 leading-relaxed">
                      {mem.content}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#26425A]/60 flex items-center justify-between text-[10.5px] font-mono text-[#86AACF]">
                      <span className="truncate max-w-[220px]">{mem.projectName || 'Workspace'}</span>
                      <span>{new Date(mem.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Memory Detail Inspector */}
        <div className="lg:col-span-5">
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 sticky top-28 shadow-sm">
            {selectedMemory ? (
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-[#26425A] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-bold text-[#C38EB4]">
                        {selectedMemory.id}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getTypeBadge(selectedMemory.type)}`}>
                        {selectedMemory.type}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono text-[#86AACF] mt-0.5 block">
                      PROVENANCE: {selectedMemory.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => handleStartEdit(selectedMemory)}
                        className="p-1.5 rounded bg-[#0C1D44] hover:bg-[#152B3F] text-[#E1CBD7] hover:text-[#FFFFFF] border border-[#26425A] transition-colors"
                        title="Edit Memory"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveEdit}
                        className="p-1.5 rounded bg-[#0C1D44] text-[#86AACF] border border-[#86AACF]/40 transition-colors"
                        title="Save Changes"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setConfirmDeleteId(selectedMemory.id)}
                      className="p-1.5 rounded bg-[#0E1F2E] hover:bg-[#152B3F] text-[#C38EB4] border border-[#26425A] hover:border-[#C38EB4]/60 transition-colors"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* View Mode vs Edit Mode */}
                {!isEditing ? (
                  <div className="space-y-3.5">
                    <div>
                      <h3 className="text-[15px] font-medium text-[#FFFFFF] leading-snug">
                        {selectedMemory.title}
                      </h3>
                      <p className="text-[13.5px] text-[#E1CBD7] mt-2 leading-relaxed bg-[#0E1F2E] p-3 rounded border border-[#26425A]">
                        {selectedMemory.content}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#0C1D44] p-2.5 rounded border border-[#26425A]">
                      <div>
                        <div className="text-[10px] font-mono text-[#86AACF] uppercase">CONTEXT</div>
                        <div className="font-mono text-[#FFFFFF] mt-0.5 truncate text-[11.5px]">
                          {selectedMemory.projectName}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#86AACF] uppercase">VALIDITY</div>
                        <div className="font-mono text-[#FFFFFF] mt-0.5 text-[11.5px]">
                          {selectedMemory.validity}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#86AACF] uppercase">CONFIDENCE</div>
                        <div className="font-mono text-[#86AACF] mt-0.5 text-[11.5px]">
                          {selectedMemory.confidence}% Verified
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-[#86AACF] uppercase">LAST UPDATED</div>
                        <div className="font-mono text-[#E1CBD7] mt-0.5 text-[11.5px]">
                          {new Date(selectedMemory.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedMemory.tags.length > 0 && (
                      <div>
                        <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-1 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>INDEXED TAGS</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedMemory.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#0C1D44] text-[#E1CBD7] border border-[#26425A]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit Mode Form */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-1.5 text-[13px] text-[#FFFFFF] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                        Content
                      </label>
                      <textarea
                        rows={4}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-1.5 text-[13px] text-[#FFFFFF] focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                          Type
                        </label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as any)}
                          className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1 text-xs text-[#FFFFFF] focus:outline-none"
                        >
                          <option value="FACT">FACT</option>
                          <option value="DECISION">DECISION</option>
                          <option value="PREFERENCE">PREFERENCE</option>
                          <option value="COMMITMENT">COMMITMENT</option>
                          <option value="INSIGHT">INSIGHT</option>
                          <option value="EVENT">EVENT</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                          Validity
                        </label>
                        <select
                          value={editValidity}
                          onChange={(e) => setEditValidity(e.target.value as any)}
                          className="w-full bg-[#0E1F2E] border border-[#26425A] rounded px-2.5 py-1 text-xs text-[#FFFFFF] focus:outline-none"
                        >
                          <option value="CURRENT">CURRENT</option>
                          <option value="UNCERTAIN">UNCERTAIN</option>
                          <option value="SUPERSEDED">SUPERSEDED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-mono text-[#86AACF] uppercase mb-1">
                        Confidence: {editConfidence}%
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={editConfidence}
                        onChange={(e) => setEditConfidence(Number(e.target.value))}
                        className="w-full accent-[#C38EB4]"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-[#26425A]">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3.5 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
                      >
                        Save Record
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-[12px] text-[#86AACF] font-mono">
                Select a memory record from the list to view provenance details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#112436] border border-[#C38EB4]/60 rounded-md p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-[#C38EB4]">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                CONFIRM DELETION
              </h3>
            </div>
            <p className="text-[13px] text-[#E1CBD7] leading-relaxed">
              Are you sure you want to permanently erase memory record <span className="text-[#FFFFFF] font-mono">{confirmDeleteId}</span>?
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
                  onDeleteMemory(confirmDeleteId);
                  setConfirmDeleteId(null);
                  if (selectedMemoryId === confirmDeleteId) {
                    setSelectedMemoryId(null);
                  }
                }}
                className="px-3.5 py-1.5 rounded bg-[#C38EB4] text-[#0C1D44] text-xs font-semibold hover:bg-[#D5A5C8]"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
