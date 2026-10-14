import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  Network,
  History,
  FolderGit2,
  CheckSquare,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { NavigationPage } from '../../types';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  openCaptureModal: () => void;
  openCommandPalette: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  openCaptureModal,
  isCollapsed,
  setIsCollapsed
}) => {
  const navWorkspace: { id: NavigationPage; label: string; icon: React.ElementType }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: LayoutDashboard },
    { id: 'memory-explorer', label: 'Memory Explorer', icon: BrainCircuit },
    { id: 'knowledge-graph', label: 'Knowledge Graph', icon: Network },
    { id: 'decision-timeline', label: 'Decision Timeline', icon: History }
  ];

  const navIntelligence: { id: NavigationPage; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'projects', label: 'Projects & Contexts', icon: FolderGit2 },
    { id: 'commitments', label: 'Commitments', icon: CheckSquare },
    { id: 'conflicts', label: 'Conflicts & Clashes', icon: ShieldAlert },
    { id: 'activity', label: 'Activity History', icon: Activity },
    { id: 'assistant', label: 'Memory Assistant', icon: Sparkles, badge: 'READY' }
  ];

  const navSystem: { id: NavigationPage; label: string; icon: React.ElementType }[] = [
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#0B1926] border-r border-[#26425A] transition-all duration-150 select-none ${
        isCollapsed ? 'w-16' : 'w-[230px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-[#26425A] flex items-center justify-between">
        {!isCollapsed ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#86AACF] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span>
              <span>LOCAL · STUDIO</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[17px] font-semibold tracking-tight text-[#FFFFFF]">CONTEXTOS</span>
            </div>
            <p className="text-[10px] font-mono tracking-wide text-[#86AACF] truncate uppercase">
              CONTEXT INTELLIGENCE SYSTEM
            </p>
          </div>
        ) : (
          <div className="mx-auto text-center">
            <span className="text-[14px] font-bold text-[#C38EB4]">CX</span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#86AACF] hover:text-[#FFFFFF] p-1.5 rounded hover:bg-[#152B3F] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
        {/* GROUP 1: WORKSPACE */}
        <div>
          {!isCollapsed && (
            <div className="px-2.5 mb-2 text-[10px] font-mono tracking-widest text-[#86AACF] uppercase font-medium">
              WORKSPACE
            </div>
          )}
          <nav className="space-y-0.5">
            {navWorkspace.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full relative flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] transition-colors text-left ${
                    isActive
                      ? 'bg-[#0C1D44] text-[#FFFFFF] font-medium'
                      : 'text-[#E1CBD7] hover:text-[#FFFFFF] hover:bg-[#152B3F]'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {/* Subtle Dusty Rose accent indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#C38EB4]" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C38EB4]' : 'text-[#86AACF]'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* GROUP 2: INTELLIGENCE */}
        <div className="pt-2 border-t border-[#26425A]/60">
          {!isCollapsed && (
            <div className="px-2.5 mb-2 text-[10px] font-mono tracking-widest text-[#86AACF] uppercase font-medium">
              INTELLIGENCE
            </div>
          )}
          <nav className="space-y-0.5">
            {navIntelligence.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full relative flex items-center justify-between px-2.5 py-2 rounded text-[13px] transition-colors text-left ${
                    isActive
                      ? 'bg-[#0C1D44] text-[#FFFFFF] font-medium'
                      : 'text-[#E1CBD7] hover:text-[#FFFFFF] hover:bg-[#152B3F]'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#C38EB4]" />
                  )}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C38EB4]' : 'text-[#86AACF]'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0C1D44] text-[#C38EB4] border border-[#26425A]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* GROUP 3: SYSTEM */}
        <div className="pt-2 border-t border-[#26425A]/60">
          {!isCollapsed && (
            <div className="px-2.5 mb-2 text-[10px] font-mono tracking-widest text-[#86AACF] uppercase font-medium">
              SYSTEM
            </div>
          )}
          <nav className="space-y-0.5">
            {navSystem.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full relative flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] transition-colors text-left ${
                    isActive
                      ? 'bg-[#0C1D44] text-[#FFFFFF] font-medium'
                      : 'text-[#E1CBD7] hover:text-[#FFFFFF] hover:bg-[#152B3F]'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#C38EB4]" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C38EB4]' : 'text-[#86AACF]'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Capture Memory Quick Button */}
        {!isCollapsed && (
          <div className="pt-3">
            <button
              onClick={openCaptureModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#0C1D44] hover:bg-[#152B3F] border border-[#26425A] hover:border-[#C38EB4]/60 text-[#FFFFFF] text-[12px] font-medium transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#C38EB4]" />
              <span>CAPTURE MEMORY</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-[#26425A] bg-[#0E1F2E]">
          <div className="text-[10px] font-mono text-[#86AACF] uppercase tracking-wider mb-0.5 flex items-center justify-between">
            <span>WIRED</span>
            <span className="flex items-center gap-1 text-[9.5px] text-[#86AACF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#86AACF]"></span> ONLINE
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#E1CBD7] truncate">
            alexa+ · mcp · graph dag
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono text-[#86AACF]">
            <span>Local Vector Vault</span>
            <span>v1.2</span>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-[#26425A] flex justify-center">
          <span className="w-2 h-2 rounded-full bg-[#86AACF]"></span>
        </div>
      )}
    </aside>
  );
};
