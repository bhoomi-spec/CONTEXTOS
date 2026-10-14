import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  LayoutDashboard,
  BrainCircuit,
  Network,
  History,
  FolderGit2,
  CheckSquare,
  Sparkles,
  Settings,
  CornerDownLeft,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { NavigationPage } from '../../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: NavigationPage) => void;
  onOpenCapture: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenCapture
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose();
      }
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'capture',
      title: 'Capture New Memory',
      category: 'ACTIONS',
      icon: Sparkles,
      action: () => {
        onClose();
        onOpenCapture();
      }
    },
    {
      id: 'mission-control',
      title: 'Go to Mission Control',
      category: 'NAVIGATION',
      icon: LayoutDashboard,
      action: () => {
        onNavigate('mission-control');
        onClose();
      }
    },
    {
      id: 'memory-explorer',
      title: 'Go to Memory Explorer',
      category: 'NAVIGATION',
      icon: BrainCircuit,
      action: () => {
        onNavigate('memory-explorer');
        onClose();
      }
    },
    {
      id: 'knowledge-graph',
      title: 'Go to Knowledge Graph',
      category: 'NAVIGATION',
      icon: Network,
      action: () => {
        onNavigate('knowledge-graph');
        onClose();
      }
    },
    {
      id: 'decision-timeline',
      title: 'Go to Decision Timeline',
      category: 'NAVIGATION',
      icon: History,
      action: () => {
        onNavigate('decision-timeline');
        onClose();
      }
    },
    {
      id: 'projects',
      title: 'Go to Projects & Contexts',
      category: 'NAVIGATION',
      icon: FolderGit2,
      action: () => {
        onNavigate('projects');
        onClose();
      }
    },
    {
      id: 'commitments',
      title: 'Go to Commitments',
      category: 'NAVIGATION',
      icon: CheckSquare,
      action: () => {
        onNavigate('commitments');
        onClose();
      }
    },
    {
      id: 'conflicts',
      title: 'Go to Conflicts & Clashes',
      category: 'NAVIGATION',
      icon: ShieldAlert,
      action: () => {
        onNavigate('conflicts');
        onClose();
      }
    },
    {
      id: 'activity',
      title: 'Go to Activity History & Audit Trail',
      category: 'NAVIGATION',
      icon: Activity,
      action: () => {
        onNavigate('activity');
        onClose();
      }
    },
    {
      id: 'assistant',
      title: 'Open Memory Assistant',
      category: 'NAVIGATION',
      icon: Sparkles,
      action: () => {
        onNavigate('assistant');
        onClose();
      }
    },
    {
      id: 'settings',
      title: 'Open Settings & Architecture',
      category: 'NAVIGATION',
      icon: Settings,
      action: () => {
        onNavigate('settings');
        onClose();
      }
    }
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (idx: number) => {
    const item = filtered[idx];
    if (item) item.action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-[#112436] border border-[#26425A] rounded-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#26425A] bg-[#0E1F2E]">
          <Search className="w-4 h-4 text-[#86AACF] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                handleSelect(selectedIndex);
              }
            }}
            placeholder="Type a command or jump to page..."
            className="w-full bg-transparent text-[14px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none font-sans"
          />
          <button onClick={onClose} className="text-[#86AACF] hover:text-[#FFFFFF] p-1 rounded hover:bg-[#152B3F] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#86AACF] font-mono">
              No matching commands or destinations found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-[13.5px] transition-colors ${
                    isSelected
                      ? 'bg-[#0C1D44] text-[#FFFFFF] font-medium border border-[#26425A]'
                      : 'text-[#E1CBD7] hover:bg-[#152B3F] hover:text-[#FFFFFF]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C38EB4]' : 'text-[#86AACF]'}`} />
                    <span>{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#86AACF] uppercase">{item.category}</span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-[#C38EB4]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#0E1F2E] border-t border-[#26425A] flex items-center justify-between text-[10.5px] font-mono text-[#86AACF]">
          <span>Use ↑↓ to navigate, ↵ to select</span>
          <span>ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
