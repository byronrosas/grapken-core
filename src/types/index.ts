// --- Shared Types ---

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type EstimationMode = 'number' | 't-shirt' | 'coffee' | 'emoji' | 'hours';

export interface ProjectSettings {
  estimationMode?: EstimationMode;
  allowRealTime: boolean;
  weeklyPace?: number;   // hours/week for forecast, default 20
}

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  estimate?: string;        // unified numeric key: '1'|'2'|'3'|'5'|'8'|'13', or free string for hours
  realTime?: number;        // hours tracked, only used when allowRealTime is enabled
  completedAt?: number;     // timestamp when status changed to 'done'; cleared on revert
  statusChangedAt?: number; // timestamp of the most recent status change (detects stalled work)
  blockedBy?: string[];     // IDs of tasks this task is waiting on (cross-widget)
}

export interface ImageContent {
  url: string;
  description: string;
}

export type InstanceMode = 'strict' | 'override' | 'additive';

export interface LocalOverrides {
  label?: string;
  content?: string | Record<string, number | string> | ImageContent | null;
  context?: Widget['context'];
  branchColor?: string;
  // Transform properties (x, y, width, height) are NOT inherited - excluded from overrides
}

export interface Widget {
  id: string;
  type: 'markdown' | 'image' | 'variables' | 'container';
  label: string;
  content: string | Record<string, number | string> | ImageContent | null;
  parentId: string | null;
  rootId: string | null;
  context: 'character' | 'mechanic' | 'level' | 'story' | 'ui' | 'economy' | 'audio' | 'general' | 'scene';
  children: string[];
  branchColor: string;
  createdAt: number;
  isRoot?: boolean;
  isMinimized?: boolean;
  isFolded?: boolean;
  isTemplate?: boolean;
  templateRef?: string;
  instanceMode?: InstanceMode;
  localOverrides?: LocalOverrides;
  tasks?: Task[];
  isTaskPanelOpen?: boolean;
  taskView?: 'list' | 'board' | 'stats';
  isStatsPanelOpen?: boolean;
  projectSettings?: ProjectSettings;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ContextType = Widget['context'];

export type PortSide = 'top' | 'right' | 'bottom' | 'left';

export interface DraggedConnection {
  fromWidgetId: string | null;
  toWidgetId: string | null;
  fromSide: PortSide;
  mouseX: number;
  mouseY: number;
  originalChildId?: string;
  originalParentId?: string;
}

// Documentary interface — connections are represented via Widget.children[] in practice
export interface Connection {
  fromId: string;
  toId: string;
  fromPort: 'output';
  toPort: 'input';
}
