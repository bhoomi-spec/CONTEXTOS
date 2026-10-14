import React, { useState } from 'react';
import { X, AlertCircle, Check, Sparkles, BrainCircuit } from 'lucide-react';
import { MemoryType, MemorySource, ValidityStatus, ProjectContext } from '../../types';

interface CaptureMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectContext[];
  onSave: (memoryData: {
    title: string;
    content: string;
    type: MemoryType;
    projectId: string;
    source: MemorySource;
    confidence: number;
    validity: ValidityStatus;
    relatedMemoryIds: string[];
    tags: string[];
  }) => void;
}

export const CaptureMemoryModal: React.FC<CaptureMemoryModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryType>('FACT');
  const [projectId, setProjectId] = useState(projects[0]?.id || 'PRJ-AI-RESEARCH');
  const [source, setSource] = useState<MemorySource>('USER_EXPLICIT');
  const [confidence, setConfidence] = useState(95);
  const [validity, setValidity] = useState<ValidityStatus>('CURRENT');
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    }
    if (!content.trim()) {
      errs.content = 'Memory content / rationale is required';
    }
    if (!projectId) {
      errs.projectId = 'Please select an associated project context';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onSave({
      title: title.trim(),
      content: content.trim(),
      type,
      projectId,
      source,
      confidence,
      validity,
      relatedMemoryIds: [],
      tags
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setTitle('');
      setContent('');
      setTagsInput('');
      setErrors({});
      setIsSubmitting(false);
      setSaveSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#112436] border border-[#26425A] rounded-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#26425A] flex items-center justify-between bg-[#0C1D44]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C38EB4]"></span>
            <span className="text-[11.5px] font-mono tracking-wider text-[#FFFFFF] uppercase font-semibold flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-[#C38EB4]" />
              CAPTURE MEMORY RECORD
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#86AACF] hover:text-[#FFFFFF] p-1 rounded hover:bg-[#152B3F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {saveSuccess && (
            <div className="p-2.5 rounded bg-[#0C1D44] border border-[#86AACF]/60 text-xs font-mono text-[#86AACF] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#86AACF]" />
              <span>Memory record indexed and persisted to vault.</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
              Memory Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Sub-85ms latency constraint verified for voice pipeline"
              className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13.5px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none transition-colors"
            />
            {errors.title && (
              <p className="text-[11px] text-[#C38EB4] mt-1 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
              </p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
              Detailed Description / Rationale *
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) setErrors((prev) => ({ ...prev, content: '' }));
              }}
              placeholder="Record the key observation, architectural reason, constraint, or contextual insight..."
              className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13.5px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none transition-colors resize-none leading-relaxed"
            />
            {errors.content && (
              <p className="text-[11px] text-[#C38EB4] mt-1 flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.content}
              </p>
            )}
          </div>

          {/* Grid row: Type & Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
                Memory Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MemoryType)}
                className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#86AACF] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none cursor-pointer"
              >
                <option value="FACT" className="bg-[#112436] text-[#FFFFFF]">FACT (Verified truth)</option>
                <option value="DECISION" className="bg-[#112436] text-[#FFFFFF]">DECISION (Architectural choice)</option>
                <option value="PREFERENCE" className="bg-[#112436] text-[#FFFFFF]">PREFERENCE (User directive)</option>
                <option value="COMMITMENT" className="bg-[#112436] text-[#FFFFFF]">COMMITMENT (Actionable SLA)</option>
                <option value="INSIGHT" className="bg-[#112436] text-[#FFFFFF]">INSIGHT (Empirical finding)</option>
                <option value="EVENT" className="bg-[#112436] text-[#FFFFFF]">EVENT (Milestone record)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
                Associated Context
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#86AACF] rounded px-3 py-2 text-[13px] text-[#FFFFFF] focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#112436] text-[#FFFFFF]">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid row: Provenance, Validity, Confidence */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
                Provenance
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as MemorySource)}
                className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#86AACF] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
              >
                <option value="USER_EXPLICIT" className="bg-[#112436] text-[#FFFFFF]">USER EXPLICIT</option>
                <option value="CONVERSATION" className="bg-[#112436] text-[#FFFFFF]">CONVERSATION</option>
                <option value="AI_INFERENCE" className="bg-[#112436] text-[#FFFFFF]">AI INFERENCE</option>
                <option value="DOC_IMPORT" className="bg-[#112436] text-[#FFFFFF]">DOC IMPORT</option>
                <option value="SYSTEM" className="bg-[#112436] text-[#FFFFFF]">SYSTEM</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
                Validity Status
              </label>
              <select
                value={validity}
                onChange={(e) => setValidity(e.target.value as ValidityStatus)}
                className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#86AACF] rounded px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:outline-none cursor-pointer"
              >
                <option value="CURRENT" className="bg-[#112436] text-[#FFFFFF]">CURRENT</option>
                <option value="UNCERTAIN" className="bg-[#112436] text-[#FFFFFF]">UNCERTAIN</option>
                <option value="SUPERSEDED" className="bg-[#112436] text-[#FFFFFF]">SUPERSEDED</option>
                <option value="ARCHIVED" className="bg-[#112436] text-[#FFFFFF]">ARCHIVED</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
                Confidence: {confidence}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full accent-[#C38EB4] mt-1.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10.5px] font-mono uppercase tracking-wider text-[#86AACF] mb-1 font-medium">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. latency, voice, alexa-plus, benchmark"
              className="w-full bg-[#0E1F2E] border border-[#26425A] focus:border-[#C38EB4] rounded px-3 py-2 text-[13px] text-[#FFFFFF] placeholder:text-[#86AACF]/60 focus:outline-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#26425A]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded text-xs text-[#86AACF] hover:text-[#FFFFFF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#C38EB4] hover:bg-[#D5A5C8] text-[#0C1D44] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save to Memory Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
