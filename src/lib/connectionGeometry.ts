import type { Widget, PortSide } from "@/types";

const HEADER_HEIGHT = 40;

// Returns the visual height of a widget (collapsed to header when minimized)
const effectiveHeight = (w: Widget): number =>
  w.isMinimized ? HEADER_HEIGHT : w.height;

// Determine the relative position of child to parent
export const getRelativePosition = (parent: Widget, child: Widget): PortSide => {
  const parentCenterX = parent.x + parent.width / 2;
  const parentCenterY = parent.y + effectiveHeight(parent) / 2;
  const childCenterX = child.x + child.width / 2;
  const childCenterY = child.y + effectiveHeight(child) / 2;

  const dx = childCenterX - parentCenterX;
  const dy = childCenterY - parentCenterY;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'bottom' : 'top';
  }
};

// Get the output port side for parent based on child position
export const getOutputPortSide = (parent: Widget, child: Widget): PortSide => {
  return getRelativePosition(parent, child);
};

// Get the input port side for child based on parent position
export const getInputPortSide = (child: Widget, parent: Widget): PortSide => {
  const relativePos = getRelativePosition(parent, child);
  switch (relativePos) {
    case 'right': return 'left';
    case 'left': return 'right';
    case 'bottom': return 'top';
    case 'top': return 'bottom';
  }
};

// Calculate bezier curve path for connections (Unreal Blueprint style)
export const getConnectionPath = (
  fromX: number, fromY: number,
  toX: number, toY: number,
  fromSide: PortSide,
  toSide: PortSide
): string => {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);

  let controlOffsetX = 0;
  let controlOffsetY = 0;

  switch (fromSide) {
    case 'right':  controlOffsetX =  Math.max(dx * 0.5, 80); break;
    case 'left':   controlOffsetX = -Math.max(dx * 0.5, 80); break;
    case 'bottom': controlOffsetY =  Math.max(dy * 0.5, 80); break;
    case 'top':    controlOffsetY = -Math.max(dy * 0.5, 80); break;
  }

  let controlOffsetX2 = 0;
  let controlOffsetY2 = 0;

  switch (toSide) {
    case 'right':  controlOffsetX2 =  Math.max(dx * 0.5, 80); break;
    case 'left':   controlOffsetX2 = -Math.max(dx * 0.5, 80); break;
    case 'bottom': controlOffsetY2 =  Math.max(dy * 0.5, 80); break;
    case 'top':    controlOffsetY2 = -Math.max(dy * 0.5, 80); break;
  }

  const cp1x = fromX + controlOffsetX;
  const cp1y = fromY + controlOffsetY;
  const cp2x = toX + controlOffsetX2;
  const cp2y = toY + controlOffsetY2;

  return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
};

// Return the visual midpoint (t=0.5) of the bezier curve used by getConnectionPath
export const getConnectionMidpoint = (
  fromX: number, fromY: number,
  toX: number, toY: number,
  fromSide: PortSide,
  toSide: PortSide
): { x: number; y: number } => {
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);

  let controlOffsetX = 0, controlOffsetY = 0;
  switch (fromSide) {
    case 'right':  controlOffsetX =  Math.max(dx * 0.5, 80); break;
    case 'left':   controlOffsetX = -Math.max(dx * 0.5, 80); break;
    case 'bottom': controlOffsetY =  Math.max(dy * 0.5, 80); break;
    case 'top':    controlOffsetY = -Math.max(dy * 0.5, 80); break;
  }

  let controlOffsetX2 = 0, controlOffsetY2 = 0;
  switch (toSide) {
    case 'right':  controlOffsetX2 =  Math.max(dx * 0.5, 80); break;
    case 'left':   controlOffsetX2 = -Math.max(dx * 0.5, 80); break;
    case 'bottom': controlOffsetY2 =  Math.max(dy * 0.5, 80); break;
    case 'top':    controlOffsetY2 = -Math.max(dy * 0.5, 80); break;
  }

  const cp1x = fromX + controlOffsetX;
  const cp1y = fromY + controlOffsetY;
  const cp2x = toX + controlOffsetX2;
  const cp2y = toY + controlOffsetY2;

  // Cubic bezier at t = 0.5
  return {
    x: 0.125 * fromX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * toX,
    y: 0.125 * fromY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * toY,
  };
};

// Get port position on a widget based on side
export const getPortPosition = (
  widget: Widget,
  side: PortSide
): { x: number; y: number } => {
  const eh = effectiveHeight(widget);

  switch (side) {
    case 'left':
      return { x: widget.x,                   y: widget.y + HEADER_HEIGHT };
    case 'right':
      return { x: widget.x + widget.width,     y: widget.y + HEADER_HEIGHT };
    case 'top':
      return { x: widget.x + widget.width / 2, y: widget.y };
    case 'bottom':
      return { x: widget.x + widget.width / 2, y: widget.y + eh };
  }
};
