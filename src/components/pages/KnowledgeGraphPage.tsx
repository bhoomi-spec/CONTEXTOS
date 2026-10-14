import React, { useState, useMemo, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Layers,
  Info,
  Link2
} from 'lucide-react';
import { ProjectContext, Memory, Decision, Commitment } from '../../types';

interface KnowledgeGraphPageProps {
  projects: ProjectContext[];
  memories: Memory[];
  decisions: Decision[];
  commitments: Commitment[];
  onOpenMemory?: (id: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'PROJECT' | 'DECISION' | 'FACT' | 'COMMITMENT' | 'INSIGHT' | 'PREFERENCE';
  color: string;
  x: number;
  y: number;
  radius: number;
  data: any;
}

interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export const KnowledgeGraphPage: React.FC<KnowledgeGraphPageProps> = ({
  projects,
  memories,
  decisions,
  commitments
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilters, setActiveTypeFilters] = useState<Record<string, boolean>>({
    PROJECT: true,
    DECISION: true,
    FACT: true,
    COMMITMENT: true,
    INSIGHT: true,
    PREFERENCE: true
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Build Graph Nodes & Links derived from store using exact palette
  const { nodes, links } = useMemo(() => {
    const rawNodes: GraphNode[] = [];
    const rawLinks: GraphLink[] = [];

    const width = 860;
    const height = 560;
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Projects as central hubs (Dusty Rose #C38EB4)
    projects.forEach((prj, idx) => {
      const angle = (idx / Math.max(1, projects.length)) * 2 * Math.PI;
      const radius = 170;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      rawNodes.push({
        id: prj.id,
        label: prj.name,
        type: 'PROJECT',
        color: '#C38EB4',
        x,
        y,
        radius: 22,
        data: prj
      });
    });

    // 2. Decisions attached to Projects (Soft Blue #86AACF)
    decisions.forEach((dec, idx) => {
      const projectNode = rawNodes.find((n) => n.id === dec.projectId);
      const baseAngle = (idx / Math.max(1, decisions.length)) * 2 * Math.PI;
      const distance = 95;
      const x = projectNode ? projectNode.x + distance * Math.cos(baseAngle) : centerX + 120 * Math.cos(baseAngle);
      const y = projectNode ? projectNode.y + distance * Math.sin(baseAngle) : centerY + 120 * Math.sin(baseAngle);

      rawNodes.push({
        id: dec.id,
        label: dec.title,
        type: 'DECISION',
        color: '#86AACF',
        x,
        y,
        radius: 16,
        data: dec
      });

      if (dec.projectId) {
        rawLinks.push({ source: dec.id, target: dec.projectId, label: 'decided_in' });
      }

      if (dec.supersedesDecisionId) {
        rawLinks.push({ source: dec.id, target: dec.supersedesDecisionId, label: 'supersedes' });
      }

      if (dec.sourceMemoryIds && dec.sourceMemoryIds.length > 0) {
        dec.sourceMemoryIds.forEach((mId) => {
          rawLinks.push({ source: dec.id, target: mId, label: 'supported_by' });
        });
      }
    });

    // 3. Memories (Pale Blush #E1CBD7 & Deep Slate Blue #26425A)
    memories.forEach((mem, idx) => {
      const pNode = rawNodes.find((n) => n.id === mem.projectId);
      const spread = (idx / Math.max(1, memories.length)) * 2 * Math.PI + 0.5;
      const dist = 140;
      const x = pNode ? pNode.x + dist * Math.cos(spread) : centerX + 220 * Math.cos(spread);
      const y = pNode ? pNode.y + dist * Math.sin(spread) : centerY + 220 * Math.sin(spread);

      let color = '#86AACF';
      let type: GraphNode['type'] = 'FACT';
      if (mem.type === 'INSIGHT') {
        color = '#C38EB4';
        type = 'INSIGHT';
      } else if (mem.type === 'PREFERENCE') {
        color = '#E1CBD7';
        type = 'PREFERENCE';
      }

      rawNodes.push({
        id: mem.id,
        label: mem.title,
        type,
        color,
        x,
        y,
        radius: 12,
        data: mem
      });

      if (mem.projectId) {
        rawLinks.push({ source: mem.id, target: mem.projectId, label: 'context_of' });
      }

      mem.relatedMemoryIds.forEach((relId) => {
        rawLinks.push({ source: mem.id, target: relId, label: 'relates_to' });
      });
    });

    // 4. Commitments (Pale Blush #E1CBD7)
    commitments.forEach((com, idx) => {
      const pNode = rawNodes.find((n) => n.id === com.projectId);
      const angle = (idx / Math.max(1, commitments.length)) * 2 * Math.PI - 0.7;
      const dist = 110;
      const x = pNode ? pNode.x + dist * Math.cos(angle) : centerX + 180 * Math.cos(angle);
      const y = pNode ? pNode.y + dist * Math.sin(angle) : centerY + 180 * Math.sin(angle);

      rawNodes.push({
        id: com.id,
        label: com.title,
        type: 'COMMITMENT',
        color: '#E1CBD7',
        x,
        y,
        radius: 14,
        data: com
      });

      if (com.projectId) {
        rawLinks.push({ source: com.id, target: com.projectId, label: 'targets' });
      }

      if (com.sourceMemoryId) {
        rawLinks.push({ source: com.id, target: com.sourceMemoryId, label: 'derived_from' });
      }
    });

    return { nodes: rawNodes, links: rawLinks };
  }, [projects, memories, decisions, commitments]);

  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => activeTypeFilters[n.type]);
  }, [nodes, activeTypeFilters]);

  const visibleNodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    visibleNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [visibleNodes]);

  const visibleLinks = useMemo(() => {
    return links.filter((l) => visibleNodeMap.has(l.source) && visibleNodeMap.has(l.target));
  }, [links, visibleNodeMap]);

  const selectedNode = visibleNodes.find((n) => n.id === selectedNodeId) || null;

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(2.5, Math.max(0.4, prev + delta)));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  const toggleTypeFilter = (type: string) => {
    setActiveTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    links.forEach((l) => {
      if (l.source === selectedNodeId) set.add(l.target);
      if (l.target === selectedNodeId) set.add(l.source);
    });
    return set;
  }, [selectedNodeId, links]);

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto">
      {/* Top Filter and Search Control Bar */}
      <div className="bg-[#112436] border border-[#26425A] rounded-sm p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Category Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] font-mono text-[#86AACF] uppercase mr-1 font-medium">LAYERS:</span>
          {[
            { id: 'PROJECT', label: 'Projects', color: '#C38EB4' },
            { id: 'DECISION', label: 'Decisions', color: '#86AACF' },
            { id: 'FACT', label: 'Facts', color: '#86AACF' },
            { id: 'COMMITMENT', label: 'Commitments', color: '#E1CBD7' },
            { id: 'INSIGHT', label: 'Insights', color: '#C38EB4' }
          ].map((cat) => {
            const isActive = activeTypeFilters[cat.id];
            return (
              <button
                key={cat.id}
                onClick={() => toggleTypeFilter(cat.id)}
                className={`text-[10.5px] font-mono px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#0C1D44] text-[#FFFFFF] border-[#26425A]'
                    : 'bg-[#0E1F2E] text-[#86AACF] border-[#26425A]/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Zoom */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-[#86AACF] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  const match = visibleNodes.find((n) =>
                    n.label.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  if (match) setSelectedNodeId(match.id);
                }
              }}
              placeholder="Find node in graph..."
              className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded pl-8 pr-2.5 py-1.5 text-xs text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#0E1F2E] border border-[#26425A] rounded p-0.5">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-1 text-[#86AACF] hover:text-[#FFFFFF] rounded hover:bg-[#152B3F]"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-1 text-[#86AACF] hover:text-[#FFFFFF] rounded hover:bg-[#152B3F]"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 text-[#86AACF] hover:text-[#FFFFFF] rounded hover:bg-[#152B3F]"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Graph Canvas */}
        <div className="lg:col-span-8 bg-[#0E1F2E] border border-[#26425A] rounded-sm overflow-hidden relative min-h-[580px] shadow-sm select-none">
          {/* Top-left HUD info */}
          <div className="absolute top-3 left-3 z-10 text-[10.5px] font-mono text-[#86AACF] bg-[#112436]/90 px-2.5 py-1 rounded border border-[#26425A] backdrop-blur pointer-events-none">
            <span>NODES: {visibleNodes.length}</span>
            <span className="mx-1.5">·</span>
            <span>EDGES: {visibleLinks.length}</span>
            <span className="mx-1.5">·</span>
            <span>ZOOM: {(zoomLevel * 100).toFixed(0)}%</span>
          </div>

          <svg
            ref={svgRef}
            className="w-full h-[580px] cursor-grab active:cursor-grabbing"
            viewBox="0 0 860 560"
            onMouseDown={(e) => {
              setIsDraggingCanvas(true);
              setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }}
            onMouseMove={(e) => {
              if (isDraggingCanvas) {
                setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onMouseUp={() => setIsDraggingCanvas(false)}
            onMouseLeave={() => setIsDraggingCanvas(false)}
          >
            <defs>
              <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="0.75" fill="#26425A" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#graph-grid)" />

            <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
              {/* Links */}
              {visibleLinks.map((link, idx) => {
                const source = visibleNodeMap.get(link.source);
                const target = visibleNodeMap.get(link.target);
                if (!source || !target) return null;

                const isConnectedToSelected =
                  selectedNodeId && (link.source === selectedNodeId || link.target === selectedNodeId);

                return (
                  <line
                    key={`link-${idx}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isConnectedToSelected ? '#C38EB4' : '#26425A'}
                    strokeWidth={isConnectedToSelected ? 2 : 1}
                    strokeDasharray={link.label === 'supersedes' ? '3,3' : undefined}
                    opacity={selectedNodeId ? (isConnectedToSelected ? 0.9 : 0.25) : 0.7}
                  />
                );
              })}

              {/* Nodes */}
              {visibleNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isConnected = connectedNodeIds.has(node.id);
                const isDimmed = selectedNodeId && !isSelected && !isConnected;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                    }}
                    className="cursor-pointer transition-opacity"
                    opacity={isDimmed ? 0.3 : 1}
                  >
                    {isSelected && (
                      <circle
                        r={node.radius + 8}
                        fill="none"
                        stroke={node.color}
                        strokeWidth="2"
                        strokeDasharray="4,4"
                      />
                    )}

                    <circle
                      r={node.radius}
                      fill="#112436"
                      stroke={node.color}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all hover:scale-110"
                    />

                    <circle r={node.radius * 0.35} fill={node.color} />

                    <text
                      y={node.radius + 14}
                      textAnchor="middle"
                      fill={isSelected ? '#FFFFFF' : '#E1CBD7'}
                      fontSize={node.type === 'PROJECT' ? '12px' : '10px'}
                      fontFamily="JetBrains Mono"
                      className="pointer-events-none select-none font-medium"
                    >
                      {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Node Inspector Panel */}
        <div className="lg:col-span-4">
          <div className="bg-[#112436] border border-[#26425A] rounded-sm p-4 h-full flex flex-col justify-between shadow-sm">
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded border uppercase"
                      style={{
                        color: selectedNode.color,
                        borderColor: `${selectedNode.color}60`,
                        backgroundColor: '#0C1D44'
                      }}
                    >
                      {selectedNode.type}
                    </span>
                    <span className="text-[11px] font-mono text-[#86AACF]">{selectedNode.id}</span>
                  </div>
                  <h3 className="text-[15px] font-medium text-[#FFFFFF] leading-snug">
                    {selectedNode.label}
                  </h3>
                </div>

                <div className="bg-[#0E1F2E] p-3.5 rounded border border-[#26425A] text-[13px] text-[#E1CBD7] leading-relaxed space-y-2">
                  <p>
                    {selectedNode.data.description || selectedNode.data.content || selectedNode.data.rationale}
                  </p>
                  {selectedNode.data.deadline && (
                    <div className="text-[11px] font-mono text-[#86AACF]">
                      DEADLINE: {selectedNode.data.deadline}
                    </div>
                  )}
                  {selectedNode.data.status && (
                    <div className="text-[11px] font-mono text-[#86AACF]">
                      STATUS: {selectedNode.data.status}
                    </div>
                  )}
                </div>

                {/* Connected Edges */}
                <div>
                  <div className="text-[10.5px] font-mono text-[#86AACF] uppercase mb-2 flex items-center gap-1 font-medium">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>CONNECTED RELATIONSHIPS ({connectedNodeIds.size})</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {Array.from(connectedNodeIds).map((cId) => {
                      const cNode = visibleNodeMap.get(cId) || nodes.find((n) => n.id === cId);
                      if (!cNode) return null;
                      return (
                        <div
                          key={cId}
                          onClick={() => setSelectedNodeId(cId)}
                          className="flex items-center justify-between p-2 rounded bg-[#0E1F2E] hover:bg-[#0C1D44] border border-[#26425A] cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cNode.color }}></span>
                            <span className="text-[#FFFFFF] truncate text-[12.5px]">{cNode.label}</span>
                          </div>
                          <span className="text-[9.5px] font-mono text-[#86AACF] uppercase ml-1 shrink-0">
                            {cNode.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[12px] text-[#86AACF] font-mono my-auto">
                <Info className="w-5 h-5 mx-auto mb-2 text-[#86AACF]" />
                Click any node in the knowledge graph to inspect its topological context and causal relationships.
              </div>
            )}

            <div className="pt-3 border-t border-[#26425A] text-[10.5px] font-mono text-[#86AACF]">
              Derived deterministically from causal DAG
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
