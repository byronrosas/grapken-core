import type React from "react";
import type { PortSide } from "@/types";

interface PortProps {
  side: PortSide;
  type: 'input' | 'output';
  color: string;
  isActive: boolean;
  isHovered?: boolean;
  onDragStart?: (e: React.MouseEvent) => void;
  onHover?: (isHovering: boolean) => void;
  widgetId: string;
}

export function Port({
  side,
  type,
  color,
  isActive,
  isHovered,
  onDragStart,
  onHover,
}: PortProps) {
  const style = {
    left:      side === 'left'   ? 0 : side === 'right' ? undefined : '50%',
    right:     side === 'right'  ? 0 : undefined,
    top:       side === 'top'    ? 0 : side === 'bottom' ? undefined : 40,
    bottom:    side === 'bottom' ? 0 : undefined,
    transform:
      side === 'left'   ? 'translate(-50%, -50%)'
      : side === 'right'  ? 'translate(50%, -50%)'
      : side === 'top'    ? 'translate(-50%, -50%)'
      : 'translate(-50%, 50%)',
  };

  const isDraggable = isActive && type === 'input';

  return (
    <div
      className={`absolute z-30 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={style}
      title={
        isDraggable
          ? `${type} connection (${side}) - drag to reconnect`
          : `${type} connection (${side})`
      }
      onMouseDown={isDraggable ? onDragStart : undefined}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 bg-neutral-900 transition-all duration-200 ${isHovered ? 'scale-125' : ''}`}
        style={{
          borderColor: color,
          boxShadow: isActive ? `0 0 10px ${color}60` : 'none',
        }}
      >
        {isActive && (
          <div
            className="absolute inset-1 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </div>
    </div>
  );
}
