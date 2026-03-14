import { useState, useRef, useCallback, useEffect } from "react";
import type React from "react";
import type { DraggedConnection, PortSide } from "@/types";
import { useWidgetStore } from "@/store/useWidgetStore";

const DRAG_THRESHOLD = 6;

export function useConnections(
  onDropIntoVoid?: (fromWidgetId: string, fromSide: PortSide, mouseX: number, mouseY: number) => void
) {
  const [draggedConnection, setDraggedConnection] = useState<DraggedConnection | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{
    widgetId: string;
    type: 'input' | 'output';
    side: PortSide;
  } | null>(null);

  // Track whether the mouse has moved far enough for this to be a real drag
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedFar = useRef(false);

  const connectChild = useWidgetStore(s => s.connectChild);
  const disconnectChild = useWidgetStore(s => s.disconnectChild);

  const handleConnectionDragStart = (widgetId: string, side: PortSide, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasDraggedFar.current = false;
    setDraggedConnection({
      fromWidgetId: widgetId,
      toWidgetId: null,
      fromSide: side,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  };

  const handleInputPortDragStart = (childId: string, side: PortSide, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasDraggedFar.current = false;
    // Use getState() to avoid registering a subscription inside a callback
    const widgets = useWidgetStore.getState().widgets;
    const child = widgets.find(w => w.id === childId);
    const parentId = child?.parentId;
    if (parentId) {
      setDraggedConnection({
        fromWidgetId: null,
        toWidgetId: childId,
        fromSide: side,
        mouseX: e.clientX,
        mouseY: e.clientY,
        originalParentId: parentId,
        originalChildId: childId,
      });
    }
  };

  const handleConnectionDragMove = useCallback((e: MouseEvent) => {
    if (draggedConnection) {
      if (!hasDraggedFar.current && dragStartPos.current) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) hasDraggedFar.current = true;
      }
      setDraggedConnection(prev =>
        prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null
      );
    }
  }, [draggedConnection]);

  const handleConnectionDragEnd = useCallback((e: MouseEvent) => {
    if (draggedConnection) {
      if (
        draggedConnection.originalParentId &&
        draggedConnection.originalChildId &&
        !draggedConnection.fromWidgetId
      ) {
        if (hoveredPort && hoveredPort.type === 'output') {
          connectChild(hoveredPort.widgetId, draggedConnection.originalChildId);
        } else {
          disconnectChild(draggedConnection.originalParentId, draggedConnection.originalChildId);
        }
      } else if (draggedConnection.fromWidgetId) {
        if (hoveredPort?.type === 'input') {
          connectChild(draggedConnection.fromWidgetId, hoveredPort.widgetId);
        } else if (!hoveredPort && hasDraggedFar.current) {
          // Only show drop-to-create when the user actually dragged (not on a simple click)
          onDropIntoVoid?.(draggedConnection.fromWidgetId, draggedConnection.fromSide, e.clientX, e.clientY);
        }
      }
    }
    dragStartPos.current = null;
    hasDraggedFar.current = false;
    setDraggedConnection(null);
    setHoveredPort(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedConnection, hoveredPort]);

  useEffect(() => {
    if (draggedConnection) {
      window.addEventListener('mousemove', handleConnectionDragMove);
      window.addEventListener('mouseup', handleConnectionDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleConnectionDragMove);
        window.removeEventListener('mouseup', handleConnectionDragEnd);
      };
    }
  }, [draggedConnection, handleConnectionDragMove, handleConnectionDragEnd]);

  return {
    draggedConnection,
    hoveredPort,
    setHoveredPort,
    handleConnectionDragStart,
    handleInputPortDragStart,
  };
}
