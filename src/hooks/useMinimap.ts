import { useMemo } from "react";
import type React from "react";
import { MINIMAP_WIDTH, MINIMAP_HEIGHT } from "@/constants";
import { useWidgetStore } from "@/store/useWidgetStore";

const PAD = 40; // padding around scene bounds in canvas units

export function useMinimap(
  canvasScale: number,
  canvasOffset: { x: number; y: number },
  viewportRef: React.RefObject<HTMLElement | null>
) {
  const widgets = useWidgetStore(s => s.widgets);

  // Scene bounds = union of all widget bounds + current viewport bounds.
  // This guarantees by construction that the viewport rect always fits inside
  // the minimap (the same technique used by Excalidraw / Figma).
  const { canvasBounds, minimapScale } = useMemo(() => {
    const viewportEl = viewportRef.current;
    const viewportW = viewportEl?.clientWidth ?? 800;
    const viewportH = viewportEl?.clientHeight ?? 600;

    // Current viewport expressed in canvas coordinates
    const vpLeft   = -canvasOffset.x / canvasScale;
    const vpTop    = -canvasOffset.y / canvasScale;
    const vpRight  = vpLeft + viewportW / canvasScale;
    const vpBottom = vpTop  + viewportH / canvasScale;

    // Start with the viewport as the minimum bounds, then expand to include
    // every visible widget.
    let minX = vpLeft,  minY = vpTop;
    let maxX = vpRight, maxY = vpBottom;

    widgets.forEach(widget => {
      if (widget.type === 'container' && widget.isMinimized) return;
      minX = Math.min(minX, widget.x);
      minY = Math.min(minY, widget.y);
      maxX = Math.max(maxX, widget.x + widget.width);
      maxY = Math.max(maxY, widget.y + widget.height);
    });

    const bounds = {
      x: minX - PAD,
      y: minY - PAD,
      width:  maxX - minX + 2 * PAD,
      height: maxY - minY + 2 * PAD,
    };

    const scale = Math.min(
      MINIMAP_WIDTH  / bounds.width,
      MINIMAP_HEIGHT / bounds.height,
    );

    return { canvasBounds: bounds, minimapScale: scale };

    // viewportRef is a stable ref object — reading .current inside is enough.
    // canvasOffset and canvasScale represent all viewport state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets, canvasOffset, canvasScale]);

  return { canvasBounds, minimapScale };
}
