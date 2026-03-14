import React, { useState, useEffect, useCallback } from "react";
import {
  GripVertical,
  Trash2,
  Folder,
  Plus,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Image as ImageIcon,
  CheckSquare,
  BarChart2,
} from "lucide-react";
import type { Widget, PortSide, DraggedConnection, ContextType, ImageContent } from "@/types";
import { CONTEXTS } from "@/constants";
import { getInputPortSide, getOutputPortSide } from "@/lib/connectionGeometry";
import { useWidgetStore } from "@/store/useWidgetStore";
import { Port } from "@/components/Port";
import { PortMenu } from "@/components/PortMenu";
import { MarkdownContent } from "@/components/MarkdownContent";
import ProjectStatsPanel from "@/components/ProjectStatsPanel";

// ── Local style helper (not exported) ────────────────────────────────────────

function getPortStyle(side: PortSide, _widget: Widget, _type: 'input' | 'output'): React.CSSProperties {
  const headerHeight = 40;
  switch (side) {
    case 'left':   return { left: 0,     top: headerHeight, transform: 'translate(-50%, -50%)' };
    case 'right':  return { right: 0,    top: headerHeight, transform: 'translate(50%, -50%)'  };
    case 'top':    return { left: '50%', top: 0,            transform: 'translate(-50%, -50%)' };
    case 'bottom': return { left: '50%', bottom: 0,         transform: 'translate(-50%, 50%)'  };
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WidgetCardProps {
  widget: Widget;
  isSelected: boolean;
  onSelect: () => void;
  onShiftSelect?: (id: string) => void;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
  canvasScale: number;
  siblings: Widget[];
  snapToGrid?: boolean;
  onCreateChild: (parentId: string, type: Widget['type'], context: ContextType) => void;
  onConnectionDragStart: (widgetId: string, side: PortSide, e: React.MouseEvent) => void;
  onInputPortDragStart: (childId: string, side: PortSide, e: React.MouseEvent) => void;
  hoveredPort: { widgetId: string; type: 'input' | 'output'; side: PortSide } | null;
  setHoveredPort: (port: { widgetId: string; type: 'input' | 'output'; side: PortSide } | null) => void;
  draggedConnection: DraggedConnection | null;
  onDragStateChange: (isDragging: boolean) => void;
  onContextMenu?: (widgetId: string, x: number, y: number) => void;
  templates?: Widget[];
  onCreateFromTemplate?: (parentId: string, templateId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WidgetCard({
  widget,
  isSelected,
  onSelect,
  onShiftSelect,
  onUpdate,
  onDelete,
  canvasScale,
  siblings,
  snapToGrid = false,
  onCreateChild,
  onConnectionDragStart,
  onInputPortDragStart,
  hoveredPort,
  setHoveredPort,
  draggedConnection,
  onDragStateChange,
  onContextMenu,
  templates,
  onCreateFromTemplate,
}: WidgetCardProps) {
  const updateMultipleWidgets = useWidgetStore(s => s.updateMultipleWidgets);
  const selectedWidgetIds = useWidgetStore(s => s.selectedWidgetIds);
  const allWidgets = useWidgetStore(s => s.widgets);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(widget.label);
  const [showPortMenu, setShowPortMenu] = useState(false);
  const [portMenuSide, setPortMenuSide] = useState<PortSide>('right');

  // Which sides have active ports
  const getActivePorts = useCallback(() => {
    const activeInputSides: PortSide[] = [];
    const activeOutputSides: PortSide[] = [];

    if (widget.parentId) {
      const parent = siblings.find(s => s.id === widget.parentId);
      if (parent) {
        activeInputSides.push(getInputPortSide(widget, parent));
      }
    }

    widget.children.forEach(childId => {
      const child = siblings.find(s => s.id === childId);
      if (child) {
        const outputSide = getOutputPortSide(widget, child);
        if (!activeOutputSides.includes(outputSide)) {
          activeOutputSides.push(outputSide);
        }
      }
    });

    return { activeInputSides, activeOutputSides };
  }, [widget, siblings]);

  const { activeInputSides, activeOutputSides } = getActivePorts();

  const getAvailableOutputSide = (): PortSide => {
    const allSides: PortSide[] = ['top', 'right', 'bottom', 'left'];
    for (const side of allSides) {
      if (!activeOutputSides.includes(side)) return side;
    }
    return 'right';
  };

  const availableOutputSide = getAvailableOutputSide();

  const handleOutputPortClick = (e: React.MouseEvent, side: PortSide) => {
    e.stopPropagation();
    setPortMenuSide(side);
    setShowPortMenu(!showPortMenu);
  };

  const handleCreateChild = (type: Widget['type'], context: ContextType) => {
    onCreateChild(widget.id, type, context);
    setShowPortMenu(false);
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ isMinimized: !widget.isMinimized });
  };

  const toggleFold = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ isFolded: !widget.isFolded });
  };

  // Count all recursive descendants for the fold badge
  const countDescendants = (id: string): number => {
    const w = siblings.find(s => s.id === id);
    if (!w || w.children.length === 0) return 0;
    return w.children.reduce((acc, childId) => acc + 1 + countDescendants(childId), 0);
  };
  const descendantCount = widget.children.length > 0 ? countDescendants(widget.id) : 0;

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    onDragStateChange(true);
    setDragStart({ x: e.clientX - widget.x, y: e.clientY - widget.y });
  };

  // Get all explicit descendants (non-recursive)
  const getDescendants = (widgetId: string): Widget[] => {
    const result: Widget[] = [];
    const stack: string[] = [widgetId];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);

      const w = siblings.find(s => s.id === currentId);
      if (w) {
        w.children.forEach(childId => {
          const child = siblings.find(s => s.id === childId);
          if (child && !visited.has(childId)) {
            result.push(child);
            stack.push(childId);
          }
        });
      }
    }
    return result;
  };

  const getAllChildren = (): Widget[] => {
    return widget.children
      .map(id => siblings.find(s => s.id === id))
      .filter((w): w is Widget => w !== undefined);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();

      const GRID = 20;
      const snapV = (v: number) => snapToGrid ? Math.round(v / GRID) * GRID : v;

      const rawX = e.clientX - dragStart.x;
      const rawY = e.clientY - dragStart.y;
      const newX = snapV(rawX);
      const newY = snapV(rawY);
      const dx = newX - widget.x;
      const dy = newY - widget.y;

      // Multi-drag: move all selected siblings together (only when this widget is selected)
      if (isSelected && selectedWidgetIds.length > 1) {
        const updates: { id: string; updates: Partial<Widget> }[] = [];
        selectedWidgetIds.forEach(id => {
          const w = siblings.find(s => s.id === id);
          if (!w) return;
          updates.push({ id, updates: { x: snapV(w.x + dx), y: snapV(w.y + dy) } });
          // Also move explicit children of selected containers
          if (w.type === 'container') {
            const children = w.children.map(cId => siblings.find(s => s.id === cId)).filter(Boolean) as Widget[];
            children.forEach(child => {
              if (!selectedWidgetIds.includes(child.id)) {
                updates.push({ id: child.id, updates: { x: child.x + dx, y: child.y + dy } });
              }
            });
          }
        });
        if (updates.length > 0) updateMultipleWidgets(updates);
        return;
      }

      if (widget.type === 'container') {
        const allChildren = getAllChildren();
        if (allChildren.length > 0) {
          const updates: { id: string; updates: Partial<Widget> }[] = [
            { id: widget.id, updates: { x: newX, y: newY } },
          ];
          allChildren.forEach(child => {
            updates.push({ id: child.id, updates: { x: child.x + dx, y: child.y + dy } });
            const descendants = getDescendants(child.id);
            descendants.forEach(desc => {
              if (!updates.find(u => u.id === desc.id)) {
                updates.push({ id: desc.id, updates: { x: desc.x + dx, y: desc.y + dy } });
              }
            });
          });
          updateMultipleWidgets(updates);
          return;
        }
      }

      onUpdate({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragStateChange(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragStart, onUpdate, onDragStateChange, snapToGrid, isSelected, selectedWidgetIds]);

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditedTitle(widget.label);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (editedTitle.trim()) {
      onUpdate({ label: editedTitle.trim() });
    } else {
      setEditedTitle(widget.label);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleBlur();
    else if (e.key === 'Escape') { setIsEditingTitle(false); setEditedTitle(widget.label); }
  };

  // Variable management
  const addVariable = () => {
    const current = widget.content as Record<string, string | number> || {};
    onUpdate({ content: { ...current, [`new_var_${Date.now()}`]: 0 } });
  };

  const removeVariable = (key: string) => {
    const current = widget.content as Record<string, string | number> || {};
    const newVars = { ...current };
    delete newVars[key];
    onUpdate({ content: newVars });
  };

  const updateVariableKey = (oldKey: string, newKey: string) => {
    const current = widget.content as Record<string, string | number> || {};
    const entries = Object.entries(current);
    const newEntries = entries.map(([k, v]) => k === oldKey ? [newKey, v] : [k, v]);
    onUpdate({ content: Object.fromEntries(newEntries) });
  };

  const updateVariableValue = (key: string, value: string) => {
    const current = widget.content as Record<string, string | number> || {};
    onUpdate({ content: { ...current, [key]: isNaN(Number(value)) ? value : Number(value) } });
  };

  const isConnectionDropTarget =
    !!draggedConnection?.fromWidgetId &&
    draggedConnection.fromWidgetId !== widget.id &&
    hoveredPort?.widgetId === widget.id &&
    hoveredPort?.type === 'input';

  const pendingTaskCount = (widget.tasks ?? []).filter(t => t.status !== 'done').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      data-draggable="widget"
      draggable={false}
      className={`absolute rounded-xl border shadow-xl transition-all duration-200 ${
        isSelected
          ? (widget.type === 'container' ? 'ring-2 ring-indigo-500 z-[5]' : 'ring-2 ring-indigo-500 z-20')
          : (widget.type === 'container' ? 'z-[5]' : 'z-10')
      } ${
        widget.type === 'container' ? 'backdrop-blur-md bg-white/5' : 'bg-neutral-900/95'
      } ${
        widget.isRoot ? 'ring-2 ring-purple-500/50 shadow-purple-500/20' : ''
      } ${
        isConnectionDropTarget ? 'ring-2 ring-purple-400 shadow-lg shadow-purple-400/30' : ''
      } ${isDragging ? 'select-none' : ''}`}
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.width,
        ...(widget.isMinimized ? {} : { minHeight: widget.height }),
        borderColor: widget.branchColor,
        userSelect: isDragging ? 'none' : 'auto',
        WebkitUserSelect: isDragging ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
      onClick={e => {
        if (e.shiftKey && onShiftSelect) {
          e.stopPropagation();
          onShiftSelect(widget.id);
        } else {
          onSelect();
        }
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(widget.id, e.clientX, e.clientY);
      }}
      onDragStart={e => e.preventDefault()}
    >
      {/* Input ports */}
      {!widget.isRoot && activeInputSides.map(side => (
        <Port
          key={`input-${side}`}
          side={side}
          type="input"
          color={widget.branchColor}
          isActive={true}
          widgetId={widget.id}
          isHovered={
            hoveredPort?.widgetId === widget.id &&
            hoveredPort?.type === 'input' &&
            hoveredPort?.side === side
          }
          onDragStart={e => onInputPortDragStart(widget.id, side, e)}
          onHover={isHovering => {
            if (isHovering) {
              setHoveredPort({ widgetId: widget.id, type: 'input', side });
            } else if (hoveredPort?.widgetId === widget.id && hoveredPort?.type === 'input') {
              setHoveredPort(null);
            }
          }}
        />
      ))}

      {/* Empty drop-target input port when dragging a connection */}
      {!widget.isRoot && !widget.parentId && draggedConnection && (
        <div
          className="absolute z-30"
          style={getPortStyle('left', widget, 'input')}
          onMouseEnter={() => setHoveredPort({ widgetId: widget.id, type: 'input', side: 'left' })}
          onMouseLeave={() => setHoveredPort(null)}
        >
          <div
            className={`w-4 h-4 rounded-full border-2 border-dashed bg-neutral-900 transition-all duration-200 ${
              hoveredPort?.widgetId === widget.id && hoveredPort?.type === 'input' ? 'scale-125' : ''
            }`}
            style={{
              borderColor: widget.branchColor,
              boxShadow:
                hoveredPort?.widgetId === widget.id && hoveredPort?.type === 'input'
                  ? `0 0 10px ${widget.branchColor}60`
                  : 'none',
            }}
          />
        </div>
      )}

      {/* Active output ports */}
      {activeOutputSides.map(side => (
        <Port
          key={`output-${side}`}
          side={side}
          type="output"
          color={widget.branchColor}
          isActive={true}
          widgetId={widget.id}
          isHovered={
            hoveredPort?.widgetId === widget.id &&
            hoveredPort?.type === 'output' &&
            hoveredPort?.side === side
          }
          onHover={isHovering => {
            if (isHovering) {
              setHoveredPort({ widgetId: widget.id, type: 'output', side });
            } else if (hoveredPort?.widgetId === widget.id && hoveredPort?.type === 'output') {
              setHoveredPort(null);
            }
          }}
        />
      ))}

      {/* Port menu */}
      {showPortMenu && (
        <PortMenu
          side={portMenuSide}
          widget={widget}
          onCreateChild={handleCreateChild}
          onClose={() => setShowPortMenu(false)}
          templates={templates}
          onCreateFromTemplate={templateId => {
            onCreateFromTemplate?.(widget.id, templateId);
            setShowPortMenu(false);
          }}
        />
      )}

      {/* Clickable + output port for creating new children */}
      <div
        className="absolute z-30 cursor-pointer"
        style={getPortStyle(availableOutputSide, widget, 'output')}
        onClick={e => handleOutputPortClick(e, availableOutputSide)}
        onMouseDown={e => {
          if (e.button === 0) onConnectionDragStart(widget.id, availableOutputSide, e);
        }}
        onMouseEnter={() => {
          if (draggedConnection) {
            setHoveredPort({ widgetId: widget.id, type: 'output', side: availableOutputSide });
          }
        }}
        onMouseLeave={() => {
          if (hoveredPort?.widgetId === widget.id && hoveredPort?.type === 'output') {
            setHoveredPort(null);
          }
        }}
        title="Click to create child widget, or drag to connect"
      >
        <div
          className={`w-4 h-4 rounded-full border-2 bg-neutral-900 transition-all duration-200 hover:scale-125 flex items-center justify-center ${
            hoveredPort?.widgetId === widget.id &&
            hoveredPort?.type === 'output' &&
            hoveredPort?.side === availableOutputSide
              ? 'scale-125'
              : ''
          }`}
          style={{
            borderColor: widget.branchColor,
            boxShadow:
              hoveredPort?.widgetId === widget.id &&
              hoveredPort?.type === 'output' &&
              hoveredPort?.side === availableOutputSide
                ? `0 0 15px ${widget.branchColor}`
                : `0 0 8px ${widget.branchColor}60`,
          }}
        >
          <Plus size={10} className="text-white" style={{ color: widget.branchColor }} />
        </div>
      </div>

      {/* Header */}
      <div
        className={`flex items-center justify-between p-2.5 ${widget.isMinimized ? '' : 'border-b'}`}
        style={{ borderColor: widget.branchColor + '20', backgroundColor: widget.branchColor + '10' }}
        onDoubleClick={e => {
          if ((e.target as HTMLElement).closest('button, input, textarea')) return;
          if (!widget.isRoot) toggleMinimize(e);
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <GripVertical className="text-neutral-500 cursor-move flex-shrink-0" size={16} />

          {widget.isRoot && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 flex-shrink-0">
              ROOT
            </span>
          )}
          {widget.isTemplate && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 flex-shrink-0"
              title="This is a master template"
            >
              TEMPLATE
            </span>
          )}
          {widget.templateRef && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 flex-shrink-0"
              title={`Instance of template: ${widget.templateRef}`}
            >
              INSTANCE
            </span>
          )}

          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={e => e.stopPropagation()}
              className="font-bold text-xs text-neutral-300 bg-transparent border-b border-indigo-500 outline-none flex-1 min-w-0"
              autoFocus
              disabled={widget.instanceMode === 'strict' && !!widget.templateRef}
            />
          ) : (
            <span
              className="font-bold text-xs text-neutral-300 truncate cursor-pointer hover:text-white transition-colors"
              title={
                widget.instanceMode === 'strict' && widget.templateRef
                  ? 'Locked to template - change mode to edit'
                  : 'Click to edit'
              }
              onClick={widget.instanceMode === 'strict' && widget.templateRef ? undefined : handleTitleClick}
              style={{ opacity: widget.instanceMode === 'strict' && widget.templateRef ? 0.7 : 1 }}
            >
              {widget.label}
            </span>
          )}

          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 flex-shrink-0">
            {CONTEXTS.find(c => c.id === widget.context)?.label}
          </span>

          {widget.instanceMode && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700/50 text-neutral-400 flex-shrink-0"
              title={`Instance mode: ${widget.instanceMode}`}
            >
              {widget.instanceMode === 'strict' && '🔒'}
              {widget.instanceMode === 'override' && '✏️'}
              {widget.instanceMode === 'additive' && '➕'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {widget.type === 'container' && getAllChildren().length > 0 && (
            <span
              className="text-[10px] text-neutral-500 mr-1"
              title={`${widget.children.length} nested widgets`}
            >
              {getAllChildren().length}
            </span>
          )}

          {/* Task panel toggle */}
          {!widget.isRoot && (
            <button
              onClick={e => { e.stopPropagation(); onUpdate({ isTaskPanelOpen: !widget.isTaskPanelOpen, taskView: widget.taskView ?? 'list' }); }}
              className={`relative flex items-center p-1 rounded transition-all flex-shrink-0 ${
                widget.isTaskPanelOpen
                  ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                  : 'hover:bg-white/10 text-neutral-400 hover:text-neutral-200'
              }`}
              title={widget.isTaskPanelOpen ? 'Close task panel' : 'Open task panel'}
            >
              <CheckSquare size={13} />
              {pendingTaskCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-indigo-500 text-[9px] text-white flex items-center justify-center px-0.5 font-bold leading-none">
                  {pendingTaskCount}
                </span>
              )}
            </button>
          )}

          {/* Stats panel toggle — root widget only */}
          {widget.isRoot && (
            <button
              onClick={e => { e.stopPropagation(); onUpdate({ isStatsPanelOpen: !widget.isStatsPanelOpen }); }}
              className={`flex items-center p-1 rounded transition-all flex-shrink-0 ${
                widget.isStatsPanelOpen
                  ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                  : 'hover:bg-white/10 text-neutral-400 hover:text-neutral-200'
              }`}
              title={widget.isStatsPanelOpen ? 'Cerrar stats del proyecto' : 'Ver stats del proyecto'}
            >
              <BarChart2 size={13} />
            </button>
          )}

          {/* Fold button — only when has children */}
          {!widget.isRoot && widget.children.length > 0 && (
            <button
              onClick={toggleFold}
              className={`flex items-center gap-0.5 px-1 py-0.5 rounded transition-all flex-shrink-0 text-[10px] font-medium ${
                widget.isFolded
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'hover:bg-white/10 text-neutral-400'
              }`}
              title={widget.isFolded ? `Expand branch (${descendantCount} hidden nodes)` : 'Collapse branch'}
            >
              {widget.isFolded
                ? <><ChevronRight size={11} />{descendantCount}</>
                : <ChevronDown size={11} />}
            </button>
          )}

          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className={`p-1 rounded transition-colors flex-shrink-0 ${
              widget.isRoot
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-red-500/20 text-neutral-500 hover:text-red-400'
            }`}
            disabled={widget.isRoot}
            title={widget.isRoot ? 'Cannot delete project root' : 'Delete widget'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!widget.isMinimized && (
      <div className="p-3 text-xs text-neutral-400 flex-1 overflow-hidden">
        {widget.type === 'markdown' && (
          <MarkdownContent
            content={String(widget.content || '')}
            onChange={content => onUpdate({ content })}
            widgetWidth={widget.width}
            widgetHeight={widget.height}
          />
        )}

        {widget.type === 'image' && (() => {
          const imageContent = (widget.content as ImageContent) || { url: '', description: '' };
          return (
            <div className="space-y-2">
              <input
                type="text"
                value={imageContent.url || ''}
                onChange={e => onUpdate({ content: { ...imageContent, url: e.target.value } })}
                onClick={e => e.stopPropagation()}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                placeholder="https://example.com/image.png"
              />
              <div
                className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-lg text-neutral-600 bg-neutral-950/30 overflow-hidden"
                style={{ height: Math.max(60, widget.height - 140) }}
              >
                {imageContent.url ? (
                  <img
                    src={imageContent.url}
                    alt={imageContent.description || 'Preview'}
                    className="max-h-full max-w-full object-contain"
                    width={widget.width - 40}
                    height={Math.max(60, widget.height - 140)}
                  />
                ) : (
                  <span className="text-center text-neutral-600 p-2">
                    <ImageIcon size={20} className="mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">Enter URL above</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={imageContent.description || ''}
                onChange={e => onUpdate({ content: { ...imageContent, description: e.target.value } })}
                onClick={e => e.stopPropagation()}
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                placeholder="Image description..."
              />
            </div>
          );
        })()}

        {widget.type === 'variables' && (
          <div className="space-y-1.5">
            {Object.entries(widget.content as Record<string, string | number> || {}).map(
              ([key, value], index) => (
                <div key={`var-${index}`} className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={key}
                    onChange={e => updateVariableKey(key, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="bg-neutral-950/50 border border-neutral-800 rounded px-1.5 py-1 text-[10px] flex-1 font-mono text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                  <input
                    type="text"
                    value={String(value)}
                    onChange={e => updateVariableValue(key, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="bg-neutral-950/50 border border-neutral-800 rounded px-1.5 py-1 text-[10px] w-16 font-mono text-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                  <button
                    onClick={e => { e.stopPropagation(); removeVariable(key); }}
                    className="p-1 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )
            )}
            <button
              onClick={e => { e.stopPropagation(); addVariable(); }}
              className="w-full py-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded border border-dashed border-neutral-800 transition-colors"
            >
              + Add Variable
            </button>
          </div>
        )}

        {widget.type === 'container' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-neutral-600 text-xs">
              <Folder size={14} />
              <span>Container Content</span>
              {widget.isMinimized && getAllChildren().length > 0 && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  Minimized
                </span>
              )}
            </div>
            <div className="text-[10px] text-neutral-700">
              {widget.children.length === 0 ? "No child widgets" : `${widget.children.length} nested widgets`}
            </div>
            {getAllChildren().length > 0 && !widget.isMinimized && (
              <div className="text-[10px] text-neutral-500 border-t border-neutral-800 pt-2 mt-1">
                Drag widgets to reposition them inside
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Resize handle (bottom-right) */}
      {!widget.isMinimized && (
      <div
        className="absolute bottom-0 right-0 w-4 h-4 bg-neutral-700/50 rounded-tr cursor-se-resize hover:bg-indigo-500/50 transition-colors z-30"
        style={{ borderTopLeftRadius: '4px', borderBottomRightRadius: widget.width < 100 ? '0' : '8px' }}
        onMouseDown={e => {
          e.stopPropagation();
          let startX = e.clientX;
          let startY = e.clientY;
          const startW = widget.width;
          const startH = widget.height;

          const handleMove = (evt: MouseEvent) => {
            onUpdate({
              width:  Math.max(200, startW + evt.clientX - startX),
              height: Math.max(100, startH + evt.clientY - startY),
            });
          };

          const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
          };

          window.addEventListener('mousemove', handleMove);
          window.addEventListener('mouseup', handleUp);
        }}
      />
      )}

      {/* Connection drop zone — hover any part of widget body during a connection drag */}
      {draggedConnection?.fromWidgetId && draggedConnection.fromWidgetId !== widget.id && (
        <div
          className="absolute inset-0 rounded-xl z-10"
          onMouseEnter={() => setHoveredPort({ widgetId: widget.id, type: 'input', side: 'left' })}
          onMouseLeave={() => {
            if (hoveredPort?.widgetId === widget.id && hoveredPort?.type === 'input') {
              setHoveredPort(null);
            }
          }}
        />
      )}

      {/* Project stats panel — root widget only, portal-rendered */}
      {widget.isRoot && widget.isStatsPanelOpen && (
        <ProjectStatsPanel
          widgets={allWidgets}
          projectSettings={widget.projectSettings}
          onClose={() => onUpdate({ isStatsPanelOpen: false })}
        />
      )}
    </div>
  );
}
