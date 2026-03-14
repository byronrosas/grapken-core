import { ZoomIn, ZoomOut, Maximize, Grid3x3 } from "lucide-react";
import { useWidgetStore } from "@/store/useWidgetStore";

interface FooterProps {
  canvasScale: number;
  setCanvasScale: (fn: (prev: number) => number) => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onZoomToFit: () => void;
}

export function Footer({
  canvasScale,
  setCanvasScale,
  snapToGrid,
  onToggleSnap,
  onZoomToFit,
}: FooterProps) {
  const widgets = useWidgetStore(s => s.widgets);
  const widgetCount = widgets.length;
  const connectionCount = widgets.reduce((acc, w) => acc + w.children.length, 0);
  const selectedCount = useWidgetStore(s => s.selectedWidgetIds.length);

  return (
    <footer className="h-10 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between px-4 text-xs text-neutral-500 z-50">
      <div className="flex items-center gap-4">
        <span>Widgets: {widgetCount}</span>
        <span>Connections: {connectionCount}</span>
        {selectedCount > 0 && (
          <span className="text-indigo-400">{selectedCount} selected</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Snap to grid toggle */}
        <button
          onClick={onToggleSnap}
          title={snapToGrid ? 'Snap: ON — click to disable' : 'Snap: OFF — click to enable'}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
            snapToGrid
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
              : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
          }`}
        >
          <Grid3x3 size={12} />
          Snap
        </button>

        <div className="w-px h-4 bg-neutral-800 mx-1" />

        {/* Zoom to fit */}
        <button
          onClick={onZoomToFit}
          title="Zoom to fit all widgets"
          className="p-1 hover:bg-neutral-800 rounded hover:text-neutral-300 transition-colors"
        >
          <Maximize size={13} />
        </button>

        <div className="w-px h-4 bg-neutral-800 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() => setCanvasScale(s => Math.max(0.25, s - 0.25))}
          className="p-1 hover:bg-neutral-800 rounded"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-14 text-center">{Math.round(canvasScale * 100)}%</span>
        <button
          onClick={() => setCanvasScale(s => Math.min(3, s + 0.25))}
          className="p-1 hover:bg-neutral-800 rounded"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      <div className="w-32 text-right text-[10px] text-neutral-700">
        Del · Ctrl+Z · Ctrl+C/V
      </div>
    </footer>
  );
}
