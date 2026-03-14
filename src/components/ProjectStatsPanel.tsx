import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Target,
  Link2,
  BarChart2,
  Layers,
  Zap,
  Shield,
  Activity,
  RotateCcw,
} from "lucide-react";
import type { Widget, ProjectSettings } from "@/types";
import {
  getProgresoStats,
  getScopeStats,
  getBloqueosStats,
  getPrediccionStats,
} from "@/lib/statsUtils";
import { generateInsights, type Insight, type MetricDisplay } from "@/lib/statsInsights";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

function velocityPrimaryText(ratio: number): string {
  if (ratio < 0.9) return `${Math.round((1 - ratio) * 100)}% faster than planned`;
  if (ratio > 1.1) return `${Math.round((1 - 1 / ratio) * 100)}% slower than planned`;
  return 'Right on pace';
}

function velocitySubText(ratio: number): string | undefined {
  if (ratio < 0.9) return `${(1 / ratio).toFixed(1)}× estimated speed`;
  if (ratio > 1.1) return `Took ${ratio.toFixed(1)}× the estimated time`;
  return undefined;
}

/** Returns pace-based context (days/weeks) or empty string when hours alone is clear enough */
function paceContext(hrs: number, weeklyPace: number): string {
  if (hrs <= 0 || weeklyPace <= 0) return '';
  const hrsPerDay = weeklyPace / 7;
  const days = hrs / hrsPerDay;
  const weeks = hrs / weeklyPace;
  if (weeks >= 1) return `~${weeks.toFixed(1)} weeks`;
  if (days >= 1) {
    const d = Math.round(days);
    return `~${d} ${d === 1 ? 'day' : 'days'}`;
  }
  return '';
}

/** Hours value with optional pace context in parens: "12.0h (~4 days)" */
function hrsWithContext(hrs: number, weeklyPace: number): string {
  if (hrs <= 0) return '\u2014';
  const ctx = paceContext(hrs, weeklyPace);
  const h = `${hrs.toFixed(1)}h`;
  return ctx ? `${h} (${ctx})` : h;
}

function getTrendContext(trendLabel: string, trendPct: number): {
  title: string;
  sub: string;
  isPositive: boolean;
  isNegative: boolean;
} {
  if (trendLabel.startsWith('↑')) {
    return {
      title: "You're crushing it!",
      sub: `Completed ${trendPct}% more tasks than last week`,
      isPositive: true,
      isNegative: false,
    };
  }
  if (trendLabel.startsWith('↓')) {
    return {
      title: 'Pace slowed down',
      sub: `${trendPct}% fewer completions — check for blockers`,
      isPositive: false,
      isNegative: true,
    };
  }
  if (trendLabel === 'No recent activity') {
    return {
      title: 'No recent completions',
      sub: 'No tasks finished in the last 2 weeks — anything blocked?',
      isPositive: false,
      isNegative: false,
    };
  }
  if (trendLabel === '→ Steady pace') {
    return {
      title: 'Keeping a steady pace',
      sub: 'Consistent week-over-week completions',
      isPositive: false,
      isNegative: false,
    };
  }
  if (trendLabel.includes('Underestimating')) {
    const match = trendLabel.match(/\+(\d+)%/);
    const pct = match ? match[1] : String(trendPct);
    return {
      title: 'Tasks taking longer than expected',
      sub: `Taking ${pct}% more time than estimated`,
      isPositive: false,
      isNegative: true,
    };
  }
  if (trendLabel.includes('Overestimating')) {
    const match = trendLabel.match(/-(\d+)%/);
    const pct = match ? match[1] : String(trendPct);
    return {
      title: 'Finishing faster than planned',
      sub: `${pct}% under estimate — you're ahead!`,
      isPositive: true,
      isNegative: false,
    };
  }
  if (trendLabel === 'Accurate estimates') {
    return {
      title: 'Estimates on point',
      sub: 'Actual time closely matches your plan',
      isPositive: true,
      isNegative: false,
    };
  }
  return { title: trendLabel, sub: '', isPositive: false, isNegative: false };
}

// ─── Game-styled shared components ────────────────────────────────────────────

function SectionHeader({
  children,
  accent = '#6366f1',
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0">
      <div
        className="w-0.5 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: accent }}
      />
      <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-semibold">
        {children}
      </span>
      <div className="flex-1 h-px bg-neutral-800" />
    </div>
  );
}

function GlowBar({ pctFill, color }: { pctFill: number; color: string }) {
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

function GlowStackedBar({
  todo,
  inProgress,
  done,
}: {
  todo: number;
  inProgress: number;
  done: number;
}) {
  const total = todo + inProgress + done;
  if (total === 0) return null;
  const donePct = (done / total) * 100;
  const inPct = (inProgress / total) * 100;
  return (
    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-neutral-800">
      <div
        style={{
          width: `${donePct}%`,
          boxShadow: donePct > 0 ? '0 0 8px #10b98166' : 'none',
        }}
        className="bg-emerald-500 h-full transition-all duration-500"
      />
      <div
        style={{
          width: `${inPct}%`,
          boxShadow: inPct > 0 ? '0 0 8px #f59e0b66' : 'none',
        }}
        className="bg-amber-400 h-full transition-all duration-500"
      />
      <div
        style={{ width: `${(todo / total) * 100}%` }}
        className="bg-neutral-700 h-full"
      />
    </div>
  );
}

function StatChip({
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
      <div
        className="text-sm font-bold font-mono leading-tight"
        style={{ color: accent ?? '#e5e5e5' }}
      >
        {value}
        {sub && <span className="text-neutral-600 font-normal text-[10px] ml-1">{sub}</span>}
      </div>
    </div>
  );
}

// ─── Tab 1 — Progress ─────────────────────────────────────────────────────────

function TabProgress({
  widgets,
  allowRealTime,
  weeklyPace,
}: {
  widgets: Widget[];
  allowRealTime: boolean;
  weeklyPace: number;
}) {
  const s = getProgresoStats(widgets, allowRealTime);

  const motivationalMsg: string | null = (() => {
    const p = s.pctDone;
    if (p <= 0)  return null;
    if (p < 25)  return 'Just getting started!';
    if (p < 50)  return "Keep pushing, you're making progress";
    if (p < 75)  return 'Halfway there, looking good!';
    if (p < 90)  return 'Almost there!';
    if (p < 100) return 'So close! Final stretch!';
    return 'You did it! All done';
  })();

  const taskSub = s.pctDone > 90 ? 'Almost done!' : s.pctDone > 50 ? 'Over halfway!' : undefined;

  return (
    <div className="space-y-4">
      {/* HUD Completion block */}
      <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 overflow-hidden">
        {/* Scanline decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
          }}
        />
        <div className="relative flex items-end gap-4">
          <div className="flex-shrink-0">
            <div className="text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
              Completion
            </div>
            <div
              className="text-5xl font-bold font-mono leading-none"
              style={{ color: '#6366f1', textShadow: '0 0 24px #6366f150' }}
            >
              {pct(s.pctDone)}
            </div>
          </div>
          <div className="flex-1 space-y-2 pb-0.5">
            {motivationalMsg && (
              <div className="text-[11px] text-neutral-400 leading-tight italic">
                {motivationalMsg}
              </div>
            )}
            <GlowStackedBar
              todo={s.todoTasks}
              inProgress={s.inProgressTasks}
              done={s.doneTasks}
            />
            <div className="flex gap-3 text-[10px] text-neutral-500">
              <span className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                  style={{ boxShadow: '0 0 4px #10b981' }}
                />
                Done: {s.doneTasks}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                In progress: {s.inProgressTasks}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 inline-block" />
                Todo: {s.todoTasks}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat chips grid */}
      <div>
        <SectionHeader accent="#6366f1">Status report</SectionHeader>
        <div className="grid grid-cols-2 gap-2">
          <StatChip
            label={`Tasks [${s.totalTasks}]`}
            value={`${s.doneTasks} done, ${s.todoTasks + s.inProgressTasks} left`}
            sub={taskSub}
            accent="#e5e5e5"
          />
          <StatChip
            label="Estimated"
            value={pct(s.pctEstimated)}
            sub="of tasks have estimates"
            accent="#e5e5e5"
          />
          {s.estimatedHrsTotal > 0 && (
            <StatChip
              label="Scope planned"
              value={hrsWithContext(s.estimatedHrsTotal, weeklyPace)}
              sub={`at ${weeklyPace}h/week pace`}
              accent="#a5b4fc"
            />
          )}
          {allowRealTime && s.realTimeLogged > 0 && (
            <StatChip
              label="Time invested"
              value={hrsWithContext(s.realTimeLogged, weeklyPace)}
              sub={`at ${weeklyPace}h/week pace`}
              accent="#fbbf24"
            />
          )}
          {allowRealTime && s.velocityRatio != null && (
            <StatChip
              label="Speed"
              value={velocityPrimaryText(s.velocityRatio)}
              sub={velocitySubText(s.velocityRatio)}
              accent={
                s.velocityRatio > 1.1
                  ? '#f87171'
                  : s.velocityRatio < 0.9
                    ? '#34d399'
                    : '#e5e5e5'
              }
            />
          )}
        </div>
      </div>

      {/* Time delta */}
      {allowRealTime && s.velocityDeltaH != null && (() => {
        const dH = s.velocityDeltaH;
        const isOver  = dH > 0.5;
        const isUnder = dH < -0.5;
        return (
          <div
            className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border"
            style={{
              borderColor: isOver ? '#ef444430' : isUnder ? '#10b98130' : '#6b728030',
              backgroundColor: isOver ? '#ef44440a' : isUnder ? '#10b9810a' : 'transparent',
            }}
          >
            <span style={{ color: isOver ? '#f87171' : isUnder ? '#34d399' : '#a3a3a3' }}>
              {isOver  && `Took ${dH.toFixed(1)}h more than planned`}
              {isUnder && `Saved ${Math.abs(dH).toFixed(1)}h vs plan`}
              {!isOver && !isUnder && '\u2713 Right on plan'}
            </span>
          </div>
        );
      })()}

      {/* Trend */}
      {s.trend !== null && (() => {
        const ctx = getTrendContext(s.trendLabel, s.trendPct);
        const borderColor = ctx.isPositive ? '#10b98130' : ctx.isNegative ? '#ef444430' : '#6b728030';
        const bgColor = ctx.isPositive ? '#10b9810a' : ctx.isNegative ? '#ef44440a' : 'transparent';
        const titleColor = ctx.isPositive ? '#34d399' : ctx.isNegative ? '#f87171' : '#a3a3a3';
        const Icon = ctx.isPositive ? TrendingUp : ctx.isNegative ? TrendingDown : Minus;
        return (
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{ borderColor, backgroundColor: bgColor }}
          >
            <div className="flex items-center gap-1.5 mb-1" style={{ color: titleColor }}>
              <Icon size={12} />
              <span className="text-sm font-semibold">{ctx.title}</span>
            </div>
            {ctx.sub && (
              <p className="text-[11px] text-neutral-500 leading-snug">{ctx.sub}</p>
            )}
          </div>
        );
      })()}

      {/* Widget type breakdown */}
      {Object.keys(s.widgetsByType).length > 0 && (
        <div>
          <SectionHeader accent="#6366f1">Widgets by type</SectionHeader>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(s.widgetsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-neutral-900/50 border border-neutral-800/50">
                <span className="text-neutral-400 capitalize">{type}</span>
                <span className="text-neutral-200 font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2 — Scope ────────────────────────────────────────────────────────────

function TabScope({ widgets }: { widgets: Widget[] }) {
  const s = getScopeStats(widgets);

  return (
    <div className="space-y-4">
      {/* Context rows — faction style */}
      <div>
        <SectionHeader accent="#8b5cf6">Contexts</SectionHeader>
        <div className="space-y-2">
          {s.contexts.map(ctx => (
            <div
              key={ctx.context}
              className="relative rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 overflow-hidden"
            >
              {/* Left faction glow bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
                style={{
                  backgroundColor: ctx.color,
                  boxShadow: `0 0 8px ${ctx.color}66`,
                }}
              />
              <div className="pl-2">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{ctx.icon}</span>
                    <span className="text-xs text-neutral-300 truncate font-medium">{ctx.label}</span>
                    {s.laggedContexts.includes(ctx.context) && (
                      <AlertTriangle size={10} className="text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ctx.highPriorityPending > 0 && (
                      <span
                        className="text-[9px] text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded"
                        style={{ boxShadow: '0 0 6px #ef444430' }}
                      >
                        H:{ctx.highPriorityPending}
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {ctx.taskDone}/{ctx.taskTotal}
                    </span>
                    <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color: ctx.color }}>
                      {pct(ctx.completionPct)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-neutral-600 w-14 flex-shrink-0">
                    {ctx.widgetCount} {ctx.widgetCount > 1 ? 'widgets' : 'widget'}
                  </div>
                  <GlowBar pctFill={ctx.completionPct} color={ctx.color} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance warnings */}
      {s.laggedContexts.length > 0 && (() => {
        const laggedLabels = s.contexts
          .filter(c => s.laggedContexts.includes(c.context))
          .map(c => c.label);
        return (
          <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/25 rounded-lg">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <strong>Uneven balance:</strong>{' '}
              {laggedLabels.join(', ')} with little progress — consider prioritizing
            </div>
          </div>
        );
      })()}

      {/* Scope Growth */}
      <div>
        <SectionHeader accent="#8b5cf6">Scope growth</SectionHeader>
        {(() => {
          const isPlanning = Date.now() < s.baselineDate;

          if (s.totalTasks === 0) {
            return (
              <p className="text-[11px] text-neutral-600 px-1">No tasks yet</p>
            );
          }

          if (isPlanning) {
            return (
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5">
                <p className="text-[11px] text-neutral-400">
                  Project is in its planning phase (first week). Scope tracking starts after day 7.
                </p>
                <p className="text-[10px] text-neutral-600 mt-1">
                  {s.totalTasks} task{s.totalTasks !== 1 ? 's' : ''} so far
                </p>
              </div>
            );
          }

          const creepColor = s.scopeCreepPct > 50 ? '#f87171'
            : s.scopeCreepPct > 15 ? '#fbbf24'
            : '#34d399';
          const originalPct = s.totalTasks > 0
            ? (s.baselineTasks / s.totalTasks) * 100
            : 100;
          const addedPct = 100 - originalPct;

          const hrsNote = s.addedHrs > 0
            ? ` — roughly ${s.addedHrs.toFixed(1)}h of extra work`
            : '';

          const interpretation = s.scopeCreepPct > 50
            ? `Significant growth: ${s.addedTasks} tasks (+${Math.round(s.scopeCreepPct)}%) added after the first week${hrsNote}. Consider reviewing priorities.`
            : s.scopeCreepPct > 15
              ? `Moderate growth: ${s.addedTasks} tasks (+${Math.round(s.scopeCreepPct)}%) added after the first week${hrsNote}`
              : s.addedTasks > 0
                ? `Scope is stable — ${s.addedTasks} task${s.addedTasks !== 1 ? 's' : ''} added since first week`
                : 'Scope is stable — no tasks added after the first week';

          return (
            <>
              <div className="grid grid-cols-2 gap-2">
                <StatChip
                  label="Original scope"
                  value={`${s.baselineTasks} task${s.baselineTasks !== 1 ? 's' : ''}`}
                  sub="planned first week"
                  accent="#a5b4fc"
                />
                <StatChip
                  label="Added later"
                  value={`${s.addedTasks} task${s.addedTasks !== 1 ? 's' : ''}`}
                  sub={s.addedTasks > 0 ? `(+${Math.round(s.scopeCreepPct)}% growth)` : undefined}
                  accent={creepColor}
                />
              </div>

              {/* Stacked scope bar */}
              {s.addedTasks > 0 && (
                <div className="mt-2">
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-neutral-800">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${originalPct}%`,
                        backgroundColor: '#6366f1',
                        boxShadow: '0 0 6px #6366f140',
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${addedPct}%`,
                        backgroundColor: creepColor,
                        boxShadow: `0 0 6px ${creepColor}40`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-600 mt-1 px-0.5">
                    <span>{Math.round(originalPct)}% original</span>
                    <span>{Math.round(addedPct)}% added</span>
                  </div>
                </div>
              )}

              {/* Interpretation */}
              <div
                className="mt-2 rounded-lg border px-3 py-2"
                style={{
                  borderColor: `${creepColor}30`,
                  backgroundColor: `${creepColor}08`,
                }}
              >
                <p className="text-[11px] leading-snug" style={{ color: creepColor }}>
                  {interpretation}
                </p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Tab 3 — Blockers ─────────────────────────────────────────────────────────

function TabBlockers({ widgets }: { widgets: Widget[] }) {
  const s = getBloqueosStats(widgets);

  const tasksAffected = s.blocked.length;
  const impactLabel = tasksAffected >= 3 ? 'HIGH' : tasksAffected >= 1 ? 'MED' : 'LOW';
  const impactColor = tasksAffected >= 3 ? '#ef4444' : tasksAffected >= 1 ? '#f59e0b' : '#10b981';

  const allClear = s.blockers.length === 0 && s.stalled.length === 0;

  if (allClear && s.unestimated.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <CheckCircle2 size={14} />
            <span>All Clear</span>
          </div>
          <div className="space-y-1 text-[11px] text-emerald-600">
            <div>✅ No blocking tasks</div>
            <div>✅ No stalled work (&gt;3 days)</div>
          </div>
          <p className="text-xs text-emerald-500 font-medium pt-1">Project is flowing!</p>
        </div>
        <div className="flex items-start gap-2 p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg">
          <Link2 size={12} className="text-neutral-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-neutral-500">
            <strong className="text-neutral-400">Tip:</strong> Click 🔗 on any task to mark it as blocked by another task. Useful when one task must finish before another can start.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      {(s.blockers.length > 0 || s.stalled.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          <StatChip label="Blocking" value={String(s.blockers.length)} accent="#ef4444" />
          <StatChip label="Affected" value={String(tasksAffected)} accent="#f87171" />
          <StatChip label="Impact" value={impactLabel} accent={impactColor} />
        </div>
      )}

      {/* Critical */}
      <div>
        <SectionHeader accent="#ef4444">Critical (blocking others)</SectionHeader>
        {s.blockers.length === 0 ? (
          <div className="space-y-1 px-1">
            <p className="text-xs text-neutral-600">No dependencies set yet</p>
            <p className="text-[11px] text-neutral-700">
              Use the 🔗 icon on any task to mark dependencies.<br />
              <span className="text-neutral-800">Example: &ldquo;Build API&rdquo; blocked by &ldquo;Design Schema&rdquo;</span>
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {s.blockers.map(({ task, widget, blockedCount }) => {
              const isHighImpact = blockedCount >= 3;
              const statusLabel = task.status === 'todo' ? 'Not started' : 'In progress';
              const statusColor = task.status === 'todo' ? '#f59e0b' : '#3b82f6';
              return (
                <div
                  key={task.id}
                  className="relative rounded-lg border px-3 py-2 overflow-hidden"
                  style={{
                    borderColor: isHighImpact ? '#ef444450' : '#ef444420',
                    backgroundColor: isHighImpact ? '#ef44440d' : '#ef44440a',
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 rounded-l-lg"
                    style={{ boxShadow: isHighImpact ? '0 0 8px #ef444499' : '0 0 4px #ef444499' }}
                  />
                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-neutral-200 truncate">{task.title}</div>
                        <div className="text-[10px] text-neutral-600 truncate">{widget.label}</div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span
                          className="text-red-400 font-mono text-[10px] bg-red-500/15 px-1.5 py-0.5 rounded"
                          style={{ boxShadow: '0 0 6px #ef444430' }}
                        >
                          blocks {blockedCount}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1">
                      {isHighImpact && <span className="text-amber-500">⚠ High impact — </span>}
                      Must finish before {blockedCount} other task{blockedCount > 1 ? 's' : ''} can proceed
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Waiting on */}
      {s.blocked.length > 0 && (
        <div>
          <SectionHeader accent="#6366f1">Waiting on ({s.blocked.length})</SectionHeader>
          <div className="space-y-2">
            {s.blocked.map(({ task, widget, blockerInfos }) => (
              <div key={task.id} className="rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-3 py-2 space-y-1.5">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-200 truncate">{task.title}</div>
                  <div className="text-[10px] text-neutral-600 truncate">{widget.label}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {blockerInfos.map(b => (
                    <span
                      key={b.id}
                      className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border ${
                        b.isDeleted
                          ? 'border-neutral-700/30 bg-neutral-800/30 text-neutral-600 italic'
                          : b.isDone
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-300'
                      }`}
                      style={{ boxShadow: b.isDone || b.isDeleted ? 'none' : '0 0 6px #ef444428' }}
                    >
                      <Link2 size={8} />
                      <span className={b.isDone ? 'line-through' : ''}>{b.title}</span>
                      {b.isDone && <span>✓</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stalled */}
      <div>
        <SectionHeader accent="#f59e0b">Stalled (in progress &gt; 3 days)</SectionHeader>
        {s.stalled.length === 0 ? (
          <p className="text-xs text-neutral-600 px-1">No stalled tasks</p>
        ) : (
          <div className="space-y-2">
            {s.stalled.map(({ task, widget, daysStalled }) => (
              <div
                key={task.id}
                className="relative rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 overflow-hidden"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400 rounded-l-lg"
                  style={{ boxShadow: '0 0 6px #f59e0b80' }}
                />
                <div className="pl-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-xs text-neutral-200 truncate">{task.title}</div>
                      <div className="text-[10px] text-neutral-600 truncate">{widget.label}</div>
                    </div>
                    <span className="flex-shrink-0 text-amber-400 font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {daysStalled}d
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-600 mb-1.5">
                    Possible reasons: waiting for feedback · unclear requirements · technical blocker
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-neutral-700">
                    <span>□ Check in on this task</span>
                    <span>□ Re-prioritize</span>
                    <span>□ Break into smaller tasks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unestimated */}
      <div>
        <SectionHeader accent="#6b7280">
          <span className="flex items-center gap-1.5">
            <Clock size={9} />
            Unestimated ({s.unestimated.length})
          </span>
        </SectionHeader>
        {s.unestimated.length === 0 ? (
          <p className="text-xs text-neutral-600 px-1">All tasks have estimates</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {s.unestimated.map(({ task, widget }) => (
              <div key={task.id} className="flex items-start gap-2 text-xs px-1">
                <AlertTriangle size={10} className="text-neutral-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-neutral-400 truncate">{task.title}</div>
                  <div className="text-neutral-700 text-[10px] truncate">{widget.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mission Control Components ───────────────────────────────────────────────

function MetricsRow({ metrics }: { metrics: MetricDisplay[] }) {
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={10} className="text-red-400" />;
    if (trend === 'down') return <TrendingDown size={10} className="text-emerald-400" />;
    if (trend === 'stable') return <Minus size={10} className="text-neutral-500" />;
    return null;
  };

  return (
    <div className="grid grid-cols-3 gap-3 my-3 px-2 py-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
      {metrics.map((metric, i) => (
        <div key={i} className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-2xl font-bold font-mono text-neutral-100">
              {metric.value}
            </span>
            {getTrendIcon(metric.trend)}
          </div>
          <div className="text-[9px] uppercase tracking-wider text-neutral-600 font-semibold mb-0.5">
            {metric.label}
          </div>
          {metric.comparison && (
            <div className="text-[10px] text-neutral-700 font-mono">
              {metric.comparison}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const severityStyles = {
    critical: {
      borderColor: '#ef444430',
      bgColor: '#ef44440a',
      glowColor: '#ef4444',
      titleColor: '#f87171',
      Icon: AlertTriangle
    },
    warning: {
      borderColor: '#f59e0b30',
      bgColor: '#f59e0b0a',
      glowColor: '#f59e0b',
      titleColor: '#fbbf24',
      Icon: AlertTriangle
    },
    success: {
      borderColor: '#10b98130',
      bgColor: '#10b9810a',
      glowColor: '#10b981',
      titleColor: '#34d399',
      Icon: CheckCircle2
    },
    info: {
      borderColor: '#6366f130',
      bgColor: '#6366f10a',
      glowColor: '#6366f1',
      titleColor: '#818cf8',
      Icon: Activity
    }
  };

  const style = severityStyles[insight.severity];
  const IconComponent = style.Icon;

  const categoryIcons = {
    velocity: Zap,
    blockers: Shield,
    scope: Layers,
    progress: Activity,
    forecast: Target,
    balance: Minus
  };
  const CategoryIcon = categoryIcons[insight.category];

  return (
    <div
      className="relative rounded-lg border px-3 py-3 overflow-hidden"
      style={{ borderColor: style.borderColor, backgroundColor: style.bgColor }}
    >
      {/* Boss level indicator */}
      {insight.bossLevel && (
        <div className="absolute top-2 right-2 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-3 rounded-full"
              style={{
                backgroundColor: i < insight.bossLevel! ? style.glowColor : '#404040',
                boxShadow: i < insight.bossLevel! ? `0 0 4px ${style.glowColor}` : 'none'
              }}
            />
          ))}
        </div>
      )}

      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg"
        style={{ backgroundColor: style.glowColor, boxShadow: `0 0 8px ${style.glowColor}99` }}
      />

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <CategoryIcon size={14} style={{ color: style.glowColor }} className="flex-shrink-0 mt-0.5" />
          <h3 className="text-sm font-semibold flex-1" style={{ color: style.titleColor }}>
            {insight.title}
          </h3>
          {insight.xp != null && (
            <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">
              +{insight.xp} XP
            </span>
          )}
        </div>

        {/* Interpretación */}
        <p className="text-xs text-neutral-300 font-semibold mb-2 uppercase tracking-wide">
          {insight.interpretation}
        </p>

        {/* Métricas Raw */}
        {insight.metrics.length > 0 && (
          <MetricsRow metrics={insight.metrics} />
        )}

        {/* Impact */}
        <div className="text-[11px] text-neutral-500 mb-3 pl-2 border-l-2 border-neutral-800">
          <strong className="text-neutral-400">Impact:</strong> {insight.impact}
        </div>

        {/* Actions */}
        {insight.actions.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-wider text-neutral-600 flex items-center gap-1">
              <Target size={9} />
              Actions (Prioritized)
            </div>
            {insight.actions.map((action, i) => {
              const priorityConfig = {
                high: { color: '#ef4444', label: 'HIGH' },
                medium: { color: '#f59e0b', label: 'MED' },
                low: { color: '#6b7280', label: 'LOW' }
              };
              const priority = priorityConfig[action.priority];
              
              return (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <span
                      className="text-[9px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: `${priority.color}15`,
                        color: priority.color
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-neutral-300">{action.text}</div>
                    <div className="text-[10px] text-neutral-600 italic flex items-center gap-1 mt-0.5">
                      <span>→</span>
                      <span>{action.estimatedImpact}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Achievement */}
        {insight.achievement && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-2 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            <span>Achievement Unlocked: {insight.achievement}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 0 — Mission Control ─────────────────────────────────────────────────

function TabMissionControl({ 
  widgets, 
  projectSettings 
}: { 
  widgets: Widget[]; 
  projectSettings: ProjectSettings | undefined;
}) {
  const insights = generateInsights(widgets, projectSettings);
  const criticalInsights = insights.filter(i => i.severity === 'critical');
  const warningInsights = insights.filter(i => i.severity === 'warning');
  const successInsights = insights.filter(i => i.severity === 'success');
  
  const totalXP = insights.reduce((sum, i) => sum + (i.xp ?? 0), 0);
  const progreso = getProgresoStats(widgets, projectSettings?.allowRealTime ?? false);

  return (
    <div className="space-y-4">
      {/* Project Status Header */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
          }}
        />
        <div className="relative flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold">
            Project Status
          </span>
          <span 
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded"
            style={{
              backgroundColor: criticalInsights.length > 0 ? '#ef444415' : warningInsights.length > 0 ? '#f59e0b15' : '#10b98115',
              color: criticalInsights.length > 0 ? '#ef4444' : warningInsights.length > 0 ? '#f59e0b' : '#10b981',
              boxShadow: criticalInsights.length > 0 ? '0 0 8px #ef444430' : warningInsights.length > 0 ? '0 0 6px #f59e0b30' : '0 0 6px #10b98130'
            }}
          >
            {criticalInsights.length > 0 ? (
              <><AlertTriangle size={12} /> CRITICAL</>
            ) : warningInsights.length > 0 ? (
              <><AlertTriangle size={12} /> CAUTION</>
            ) : (
              <><CheckCircle2 size={12} /> ON TRACK</>
            )}
          </span>
        </div>
        <div className="relative text-sm text-neutral-400 mb-1">
          {criticalInsights.length > 0 && `${criticalInsights.length} critical issue${criticalInsights.length > 1 ? 's' : ''} require immediate attention`}
          {criticalInsights.length === 0 && warningInsights.length > 0 && `${warningInsights.length} warning${warningInsights.length > 1 ? 's' : ''} need review`}
          {criticalInsights.length === 0 && warningInsights.length === 0 && 'Project is flowing smoothly'}
        </div>
        <div className="relative text-xs text-neutral-600">
          Progress: {Math.round(progreso.pctDone)}% • {progreso.doneTasks}/{progreso.totalTasks} tasks
        </div>
      </div>

      {/* Critical Issues */}
      {criticalInsights.length > 0 && (
        <div>
          <SectionHeader accent="#ef4444">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={10} />
              CRITICAL ISSUES ({criticalInsights.length})
            </div>
          </SectionHeader>
          <div className="space-y-3">
            {criticalInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warningInsights.length > 0 && (
        <div>
          <SectionHeader accent="#f59e0b">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={10} />
              WARNINGS ({warningInsights.length})
            </div>
          </SectionHeader>
          <div className="space-y-3">
            {warningInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Achievements & Wins */}
      {successInsights.length > 0 && (
        <div>
          <SectionHeader accent="#10b981">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={10} />
              ACHIEVEMENTS & WINS
            </div>
          </SectionHeader>
          <div className="space-y-2">
            {successInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* XP Summary */}
      {totalXP > 0 && (
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={12} className="text-indigo-400" />
              <span className="text-xs text-neutral-500">Potential XP from resolving issues</span>
            </div>
            <span className="text-sm font-mono font-bold text-indigo-400">+{totalXP} XP</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {insights.length === 0 && (
        <div className="text-center py-12 text-neutral-600">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="text-sm">No issues detected</p>
          <p className="text-xs text-neutral-700 mt-1">Project is running smoothly</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4 — Forecast ─────────────────────────────────────────────────────────

function TabForecast({
  widgets,
  allowRealTime,
  weeklyPace,
}: {
  widgets: Widget[];
  allowRealTime: boolean;
  weeklyPace: number;
}) {
  const s = getPrediccionStats(widgets, allowRealTime, weeklyPace);

  // ── Confidence ──
  const confidence = Math.round(
    (s.estimatedHrsTotal > 0 ? 40 : 0) +
    (s.velocityRatio != null ? 40 : 0) +
    (s.realTimeLogged > 0 ? 20 : 0),
  );
  const confidenceLabel = confidence >= 80 ? 'High' : confidence >= 40 ? 'Medium' : 'Low';
  const confidenceColor = confidence >= 80 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#6b7280';

  // ── Estimated completion date ──
  const completionDate = s.weeksRemaining > 0
    ? new Date(Date.now() + s.weeksRemaining * 7 * 86400000)
    : null;
  const completionDateStr = completionDate
    ? completionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: completionDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
    : null;

  // ── Smart remaining label (days for short, weeks for long) ──
  const remainingCtx = paceContext(s.adjustedHrsRemaining, weeklyPace);

  // ── Interpretation text ──
  const hasVelocity = s.velocityRatio != null;
  const isSlower = hasVelocity && s.velocityRatio! > 1.1;
  const isFaster = hasVelocity && s.velocityRatio! < 0.9;

  let interpretationText = '';
  let interpretationColor = '#a5b4fc'; // indigo
  if (s.estimatedHrsTotal <= 0) {
    interpretationText = '';
  } else if (s.adjustedHrsRemaining <= 0) {
    interpretationText = 'All estimated work is done!';
    interpretationColor = '#34d399';
  } else {
    const timeLeft = s.adjustedHrsRemaining.toFixed(1);
    const basis = hasVelocity ? 'Based on your actual pace' : 'Based on estimates';
    const dateNote = completionDateStr ? ` — around ${completionDateStr}` : '';
    if (remainingCtx) {
      interpretationText = `${basis}, you have about ${timeLeft}h of work remaining (${remainingCtx})${dateNote}.`;
    } else {
      interpretationText = `${basis}, you have about ${timeLeft}h of work remaining${dateNote}.`;
    }
    if (isSlower) interpretationColor = '#fbbf24';
    if (isFaster) interpretationColor = '#34d399';
  }

  // ── Milestone formatting helper ──
  function milestoneTimeLabel(weeksFromNow: number): string {
    if (weeksFromNow <= 0) return '';
    const hrs = weeksFromNow * weeklyPace;
    const ctx = paceContext(hrs, weeklyPace);
    return ctx || `${hrs.toFixed(0)}h`;
  }

  // Empty state
  if (s.estimatedHrsTotal === 0) {
    return (
      <div className="text-center text-xs text-neutral-600 py-8">
        Add estimates to tasks to see the forecast
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Interpretation summary */}
      {interpretationText && (
        <div
          className="rounded-xl border px-3.5 py-3 space-y-1.5"
          style={{
            borderColor: `${interpretationColor}25`,
            backgroundColor: `${interpretationColor}08`,
          }}
        >
          <p className="text-xs leading-snug" style={{ color: interpretationColor }}>
            {interpretationText}
          </p>
          {isSlower && (
            <p className="text-[10px] text-neutral-600">
              Forecasts adjusted because tasks are taking {s.velocityRatio!.toFixed(1)}&times; the estimated time.
            </p>
          )}
          {isFaster && (
            <p className="text-[10px] text-neutral-600">
              Forecasts adjusted — you&apos;re completing tasks at {(1 / s.velocityRatio!).toFixed(1)}&times; estimated speed.
            </p>
          )}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] text-neutral-600">Confidence:</span>
            <span className="font-mono text-[10px] font-bold" style={{ color: confidenceColor }}>
              {confidenceLabel}
            </span>
            {confidence < 80 && (
              <span className="text-[10px] text-neutral-700">
                — {!hasVelocity && s.realTimeLogged <= 0
                  ? 'enable real time tracking for better accuracy'
                  : !hasVelocity
                    ? 'complete some estimated tasks to calibrate'
                    : 'log real time on tasks for full accuracy'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Velocity context */}
      {s.velocityRatio != null && (
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5">
          <span className="text-xs text-neutral-500">Development pace</span>
          <div className="flex flex-col items-end gap-0.5">
            <span
              className="font-semibold text-sm"
              style={{
                color:
                  s.velocityRatio > 1.1
                    ? '#f87171'
                    : s.velocityRatio < 0.9
                      ? '#34d399'
                      : '#e5e5e5',
              }}
            >
              {velocityPrimaryText(s.velocityRatio)}
            </span>
            {velocitySubText(s.velocityRatio) && (
              <span className="text-[10px] text-neutral-600">
                {velocitySubText(s.velocityRatio)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hours breakdown */}
      <div>
        <SectionHeader accent="#6366f1">Hours breakdown</SectionHeader>
        <div className="grid grid-cols-2 gap-2">
          <StatChip label="Original estimate" value={hrsWithContext(s.estimatedHrsTotal, weeklyPace)} accent="#a5b4fc" />
          {s.velocityRatio != null && s.velocityRatio !== 1 && (
            <StatChip
              label="Adjusted estimate"
              value={hrsWithContext(s.adjustedHrsTotal, weeklyPace)}
              sub={
                s.velocityRatio > 1.1
                  ? `Based on ${s.velocityRatio.toFixed(1)}× actual pace`
                  : `Based on ${s.velocityRatio.toFixed(1)}× actual pace`
              }
              accent={s.velocityRatio > 1.1 ? '#f87171' : '#34d399'}
            />
          )}
          {allowRealTime && s.realTimeLogged > 0 && (
            <StatChip label="Time logged" value={`${s.realTimeLogged.toFixed(1)}h`} accent="#fbbf24" />
          )}
          <StatChip
            label="Time left"
            value={hrsWithContext(s.adjustedHrsRemaining, weeklyPace)}
            sub={completionDateStr ? `finish ~${completionDateStr}` : s.weeksRemaining > 0 ? `at ${weeklyPace}h/week pace` : undefined}
            accent="#e5e5e5"
          />
        </div>
      </div>

      {/* Milestones */}
      {s.milestones.some(m => !m.reached) && (
        <div>
          <SectionHeader accent="#8b5cf6">Milestones</SectionHeader>
          <div className="space-y-1">
            {s.milestones.map((m, i) => {
              const timeLabel = m.reached ? '' : milestoneTimeLabel(m.weeksFromNow);
              const dateEst = !m.reached && m.weeksFromNow > 0
                ? new Date(Date.now() + m.weeksFromNow * 7 * 86400000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : null;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border ${
                    m.reached
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-neutral-800 bg-neutral-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {m.reached ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-neutral-700" />
                    )}
                    <span className={`text-xs ${m.reached ? 'text-emerald-400' : 'text-neutral-400'}`}>
                      {m.label}
                    </span>
                  </div>
                  {m.reached ? (
                    <span className="text-[10px] text-emerald-500">Reached</span>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs text-neutral-400 font-mono">{timeLabel}</span>
                      {dateEst && (
                        <span className="text-[10px] text-neutral-600 ml-1.5">~{dateEst}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risks */}
      {s.risks.length > 0 && (
        <div>
          <SectionHeader accent="#f59e0b">Detected risks</SectionHeader>
          <div className="space-y-1.5">
            {s.risks.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-amber-300 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2"
              >
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-amber-400" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId = 'progress' | 'scope' | 'blockers' | 'forecast';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'progress', label: 'Progress', icon: <CheckCircle2 size={12} /> },
  { id: 'scope',    label: 'Scope',    icon: <Layers size={12} /> },
  { id: 'blockers', label: 'Blockers', icon: <Link2 size={12} /> },
  { id: 'forecast', label: 'Forecast', icon: <Target size={12} /> },
];

interface ProjectStatsPanelProps {
  widgets: Widget[];
  projectSettings: ProjectSettings | undefined;
  onClose: () => void;
}

export default function ProjectStatsPanel({
  widgets,
  projectSettings,
  onClose,
}: ProjectStatsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('progress');
  const [recalcKey, setRecalcKey] = useState(0);
  const allowRealTime = projectSettings?.allowRealTime ?? false;
  const weeklyPace = projectSettings?.weeklyPace ?? 20;

  const panel = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[99]"
        onPointerDown={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[480px] z-[100] bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl">
        {/* Scanline overlay on panel */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)',
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
            <BarChart2 size={15} className="text-indigo-400" style={{ filter: 'drop-shadow(0 0 4px #6366f199)' }} />
            <span>Project Stats</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRecalcKey(k => k + 1)}
              title="Recalculate stats"
              className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative z-10 flex border-b border-neutral-800 px-2 pt-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-300 border-b-2 border-indigo-500 -mb-px bg-indigo-500/5'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div key={recalcKey} className="relative z-10 flex-1 overflow-y-auto p-4">
          {activeTab === 'progress' && (
            <TabProgress widgets={widgets} allowRealTime={allowRealTime} weeklyPace={weeklyPace} />
          )}
          {activeTab === 'scope' && <TabScope widgets={widgets} />}
          {activeTab === 'blockers' && <TabBlockers widgets={widgets} />}
          {activeTab === 'forecast' && (
            <TabForecast widgets={widgets} allowRealTime={allowRealTime} weeklyPace={weeklyPace} />
          )}
        </div>
      </div>
    </>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(panel, document.body);
}
