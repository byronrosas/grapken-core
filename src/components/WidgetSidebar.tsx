import React from "react";
import { Plus } from "lucide-react";
import { WIDGET_TYPES } from "@/constants";
import type { Widget } from "@/types";

interface WidgetSidebarProps {
  onCreateWidget: (type: Widget['type']) => void;
}

export function WidgetSidebar({ onCreateWidget }: WidgetSidebarProps) {
  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Plus size={18} className="text-indigo-400" />
        <h2 className="text-sm font-bold text-neutral-200">Widget Library</h2>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          Quick Add Widgets
        </div>
        
        {WIDGET_TYPES.map((widgetType) => (
          <button
            key={widgetType.type}
            onClick={() => onCreateWidget(widgetType.type)}
            className="w-full flex items-center gap-3 px-3 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 hover:border-indigo-500/50 transition-all group"
          >
            <widgetType.icon size={20} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-neutral-200">{widgetType.label}</div>
              <div className="text-xs text-neutral-500">
                {widgetType.type === 'markdown' && 'Text notes with Markdown'}
                {widgetType.type === 'image' && 'Image URLs with preview'}
                {widgetType.type === 'variables' && 'Key-value game data'}
                {widgetType.type === 'container' && 'Group related widgets'}
              </div>
            </div>
          </button>
        ))}

        <div className="pt-4 border-t border-neutral-800">
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Pro Tips
          </div>
          <div className="text-xs text-neutral-400 space-y-1">
            <p>• Click any widget to add to canvas</p>
            <p>• Drag widgets to connect them</p>
            <p>• Press Delete to remove widgets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
