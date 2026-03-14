import React, { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import type { PortSide, Widget, ContextType } from "@/types";
import { CONTEXTS, WIDGET_TYPES } from "@/constants";

interface PortMenuProps {
  side: PortSide;
  widget: Widget;
  onCreateChild: (type: Widget['type'], context: ContextType) => void;
  onClose: () => void;
  templates?: Widget[];
  onCreateFromTemplate?: (templateId: string) => void;
}

export function PortMenu({
  side,
  widget,
  onCreateChild,
  onClose,
  templates = [],
  onCreateFromTemplate,
}: PortMenuProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedType, setSelectedType] = useState<Widget['type']>('markdown');

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 100,
    ...(side === 'right'  && { left: '100%',  top: '50%',  transform: 'translateY(-50%)',  marginLeft: '20px'  }),
    ...(side === 'left'   && { right: '100%', top: '50%',  transform: 'translateY(-50%)',  marginRight: '20px' }),
    ...(side === 'bottom' && { top: '100%',   left: '50%', transform: 'translateX(-50%)',  marginTop: '20px'   }),
    ...(side === 'top'    && { bottom: '100%',left: '50%', transform: 'translateX(-50%)',  marginBottom: '20px'}),
  };

  return (
    <div
      className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl min-w-[220px]"
      style={menuStyle}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-neutral-300">Create Child Widget</span>
        <button onClick={onClose} className="text-neutral-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {/* Templates Section */}
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
                    onClick={() => {
                      onCreateFromTemplate?.(t.id);
                      onClose();
                    }}
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

        {/* New Widget Types */}
        <div>
          <div className="text-[10px] text-neutral-500 uppercase mb-1">New Widget:</div>
          <div className="flex flex-wrap gap-1">
            {WIDGET_TYPES.map(wt => (
              <button
                key={wt.type}
                onClick={() => { setSelectedType(wt.type); onCreateChild(wt.type, widget.context); }}
                className="px-2 py-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 text-neutral-300 transition-colors"
              >
                {wt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-neutral-500 uppercase mb-1">Context:</div>
          <div className="flex flex-wrap gap-1">
            {CONTEXTS.map(ctx => (
              <button
                key={ctx.id}
                onClick={() => onCreateChild(selectedType, ctx.id)}
                className="px-2 py-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 text-neutral-300 transition-colors"
                style={{ borderColor: ctx.color + '40' }}
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
