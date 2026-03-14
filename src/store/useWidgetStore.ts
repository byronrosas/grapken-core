import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Widget, ContextType, InstanceMode, Task, ProjectMeta } from "@/types";
import type { GrapkenFile } from "@/lib/grapkenFormat";
import { CONTEXTS } from "@/constants";
import { generateId, generateTimestamp, createRootWidget } from "@/lib/widgetUtils";
import { createTemplateInstance, propagateTemplateChanges } from "@/lib/templateSystem";
import { migrateTaskEstimate } from "@/lib/estimationScale";

// ── Deep-copy template descendants ───────────────────────────────────────────

function deepCopyDescendants(
  templateId: string,
  newParentId: string,
  offsetX: number,
  offsetY: number,
  widgets: Widget[],
): Widget[] {
  const template = widgets.find(w => w.id === templateId);
  if (!template || template.children.length === 0) return [];

  const copies: Widget[] = [];
  const now = generateTimestamp();

  const copyTree = (sourceId: string, parentId: string) => {
    const source = widgets.find(w => w.id === sourceId);
    if (!source) return;
    const newId = generateId();
    const copy: Widget = {
      ...source,
      id: newId,
      parentId,
      x: source.x + offsetX,
      y: source.y + offsetY,
      children: [],
      isTemplate: false,
      templateRef: undefined,
      instanceMode: undefined,
      localOverrides: undefined,
      createdAt: now,
      tasks: (source.tasks ?? []).map(t => ({
        ...t,
        id: generateId(),
        createdAt: now,
        blockedBy: undefined,
      })),
    };
    copies.push(copy);

    // Update parent's children to include this copy
    const parent = copies.find(c => c.id === parentId);
    if (parent) {
      parent.children = [...parent.children, newId];
    }

    // Recurse into source's children
    for (const childId of source.children) {
      copyTree(childId, newId);
    }
  };

  for (const childId of template.children) {
    copyTree(childId, newParentId);
  }

  return copies;
}

// ── Auto-connect widgets dropped inside a container ───────────────────────────

function autoConnectToContainer(widgets: Widget[]): Widget[] {
  const toConnect: { childId: string; containerId: string }[] = [];

  for (const w of widgets) {
    if (w.type !== 'container' || w.isMinimized) continue;
    for (const s of widgets) {
      // Skip: self, root, is a container itself, already in this container's children
      if (s.id === w.id || s.isRoot || s.type === 'container') continue;
      if (w.children.includes(s.id)) continue;
      const cx = s.x + s.width / 2;
      const cy = s.y + s.height / 2;
      const inside =
        cx >= w.x && cx <= w.x + w.width &&
        cy >= w.y && cy <= w.y + w.height;
      if (inside) toConnect.push({ childId: s.id, containerId: w.id });
    }
  }

  if (toConnect.length === 0) return widgets;

  return widgets.map(w => {
    // Add new children to container's children array
    const newKids = toConnect.filter(c => c.containerId === w.id).map(c => c.childId);
    if (newKids.length > 0) {
      return { ...w, children: [...w.children, ...newKids] };
    }
    // Set parentId only if the widget doesn't already have a hierarchical parent
    const adopted = toConnect.find(c => c.childId === w.id);
    if (adopted && !w.parentId) {
      return { ...w, parentId: adopted.containerId };
    }
    return w;
  });
}

// ── Project localStorage helpers ───────────────────────────────────────────────

function saveProjectSnapshot(id: string, widgets: Widget[]) {
  try { localStorage.setItem(`grapken-${id}`, JSON.stringify(widgets)); } catch {}
}

function loadProjectWidgets(id: string): Widget[] | null {
  try {
    const raw = localStorage.getItem(`grapken-${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface WidgetStore {
  // Persisted
  widgets: Widget[];
  projects: ProjectMeta[];
  activeProjectId: string;
  // Memory only
  selectedWidgetId: string | null;     // single — drives Properties panel
  selectedWidgetIds: string[];          // multi — drives delete, copy, drag
  isLoaded: boolean;
  history: Widget[][];
  historyStep: number;

  // Internal helper
  _saveSnapshot: (newWidgets: Widget[]) => void;

  // Selection
  setSelectedWidgetId: (id: string | null) => void;
  toggleWidgetSelection: (id: string) => void;
  clearSelection: () => void;

  // CRUD
  createChildWidget: (parentId: string, type: Widget['type'], context: ContextType, overridePos?: { x: number; y: number }) => void;
  createChildFromTemplate: (parentId: string, templateId: string, overridePos?: { x: number; y: number }) => void;
  addStandaloneWidget: (type: Widget['type'], context: ContextType, x: number, y: number) => void;
  createStandaloneFromTemplate: (templateId: string, x: number, y: number) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  updateMultipleWidgets: (updates: { id: string; updates: Partial<Widget> }[]) => void;
  deleteWidget: (id: string) => void;
  deleteSelectedWidgets: () => void;
  duplicateWidgets: (ids: string[]) => void;
  setParentContainer: (widgetId: string, newParentId: string | null) => void;
  removeChildFromContainer: (containerId: string, childId: string) => void;
  connectChild: (parentId: string, childId: string) => void;
  disconnectChild: (parentId: string, childId: string) => void;

  // Tasks
  addTask: (widgetId: string, title: string) => void;
  updateTask: (widgetId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (widgetId: string, taskId: string) => void;

  // Projects
  createProject: (name: string) => void;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  importAsNewProject: (fileData: GrapkenFile) => void;
  importReplaceCurrentProject: (fileData: GrapkenFile) => void;

  // History
  undo: () => void;
  redo: () => void;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: [],
      projects: [],
      activeProjectId: '',
      selectedWidgetId: null,
      selectedWidgetIds: [],
      isLoaded: false,
      history: [],
      historyStep: 0,

      _saveSnapshot: (newWidgets) => {
        const reconciled = autoConnectToContainer(newWidgets);
        const { history, historyStep } = get();
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(reconciled);
        set({ widgets: reconciled, history: newHistory, historyStep: newHistory.length - 1 });
      },

      // ── Selection ─────────────────────────────────────────────────────────

      setSelectedWidgetId: (id) => set({
        selectedWidgetId: id,
        selectedWidgetIds: id ? [id] : [],
      }),

      toggleWidgetSelection: (id) => {
        const { selectedWidgetIds } = get();
        const isAlreadySelected = selectedWidgetIds.includes(id);
        const newIds = isAlreadySelected
          ? selectedWidgetIds.filter(i => i !== id)
          : [...selectedWidgetIds, id];
        set({
          selectedWidgetIds: newIds,
          selectedWidgetId: newIds.length === 1 ? newIds[0] : (newIds.length > 1 ? null : null),
        });
      },

      clearSelection: () => set({ selectedWidgetId: null, selectedWidgetIds: [] }),

      // ── CRUD ──────────────────────────────────────────────────────────────

      createChildWidget: (parentId, type, context, overridePos) => {
        const { widgets } = get();
        const parent = widgets.find(w => w.id === parentId);
        if (!parent) return;

        const color = CONTEXTS.find(c => c.id === context)?.color || '#6b7280';
        const id = generateId();
        const now = generateTimestamp();

        let inheritedTemplateRef: string | undefined;
        let inheritedInstanceMode: InstanceMode | undefined;

        if (parent.templateRef && parent.type === 'container') {
          inheritedTemplateRef = undefined;
          inheritedInstanceMode = parent.instanceMode;
        }

        const newWidth = type === 'container' ? 400 : 300;

        // Smart positioning: spread children horizontally, or use override
        let posX: number;
        let posY: number;
        if (overridePos) {
          posX = overridePos.x;
          posY = overridePos.y;
        } else {
          const siblings = parent.children
            .map(cid => widgets.find(w => w.id === cid))
            .filter((w): w is Widget => !!w);
          if (siblings.length > 0) {
            const lastSibling = siblings[siblings.length - 1];
            posX = lastSibling.x + lastSibling.width + 20;
            posY = lastSibling.y;
          } else {
            posX = parent.x;
            posY = parent.y + parent.height + 40;
          }
        }

        const newWidget: Widget = {
          id,
          type,
          label:
            type === 'markdown' ? 'New Note'
              : type === 'image' ? 'Image Asset'
                : type === 'variables' ? 'Data Variables'
                  : 'Group Container',
          content:
            type === 'variables' ? { health: 100, speed: 5 }
              : type === 'markdown' ? '# New Section\n\nStart writing here...'
                : type === 'image' ? { url: '', description: '' }
                  : null,
          parentId,
          rootId: parent.rootId || parentId,
          context,
          children: [],
          branchColor: color,
          createdAt: now,
          templateRef: inheritedTemplateRef,
          instanceMode: inheritedInstanceMode,
          x: posX,
          y: posY,
          width: newWidth,
          height: type === 'variables' ? 250 : type === 'container' ? 300 : 200,
        };

        const updatedWidgets = widgets.map(w =>
          w.id === parentId ? { ...w, children: [...w.children, id] } : w
        );
        const newWidgets = [...updatedWidgets, newWidget];
        get()._saveSnapshot(newWidgets);
        set({ selectedWidgetId: newWidget.id, selectedWidgetIds: [newWidget.id] });
      },

      createChildFromTemplate: (parentId, templateId, overridePos) => {
        const { widgets } = get();
        const template = widgets.find(w => w.id === templateId);
        const parent = widgets.find(w => w.id === parentId);
        if (!template || !parent) return;

        const id = generateId();
        const newWidget = createTemplateInstance(template, id, parentId, {});
        newWidget.context = template.context;
        newWidget.branchColor = template.branchColor;
        newWidget.x = overridePos?.x ?? parent.x + 50;
        newWidget.y = overridePos?.y ?? parent.y + parent.height + 20;

        // Deep-copy template's children
        const offsetX = newWidget.x - template.x;
        const offsetY = newWidget.y - template.y;
        const copiedChildren = deepCopyDescendants(templateId, id, offsetX, offsetY, widgets);
        newWidget.children = copiedChildren.filter(c => c.parentId === id).map(c => c.id);

        const updatedWidgets = widgets.map(w =>
          w.id === parentId ? { ...w, children: [...w.children, id] } : w
        );
        const newWidgets = [...updatedWidgets, newWidget, ...copiedChildren];
        get()._saveSnapshot(newWidgets);
        set({ selectedWidgetId: newWidget.id, selectedWidgetIds: [newWidget.id] });
      },

      addStandaloneWidget: (type, context, x, y) => {
        const { widgets } = get();
        const color = CONTEXTS.find(c => c.id === context)?.color || '#6b7280';
        const id = generateId();
        const now = generateTimestamp();
        const newWidget: Widget = {
          id,
          type,
          label:
            type === 'markdown' ? 'New Note'
              : type === 'image' ? 'Image Asset'
                : type === 'variables' ? 'Data Variables'
                  : 'Group Container',
          content:
            type === 'variables' ? { health: 100, speed: 5 }
              : type === 'markdown' ? '# New Section\n\nStart writing here...'
                : type === 'image' ? { url: '', description: '' }
                  : null,
          parentId: null,
          rootId: null,
          context,
          children: [],
          branchColor: color,
          createdAt: now,
          x,
          y,
          width: type === 'container' ? 400 : 300,
          height: type === 'variables' ? 250 : type === 'container' ? 300 : 200,
        };
        get()._saveSnapshot([...widgets, newWidget]);
        set({ selectedWidgetId: newWidget.id, selectedWidgetIds: [newWidget.id] });
      },

      createStandaloneFromTemplate: (templateId, x, y) => {
        const { widgets } = get();
        const template = widgets.find(w => w.id === templateId);
        if (!template) return;
        const id = generateId();
        const now = generateTimestamp();

        // Deep-copy template's children
        const offsetX = x - template.x;
        const offsetY = y - template.y;
        const copiedChildren = deepCopyDescendants(templateId, id, offsetX, offsetY, widgets);

        const newWidget: Widget = {
          ...template,
          id,
          x,
          y,
          parentId: null,
          rootId: null,
          children: copiedChildren.filter(c => c.parentId === id).map(c => c.id),
          isTemplate: false,
          templateRef: template.id,
          instanceMode: template.instanceMode ?? 'strict',
          localOverrides: {},
          createdAt: now,
          tasks: (template.tasks ?? []).map(t => ({ ...t, id: generateId(), createdAt: now, blockedBy: undefined })),
          isTaskPanelOpen: false,
          isStatsPanelOpen: false,
        };
        get()._saveSnapshot([...widgets, newWidget, ...copiedChildren]);
        set({ selectedWidgetId: newWidget.id, selectedWidgetIds: [newWidget.id] });
      },

      updateWidget: (id, updates) => {
        const { widgets } = get();
        const widget = widgets.find(w => w.id === id);
        const isTemplateUpdate = widget?.isTemplate === true;

        let result = widgets.map(w => {
          if (w.id !== id) return { ...w };

          if (widget?.templateRef && widget.instanceMode !== 'strict') {
            const newOverrides = { ...(widget.localOverrides || {}) };
            for (const key of Object.keys(updates) as (keyof Widget)[]) {
              if (['label', 'content', 'context', 'branchColor'].includes(key)) {
                (newOverrides as any)[key] = updates[key];
              }
            }
            return { ...w, ...updates, localOverrides: newOverrides };
          }

          return { ...w, ...updates };
        });

        if (isTemplateUpdate) {
          result = propagateTemplateChanges(result, id, updates);
        }

        // If template was deactivated, release all instances
        if (isTemplateUpdate && updates.isTemplate === false) {
          result = result.map(w => {
            if (w.templateRef === id) {
              return { ...w, templateRef: undefined, instanceMode: undefined, localOverrides: undefined };
            }
            return w;
          });
        }

        // Sync root widget label → ProjectMeta.name
        if (updates.label !== undefined) {
          const changed = result.find(w => w.id === id);
          if (changed?.isRoot) {
            const { projects, activeProjectId } = get();
            if (projects.length > 0) {
              const updatedProjects = projects.map(p =>
                p.id === activeProjectId ? { ...p, name: updates.label!, updatedAt: Date.now() } : p
              );
              set({ projects: updatedProjects });
            }
          }
        }

        get()._saveSnapshot(result);
      },

      updateMultipleWidgets: (updates) => {
        const { widgets } = get();
        const newWidgets = widgets.map(w => {
          const update = updates.find(u => u.id === w.id);
          return update ? { ...w, ...update.updates } : w;
        });
        get()._saveSnapshot(newWidgets);
      },

      deleteWidget: (id) => {
        const { widgets } = get();
        const widget = widgets.find(w => w.id === id);
        if (widget?.isRoot) return;

        // If deleting a template, warn and release instances
        if (widget?.isTemplate) {
          const instances = widgets.filter(w => w.templateRef === id);
          if (instances.length > 0) {
            const confirmed = window.confirm(
              `This template has ${instances.length} instance(s). Deleting it will make them independent widgets. Continue?`
            );
            if (!confirmed) return;
          }
        }

        if (widget?.type === 'container') {
          if (widget.children.length > 0) {
            const confirmed = window.confirm(
              `This container has ${widget.children.length} widget(s) inside. Deleting it will also delete all contained widgets. Are you sure?`
            );
            if (!confirmed) return;
          }

          const getAllDescendants = (widgetId: string): string[] => {
            const w = widgets.find(ww => ww.id === widgetId);
            if (!w) return [widgetId];
            const descendants = [widgetId];
            w.children.forEach(childId => descendants.push(...getAllDescendants(childId)));
            return descendants;
          };

          const idsToDelete = new Set(getAllDescendants(id));

          const newWidgets = widgets
            .filter(w => !idsToDelete.has(w.id))
            .map(w => {
              const cleaned = { ...w, children: w.children.filter(childId => !idsToDelete.has(childId)) };
              // Release orphaned instances
              if (cleaned.templateRef && idsToDelete.has(cleaned.templateRef)) {
                cleaned.templateRef = undefined;
                cleaned.instanceMode = undefined;
                cleaned.localOverrides = undefined;
              }
              return cleaned;
            });

          get()._saveSnapshot(newWidgets);
          set({ selectedWidgetId: null, selectedWidgetIds: [] });
          return;
        }

        const getAllDescendants = (widgetId: string): string[] => {
          const w = widgets.find(ww => ww.id === widgetId);
          if (!w) return [widgetId];
          const descendants = [widgetId];
          w.children.forEach(childId => descendants.push(...getAllDescendants(childId)));
          return descendants;
        };

        const idsToDelete = new Set(getAllDescendants(id));
        const newWidgets = widgets
          .filter(w => !idsToDelete.has(w.id))
          .map(w => {
            const cleaned = { ...w, children: w.children.filter(childId => !idsToDelete.has(childId)) };
            // Release orphaned instances
            if (cleaned.templateRef && idsToDelete.has(cleaned.templateRef)) {
              cleaned.templateRef = undefined;
              cleaned.instanceMode = undefined;
              cleaned.localOverrides = undefined;
            }
            return cleaned;
          });

        get()._saveSnapshot(newWidgets);
        set({ selectedWidgetId: null, selectedWidgetIds: [] });
      },

      deleteSelectedWidgets: () => {
        const { selectedWidgetIds, deleteWidget } = get();
        // Delete non-root widgets; container confirm happens inside deleteWidget
        const toDelete = selectedWidgetIds.filter(id => {
          const w = get().widgets.find(ww => ww.id === id);
          return w && !w.isRoot;
        });
        toDelete.forEach(id => deleteWidget(id));
      },

      duplicateWidgets: (ids) => {
        const { widgets } = get();
        const OFFSET = 40;
        const idMap = new Map<string, string>(); // oldId → newId
        const now = generateTimestamp();

        // Build new widgets
        const newWidgets: Widget[] = [];
        ids.forEach(id => {
          const w = widgets.find(ww => ww.id === id);
          if (!w || w.isRoot) return;
          const newId = generateId();
          idMap.set(id, newId);
          newWidgets.push({
            ...w,
            id: newId,
            label: `${w.label} (copy)`,
            x: w.x + OFFSET,
            y: w.y + OFFSET,
            createdAt: now,
            parentId: null,     // detach from parent
            children: [],           // children re-linked below
            isTemplate: false,
            templateRef: undefined,
            instanceMode: undefined,
            localOverrides: undefined,
          });
        });

        const combined = [...widgets, ...newWidgets];
        const newIds = newWidgets.map(w => w.id);
        get()._saveSnapshot(combined);
        set({ selectedWidgetIds: newIds, selectedWidgetId: newIds.length === 1 ? newIds[0] : null });
      },

      setParentContainer: (widgetId, newParentId) => {
        const { widgets } = get();
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const oldParentId = widget.parentId;
        if (oldParentId === newParentId) return;

        const newWidgets = widgets.map(w => {
          if (w.id === oldParentId) return { ...w, children: w.children.filter(id => id !== widgetId) };
          if (w.id === newParentId) return { ...w, children: [...w.children, widgetId] };
          if (w.id === widgetId) return { ...w, parentId: newParentId };
          return w;
        });

        get()._saveSnapshot(newWidgets);
      },

      removeChildFromContainer: (containerId, childId) => {
        const { widgets } = get();
        const newWidgets = widgets.map(w => {
          if (w.id === containerId) return { ...w, children: w.children.filter(id => id !== childId) };
          if (w.id === childId) return { ...w, parentId: null };
          return w;
        });
        get()._saveSnapshot(newWidgets);
      },

      connectChild: (parentId, childId) => {
        if (parentId === childId) return;
        const { widgets } = get();

        const checkCircular = (currentId: string, targetId: string): boolean => {
          const current = widgets.find(w => w.id === currentId);
          if (!current) return false;
          if (current.children.includes(targetId)) return true;
          return current.children.some(cId => checkCircular(cId, targetId));
        };

        if (checkCircular(childId, parentId)) return;

        const child = widgets.find(w => w.id === childId);
        const oldParentId = child?.parentId;

        const newWidgets = widgets.map(w => {
          if (w.id === oldParentId) return { ...w, children: w.children.filter(id => id !== childId) };
          if (w.id === parentId) return { ...w, children: [...w.children, childId] };
          if (w.id === childId) return { ...w, parentId };
          return w;
        });

        get()._saveSnapshot(newWidgets);
      },

      disconnectChild: (parentId, childId) => {
        const { widgets } = get();
        const newWidgets = widgets.map(w => {
          if (w.id === parentId) return { ...w, children: w.children.filter(id => id !== childId) };
          if (w.id === childId) return { ...w, parentId: null };
          return w;
        });
        get()._saveSnapshot(newWidgets);
      },

      // ── Tasks ─────────────────────────────────────────────────────────────

      addTask: (widgetId, title) => {
        const { widgets } = get();
        const newTask: Task = {
          id: generateId(),
          title: title.trim(),
          status: 'todo',
          priority: 'medium',
          createdAt: generateTimestamp(),
        };
        const newWidgets = widgets.map(w =>
          w.id === widgetId ? { ...w, tasks: [...(w.tasks ?? []), newTask] } : w
        );
        get()._saveSnapshot(newWidgets);
      },

      updateTask: (widgetId, taskId, updates) => {
        const { widgets } = get();
        const newWidgets = widgets.map(w => {
          if (w.id !== widgetId) return w;
          return {
            ...w,
            tasks: (w.tasks ?? []).map(t => {
              if (t.id !== taskId) return t;
              const merged = { ...t, ...updates };
              // Auto-timestamp status changes for analytics
              if (updates.status !== undefined && updates.status !== t.status) {
                merged.statusChangedAt = Date.now();
                merged.completedAt = updates.status === 'done' ? Date.now() : undefined;
              }
              return merged;
            }),
          };
        });
        get()._saveSnapshot(newWidgets);
      },

      deleteTask: (widgetId, taskId) => {
        const { widgets } = get();
        const newWidgets = widgets.map(w => ({
          ...w,
          tasks: (w.tasks ?? [])
            .filter(t => !(w.id === widgetId && t.id === taskId))
            .map(t => {
              if (!t.blockedBy?.includes(taskId)) return t;
              const next = t.blockedBy.filter(id => id !== taskId);
              return { ...t, blockedBy: next.length > 0 ? next : undefined };
            }),
        }));
        get()._saveSnapshot(newWidgets);
      },

      // ── Projects ──────────────────────────────────────────────────────────

      createProject: (name) => {
        const { widgets, activeProjectId, projects } = get();
        if (activeProjectId) saveProjectSnapshot(activeProjectId, widgets);
        const id = generateId();
        const rootWidget = { ...createRootWidget(), label: name };
        const newProject: ProjectMeta = { id, name, createdAt: Date.now(), updatedAt: Date.now() };
        saveProjectSnapshot(id, [rootWidget]);
        set({
          widgets: [rootWidget],
          projects: [...projects, newProject],
          activeProjectId: id,
          selectedWidgetId: null,
          selectedWidgetIds: [],
          history: [[rootWidget]],
          historyStep: 0,
        });
      },

      switchProject: (id) => {
        const { activeProjectId, widgets } = get();
        if (id === activeProjectId) return;
        if (activeProjectId) saveProjectSnapshot(activeProjectId, widgets);
        const newWidgets = loadProjectWidgets(id) ?? [createRootWidget()];
        set({
          widgets: newWidgets,
          activeProjectId: id,
          selectedWidgetId: null,
          selectedWidgetIds: [],
          history: [newWidgets],
          historyStep: 0,
        });
      },

      deleteProject: (id) => {
        const { activeProjectId, widgets, projects } = get();
        if (projects.length <= 1) return;
        try { localStorage.removeItem(`grapken-${id}`); } catch {}
        const newProjects = projects.filter(p => p.id !== id);
        if (id === activeProjectId) {
          const nextId = newProjects[0].id;
          const newWidgets = loadProjectWidgets(nextId) ?? [createRootWidget()];
          set({
            projects: newProjects,
            activeProjectId: nextId,
            widgets: newWidgets,
            selectedWidgetId: null,
            selectedWidgetIds: [],
            history: [newWidgets],
            historyStep: 0,
          });
        } else {
          set({ projects: newProjects });
        }
      },

      importAsNewProject: (fileData) => {
        const { widgets: currentWidgets, activeProjectId, projects } = get();
        if (activeProjectId) saveProjectSnapshot(activeProjectId, currentWidgets);
        const newId = generateId();
        const newProject: ProjectMeta = {
          id: newId,
          name: fileData.project.name,
          createdAt: fileData.project.createdAt,
          updatedAt: Date.now(),
        };
        saveProjectSnapshot(newId, fileData.widgets);
        set({
          widgets: fileData.widgets,
          projects: [...projects, newProject],
          activeProjectId: newId,
          selectedWidgetId: null,
          selectedWidgetIds: [],
          history: [fileData.widgets],
          historyStep: 0,
        });
      },

      importReplaceCurrentProject: (fileData) => {
        const { activeProjectId, projects } = get();
        const updatedProjects = projects.map(p =>
          p.id === activeProjectId
            ? { ...p, name: fileData.project.name, updatedAt: Date.now() }
            : p
        );
        saveProjectSnapshot(activeProjectId, fileData.widgets);
        set({
          widgets: fileData.widgets,
          projects: updatedProjects,
          selectedWidgetId: null,
          selectedWidgetIds: [],
          history: [fileData.widgets],
          historyStep: 0,
        });
      },

      // ── History ───────────────────────────────────────────────────────────

      undo: () => {
        const { historyStep, history } = get();
        if (historyStep > 0) {
          const step = historyStep - 1;
          set({ historyStep: step, widgets: history[step] });
        }
      },

      redo: () => {
        const { historyStep, history } = get();
        if (historyStep < history.length - 1) {
          const step = historyStep + 1;
          set({ historyStep: step, widgets: history[step] });
        }
      },
    }),
    {
      name: 'game-design-db',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ widgets: state.widgets, projects: state.projects, activeProjectId: state.activeProjectId }),
      skipHydration: true,
      onRehydrateStorage: () => (state, error) => {
        const makeFreshProject = () => {
          const rootWidget = createRootWidget();
          const defaultId = 'default';
          saveProjectSnapshot(defaultId, [rootWidget]);
          return {
            widgets: [rootWidget],
            projects: [{ id: defaultId, name: rootWidget.label, createdAt: Date.now(), updatedAt: Date.now() }],
            activeProjectId: defaultId,
            isLoaded: true,
            history: [[rootWidget]],
            historyStep: 0,
          };
        };

        if (error) {
          console.error('Rehydration error:', error);
          useWidgetStore.setState(makeFreshProject());
          return;
        }

        if (!state || !state.widgets || state.widgets.length === 0) {
          useWidgetStore.setState(makeFreshProject());
          return;
        }

        const hasRoot = state.widgets.some((w: Widget) => w.isRoot);
        if (!hasRoot) {
          state.widgets = [createRootWidget()];
        }

        // Migrate old estimate string formats to unified numeric keys
        const rootWidget = state.widgets.find((w: Widget) => w.isRoot);
        const estimationMode = rootWidget?.projectSettings?.estimationMode;
        if (estimationMode && estimationMode !== 'hours') {
          state.widgets = state.widgets.map((w: Widget) => {
            if (!w.tasks?.length) return w;
            return {
              ...w,
              tasks: w.tasks.map((t: Task) =>
                t.estimate
                  ? { ...t, estimate: migrateTaskEstimate(t.estimate, estimationMode) }
                  : t
              ),
            };
          });
        }

        state.isLoaded = true;
        state.history = [state.widgets];
        state.historyStep = 0;

        // Migrate: first load without multi-project support
        if (!state.projects || state.projects.length === 0) {
          const rootLabel = state.widgets.find((w: Widget) => w.isRoot)?.label ?? 'My Project';
          const defaultId = 'default';
          state.projects = [{ id: defaultId, name: rootLabel, createdAt: Date.now(), updatedAt: Date.now() }];
          state.activeProjectId = defaultId;
          saveProjectSnapshot(defaultId, state.widgets);
        }
      },
    }
  )
);
