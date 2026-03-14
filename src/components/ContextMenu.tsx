import { useEffect, useRef } from "react";
import {
  Copy,
  Trash2,
  Star,
  StarOff,
  Minimize2,
  Maximize2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useWidgetStore } from "@/store/useWidgetStore";

interface ContextMenuProps {
  widgetId: string;
  x: number;
  y: number;
  onClose: () => void;
  onDuplicate: () => void;
}

export function ContextMenu({ widgetId, x, y, onClose, onDuplicate }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const widget = useWidgetStore(s => s.widgets.find(w => w.id === widgetId));
  const deleteWidget = useWidgetStore(s => s.deleteWidget);
  const updateWidget = useWidgetStore(s => s.updateWidget);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  if (!widget) return null;

  const isRoot = !!widget.isRoot;
  const hasChildren = widget.children.length > 0;

  type MenuItem =
    | { kind: 'separator' }
    | {
        kind: 'item';
        icon: React.ReactNode;
        label: string;
        hint?: string;
        action: () => void;
        disabled?: boolean;
        danger?: boolean;
      };

  const items: MenuItem[] = [
    {
      kind: 'item',
      icon: <Copy size={13} />,
      label: 'Duplicate',
      hint: 'Ctrl+D',
      action: () => { onDuplicate(); onClose(); },
      disabled: isRoot,
    },
    {
      kind: 'item',
      icon: widget.isTemplate ? <StarOff size={13} /> : <Star size={13} />,
      label: widget.isTemplate ? 'Remove template' : 'Mark as template',
      action: () => { updateWidget(widgetId, { isTemplate: !widget.isTemplate }); onClose(); },
      disabled: isRoot,
    },
    { kind: 'separator' },
    {
      kind: 'item',
      icon: widget.isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />,
      label: widget.isMinimized ? 'Expand' : 'Minimize',
      hint: 'double click',
      action: () => { updateWidget(widgetId, { isMinimized: !widget.isMinimized }); onClose(); },
      disabled: isRoot,
    },
    ...(hasChildren && !isRoot
      ? [{
          kind: 'item' as const,
          icon: widget.isFolded ? <ChevronDown size={13} /> : <ChevronRight size={13} />,
          label: widget.isFolded ? 'Expand branch' : 'Collapse branch',
          action: () => { updateWidget(widgetId, { isFolded: !widget.isFolded }); onClose(); },
        }]
      : []),
    { kind: 'separator' },
    {
      kind: 'item',
      icon: <Trash2 size={13} />,
      label: 'Delete',
      hint: 'Del',
      action: () => { deleteWidget(widgetId); onClose(); },
      disabled: isRoot,
      danger: true,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[200px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1 text-xs"
      style={{ left: x, top: y }}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="px-3 py-1.5 text-neutral-500 border-b border-neutral-800 mb-1 truncate">
        {widget.label}
      </div>

      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return <div key={i} className="h-px bg-neutral-800 my-1" />;
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={item.disabled ? undefined : item.action}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              item.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <span className="flex-shrink-0 text-neutral-500">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.hint && (
              <span className="text-neutral-600 text-[10px]">{item.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
