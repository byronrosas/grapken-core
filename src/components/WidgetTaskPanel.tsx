import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronRight, ArrowRight, ArrowLeft, Plus, Link2, BarChart2 } from "lucide-react";
import type { Widget, Task, TaskStatus, TaskPriority, ProjectSettings, EstimationMode } from "@/types";
import { ESTIMATION_SCALE, SCALE_HOURS, renderEstimateBadge, getScalePoint, totalEstimateHours, formatTimeFromHours, formatTotalEstimate } from "@/lib/estimationScale";
import { useWidgetStore } from "@/store/useWidgetStore";
import { getWidgetStats } from "@/lib/statsUtils";

interface WidgetTaskPanelProps {
  widget: Widget;
  projectSettings?: ProjectSettings;
  onAddTask: (title: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleView: (view: 'list' | 'board' | 'stats') => void;
  onClose: () => void;
}

const PRIORITY_CYCLE: TaskPriority[] = ['low', 'medium', 'high'];

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low:    'bg-neutral-700 text-neutral-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high:   'bg-red-500/20 text-red-400',
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];
const STATUS_LABEL: Record<TaskStatus, string> = {
  'todo':        'Todo',
  'in-progress': 'In Progress',
  'done':        'Done',
};
const STATUS_COLOR: Record<TaskStatus, string> = {
  'todo':        'text-neutral-400 border-neutral-700',
  'in-progress': 'text-amber-400 border-amber-500/40',
  'done':        'text-emerald-400 border-emerald-500/40',
};

function cyclePriority(p: TaskPriority): TaskPriority {
  const i = PRIORITY_CYCLE.indexOf(p);
  return PRIORITY_CYCLE[(i + 1) % PRIORITY_CYCLE.length];
}

function moveTo(status: TaskStatus, dir: 'prev' | 'next'): TaskStatus {
  const i = STATUS_ORDER.indexOf(status);
  const next = dir === 'next' ? i + 1 : i - 1;
  return STATUS_ORDER[Math.max(0, Math.min(STATUS_ORDER.length - 1, next))];
}

// ── Floating estimate popover (via Portal) ────────────────────────────────────

const POPOVER_W = 380; // approx max width of the pill strip
const POPOVER_H = 52;  // approx height

interface PopoverState {
  taskId: string;
  rect: DOMRect;
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** Convert "2026-W09" → Monday date string like "Feb 24" */
function isoWeekToDateStr(label: string): string {
  const [yearStr, wPart] = label.split('-W');
  const weekNum = parseInt(wPart, 10);
  const year = parseInt(yearStr, 10);
  // Jan 4 always falls in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7; // 1=Mon..7=Sun
  const mondayW1 = new Date(jan4);
  mondayW1.setDate(jan4.getDate() - (dow - 1));
  const monday = new Date(mondayW1);
  monday.setDate(mondayW1.getDate() + (weekNum - 1) * 7);
  return `${SHORT_MONTHS[monday.getMonth()]} ${monday.getDate()}`;
}

function EstimatePopover({
  state,
  mode,
  value,
  weeklyPace = 20,
  onSelect,
  onClose,
}: {
  state: PopoverState;
  mode: EstimationMode;
  value?: string;
  weeklyPace?: number;
  onSelect: (v: string | undefined) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Edge-clamped position
  const left = Math.min(state.rect.left, window.innerWidth - POPOVER_W - 8);
  const top  = state.rect.bottom + 6 + POPOVER_H > window.innerHeight
    ? state.rect.top - POPOVER_H - 6
    : state.rect.bottom + 6;

  // Close on pointerdown outside
  useEffect(() => {
    const handle = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', handle, true);
    return () => window.removeEventListener('pointerdown', handle, true);
  }, [onClose]);

  // Pill content per mode
  function primaryLabel(p: typeof ESTIMATION_SCALE[0]): string {
    if (mode === 'number')  return String(p.num);
    if (mode === 't-shirt') return p.tshirt;
    if (mode === 'emoji')   return p.emoji;
    if (mode === 'coffee')  return renderEstimateBadge(p.value, 'coffee');
    return String(p.num);
  }

  function secondaryLabel(p: typeof ESTIMATION_SCALE[0]): string {
    const h = SCALE_HOURS[p.value] ?? 0;
    return formatTimeFromHours(h, weeklyPace) || p.timeRange;
  }

  const el = (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 9999 }}
      className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl"
      onPointerDown={e => e.stopPropagation()}
    >
      {ESTIMATION_SCALE.map(p => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            onClick={e => { e.stopPropagation(); onSelect(active ? undefined : p.value); }}
            title={`${p.label} · ${secondaryLabel(p)}`}
            className={`flex flex-col items-center px-2 py-1 rounded-lg text-center transition-all hover:scale-105 active:scale-95 ${
              active
                ? 'bg-indigo-500/30 text-white ring-1 ring-indigo-400/50'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <span className="text-[13px] leading-none">[{primaryLabel(p)}]</span>
            <span className="text-[9px] text-neutral-500 mt-0.5 leading-none">{secondaryLabel(p)}</span>
          </button>
        );
      })}
      {value && (
        <button
          onClick={e => { e.stopPropagation(); onSelect(undefined); }}
          className="ml-1 text-[9px] px-1.5 py-0.5 rounded-md text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800 transition-all self-center"
          title="Clear estimate"
        >
          ✕
        </button>
      )}
    </div>
  );

  return createPortal(el, document.body);
}

// ── Hours estimate inline input ───────────────────────────────────────────────

function HoursInput({ value, onSave, stopPointerPropagation }: {
  value?: string;
  onSave: (v: string) => void;
  stopPointerPropagation?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState(value ?? '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = local.trim();
    if (trimmed !== (value ?? '')) onSave(trimmed);
    else setLocal(value ?? '');
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        min="0"
        step="0.5"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setEditing(false); setLocal(value ?? ''); }
          e.stopPropagation();
        }}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        className="w-12 bg-neutral-800 border border-indigo-500/50 rounded px-1 py-0.5 text-[9px] text-neutral-200 outline-none"
      />
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true); setLocal(value ?? ''); }}
      onPointerDown={stopPointerPropagation ? e => e.stopPropagation() : undefined}
      className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium transition-all ${
        value ? 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600' : 'bg-neutral-800 text-neutral-600 hover:text-neutral-400'
      }`}
      title="Click to set estimated hours"
    >
      {value ? `${value}h` : '–h'}
    </button>
  );
}

// ── Real time inline input (only on done tasks when enabled) ──────────────────

function RealTimeInput({ value, onSave }: { value?: number; onSave: (v: number | undefined) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState(value != null ? String(value) : '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = local.trim();
    if (!trimmed) { onSave(undefined); return; }
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && parsed !== value) onSave(parsed);
    else setLocal(value != null ? String(value) : '');
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        min="0"
        step="0.5"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setEditing(false); setLocal(value != null ? String(value) : ''); }
          e.stopPropagation();
        }}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        className="w-12 bg-neutral-800 border border-amber-500/40 rounded px-1 py-0.5 text-[9px] text-neutral-200 outline-none"
      />
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true); setLocal(value != null ? String(value) : ''); }}
      onPointerDown={e => e.stopPropagation()}
      className={`flex-shrink-0 text-[9px] px-1 py-0.5 rounded transition-all flex items-center gap-0.5 ${
        value != null ? 'text-amber-400/80 hover:text-amber-300' : 'text-neutral-600 hover:text-neutral-500'
      }`}
      title="Log actual time spent"
    >
      ⏱ {value != null ? `${value}h` : '–'}
    </button>
  );
}

// ── Inline editable task title ──────────────────────────────────────────────

function TaskTitle({ title, onSave }: { title: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) onSave(trimmed);
    else setValue(title);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setValue(title); } }}
        onClick={e => e.stopPropagation()}
        className="flex-1 bg-neutral-800 rounded px-1 py-0.5 text-xs text-neutral-200 outline-none border border-indigo-500/50 min-w-0"
      />
    );
  }
  return (
    <span
      className="flex-1 text-sm text-neutral-100 cursor-pointer hover:text-white transition-colors truncate min-w-0"
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Double-click to edit"
    >
      {title}
    </span>
  );
}

// ── Blocker picker (via Portal) ───────────────────────────────────────────────

const BLOCKER_W = 260;
const BLOCKER_H = 300;

function BlockerPicker({
  state,
  allWidgets,
  blockedBy,
  onToggle,
  onClose,
}: {
  state: PopoverState;
  allWidgets: Widget[];
  blockedBy?: string[];
  onToggle: (taskId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const left = Math.min(state.rect.left, window.innerWidth - BLOCKER_W - 8);
  const top  = state.rect.bottom + 6 + BLOCKER_H > window.innerHeight
    ? state.rect.top - BLOCKER_H - 6
    : state.rect.bottom + 6;

  useEffect(() => {
    const handle = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', handle, true);
    return () => window.removeEventListener('pointerdown', handle, true);
  }, [onClose]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const q = query.trim().toLowerCase();

  // Collect all tasks from non-root widgets, grouped by widget, filtered by query
  const groups = allWidgets
    .filter(w => !w.isRoot && (w.tasks?.length ?? 0) > 0)
    .map(w => ({
      widgetId: w.id,
      widgetLabel: w.label,
      tasks: (w.tasks ?? []).filter(t =>
        t.id !== state.taskId &&
        (!q || t.title.toLowerCase().includes(q) || w.label.toLowerCase().includes(q))
      ),
    }))
    .filter(g => g.tasks.length > 0);

  const el = (
    <div
      ref={ref}
      style={{ position: 'fixed', left, top, zIndex: 9999, width: BLOCKER_W }}
      className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header + search */}
      <div className="px-2 pt-2 pb-2 border-b border-neutral-800 flex-shrink-0 space-y-1.5">
        <div className="flex items-center gap-1.5 px-1">
          <Link2 size={11} className="text-neutral-500 flex-shrink-0" />
          <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wide">Blocked by…</span>
        </div>
        <input
          ref={searchRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }}
          onClick={e => e.stopPropagation()}
          placeholder="Search tasks…"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1 text-[11px] text-neutral-200 placeholder-neutral-600 outline-none focus:border-indigo-500/60 transition-colors"
        />
      </div>

      {/* Task list */}
      <div className="overflow-y-auto" style={{ maxHeight: 210 }}>
        {groups.length === 0 ? (
          <p className="text-[11px] text-neutral-600 text-center py-4">
            {q ? 'No matches' : 'No other tasks found'}
          </p>
        ) : (
          groups.map(g => (
            <div key={g.widgetId}>
              <div className="px-3 py-1 text-[9px] text-neutral-600 uppercase tracking-wider font-semibold bg-neutral-950/50 sticky top-0">
                {g.widgetLabel}
              </div>
              {g.tasks.map(t => {
                const active = blockedBy?.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={e => { e.stopPropagation(); onToggle(t.id); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-neutral-800 ${active ? 'bg-indigo-500/10' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-3 h-3 rounded border transition-colors ${active ? 'bg-indigo-500 border-indigo-400' : 'border-neutral-600'}`}>
                      {active && <svg viewBox="0 0 8 8" fill="none" className="w-full h-full p-0.5"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span className={`text-[11px] truncate ${active ? 'text-indigo-200' : 'text-neutral-300'}`}>{t.title}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return createPortal(el, document.body);
}

// ── List view ────────────────────────────────────────────────────────────────

function ListView({ tasks, color, projectSettings, allWidgets, onAdd, onUpdate, onDelete }: {
  tasks: Task[];
  color: string;
  projectSettings?: ProjectSettings;
  allWidgets: Widget[];
  onAdd: (title: string) => void;
  onUpdate: (id: string, u: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const [input, setInput]       = useState('');
  const [showDone, setShowDone] = useState(true);
  const [pickerState, setPickerState] = useState<PopoverState | null>(null);
  const [blockerState, setBlockerState] = useState<PopoverState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = tasks.filter(t => t.status !== 'done');
  const done   = tasks.filter(t => t.status === 'done');

  const estimationMode = projectSettings?.estimationMode;
  const allowRealTime  = projectSettings?.allowRealTime ?? false;
  const weeklyPace     = projectSettings?.weeklyPace ?? 20;

  const openPicker = (taskId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setPickerState(ps => ps?.taskId === taskId ? null : { taskId, rect });
  };

  const openBlockerPicker = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setBlockerState(bs => bs?.taskId === taskId ? null : { taskId, rect });
    setPickerState(null);
  };

  const toggleBlocker = (taskId: string, blockerTaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const current = task.blockedBy ?? [];
    const next = current.includes(blockerTaskId)
      ? current.filter(id => id !== blockerTaskId)
      : [...current, blockerTaskId];
    onUpdate(taskId, { blockedBy: next.length > 0 ? next : undefined });
  };

  const taskTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of allWidgets) {
      for (const t of w.tasks ?? []) {
        map.set(t.id, t.title);
      }
    }
    return map;
  }, [allWidgets]);

  const findTaskTitle = (taskId: string): string => taskTitleMap.get(taskId) ?? taskId;

  const commit = () => {
    const v = input.trim();
    if (v) { onAdd(v); setInput(''); }
  };

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto flex-1" style={{ maxHeight: 420 }}>
      {/* Input */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
          onClick={e => e.stopPropagation()}
          placeholder="Add task… (Enter)"
          className="flex-1 bg-neutral-800/80 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 outline-none focus:border-indigo-500/60 transition-colors"
        />
        <button
          onClick={e => { e.stopPropagation(); commit(); }}
          className="px-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Active tasks */}
      {active.length === 0 && done.length === 0 && (
        <p className="text-[11px] text-neutral-600 text-center mt-2">No tasks yet</p>
      )}
      <div className="space-y-0.5">
        {active.map(task => {
          const pickerOpen = pickerState?.taskId === task.id;
          const blockerOpen = blockerState?.taskId === task.id;
          const isOrphan = !!task.estimate && estimationMode !== 'hours' && !getScalePoint(task.estimate);
          const hasBlockers = (task.blockedBy?.length ?? 0) > 0;
          return (
            <div
              key={task.id}
              className={`group rounded-lg px-2 py-1 transition-colors ${
                task.priority === 'high'
                  ? 'bg-red-500/10 hover:bg-red-500/15'
                  : task.priority === 'medium'
                    ? 'bg-amber-500/10 hover:bg-amber-500/15'
                    : 'hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Checkbox */}
                <button
                  onMouseDown={e => { e.stopPropagation(); onUpdate(task.id, { status: 'done' }); }}
                  className="flex-shrink-0 w-4 h-4 rounded border-2 transition-colors flex items-center justify-center"
                  style={{ borderColor: color + '80' }}
                  title="Mark as done"
                />
                {/* In-progress dot */}
                {task.status === 'in-progress' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 -ml-1" />
                )}
                <TaskTitle title={task.title} onSave={v => onUpdate(task.id, { title: v })} />

                {/* Estimation badge */}
                {estimationMode && (
                  estimationMode === 'hours'
                    ? <HoursInput value={task.estimate} onSave={v => onUpdate(task.id, { estimate: v || undefined })} />
                    : <button
                        onClick={e => { e.stopPropagation(); openPicker(task.id, e); }}
                        className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors flex items-center ${
                          pickerOpen
                            ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40'
                            : isOrphan
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : task.estimate
                                ? 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'
                                : 'bg-neutral-800 text-neutral-600 hover:text-neutral-400'
                        }`}
                        title={isOrphan ? 'Estimate incompatible with current mode — click to update' : 'Click to set estimate'}
                      >
                        {isOrphan ? '?' : task.estimate ? renderEstimateBadge(task.estimate, estimationMode) : '–'}
                      </button>
                )}

                {/* Priority badge */}
                <button
                  onClick={e => { e.stopPropagation(); onUpdate(task.id, { priority: cyclePriority(task.priority) }); }}
                  className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide transition-colors flex items-center ${PRIORITY_STYLE[task.priority]}`}
                  title="Click to cycle priority"
                >
                  {task.priority[0]}
                </button>

                {/* Link2 blocker button */}
                <button
                  onClick={e => openBlockerPicker(task.id, e)}
                  className={`flex-shrink-0 transition-colors ${
                    blockerOpen || hasBlockers
                      ? 'flex items-center text-indigo-400'
                      : 'flex items-center text-neutral-700 hover:text-indigo-400'
                  }`}
                  title="Mark dependencies (blocked by…)"
                >
                  <Link2 size={11} />
                </button>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(task.id); setPickerState(null); setBlockerState(null); }}
                  className="flex-shrink-0 hidden group-hover:flex items-center text-neutral-600 hover:text-red-400 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>

              {/* blockedBy chips */}
              {hasBlockers && (
                <div className="ml-6 mt-1 flex flex-wrap gap-1">
                  {(task.blockedBy ?? []).map(bid => (
                    <span
                      key={bid}
                      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                    >
                      <Link2 size={8} />
                      <span className="max-w-[100px] truncate">{findTaskTitle(bid)}</span>
                      <button
                        onClick={e => { e.stopPropagation(); toggleBlocker(task.id, bid); }}
                        className="hover:text-red-400 transition-colors leading-none"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Done section */}
      {done.length > 0 && (
        <div className="border-t border-neutral-800 mt-1 pt-2">
          <button
            onClick={e => { e.stopPropagation(); setShowDone(v => !v); }}
            className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-400 transition-colors mb-1"
          >
            {showDone ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            {done.length} done
          </button>
          {showDone && (
            <div className="space-y-0.5">
              {done.map(task => (
              <div
                  key={task.id}
                  className={`flex flex-col group px-2 py-1.5 rounded-lg hover:bg-neutral-800/40 transition-all ${
                    task.priority === 'high'
                      ? 'bg-red-500/6'
                      : task.priority === 'medium'
                        ? 'bg-amber-500/6'
                        : ''
                  }`}
                >
                  <div className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-all">
                    {/* Checked box */}
                    <button
                      onMouseDown={e => { e.stopPropagation(); onUpdate(task.id, { status: 'todo' }); }}
                      className="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                      style={{ borderColor: color, backgroundColor: color + '30' }}
                      title="Mark as todo"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-neutral-500 line-through truncate">{task.title}</span>
                    {/* Estimate badge — static on done tasks */}
                    {estimationMode && task.estimate && (() => {
                      const doneOrphan = estimationMode !== 'hours' && !getScalePoint(task.estimate!);
                      return (
                        <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded ${doneOrphan ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-800 text-neutral-600'}`}>
                          {doneOrphan ? '?' : estimationMode === 'hours' ? `${task.estimate}h` : renderEstimateBadge(task.estimate, estimationMode)}
                        </span>
                      );
                    })()}
                    {/* Real time — inline */}
                    {allowRealTime && (
                      <RealTimeInput
                        value={task.realTime}
                        onSave={v => onUpdate(task.id, { realTime: v })}
                      />
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(task.id); }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portal popover */}
      {pickerState && estimationMode && estimationMode !== 'hours' && (
        <EstimatePopover
          state={pickerState}
          mode={estimationMode}
          value={tasks.find(t => t.id === pickerState.taskId)?.estimate}
          weeklyPace={weeklyPace}
          onSelect={v => { onUpdate(pickerState.taskId, { estimate: v }); setPickerState(null); }}
          onClose={() => setPickerState(null)}
        />
      )}

      {/* Blocker picker portal */}
      {blockerState && (
        <BlockerPicker
          state={blockerState}
          allWidgets={allWidgets}
          blockedBy={tasks.find(t => t.id === blockerState.taskId)?.blockedBy}
          onToggle={blockerTaskId => toggleBlocker(blockerState.taskId, blockerTaskId)}
          onClose={() => setBlockerState(null)}
        />
      )}
    </div>
  );
}

// ── Board task title (multiline editable) ───────────────────────────────────

function BoardTaskTitle({ title, onSave }: { title: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) onSave(trimmed);
    else setValue(title);
  };

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={value}
        rows={1}
        onChange={e => {
          setValue(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setEditing(false); setValue(title); }
          e.stopPropagation();
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        className="w-full bg-neutral-700/80 rounded px-1.5 py-1 text-[11px] text-neutral-200 outline-none border border-indigo-500/50 resize-none leading-snug overflow-hidden"
        style={{ minHeight: 28 }}
      />
    );
  }

  return (
    <p
      className="text-[11px] text-neutral-200 leading-snug break-words cursor-pointer hover:text-white select-none transition-colors"
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Double-click to edit"
    >
      {title}
    </p>
  );
}

// ── Board view ───────────────────────────────────────────────────────────────

function BoardView({ tasks, color, projectSettings, onUpdate, onDelete }: {
  tasks: Task[];
  color: string;
  projectSettings?: ProjectSettings;
  onUpdate: (id: string, u: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const draggingIdRef = useRef<string | null>(null);
  const dragOverRef   = useRef<TaskStatus | null>(null);

  const [draggingId,     setDraggingId]     = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [pickerState,    setPickerState]    = useState<PopoverState | null>(null);

  const estimationMode = projectSettings?.estimationMode;
  const allowRealTime  = projectSettings?.allowRealTime ?? false;
  const weeklyPace     = projectSettings?.weeklyPace ?? 20;

  const openPicker = (taskId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setPickerState(ps => ps?.taskId === taskId ? null : { taskId, rect });
  };

  const commitDrop = useCallback(() => {
    const id     = draggingIdRef.current;
    const target = dragOverRef.current;
    if (id && target) {
      const task = tasks.find(t => t.id === id);
      if (task && task.status !== target) onUpdate(id, { status: target });
    }
    draggingIdRef.current = null;
    dragOverRef.current   = null;
    setDraggingId(null);
    setDragOverStatus(null);
  }, [tasks, onUpdate]);

  useEffect(() => {
    if (!draggingId) return;
    const handle = () => commitDrop();
    window.addEventListener('pointerup', handle);
    return () => window.removeEventListener('pointerup', handle);
  }, [draggingId, commitDrop]);

  const startDrag = (e: React.PointerEvent, taskId: string) => {
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    e.stopPropagation();
    setPickerState(null);
    draggingIdRef.current = taskId;
    setDraggingId(taskId);
  };

  const enterColumn = (status: TaskStatus) => {
    if (!draggingIdRef.current) return;
    dragOverRef.current = status;
    setDragOverStatus(status);
  };

  return (
    <div
      className="flex gap-2 p-3 overflow-x-auto select-none"
      style={{
        minHeight: 120,
        maxHeight: 420,
        cursor: draggingId ? 'grabbing' : undefined,
      }}
      onPointerUp={e => { e.stopPropagation(); commitDrop(); }}
      onPointerLeave={() => {
        if (draggingIdRef.current) {
          dragOverRef.current = null;
          setDragOverStatus(null);
        }
      }}
    >
      {STATUS_ORDER.map(status => {
        const col = tasks.filter(t => t.status === status);
        const isDropTarget =
          !!draggingId &&
          dragOverStatus === status &&
          tasks.find(t => t.id === draggingId)?.status !== status;

        return (
          <div
            key={status}
            className="flex flex-col gap-1.5 min-w-[160px] flex-1"
            onPointerEnter={() => enterColumn(status)}
          >
            {/* Column header */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${STATUS_COLOR[status]} ${isDropTarget ? 'bg-neutral-800' : 'bg-neutral-900'}`}>
              <span className="text-[10px] font-semibold uppercase tracking-wide">{STATUS_LABEL[status]}</span>
              <span className="ml-auto text-[10px] opacity-60">{col.length}</span>
            </div>

            {/* Column body */}
            <div
              className={`flex flex-col gap-1.5 flex-1 overflow-y-auto rounded-lg p-0.5 transition-all ${isDropTarget ? 'ring-1 ring-indigo-500/50 bg-indigo-500/5' : ''}`}
              style={{ maxHeight: 340 }}
            >
              {col.map(task => {
                const pickerOpen = pickerState?.taskId === task.id;
                const isOrphan = !!task.estimate && estimationMode !== 'hours' && !getScalePoint(task.estimate);
                return (
                  <div
                    key={task.id}
                    onPointerDown={e => startDrag(e, task.id)}
                    className={`group relative bg-neutral-800/80 border border-neutral-700/60 rounded-lg p-2 flex flex-col gap-1.5 hover:border-neutral-600 transition-all ${
                      draggingId === task.id ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-grab'
                    } ${pickerOpen ? 'border-neutral-600' : ''}`}
                    style={{ borderLeftColor: color + '70', borderLeftWidth: 2 }}
                  >
                    <BoardTaskTitle title={task.title} onSave={v => onUpdate(task.id, { title: v })} />

                    {/* Badges row */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Priority */}
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); onUpdate(task.id, { priority: cyclePriority(task.priority) }); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide transition-all hover:scale-105 active:scale-95 ${PRIORITY_STYLE[task.priority]}`}
                        title="Click to change priority"
                      >
                        {task.priority}
                      </button>

                      {/* Estimation badge */}
                      {estimationMode && (
                        estimationMode === 'hours'
                          ? <HoursInput value={task.estimate} onSave={v => onUpdate(task.id, { estimate: v || undefined })} stopPointerPropagation />
                          : <button
                              onPointerDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); openPicker(task.id, e); }}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium transition-all hover:scale-105 active:scale-95 ${
                                pickerOpen
                                  ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40'
                                  : isOrphan
                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                    : task.estimate
                                      ? 'bg-neutral-700 text-neutral-200'
                                      : 'bg-neutral-800/80 text-neutral-600'
                              }`}
                              title={isOrphan ? 'Estimate incompatible with current mode — click to update' : 'Click to set estimate'}
                            >
                              {isOrphan ? '?' : task.estimate ? renderEstimateBadge(task.estimate, estimationMode) : '–'}
                            </button>
                      )}

                      {/* Real time */}
                      {allowRealTime && status === 'done' && (
                        <RealTimeInput
                          value={task.realTime}
                          onSave={v => onUpdate(task.id, { realTime: v })}
                        />
                      )}

                      {/* Arrow + delete — revealed on hover */}
                      <div className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-all">
                        {status !== 'todo' && (
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onUpdate(task.id, { status: moveTo(status, 'prev') }); }}
                            className="p-0.5 rounded text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
                            title={`← ${STATUS_LABEL[moveTo(status, 'prev')]}`}
                          >
                            <ArrowLeft size={10} />
                          </button>
                        )}
                        {status !== 'done' && (
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onUpdate(task.id, { status: moveTo(status, 'next') }); }}
                            className="p-0.5 rounded text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors"
                            title={`→ ${STATUS_LABEL[moveTo(status, 'next')]}`}
                          >
                            <ArrowRight size={10} />
                          </button>
                        )}
                        <button
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); onDelete(task.id); setPickerState(null); }}
                          className="p-0.5 rounded text-neutral-600 hover:text-red-400 hover:bg-neutral-700 transition-colors"
                          title="Delete"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {col.length === 0 && (
                <div className={`rounded-lg border p-3 text-center text-[10px] transition-all ${
                  isDropTarget
                    ? 'border-indigo-500/50 border-solid text-indigo-400/70 bg-indigo-500/10'
                    : 'border-dashed border-neutral-800 text-neutral-700'
                }`}>
                  {isDropTarget ? 'Drop here' : 'Empty'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Portal popover */}
      {pickerState && estimationMode && estimationMode !== 'hours' && (
        <EstimatePopover
          state={pickerState}
          mode={estimationMode}
          value={tasks.find(t => t.id === pickerState.taskId)?.estimate}
          weeklyPace={weeklyPace}
          onSelect={v => { onUpdate(pickerState.taskId, { estimate: v }); setPickerState(null); }}
          onClose={() => setPickerState(null)}
        />
      )}
    </div>
  );
}

// ── Stats view helpers (same style as ProjectStatsPanel) ──────────────────────

function StatsSectionHeader({
  children,
  accent = '#6366f1',
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-0.5 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
      <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">
        {children}
      </span>
      <div className="flex-1 h-px bg-neutral-800" />
    </div>
  );
}

function StatsGlowBar({ pctFill, color }: { pctFill: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 bg-neutral-800/80 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, pctFill)}%`,
          backgroundColor: color,
          boxShadow: pctFill > 0 ? `0 0 8px ${color}66, 0 0 2px ${color}` : 'none',
        }}
      />
    </div>
  );
}

function StatsGlowStackedBar({ todo, inProgress, done }: { todo: number; inProgress: number; done: number }) {
  const total = todo + inProgress + done;
  if (total === 0) return null;
  const donePct = (done / total) * 100;
  const inPct   = (inProgress / total) * 100;
  return (
    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-neutral-800">
      <div
        style={{ width: `${donePct}%`, boxShadow: donePct > 0 ? '0 0 8px #10b98166' : 'none' }}
        className="bg-emerald-500 h-full transition-all duration-500"
      />
      <div
        style={{ width: `${inPct}%`, boxShadow: inPct > 0 ? '0 0 8px #f59e0b66' : 'none' }}
        className="bg-amber-400 h-full transition-all duration-500"
      />
      <div style={{ width: `${(todo / total) * 100}%` }} className="bg-neutral-700 h-full" />
    </div>
  );
}

function StatsChip({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-neutral-600 mb-0.5">{label}</div>
      <div className="text-sm font-bold font-mono leading-tight" style={{ color: accent ?? '#e5e5e5' }}>
        {value}
        {sub && <span className="text-neutral-600 font-normal text-[10px] ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function PriorityBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span
      className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
      style={{
        color,
        borderColor: color + '60',
        backgroundColor: color + '12',
        boxShadow: `0 0 6px ${color}30`,
      }}
    >
      {label}:{count}
    </span>
  );
}

// ── Stats view ────────────────────────────────────────────────────────────────

function StatsView({ widget, allWidgets, projectSettings }: {
  widget: Widget;
  allWidgets: Widget[];
  projectSettings?: ProjectSettings;
}) {
  const allowRealTime = projectSettings?.allowRealTime ?? false;
  const estimationMode = projectSettings?.estimationMode;
  const s = getWidgetStats(widget, allWidgets, allowRealTime);
  const tasks = widget.tasks ?? [];
  const total = tasks.length;

  if (total === 0) {
    return (
      <div className="p-6 text-center text-xs text-neutral-600">
        <BarChart2 size={20} className="mx-auto mb-2 text-neutral-700" />
        No tasks yet
      </div>
    );
  }

  const donePct   = total > 0 ? (s.doneCount / total) * 100 : 0;
  const pctColor  = donePct === 100 ? '#10b981' : donePct >= 50 ? '#a5b4fc' : '#f59e0b';
  const pctShadow = donePct === 100 ? '0 0 16px #10b98150' : donePct >= 50 ? '0 0 16px #6366f140' : '0 0 16px #f59e0b40';

  // Time delta for done tasks with both estimate + real time
  let deltaH: number | null = null;
  if (allowRealTime) {
    const doneWithBoth = tasks.filter(
      t => t.status === 'done' && t.realTime != null && !!t.estimate,
    );
    if (doneWithBoth.length > 0) {
      const estH  = totalEstimateHours(doneWithBoth);
      const realH = doneWithBoth.reduce((sum, t) => sum + (t.realTime ?? 0), 0);
      deltaH = estH > 0 ? realH - estH : null;
    }
  }
  const isOver    = deltaH !== null && deltaH > 0.5;
  const isUnder   = deltaH !== null && deltaH < -0.5;
  const isOnTrack = deltaH !== null && !isOver && !isUnder;

  // Weekly progress — trim leading empty weeks, compute friendly labels
  const firstActiveIdx = s.weeklyCompletions.findIndex(w => w.count > 0);
  const trimmedWeeks   = firstActiveIdx >= 0 ? s.weeklyCompletions.slice(firstActiveIdx) : [];
  const maxCount       = Math.max(...trimmedWeeks.map(w => w.count), 1);
  const hasActivity    = trimmedWeeks.length > 0;
  const weeklyTotal    = trimmedWeeks.reduce((sum, w) => sum + w.count, 0);
  const thisWeekKey    = s.weeklyCompletions[s.weeklyCompletions.length - 1]?.weekLabel;
  const lastWeekKey    = s.weeklyCompletions[s.weeklyCompletions.length - 2]?.weekLabel;

  const hasPriority    = s.highCount > 0 || s.medCount > 0 || s.lowCount > 0;
  const estimatedCount = estimationMode ? tasks.filter(t => !!t.estimate).length : 0;

  return (
    <div className="space-y-4 px-3 py-3">

      {/* ── STATUS ──────────────────────────────────── */}
      <div>
        <StatsSectionHeader accent="#10b981">Status</StatsSectionHeader>
        <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
            }}
          />
          <div className="relative flex items-end gap-4">
            <div className="flex-shrink-0">
              <div className="text-[9px] uppercase tracking-widest text-neutral-600 mb-1">Completion</div>
              <div
                className="text-4xl font-bold font-mono leading-none"
                style={{ color: pctColor, textShadow: pctShadow }}
              >
                {Math.round(donePct)}%
              </div>
            </div>
            <div className="flex-1 space-y-2 pb-0.5">
              <StatsGlowStackedBar todo={s.todoCount} inProgress={s.inProgressCount} done={s.doneCount} />
              <div className="flex gap-3 text-[10px] text-neutral-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" style={{ boxShadow: '0 0 4px #10b981' }} />
                  {s.doneCount} done
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  {s.inProgressCount} active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 inline-block" />
                  {s.todoCount} todo
                </span>
                {estimationMode && (
                  <span
                    className="ml-auto flex-shrink-0"
                    style={{ color: estimatedCount < total ? '#f59e0b99' : '#6b728066' }}
                    title={`${estimatedCount} of ${total} tasks have an estimate`}
                  >
                    {estimatedCount}/{total} est.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRIORITY ──────────────────────────────────── */}
      {hasPriority && (
        <div>
          <StatsSectionHeader accent="#f59e0b">Priority</StatsSectionHeader>
          <div className="flex flex-wrap gap-2">
            {s.highCount > 0 && <PriorityBadge label="H" count={s.highCount} color="#ef4444" />}
            {s.medCount  > 0 && <PriorityBadge label="M" count={s.medCount}  color="#f59e0b" />}
            {s.lowCount  > 0 && <PriorityBadge label="L" count={s.lowCount}  color="#6b7280" />}
          </div>
        </div>
      )}

      {/* ── ESTIMATES ──────────────────────────────────── */}
      {estimationMode && (
        <div>
          <StatsSectionHeader accent="#6366f1">Estimates</StatsSectionHeader>
          <div className="grid grid-cols-2 gap-2">
            <StatsChip
              label="Estimated"
              value={
                s.estimatedHrs > 0
                  ? `${s.estimatedHrs.toFixed(1)}h${estimationMode !== 'hours' && s.estimatedPts > 0 ? ` (${s.estimatedPts} pts)` : ''}`
                  : '—'
              }
              accent="#a5b4fc"
            />
            {allowRealTime && s.realTimeLogged > 0 && (
              <StatsChip
                label="Actual"
                value={`${s.realTimeLogged.toFixed(1)}h`}
                accent="#fbbf24"
              />
            )}
          </div>

          {/* Velocity + Difference */}
          {allowRealTime && s.realTimeLogged > 0 && s.estimatedHrs > 0 && s.velocityRatio != null && (
            <div className="space-y-1.5 mt-2">
              {/* Speed row */}
              <div
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border"
                style={{
                  borderColor: s.velocityRatio > 1.1 ? '#f59e0b30' : s.velocityRatio < 0.9 ? '#10b98130' : '#6b728030',
                  backgroundColor: s.velocityRatio > 1.1 ? '#f59e0b08' : s.velocityRatio < 0.9 ? '#10b9810a' : 'transparent',
                }}
              >
                <span className="text-[9px] uppercase tracking-wider text-neutral-600">Speed</span>
                <div className="text-right">
                  <span
                    className="text-xs font-medium block"
                    style={{
                      color: s.velocityRatio > 1.1 ? '#fbbf24' : s.velocityRatio < 0.9 ? '#34d399' : '#a3a3a3',
                    }}
                  >
                    {s.velocityRatio < 0.9
                      ? `${Math.round((1 - s.velocityRatio) * 100)}% faster than planned`
                      : s.velocityRatio > 1.1
                        ? `${Math.round((1 - 1 / s.velocityRatio) * 100)}% slower than planned`
                        : 'Right on pace'}
                  </span>
                  {s.velocityRatio < 0.9 && (
                    <span className="text-[10px] text-neutral-600 block">
                      {(1 / s.velocityRatio).toFixed(1)}× estimated speed
                    </span>
                  )}
                  {s.velocityRatio > 1.1 && (
                    <span className="text-[10px] text-neutral-600 block">
                      Took {s.velocityRatio.toFixed(1)}× the estimated time
                    </span>
                  )}
                </div>
              </div>

              {/* Difference row */}
              {deltaH !== null && (
                <div
                  className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border"
                  style={{
                    borderColor: isOver ? '#ef444430' : isUnder ? '#10b98130' : '#6b728030',
                    backgroundColor: isOver ? '#ef44440a' : isUnder ? '#10b9810a' : 'transparent',
                  }}
                >
                  <span style={{ color: isOver ? '#f87171' : isUnder ? '#34d399' : '#a3a3a3' }}>
                    {isOver    && `Took ${deltaH.toFixed(1)}h more than planned`}
                    {isUnder   && `Saved ${Math.abs(deltaH).toFixed(1)}h vs plan`}
                    {isOnTrack && '✓ Went as planned'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TASKS COMPLETED ──────────────────────────── */}
      {hasActivity && (
        <div>
          <StatsSectionHeader accent="#6366f1">Tasks completed</StatsSectionHeader>
          <div className="space-y-2">
            {trimmedWeeks.map((wk) => {
              const isThisWeek = wk.weekLabel === thisWeekKey;
              const isLastWeek = wk.weekLabel === lastWeekKey;
              const label = isThisWeek ? 'This week'
                : isLastWeek ? 'Last week'
                : isoWeekToDateStr(wk.weekLabel);
              return (
                <div key={wk.weekLabel} className="flex items-center gap-2">
                  <span className={`text-[10px] flex-shrink-0 ${isThisWeek ? 'text-indigo-400 font-medium' : 'text-neutral-600'}`}
                    style={{ width: 58 }}
                  >
                    {label}
                  </span>
                  <StatsGlowBar
                    pctFill={maxCount > 0 ? (wk.count / maxCount) * 100 : 0}
                    color={isThisWeek ? '#6366f1' : '#52525b'}
                  />
                  <span className="text-[10px] text-neutral-500 font-mono w-3 text-right flex-shrink-0">
                    {wk.count}
                  </span>
                </div>
              );
            })}
          </div>
          {weeklyTotal > 0 && (
            <div className="text-[10px] text-neutral-600 mt-1.5 text-right">
              {weeklyTotal} task{weeklyTotal !== 1 ? 's' : ''} total
            </div>
          )}
        </div>
      )}

      {/* ── Descendant scope rollup ─────────────────── */}
      {s.hasDescendants && (
        <div>
          <StatsSectionHeader accent="#6366f1">Sub-widgets</StatsSectionHeader>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] text-neutral-500">
                {s.descendantWidgetCount} sub-widget{s.descendantWidgetCount > 1 ? 's' : ''} included
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-300">
                {s.recursiveDoneTasks}
                <span className="text-neutral-600 font-normal text-[10px]">/{s.recursiveTotalTasks}</span>
              </span>
            </div>
            {s.recursiveTotalTasks > 0 && (
              <StatsGlowBar
                pctFill={(s.recursiveDoneTasks / s.recursiveTotalTasks) * 100}
                color="#6366f1"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export function WidgetTaskPanel({
  widget,
  projectSettings,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleView,
  onClose,
}: WidgetTaskPanelProps) {
  const tasks = widget.tasks ?? [];
  const view = widget.taskView ?? 'list';
  const color = widget.branchColor;
  const allWidgets = useWidgetStore(s => s.widgets);

  const total = tasks.length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  const isBoard = view === 'board';
  const isStats = view === 'stats';
  const panelWidth = isBoard ? 516 : isStats ? 300 : 320;

  const [showTime, setShowTime] = useState(false);
  const estimationMode = projectSettings?.estimationMode;
  const weeklyPace = projectSettings?.weeklyPace ?? 20;
  const totalLabel = estimationMode ? formatTotalEstimate(tasks, estimationMode) : '';
  const rawHrs     = totalEstimateHours(tasks);
  const timeLabel  = estimationMode !== 'hours' && rawHrs > 0 ? `${rawHrs % 1 === 0 ? rawHrs : rawHrs.toFixed(1)}h` : '';

  return (
    <div
      className="flex flex-col rounded-xl border shadow-2xl bg-neutral-950/95 backdrop-blur-md overflow-hidden"
      style={{
        width: panelWidth,
        borderColor: color + '40',
        borderLeftColor: color,
        borderLeftWidth: 3,
      }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 flex-shrink-0"
        style={{ backgroundColor: color + '10' }}
      >
        <span className="text-xs font-bold text-neutral-200">Tasks</span>
        {total > 0 && (
          <span className="text-[10px] text-neutral-500">
            {doneCount}/{total}
          </span>
        )}
        {totalLabel && (
          <button
            onClick={e => { e.stopPropagation(); if (timeLabel) setShowTime(v => !v); }}
            className={`text-[9px] px-2 py-0.5 rounded-full border font-medium transition-all ${
              showTime && timeLabel
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                : 'border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:text-neutral-300'
            }`}
            title={timeLabel
              ? showTime
                ? 'Showing total hours · Click for estimate total'
                : `${rawHrs % 1 === 0 ? rawHrs : rawHrs.toFixed(1)}h total · Click to show`
              : undefined}
          >
            {showTime && timeLabel ? timeLabel : totalLabel}
          </button>
        )}
        <div className="flex-1" />
        <div className="flex rounded-md overflow-hidden border border-neutral-700 text-[10px] font-medium">
          <button
            onClick={e => { e.stopPropagation(); onToggleView('list'); }}
            className={`px-2 py-1 transition-colors ${view === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            List
          </button>
          <button
            onClick={e => { e.stopPropagation(); onToggleView('board'); }}
            className={`px-2 py-1 transition-colors ${view === 'board' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Board
          </button>
          <button
            onClick={e => { e.stopPropagation(); onToggleView('stats'); }}
            className={`px-2 py-1 transition-colors ${view === 'stats' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Stats
          </button>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          className="text-neutral-500 hover:text-white transition-colors ml-1"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      {isStats ? (
        <StatsView widget={widget} allWidgets={allWidgets} projectSettings={projectSettings} />
      ) : isBoard ? (
        <BoardView tasks={tasks} color={color} projectSettings={projectSettings} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
      ) : (
        <ListView tasks={tasks} color={color} projectSettings={projectSettings} allWidgets={allWidgets} onAdd={onAddTask} onUpdate={onUpdateTask} onDelete={onDeleteTask} />
      )}
    </div>
  );
}
