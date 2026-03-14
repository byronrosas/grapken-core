import type { Widget, Task, ProjectMeta, ContextType } from "@/types";
import { CONTEXTS } from "@/constants";

export const GRAPKEN_FORMAT_VERSION = "1" as const;

export interface GrapkenFile {
  version: typeof GRAPKEN_FORMAT_VERSION;
  exportedAt: number;
  project: {
    name: string;
    createdAt: number;
    updatedAt: number;
  };
  widgets: Widget[];
}

export function serializeProject(meta: ProjectMeta, widgets: Widget[]): GrapkenFile {
  return {
    version: GRAPKEN_FORMAT_VERSION,
    exportedAt: Date.now(),
    project: {
      name: meta.name,
      createdAt: meta.createdAt,
      updatedAt: Date.now(),
    },
    widgets,
  };
}

export function downloadGrapken(file: GrapkenFile, projectName: string): void {
  const data = JSON.stringify(file, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "_")}.grapken`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Validation / sanitization ──────────────────────────────────────────────

const VALID_WIDGET_TYPES = new Set<string>(['markdown', 'image', 'variables', 'container']);
const VALID_CONTEXTS = new Set<string>(CONTEXTS.map(c => c.id));
const VALID_TASK_STATUSES = new Set<string>(['todo', 'in-progress', 'done']);
const VALID_TASK_PRIORITIES = new Set<string>(['low', 'medium', 'high']);

function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== 'string' || !t.id) return null;
  if (typeof t.title !== 'string') return null;

  const task: Task = {
    id: t.id,
    title: t.title,
    status: VALID_TASK_STATUSES.has(t.status as string) ? (t.status as Task['status']) : 'todo',
    priority: VALID_TASK_PRIORITIES.has(t.priority as string) ? (t.priority as Task['priority']) : 'medium',
    createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
  };

  if (typeof t.estimate === 'string') task.estimate = t.estimate;
  if (typeof t.realTime === 'number') task.realTime = t.realTime;
  if (typeof t.completedAt === 'number') task.completedAt = t.completedAt;
  if (typeof t.statusChangedAt === 'number') task.statusChangedAt = t.statusChangedAt;
  if (Array.isArray(t.blockedBy)) {
    task.blockedBy = (t.blockedBy as unknown[]).filter(id => typeof id === 'string') as string[];
  }

  return task;
}

function sanitizeContent(
  content: unknown,
  type: Widget['type']
): Widget['content'] {
  if (type === 'markdown') {
    return typeof content === 'string' ? content : '';
  }
  if (type === 'image') {
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      const c = content as Record<string, unknown>;
      return {
        url: typeof c.url === 'string' ? c.url : '',
        description: typeof c.description === 'string' ? c.description : '',
      };
    }
    return { url: '', description: '' };
  }
  if (type === 'variables') {
    if (content && typeof content === 'object' && !Array.isArray(content)) {
      const result: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(content as object)) {
        if (typeof v === 'number' || typeof v === 'string') result[k] = v;
      }
      return result;
    }
    return {};
  }
  return null; // container
}

function sanitizeWidget(raw: unknown): Widget | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Record<string, unknown>;

  if (typeof w.id !== 'string' || !w.id) return null;
  if (!VALID_WIDGET_TYPES.has(w.type as string)) return null;

  const type = w.type as Widget['type'];
  const context: ContextType = VALID_CONTEXTS.has(w.context as string)
    ? (w.context as ContextType)
    : 'general';

  const widget: Widget = {
    id: w.id,
    type,
    label: typeof w.label === 'string' ? w.label : 'Untitled',
    content: sanitizeContent(w.content, type),
    parentId: typeof w.parentId === 'string' ? w.parentId : null,
    rootId: typeof w.rootId === 'string' ? w.rootId : null,
    context,
    children: Array.isArray(w.children)
      ? (w.children as unknown[]).filter(id => typeof id === 'string') as string[]
      : [],
    branchColor: typeof w.branchColor === 'string' ? w.branchColor : '#6b7280',
    createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
    x: typeof w.x === 'number' ? w.x : 0,
    y: typeof w.y === 'number' ? w.y : 0,
    width: typeof w.width === 'number' && w.width > 0 ? w.width : 300,
    height: typeof w.height === 'number' && w.height > 0 ? w.height : 200,
  };

  if (w.isRoot === true) widget.isRoot = true;
  if (w.isMinimized === true) widget.isMinimized = true;
  if (w.isFolded === true) widget.isFolded = true;
  if (w.isTemplate === true) widget.isTemplate = true;
  if (typeof w.templateRef === 'string') widget.templateRef = w.templateRef;
  if (typeof w.instanceMode === 'string' && ['strict', 'override', 'additive'].includes(w.instanceMode)) {
    widget.instanceMode = w.instanceMode as Widget['instanceMode'];
  }
  if (w.localOverrides && typeof w.localOverrides === 'object') {
    widget.localOverrides = w.localOverrides as Widget['localOverrides'];
  }
  if (Array.isArray(w.tasks)) {
    widget.tasks = (w.tasks as unknown[]).map(sanitizeTask).filter(Boolean) as Task[];
  }
  if (w.projectSettings && typeof w.projectSettings === 'object') {
    widget.projectSettings = w.projectSettings as Widget['projectSettings'];
  }
  if (typeof w.taskView === 'string' && ['list', 'board', 'stats'].includes(w.taskView)) {
    widget.taskView = w.taskView as Widget['taskView'];
  }

  return widget;
}

export function validateGrapkenFile(raw: unknown): GrapkenFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const file = raw as Record<string, unknown>;

  if (file.version !== GRAPKEN_FORMAT_VERSION) return null;
  if (!Array.isArray(file.widgets) || file.widgets.length === 0) return null;

  const sanitizedWidgets: Widget[] = [];
  for (const w of file.widgets as unknown[]) {
    const sanitized = sanitizeWidget(w);
    if (sanitized) sanitizedWidgets.push(sanitized);
  }

  if (sanitizedWidgets.length === 0) return null;

  const rootWidgets = sanitizedWidgets.filter(w => w.isRoot);
  if (rootWidgets.length === 0) return null;

  const projectRaw = (file.project && typeof file.project === 'object')
    ? (file.project as Record<string, unknown>)
    : {};

  const projectName = typeof projectRaw.name === 'string' && projectRaw.name
    ? projectRaw.name
    : rootWidgets[0].label;

  return {
    version: GRAPKEN_FORMAT_VERSION,
    exportedAt: typeof file.exportedAt === 'number' ? file.exportedAt : Date.now(),
    project: {
      name: projectName,
      createdAt: typeof projectRaw.createdAt === 'number' ? projectRaw.createdAt : Date.now(),
      updatedAt: typeof projectRaw.updatedAt === 'number' ? projectRaw.updatedAt : Date.now(),
    },
    widgets: sanitizedWidgets,
  };
}
