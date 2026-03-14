import React, { useState, useEffect } from "react";
import { ChevronRight, X } from "lucide-react";
import type { Widget, ContextType } from "@/types";
import { CONTEXTS, WIDGET_TYPES } from "@/constants";

interface CanvasCreateMenuProps {
  onCreateWidget: (type: Widget['type'], context: ContextType) => void;
  onClose: () => void;
  templates?: Widget[];
  onCreateFromTemplate?: (templateId: string) => void;
  defaultContext?: ContextType;
  onContextChange?: (ctx: ContextType) => void;
}

export function CanvasCreateMenu({
  onCreateWidget,
  onClose,
  templates = [],
  onCreateFromTemplate,
  defaultContext,
  onContextChange,
}: CanvasCreateMenuProps) {
  const [selectedContext, setSelectedContext] = useState<ContextType>(defaultContext ?? 'general');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleContextChange = (ctx: ContextType) => {
    setSelectedContext(ctx);
    onContextChange?.(ctx);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl min-w-[240px]"
      style={{ position: 'absolute', left: 8, top: 0, transform: 'translateY(-50%)', zIndex: 200 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-neutral-300">Create Widget</span>
        <button onClick={onClose} className="text-neutral-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {/* Templates section */}
        {templates.length > 0 && (
          <div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 rounded border border-amber-500/40 text-amber-300 transition-colors"
            >
              <span>⚡ From Template ({templates.length})</span>
              <ChevronRight
                size={12}
                className={`transition-transform ${showTemplates ? 'rotate-90' : ''}`}
              />
            </button>
            {showTemplates && (
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onCreateFromTemplate?.(t.id); onClose(); }}
                    className="w-full text-left px-2 py-1.5 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 text-neutral-300 transition-colors flex items-center gap-2"
                  >
                    <span className="text-amber-400">📋</span>
                    <span className="truncate flex-1">{t.label}</span>
                    <span className="text-neutral-500 text-[9px]">{t.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {templates.length > 0 && <div className="border-t border-neutral-700 my-2" />}

        {/* Widget type buttons — click creates immediately with selected context */}
        <div>
          <div className="text-[10px] text-neutral-500 uppercase mb-1">Type:</div>
          <div className="flex flex-wrap gap-1">
            {WIDGET_TYPES.map(wt => (
              <button
                key={wt.type}
                onClick={() => { onCreateWidget(wt.type, selectedContext); onClose(); }}
                className="px-2 py-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 text-neutral-300 transition-colors"
              >
                {wt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context pills — only update the sticky selected context */}
        <div>
          <div className="text-[10px] text-neutral-500 uppercase mb-1">Context:</div>
          <div className="flex flex-wrap gap-1">
            {CONTEXTS.map(ctx => (
              <button
                key={ctx.id}
                onClick={() => handleContextChange(ctx.id)}
                className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                  selectedContext === ctx.id
                    ? 'bg-neutral-700 text-white border-neutral-500'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border-neutral-700'
                }`}
                style={selectedContext !== ctx.id ? { borderColor: ctx.color + '40' } : undefined}
              >
                {ctx.icon} {ctx.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
