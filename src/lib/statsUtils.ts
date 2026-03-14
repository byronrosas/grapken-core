import type { Widget, Task, ContextType } from "@/types";
import { CONTEXTS } from "@/constants";
import { totalEstimateHours } from "./estimationScale";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SCALE_HOURS: Record<string, number> = {
  '1': 1.5, '2': 3, '3': 6, '5': 12, '8': 24, '13': 40,
};

function taskEstHours(task: Task): number {
  if (!task.estimate) return 0;
  if (SCALE_HOURS[task.estimate] !== undefined) return SCALE_HOURS[task.estimate];
  // hours mode: free numeric string
  const n = parseFloat(task.estimate);
  return isNaN(n) ? 0 : n;
}

function taskPts(task: Task): number {
  if (!task.estimate) return 0;
  const n = parseFloat(task.estimate);
  return isNaN(n) ? 0 : n;
}

function getISOWeekLabel(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── Flat task collector ──────────────────────────────────────────────────────

export function collectAllTasks(widgets: Widget[]): { widget: Widget; task: Task }[] {
  const result: { widget: Widget; task: Task }[] = [];
  for (const w of widgets) {
    if (w.isRoot) continue;
    for (const t of w.tasks ?? []) {
      result.push({ widget: w, task: t });
    }
  }
  return result;
}

// ─── Tab 1 — Progreso ─────────────────────────────────────────────────────────

export interface ProgresoStats {
  totalWidgets: number;
  widgetsByType: Record<string, number>;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  pctDone: number;
  pctEstimated: number;
  estimatedHrsTotal: number;
  estimatedHrsRemaining: number;
  estimatedHrsDone: number;
  realTimeLogged: number;
  velocityRatio: number | null;
  velocityDeltaH: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  trendLabel: string;
  trendPct: number;
}

export function getProgresoStats(widgets: Widget[], allowRealTime: boolean): ProgresoStats {
  const nonRoot = widgets.filter(w => !w.isRoot);
  const widgetsByType: Record<string, number> = {};
  for (const w of nonRoot) {
    widgetsByType[w.type] = (widgetsByType[w.type] ?? 0) + 1;
  }

  const all = collectAllTasks(widgets);
  const totalTasks = all.length;
  const doneTasks = all.filter(({ task }) => task.status === 'done').length;
  const inProgressTasks = all.filter(({ task }) => task.status === 'in-progress').length;
  const todoTasks = all.filter(({ task }) => task.status === 'todo').length;

  const estimatedCount = all.filter(({ task }) => !!task.estimate).length;
  const pctEstimated = totalTasks > 0 ? (estimatedCount / totalTasks) * 100 : 0;

  const estimatedHrsTotal = all.reduce((s, { task }) => s + taskEstHours(task), 0);
  const estimatedHrsRemaining = all
    .filter(({ task }) => task.status !== 'done')
    .reduce((s, { task }) => s + taskEstHours(task), 0);
  const estimatedHrsDone = all
    .filter(({ task }) => task.status === 'done')
    .reduce((s, { task }) => s + taskEstHours(task), 0);

  const realTimeLogged = allowRealTime
    ? all.reduce((s, { task }) => s + (task.realTime ?? 0), 0)
    : 0;

  // Velocity: real / estimated (for done tasks only)
  let velocityRatio: number | null = null;
  let velocityDeltaH: number | null = null;
  if (allowRealTime) {
    const doneWithBoth = all.filter(
      ({ task }) => task.status === 'done' && task.realTime != null && !!task.estimate,
    );
    if (doneWithBoth.length > 0) {
      const estH = doneWithBoth.reduce((s, { task }) => s + taskEstHours(task), 0);
      const realH = doneWithBoth.reduce((s, { task }) => s + (task.realTime ?? 0), 0);
      if (estH > 0) {
        velocityRatio = realH / estH;
        velocityDeltaH = realH - estH;
      }
    }
  }

  // Trend: compare tasks done in last 7 days vs 7-14 days ago (requires completedAt)
  const now = Date.now();
  const day = 86400000;
  const recentDone = all.filter(
    ({ task }) =>
      task.status === 'done' && task.completedAt != null && task.completedAt >= now - 7 * day,
  ).length;
  const prevDone = all.filter(
    ({ task }) =>
      task.status === 'done' &&
      task.completedAt != null &&
      task.completedAt >= now - 14 * day &&
      task.completedAt < now - 7 * day,
  ).length;

  // Only show trend if we have at least some completedAt data
  const hasCompletedAtData = all.some(({ task }) => task.completedAt != null);

  let trend: ProgresoStats['trend'] = null;
  let trendLabel = '';
  let trendPct = 0;

  if (hasCompletedAtData) {
    if (prevDone === 0 && recentDone === 0) {
      trend = 'stable';
      trendLabel = 'No recent activity';
    } else if (recentDone > prevDone) {
      trend = 'up';
      const pct = prevDone > 0 ? Math.round(((recentDone - prevDone) / prevDone) * 100) : 100;
      trendPct = pct;
      trendLabel = `↑ Improving +${pct}%`;
    } else if (recentDone < prevDone) {
      trend = 'down';
      const pct = Math.round(((prevDone - recentDone) / prevDone) * 100);
      trendPct = pct;
      trendLabel = `↓ Declining -${pct}%`;
    } else {
      trend = 'stable';
      trendLabel = '→ Steady pace';
    }
  }

  // Override trendLabel with velocity-based label if allowRealTime
  if (allowRealTime && velocityRatio != null) {
    if (velocityRatio > 1.1) {
      const over = Math.round((velocityRatio - 1) * 100);
      trendLabel = `Underestimating +${over}%`;
    } else if (velocityRatio < 0.9) {
      const under = Math.round((1 - velocityRatio) * 100);
      trendLabel = `Overestimating -${under}%`;
    } else {
      trendLabel = 'Accurate estimates';
    }
  }

  return {
    totalWidgets: nonRoot.length,
    widgetsByType,
    totalTasks,
    doneTasks,
    inProgressTasks,
    todoTasks,
    pctDone: totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0,
    pctEstimated,
    estimatedHrsTotal,
    estimatedHrsRemaining,
    estimatedHrsDone,
    realTimeLogged,
    velocityRatio,
    velocityDeltaH,
    trend,
    trendLabel,
    trendPct,
  };
}

// ─── Tab 2 — Scope ────────────────────────────────────────────────────────────

export interface ContextStat {
  context: ContextType;
  label: string;
  color: string;
  icon: string;
  widgetCount: number;
  taskTotal: number;
  taskDone: number;
  taskInProgress: number;
  taskTodo: number;
  estimatedHrsRemaining: number;
  highPriorityPending: number;
  completionPct: number;
}

export interface ScopeStats {
  contexts: ContextStat[];
  laggedContexts: ContextType[];
  // Task-based scope tracking
  totalTasks: number;
  baselineTasks: number;
  addedTasks: number;
  addedHrs: number;
  scopeCreepPct: number;
  baselineDate: number;
  totalWidgets: number;
}

export function getScopeStats(widgets: Widget[]): ScopeStats {
  const nonRoot = widgets.filter(w => !w.isRoot);

  const stats: ContextStat[] = CONTEXTS.map(ctx => {
    const ctxWidgets = nonRoot.filter(w => w.context === ctx.id);
    const tasks = ctxWidgets.flatMap(w => w.tasks ?? []);
    const taskDone = tasks.filter(t => t.status === 'done').length;
    const taskInProgress = tasks.filter(t => t.status === 'in-progress').length;
    const taskTodo = tasks.filter(t => t.status === 'todo').length;
    const highPriorityPending = tasks.filter(
      t => t.priority === 'high' && t.status !== 'done',
    ).length;
    const estimatedHrsRemaining = tasks
      .filter(t => t.status !== 'done')
      .reduce((s, t) => s + taskEstHours(t), 0);

    return {
      context: ctx.id,
      label: ctx.label,
      color: ctx.color,
      icon: ctx.icon,
      widgetCount: ctxWidgets.length,
      taskTotal: tasks.length,
      taskDone,
      taskInProgress,
      taskTodo,
      estimatedHrsRemaining,
      highPriorityPending,
      completionPct: tasks.length > 0 ? (taskDone / tasks.length) * 100 : 0,
    };
  }).filter(s => s.widgetCount > 0); // only show contexts with widgets

  const laggedContexts = stats
    .filter(s => s.completionPct < 10 && s.taskTotal >= 3)
    .map(s => s.context);

  // Task-based scope creep: tasks added after first week
  const allTasks = nonRoot.flatMap(w => w.tasks ?? []);
  const minTaskCreated = allTasks.length > 0
    ? Math.min(...allTasks.map(t => t.createdAt))
    : Date.now();
  const baselineDate = isFinite(minTaskCreated)
    ? minTaskCreated + 7 * 86400000
    : Date.now();
  const baseTasks = allTasks.filter(t => t.createdAt <= baselineDate);
  const newTasks = allTasks.filter(t => t.createdAt > baselineDate);
  const addedHrs = newTasks.reduce((s, t) => s + taskEstHours(t), 0);
  const scopeCreepPct =
    baseTasks.length > 0 ? (newTasks.length / baseTasks.length) * 100 : 0;

  return {
    contexts: stats,
    laggedContexts,
    totalTasks: allTasks.length,
    baselineTasks: baseTasks.length,
    addedTasks: newTasks.length,
    addedHrs,
    scopeCreepPct,
    baselineDate,
    totalWidgets: nonRoot.length,
  };
}

// ─── Tab 3 — Bloqueos ─────────────────────────────────────────────────────────

export interface BlockerEntry {
  task: Task;
  widget: Widget;
  blockedCount: number;
}

export interface BlockedEntry {
  task: Task;
  widget: Widget;
  blockerInfos: { id: string; title: string; isDone: boolean; isDeleted: boolean }[];
}

export interface StalledEntry {
  task: Task;
  widget: Widget;
  daysStalled: number;
}

export interface BloqueosStats {
  blockers: BlockerEntry[];
  blocked: BlockedEntry[];
  stalled: StalledEntry[];
  unestimated: { task: Task; widget: Widget }[];
}

export function getBloqueosStats(widgets: Widget[]): BloqueosStats {
  const all = collectAllTasks(widgets);

  // Build a map: taskId → how many tasks have it in their blockedBy
  const blockedCountMap = new Map<string, number>();
  for (const { task } of all) {
    for (const blockerId of task.blockedBy ?? []) {
      blockedCountMap.set(blockerId, (blockedCountMap.get(blockerId) ?? 0) + 1);
    }
  }

  // Blockers: tasks that appear in other tasks' blockedBy, not done
  const blockers: BlockerEntry[] = [];
  for (const { task, widget } of all) {
    const count = blockedCountMap.get(task.id) ?? 0;
    if (count > 0 && task.status !== 'done') {
      blockers.push({ task, widget, blockedCount: count });
    }
  }
  blockers.sort((a, b) => b.blockedCount - a.blockedCount);

  // Stalled: in-progress tasks not updated in > 3 days
  const now = Date.now();
  const stalledThreshold = 3 * 86400000;
  const stalled: StalledEntry[] = [];
  for (const { task, widget } of all) {
    if (task.status !== 'in-progress') continue;
    const lastChange = task.statusChangedAt ?? task.createdAt;
    const diff = now - lastChange;
    if (diff > stalledThreshold) {
      stalled.push({ task, widget, daysStalled: Math.floor(diff / 86400000) });
    }
  }
  stalled.sort((a, b) => b.daysStalled - a.daysStalled);

  // Unestimated: non-done tasks without estimate
  const unestimated = all.filter(({ task }) => task.status !== 'done' && !task.estimate);

  // Blocked tasks: non-done tasks that have blockedBy references
  const taskInfoMap = new Map<string, { title: string; isDone: boolean }>();
  for (const { task } of all) {
    taskInfoMap.set(task.id, { title: task.title, isDone: task.status === 'done' });
  }
  const blocked: BlockedEntry[] = [];
  for (const { task, widget } of all) {
    if (task.status === 'done') continue;
    const blockedByIds = task.blockedBy ?? [];
    if (blockedByIds.length === 0) continue;
    const blockerInfos = blockedByIds.map(id => ({
      id,
      title: taskInfoMap.get(id)?.title ?? `(deleted task)`,
      isDone: taskInfoMap.get(id)?.isDone ?? false,
      isDeleted: !taskInfoMap.has(id),
    }));
    blocked.push({ task, widget, blockerInfos });
  }

  return { blockers, blocked, stalled, unestimated };
}

// ─── Tab 4 — Predicción ───────────────────────────────────────────────────────

export interface PrediccionStats {
  estimatedHrsTotal: number;
  adjustedHrsTotal: number;
  realTimeLogged: number;
  estimatedHrsDone: number;
  adjustedHrsRemaining: number;
  estimatedHrsRemaining: number;
  velocityRatio: number | null;
  weeksRemaining: number;
  milestones: { label: string; weeksFromNow: number; reached: boolean }[];
  risks: string[];
}

export function getPrediccionStats(widgets: Widget[], allowRealTime: boolean, weeklyPace = 20): PrediccionStats {
  const progreso = getProgresoStats(widgets, allowRealTime);
  const { estimatedHrsTotal, estimatedHrsDone, estimatedHrsRemaining, velocityRatio, realTimeLogged } = progreso;

  const ratio = velocityRatio ?? 1;
  const adjustedHrsTotal = estimatedHrsTotal * ratio;
  const adjustedHrsRemaining = estimatedHrsRemaining * ratio;
  const pace = Math.max(1, weeklyPace); // guard against weeklyPace = 0

  const weeksRemaining = adjustedHrsRemaining > 0 ? adjustedHrsRemaining / pace : 0;

  // Progress-based milestones: "when will we reach X% done?"
  // Each milestone answers a concrete question rather than showing abstract time-fractions.
  const milestoneTargets = [
    { label: '50% complete', pct: 0.5 },
    { label: '75% complete', pct: 0.75 },
    { label: '90% complete', pct: 0.9 },
    { label: '100% done',    pct: 1.0 },
  ];
  const milestones = milestoneTargets.map(({ label, pct }) => {
    const targetHrsDone = estimatedHrsTotal * pct;
    const hrsNeeded = targetHrsDone - estimatedHrsDone;
    if (hrsNeeded <= 0) {
      return { label, weeksFromNow: 0, reached: true };
    }
    const adjustedHrsNeeded = hrsNeeded * ratio;
    const weeksFromNow = Math.round((adjustedHrsNeeded / pace) * 10) / 10;
    return { label, weeksFromNow, reached: false };
  });

  // Risk signals
  const nonRoot = widgets.filter(w => !w.isRoot);
  const widgetsWithoutTasks = nonRoot.filter(w => !w.tasks || w.tasks.length === 0).length;
  const all = collectAllTasks(widgets);
  const unestimatedCount = all.filter(({ task }) => task.status !== 'done' && !task.estimate).length;

  const risks: string[] = [];
  if (widgetsWithoutTasks > 0) risks.push(`${widgetsWithoutTasks} widget${widgetsWithoutTasks > 1 ? 's' : ''} without tasks — hidden scope possible`);
  if (unestimatedCount > 0) risks.push(`${unestimatedCount} task${unestimatedCount > 1 ? 's' : ''} without estimate — forecast may undercount`);
  if (velocityRatio != null && velocityRatio > 1.5) risks.push(`Tasks taking ${velocityRatio.toFixed(1)}× longer than estimated — consider revising estimates`);

  return {
    estimatedHrsTotal,
    adjustedHrsTotal,
    realTimeLogged,
    estimatedHrsDone,
    adjustedHrsRemaining,
    estimatedHrsRemaining,
    velocityRatio,
    weeksRemaining,
    milestones,
    risks,
  };
}

// ─── Widget Stats tab (per-widget) ────────────────────────────────────────────

export interface WidgetStatsSummary {
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  totalTasks: number;
  highCount: number;
  medCount: number;
  lowCount: number;
  unsetPriorityCount: number;
  estimatedPts: number;
  estimatedHrs: number;
  pctEstimated: number;
  realTimeLogged: number;
  velocityRatio: number | null;
  weeklyCompletions: { weekLabel: string; count: number }[];
  hasDescendants: boolean;
  descendantWidgetCount: number;
  recursiveTotalTasks: number;
  recursiveDoneTasks: number;
}

function collectDescendantIds(widgetId: string, allWidgets: Widget[]): string[] {
  const widget = allWidgets.find(w => w.id === widgetId);
  if (!widget || widget.children.length === 0) return [];
  const result: string[] = [];
  for (const childId of widget.children) {
    result.push(childId);
    result.push(...collectDescendantIds(childId, allWidgets));
  }
  return result;
}

export function getWidgetStats(
  widget: Widget,
  allWidgets: Widget[],
  allowRealTime: boolean,
): WidgetStatsSummary {
  const tasks = widget.tasks ?? [];

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;

  const highCount = tasks.filter(t => t.priority === 'high').length;
  const medCount = tasks.filter(t => t.priority === 'medium').length;
  const lowCount = tasks.filter(t => t.priority === 'low').length;
  const unsetPriorityCount = tasks.filter(t => !t.priority).length;

  const estimatedPts = tasks.reduce((s, t) => s + taskPts(t), 0);
  const estimatedHrs = totalEstimateHours(tasks);
  const estimatedCount = tasks.filter(t => !!t.estimate).length;
  const pctEstimated = totalTasks > 0 ? (estimatedCount / totalTasks) * 100 : 0;

  const realTimeLogged = allowRealTime
    ? tasks.reduce((s, t) => s + (t.realTime ?? 0), 0)
    : 0;

  const velocityRatio: number | null = (() => {
    if (!allowRealTime) return null;
    const doneWithBoth = tasks.filter(
      t => t.status === 'done' && t.realTime != null && !!t.estimate,
    );
    if (doneWithBoth.length === 0) return null;
    const estH = totalEstimateHours(doneWithBoth);
    const realH = doneWithBoth.reduce((s, t) => s + (t.realTime ?? 0), 0);
    return estH > 0 ? realH / estH : null;
  })();

  // Weekly completions — last 4 ISO weeks
  const now = Date.now();
  const weekLabels: string[] = [];
  for (let i = 3; i >= 0; i--) {
    weekLabels.push(getISOWeekLabel(now - i * 7 * 86400000));
  }
  const weekMap = new Map<string, number>();
  for (const label of weekLabels) weekMap.set(label, 0);
  for (const t of tasks) {
    if (t.status === 'done' && t.completedAt != null) {
      const wk = getISOWeekLabel(t.completedAt);
      if (weekMap.has(wk)) weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
    }
  }
  const weeklyCompletions = weekLabels.map(wk => ({ weekLabel: wk, count: weekMap.get(wk) ?? 0 }));

  // Descendant rollup
  const descendantIds = collectDescendantIds(widget.id, allWidgets);
  const hasDescendants = descendantIds.length > 0;
  const descendantWidgets = allWidgets.filter(w => descendantIds.includes(w.id));
  const descendantTasks = descendantWidgets.flatMap(w => w.tasks ?? []);
  const recursiveTotalTasks = descendantTasks.length;
  const recursiveDoneTasks = descendantTasks.filter(t => t.status === 'done').length;

  return {
    todoCount,
    inProgressCount,
    doneCount,
    totalTasks,
    highCount,
    medCount,
    lowCount,
    unsetPriorityCount,
    estimatedPts,
    estimatedHrs,
    pctEstimated,
    realTimeLogged,
    velocityRatio,
    weeklyCompletions,
    hasDescendants,
    descendantWidgetCount: descendantIds.length,
    recursiveTotalTasks,
    recursiveDoneTasks,
  };
}
