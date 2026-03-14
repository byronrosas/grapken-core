import { useRef } from "react";
import { X } from "lucide-react";
import type React from "react";
import { useMinimap } from "@/hooks/useMinimap";
import { useWidgetStore } from "@/store/useWidgetStore";

interface MiniMapProps {
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  viewportRef: React.RefObject<HTMLElement | null>;
  onHide: () => void;
}

export function MiniMap({ canvasScale, canvasOffset, setCanvasOffset, viewportRef, onHide }: MiniMapProps) {
  const { canvasBounds, minimapScale } = useMinimap(
    canvasScale,
    canvasOffset,
    viewportRef
  );
  const widgets = useWidgetStore(s => s.widgets);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Convert a client position to a canvas offset that centers the viewport there
  const panToClientPos = (clientX: number, clientY: number) => {
    const rect = minimapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const targetCanvasX = canvasBounds.x + clickX / minimapScale;
    const targetCanvasY = canvasBounds.y + clickY / minimapScale;

    setCanvasOffset({
      x: viewportEl.clientWidth  / 2 - targetCanvasX * canvasScale,
      y: viewportEl.clientHeight / 2 - targetCanvasY * canvasScale,
    });
  };

  // Viewport rect in minimap space
  const viewportW = viewportRef.current?.clientWidth ?? 0;
  const viewportH = viewportRef.current?.clientHeight ?? 0;
  const rectX      = (-canvasOffset.x / canvasScale - canvasBounds.x) * minimapScale;
  const rectY      = (-canvasOffset.y / canvasScale - canvasBounds.y) * minimapScale;
  const rectWidth  = (viewportW / canvasScale) * minimapScale;
  const rectHeight = (viewportH / canvasScale) * minimapScale;

  return (
    <div className="absolute bottom-6 left-6 z-40" data-export-ignore="true">
      <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-neutral-400">Mini-Mapa</span>
          <button
            onClick={onHide}
            className="text-neutral-500 hover:text-white text-xs"
            title="Ocultar mini-mapa"
          >
            <X size={14} />
          </button>
        </div>

        {/* Pointer capture on the div gives us seamless drag without global listeners */}
        <div
          ref={minimapRef}
          className="relative bg-neutral-800 rounded border border-neutral-600 overflow-hidden cursor-crosshair select-none"
          style={{ width: '200px', height: '150px' }}
          onPointerDown={e => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            panToClientPos(e.clientX, e.clientY);
          }}
          onPointerMove={e => {
            if (e.buttons !== 1) return;
            panToClientPos(e.clientX, e.clientY);
          }}
          onPointerUp={e => {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
        >
          <div className="absolute inset-0">
            {/* Widget representations */}
            {widgets.map(widget => {
              if (widget.type === 'container' && widget.isMinimized) return null;

              const x      = (widget.x - canvasBounds.x) * minimapScale;
              const y      = (widget.y - canvasBounds.y) * minimapScale;
              const width  = widget.width  * minimapScale;
              const height = widget.height * minimapScale;

              return (
                <div
                  key={widget.id}
                  className={`absolute border rounded ${
                    widget.isRoot
                      ? 'bg-indigo-500/40 border-indigo-400'
                      : 'bg-neutral-500/30 border-neutral-400'
                  }`}
                  style={{
                    left: x,
                    top: y,
                    width:  Math.max(width,  4),
                    height: Math.max(height, 3),
                  }}
                  title={widget.label}
                />
              );
            })}

            {/* Visible viewport rectangle */}
            <div
              className="absolute border-2 border-white/70 bg-white/5 pointer-events-none"
              style={{ left: rectX, top: rectY, width: rectWidth, height: rectHeight }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
