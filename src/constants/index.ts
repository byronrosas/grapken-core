import { FileText, Image as ImageIcon, Settings, Folder } from "lucide-react";
import type { ContextType, Widget } from "@/types";
import type { ComponentType } from "react";

export const PROJECT_VERSION = "v0.1.0 Beta";
export const STORAGE_INFO = "Local Storage";

export const MINIMAP_WIDTH = 200;
export const MINIMAP_HEIGHT = 150;
export const DEFAULT_CANVAS_SIZE = 2000;
export const CANVAS_EDGE_BUFFER = 300;
export const CANVAS_INCREMENT = 1000;

export const CONTEXTS: { id: ContextType; label: string; color: string; icon: string }[] = [
  { id: 'general',   label: 'General',   color: '#8b5cf6', icon: '📋' },
  { id: 'character', label: 'Character', color: '#ef4444', icon: '🎭' },
  { id: 'mechanic',  label: 'Mechanic',  color: '#10b981', icon: '⚙️' },
  { id: 'level',     label: 'Level',     color: '#f59e0b', icon: '🧱' },
  { id: 'story',     label: 'Story',     color: '#0ea5e9', icon: '📖' },
  { id: 'ui',        label: 'UI',        color: '#8b5cf6', icon: '📱' },
  { id: 'economy',   label: 'Economy',   color: '#f97316', icon: '💰' },
  { id: 'audio',     label: 'Audio',     color: '#a78bfa', icon: '🔊' },
  { id: 'scene',     label: 'Scene',     color: '#ec4899', icon: '🎬' },
];

export const WIDGET_TYPES: {
  type: Widget['type'];
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
}[] = [
  { type: 'markdown',  label: 'Note (Markdown)', icon: FileText,  color: 'blue'   },
  { type: 'image',     label: 'Image',           icon: ImageIcon, color: 'purple' },
  { type: 'variables', label: 'Variables',       icon: Settings,  color: 'orange' },
  { type: 'container', label: 'Container',       icon: Folder,    color: 'green'  },
];
