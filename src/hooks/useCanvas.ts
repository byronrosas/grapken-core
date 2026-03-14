import { useState, useRef, useCallback } from "react";
import type React from "react";
import type { Widget } from "@/types";

const GRID = 20;

export function useCanvas() {
  const [canvasScale, setCanvasScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  // Refs that always hold the latest values — used by the stable wheel handler
  // to avoid stale closures from addEventListener.
  const scaleRef = useRef(canvasScale);
  scaleRef.current = canvasScale;

  const offsetRef = useRef(canvasOffset);
  offsetRef.current = canvasOffset;

  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snap = (v: number) => (snapToGrid ? Math.round(v / GRID) * GRID : v);

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button === 2) return; // right-click — let context menu handle it
    if ((e.target as HTMLElement).closest('[data-draggable="widget"]')) return;
    e.preventDefault();
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return;
    e.preventDefault();
    setCanvasOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUpCanvas = () => {
    setIsDraggingCanvas(false);
  };

  // Stable wheel handler — reads values via refs so addEventListener can be
  // registered once without needing to be re-registered on every render.
  const handleWheelCanvas = useCallback((e: WheelEvent, rect: DOMRect) => {
    e.preventDefault();

    // Normalize delta across different deltaMode values:
    //   0 = pixels (trackpad, default), 1 = lines (~30px each), 2 = pages (~300px each)
    const factor = e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 300 : 1;
    const dy = e.deltaY * factor;
    const dx = e.deltaX * factor;

    // Mark as interacting to disable CSS transition (instant response during scroll)
    setIsInteracting(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setIsInteracting(false), 200);

    if (e.ctrlKey) {
      // ── Zoom centered on cursor (pinch trackpad gesture or Ctrl+wheel) ────
      const scale = scaleRef.current;
      const offset = offsetRef.current;

      // Math.pow(0.997, dy) gives smooth fractional scaling:
      //   - trackpad produces small dy (1-10), so tiny steps per event
      //   - mouse wheel produces large dy (~100), so a meaningful jump
      const newScale = Math.min(5, Math.max(0.1, scale * Math.pow(0.997, dy)));

      // Adjust offset so the point under the cursor stays fixed after scaling
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const newOffsetX = cursorX - (cursorX - offset.x) * (newScale / scale);
      const newOffsetY = cursorY - (cursorY - offset.y) * (newScale / scale);

      setCanvasScale(newScale);
      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    } else {
      // ── Pan (trackpad two-finger scroll or mouse wheel without Ctrl) ──────
      const offset = offsetRef.current;
      setCanvasOffset({ x: offset.x - dx, y: offset.y - dy });
    }
  }, []); // Empty deps — always reads fresh values via refs

  const centerOnRoot = (rootWidget: Widget, viewportW: number, viewportH: number) => {
    const scale = 1;
    setCanvasScale(scale);
    setCanvasOffset({
      x: viewportW / 2 - (rootWidget.x + rootWidget.width / 2) * scale,
      y: viewportH / 2 - (rootWidget.y + rootWidget.height / 2) * scale,
    });
  };

  const zoomToFit = (widgets: Widget[], viewportW: number, viewportH: number) => {
    const visible = widgets.filter(w => !w.isMinimized);
    if (visible.length === 0) return;

    const PADDING = 80;
    const minX = Math.min(...visible.map(w => w.x));
    const minY = Math.min(...visible.map(w => w.y));
    const maxX = Math.max(...visible.map(w => w.x + w.width));
    const maxY = Math.max(...visible.map(w => w.y + w.height));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    if (contentW === 0 || contentH === 0) return;

    const newScale = Math.min(
      Math.max(0.25, (viewportW - PADDING * 2) / contentW),
      Math.max(0.25, (viewportH - PADDING * 2) / contentH),
      2
    );

    setCanvasScale(newScale);
    setCanvasOffset({
      x: (viewportW - contentW * newScale) / 2 - minX * newScale,
      y: (viewportH - contentH * newScale) / 2 - minY * newScale,
    });
  };

  return {
    canvasScale,
    setCanvasScale,
    isDraggingCanvas,
    isInteracting,
    canvasOffset,
    setCanvasOffset,
    dragStart,
    snapToGrid,
    setSnapToGrid,
    snap,
    handleMouseDownCanvas,
    handleMouseMoveCanvas,
    handleMouseUpCanvas,
    handleWheelCanvas,
    centerOnRoot,
    zoomToFit,
  };
}
