import React from 'react';
import { Command, Plus } from 'lucide-react';
import { NavigationPage } from '../../types';

interface HeaderProps {
  currentPage: NavigationPage;
  onOpenCommandPalette: () => void;
  onOpenCaptureModal: () => void;
  onNavigate: (page: NavigationPage) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenCommandPalette,
  onOpenCaptureModal
}) => {
  const getPageMeta = () => {
    switch (currentPage) {
      case 'mission-control':
        return {
          roman: 'I — MEMORY OPERATIONS',
          title: 'Mission Control',
          subtitle: 'Context activity, active contexts, and decision evolution.'
        };
      case 'memory-explorer':
        return {
          roman: 'II — MEMORY VAULT & EXPLORER',
          title: 'Memory Explorer',
          subtitle: 'Browse, filter, inspect, and maintain verified knowledge records.'
        };
      case 'knowledge-graph':
        return {
          roman: 'III — TOPOLOGICAL KNOWLEDGE GRAPH',
          title: 'Knowledge Graph',
          subtitle: 'Causal relationships between projects, decisions, facts, and commitments.'
        };
      case 'decision-timeline':
        return {
          roman: 'IV — DECISION PROVENANCE & LINEAGE',
          title: 'Decision Timeline',
          subtitle: 'Chronological rationale tracking with non-destructive supersede history.'
        };
      case 'projects':
        return {
          roman: 'V — CONTEXT SPACES & PROJECTS',
          title: 'Projects & Contexts',
          subtitle: 'Scoped operational contexts, boundary constraints, and goal tracking.'
        };
      case 'commitments':
        return {
          roman: 'VI — COMMITMENT TRACKER & SLA',
          title: 'Commitments',
          subtitle: 'Temporal task execution, overdue tracking, and priority triage.'
        };
      case 'conflicts':
        return {
          roman: 'VII — CONTRADICTION & CONFLICT INTELLIGENCE',
          title: 'Conflicts & Clashes',
          subtitle: 'Automated contradiction detection, parameter divergence, and deadline clashes.'
        };
      case 'activity':
        return {
          roman: 'VIII — ACTIVITY LOG & AUDIT TRAIL',
          title: 'Activity History',
          subtitle: 'Immutable audit trail of state changes, supersessions, and actions.'
        };
      case 'assistant':
        return {
          roman: 'IX — CONTEXT INTELLIGENCE ASSISTANT',
          title: 'Memory Assistant',
          subtitle: 'Understand your history. Connect decisions. Find your next step.'
        };
      case 'settings':
        return {
          roman: 'X — SYSTEM & HACKATHON ARCHITECTURE',
          title: 'Settings & Architecture',
          subtitle: 'Storage management, diagnostics, and Model Context Protocol (MCP) adapters.'
        };
      default:
        return {
          roman: 'I — WORKSPACE',
          title: 'Mission Control',
          subtitle: 'Context Intelligence System'
        };
    }
  };

  const meta = getPageMeta();

  return (
    <header className="border-b border-[#26425A] bg-[#0E1F2E]/95 backdrop-blur sticky top-0 z-20 px-6 py-4">
      {/* Top metadata & utility bar */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#26425A]/60">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-mono tracking-widest text-[#86AACF] font-medium uppercase">
            {meta.roman}
          </span>
          <span className="text-[#26425A]">·</span>
          <span className="text-[10.5px] font-mono text-[#86AACF]">
            09:17 LOCAL · STUDIO
          </span>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-2">
          {/* Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#112436] hover:bg-[#152B3F] border border-[#26425A] text-[#E1CBD7] hover:text-[#FFFFFF] text-xs font-mono transition-colors"
          >
            <Command className="w-3.5 h-3.5 text-[#86AACF]" />
            <span className="text-[11px]">⌘K Command palette</span>
          </button>

          {/* All Systems Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0C1D44] border border-[#26425A] text-[10.5px] font-mono text-[#86AACF]">
            <span className="flex items-center gap-0.5 tracking-tighter text-[#86AACF] font-bold">
              ||||
            </span>
            <span>ALL SYSTEMS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF] ml-0.5"></span>
          </div>

          {/* Primary Action Button */}
          {currentPage !== 'assistant' && (
            <button
              onClick={onOpenCaptureModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#C38EB4]/60 hover:border-[#C38EB4] text-[#FFFFFF] text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#C38EB4]" />
              <span className="hidden md:inline">CAPTURE MEMORY</span>
            </button>
          )}
        </div>
      </div>

      {/* Main heading and subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-[28px] md:text-[30px] font-medium tracking-tight text-[#FFFFFF] leading-tight font-sans">
            {meta.title}
          </h1>
          <p className="text-[13px] text-[#E1CBD7] mt-0.5 font-sans">
            {meta.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-[#86AACF]">
          <span className="inline-flex items-center gap-1.5 text-[#86AACF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span>
            STATUS: LOCAL WORKSPACE
          </span>
          <span className="text-[#26425A]">·</span>
          <span>SLA: 24ms</span>
        </div>
      </div>
    </header>
  );
};
