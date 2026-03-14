import { useState } from "react";
import type React from "react";
import type { DraggedConnection, PortSide } from "@/types";
import { useWidgetStore } from "@/store/useWidgetStore";
import {
  getOutputPortSide,
  getInputPortSide,
  getConnectionPath,
  getConnectionMidpoint,
  getPortPosition,
} from "@/lib/connectionGeometry";

interface ConnectionLayerProps {
  draggedConnection: DraggedConnection | null;
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  canvasAreaRef: React.RefObject<HTMLElement | null>;
  canvasSize: { w: number; h: number };
  visibleWidgetIds: Set<string>;
}

export function ConnectionLayer({
  draggedConnection,
  canvasOffset,
  canvasScale,
  canvasAreaRef,
  canvasSize,
  visibleWidgetIds,
}: ConnectionLayerProps) {
  const widgets = useWidgetStore(s => s.widgets);
  const disconnectChild = useWidgetStore(s => s.disconnectChild);

  const isHiddenByMinimizedContainer = (w: typeof widgets[number]): boolean => {
    return widgets.some(c =>
      c.type === 'container' && c.isMinimized && c.children.includes(w.id)
    );
  };

  const [hoveredConnection, setHoveredConnection] = useState<{
    parentId: string;
    childId: string;
  } | null>(null);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: `${canvasSize.w}px`, height: `${canvasSize.h}px`, zIndex: 0, overflow: 'visible' }}
    >
      <defs>
        <filter id="connection-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="connection-glow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Static connections */}
      {widgets.map(widget =>
        widget.children.map(childId => {
          const child = widgets.find(w => w.id === childId);
          if (!child) return null;
          // Skip if both endpoints are off-screen (virtualization)
          if (!visibleWidgetIds.has(widget.id) && !visibleWidgetIds.has(childId)) return null;
          if (widget.type === 'container' && widget.isMinimized) return null;
          if (isHiddenByMinimizedContainer(widget) || isHiddenByMinimizedContainer(child)) return null;
          // Hide connection if the parent widget has folded its branch
          if (widget.isFolded) return null;
          // Hide connection if any ancestor in child's chain is folded
          {
            let pid = child.parentId;
            while (pid) {
              const ancestor = widgets.find(w => w.id === pid);
              if (!ancestor) break;
              if (ancestor.isFolded) return null;
              pid = ancestor.parentId;
            }
          }

          const outputSide = getOutputPortSide(widget, child);
          const inputSide = getInputPortSide(child, widget);
          const from = getPortPosition(widget, outputSide);
          const to = getPortPosition(child, inputSide);
          const path = getConnectionPath(from.x, from.y, to.x, to.y, outputSide, inputSide);
          const mid = getConnectionMidpoint(from.x, from.y, to.x, to.y, outputSide, inputSide);

          const key = `${widget.id}-${childId}`;
          const isHovered =
            hoveredConnection?.parentId === widget.id &&
            hoveredConnection?.childId === childId;

          return (
            <g
              key={key}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredConnection({ parentId: widget.id, childId })}
              onMouseLeave={() => setHoveredConnection(null)}
            >
              {/* Wide invisible hit area for easy hover */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth="20"
              />

              {/* Glow layer — brighter on hover */}
              <path
                d={path}
                fill="none"
                stroke={widget.branchColor}
                strokeWidth={isHovered ? 8 : 4}
                strokeLinecap="round"
                opacity={isHovered ? 0.5 : 0.3}
                filter={isHovered ? "url(#connection-glow-strong)" : "url(#connection-glow)"}
              />

              {/* Main visible path */}
              <path
                d={path}
                fill="none"
                stroke={widget.branchColor}
                strokeWidth={isHovered ? 3.5 : 2.5}
                strokeLinecap="round"
                opacity={isHovered ? 1 : 0.85}
              />

              {/* Animated flow dot */}
              <circle r="3" fill={widget.branchColor} opacity={isHovered ? 1 : 0.7}>
                <animateMotion dur="2s" repeatCount="indefinite" path={path} />
              </circle>

              {/* Delete button at midpoint — only shown on hover */}
              {isHovered && (
                <g
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation();
                    disconnectChild(widget.id, childId);
                    setHoveredConnection(null);
                  }}
                >
                  {/* Outer glow ring */}
                  <circle
                    cx={mid.x}
                    cy={mid.y}
                    r="13"
                    fill="none"
                    stroke={widget.branchColor}
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  {/* Button background */}
                  <circle
                    cx={mid.x}
                    cy={mid.y}
                    r="10"
                    fill="#0f0f0f"
                    stroke={widget.branchColor}
                    strokeWidth="1.5"
                  />
                  {/* × symbol */}
                  <text
                    x={mid.x}
                    y={mid.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize="13"
                    fontWeight="bold"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    ×
                  </text>
                </g>
              )}
            </g>
          );
        })
      )}

      {/* Dragged connection preview */}
      {draggedConnection && (() => {
        let startX: number, startY: number, startSide: PortSide;
        let color = '#8b5cf6';

        if (draggedConnection.fromWidgetId) {
          const fromWidget = widgets.find(w => w.id === draggedConnection.fromWidgetId);
          if (!fromWidget) return null;
          const pos = getPortPosition(fromWidget, draggedConnection.fromSide);
          startX = pos.x;
          startY = pos.y;
          startSide = draggedConnection.fromSide;
          color = fromWidget.branchColor;
        } else if (draggedConnection.originalParentId) {
          const childWidget = widgets.find(w => w.id === draggedConnection.originalChildId);
          const parentWidget = widgets.find(w => w.id === draggedConnection.originalParentId);
          if (!childWidget || !parentWidget) return null;
          const inputSide = getInputPortSide(childWidget, parentWidget);
          const pos = getPortPosition(childWidget, inputSide);
          startX = pos.x;
          startY = pos.y;
          startSide = inputSide;
          color = childWidget.branchColor;
        } else {
          return null;
        }

        const rect = canvasAreaRef.current?.getBoundingClientRect();
        const originX = rect?.left ?? 0;
        const originY = rect?.top ?? 0;
        const endX = (draggedConnection.mouseX - originX - canvasOffset.x) / canvasScale;
        const endY = (draggedConnection.mouseY - originY - canvasOffset.y) / canvasScale;

        const dx = endX - startX;
        const dy = endY - startY;
        let endSide: PortSide;
        if (Math.abs(dx) > Math.abs(dy)) {
          endSide = dx > 0 ? 'left' : 'right';
        } else {
          endSide = dy > 0 ? 'top' : 'bottom';
        }

        const dragPath = getConnectionPath(startX, startY, endX, endY, startSide, endSide);

        return (
          <g>
            <path
              d={dragPath}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.3"
              filter="url(#connection-glow)"
            />
            <path
              d={dragPath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="8,4"
              className="transition-all duration-75"
            />
            <circle cx={endX} cy={endY} r="6" fill={color} opacity="0.8" />
          </g>
        );
      })()}
    </svg>
  );
}
