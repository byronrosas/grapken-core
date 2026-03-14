import type { EstimationMode, Task } from "@/types";

// ─── Unified 6-point Fibonacci scale ────────────────────────────────────────
// All estimation modes share the same 6 breakpoints.
// Task.estimate always stores the numeric key string: '1'|'2'|'3'|'5'|'8'|'13'
// The mode only changes how that value is displayed.

export interface ScalePoint {
  value: string;     // stored key: '1' | '2' | '3' | '5' | '8' | '13'
  num: number;       // Fibonacci number
  tshirt: string;    // 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
  emoji: string;
  timeRange: string; // human-readable range
  label: string;     // 'Trivial' | 'Simple' | 'Normal' | 'Complejo' | 'Difícil' | 'Épico'
}

export const ESTIMATION_SCALE: ScalePoint[] = [
  { value: '1',  num: 1,  tshirt: 'XS',  emoji: '😊', timeRange: '1–2h',     label: 'Trivial'  },
  { value: '2',  num: 2,  tshirt: 'S',   emoji: '🤔', timeRange: '2–4h',     label: 'Simple'   },
  { value: '3',  num: 3,  tshirt: 'M',   emoji: '😰', timeRange: '4–8h',     label: 'Normal'   },
  { value: '5',  num: 5,  tshirt: 'L',   emoji: '🔥', timeRange: '1–2 days', label: 'Complex' },
  { value: '8',  num: 8,  tshirt: 'XL',  emoji: '💀', timeRange: '2–4 days', label: 'Hard'    },
  { value: '13', num: 13, tshirt: 'XXL', emoji: '🚨', timeRange: '1 week',   label: 'Epic'    },
];

export function getScalePoint(value: string): ScalePoint | undefined {
  return ESTIMATION_SCALE.find(p => p.value === value);
}

// ─── Coffee display helper ───────────────────────────────────────────────────
// Shows up to 3 cups as glyphs, then switches to ☕×N notation

export function renderCoffeeBadge(value: string): string {
  const n = Number(value);
  if (!n) return '–';
  if (n <= 3) return '☕'.repeat(n);
  return `☕×${n}`;
}

// ─── Badge renderer (used in task panel) ────────────────────────────────────

export function renderEstimateBadge(value: string, mode: EstimationMode): string {
  if (!value) return '–';
  const p = getScalePoint(value);
  if (!p) return value; // hours or unknown legacy value

  if (mode === 'number')  return String(p.num);
  if (mode === 't-shirt') return p.tshirt;
  if (mode === 'emoji')   return p.emoji;
  if (mode === 'coffee')  return renderCoffeeBadge(value);
  return value;
}

// ─── Export renderer (used in markdown / PDF export) ─────────────────────────

export function renderEstimateExport(
  value: string,
  mode: EstimationMode,
  display: 'visual' | 'technical',
): string {
  if (mode === 'hours') return `${value}h`;
  const p = getScalePoint(value);
  if (!p) return value;
  if (display === 'technical') return `${p.num} (${p.label})`;
  // visual
  return `${p.emoji} ${p.label}`;
}

// ─── Markdown legend table (inserted into GDD export) ────────────────────────

export function buildScaleLegendMd(mode?: EstimationMode, display: 'visual' | 'technical' = 'visual'): string {
  const modeLabels: Record<string, string> = {
    'number': 'Fibonacci points',
    't-shirt': 'T-Shirt sizes',
    'emoji': 'Emoji scale',
    'coffee': 'Coffee cups',
  };
  const title = mode ? `### Estimation scale — ${modeLabels[mode] ?? mode}` : '### Estimation scale';

  // Technical display: always show a uniform reference table
  if (display === 'technical') {
    const header = `${title}\n\n| Points | T-Shirt | Time | Description |\n|--------|---------|-------------|-------------|`;
    const rows = ESTIMATION_SCALE.map(p =>
      `| ${p.num.toString().padStart(6)} | ${p.tshirt.padEnd(7)} | ${p.timeRange.padEnd(11)} | ${p.label.padEnd(8)} |`
    );
    return [header, ...rows].join('\n');
  }

  // Visual display: show the column matching the configured mode
  if (mode === 'coffee') {
    const header = `${title}\n\n| Coffee | Time | Description |\n|--------|-------------|-------------|`;
    const rows = ESTIMATION_SCALE.map(p =>
      `| ${renderCoffeeBadge(p.value).padEnd(6)} | ${p.timeRange.padEnd(11)} | ${p.label.padEnd(8)} |`
    );
    return [header, ...rows].join('\n');
  }
  if (mode === 't-shirt') {
    const header = `${title}\n\n| Size | Time | Description |\n|------|-------------|-------------|`;
    const rows = ESTIMATION_SCALE.map(p =>
      `| ${p.tshirt.padEnd(4)} | ${p.timeRange.padEnd(11)} | ${p.label.padEnd(8)} |`
    );
    return [header, ...rows].join('\n');
  }
  if (mode === 'emoji') {
    const header = `${title}\n\n| Emoji | Time | Description |\n|-------|-------------|-------------|`;
    const rows = ESTIMATION_SCALE.map(p =>
      `| ${p.emoji}    | ${p.timeRange.padEnd(11)} | ${p.label.padEnd(8)} |`
    );
    return [header, ...rows].join('\n');
  }
  // Default: number / fibonacci
  const header = `${title}\n\n| Points | Time | Description |\n|--------|-------------|-------------|`;
  const rows = ESTIMATION_SCALE.map(p =>
    `| ${p.num.toString().padStart(6)} | ${p.timeRange.padEnd(11)} | ${p.label.padEnd(8)} |`
  );
  return [header, ...rows].join('\n');
}

// ─── Legacy estimate migration ────────────────────────────────────────────────
// Converts old mode-specific strings to the unified numeric key.

const TSHIRT_MIGRATION: Record<string, string> = {
  XS: '1', S: '2', M: '3', L: '5', XL: '8', XXL: '13',
};

const COFFEE_MIGRATION: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '5',
};

// Old 5-emoji set (before gamer update) mapped to same scale
const EMOJI_MIGRATION: Record<string, string> = {
  '😊': '1', '😐': '2', '😅': '3', '😱': '5',
  // Current set already numeric, no migration needed
};

export function migrateTaskEstimate(estimate: string, mode: EstimationMode): string {
  if (mode === 't-shirt') return TSHIRT_MIGRATION[estimate] ?? estimate;
  if (mode === 'coffee')  return COFFEE_MIGRATION[estimate]  ?? estimate;
  if (mode === 'emoji')   return EMOJI_MIGRATION[estimate]   ?? estimate;
  return estimate; // 'number', 'hours', or already numeric
}

// ─── Total estimate helpers (task panel header chip) ─────────────────────────

// Hour midpoints per Fibonacci point (8h workday)
export const SCALE_HOURS: Record<string, number> = {
  '1': 1.5, '2': 3, '3': 6, '5': 12, '8': 24, '13': 40,
};

export function totalEstimateHours(tasks: Task[]): number {
  return tasks.reduce((sum, t) => {
    if (!t.estimate) return sum;
    return sum + (SCALE_HOURS[t.estimate] ?? 0);
  }, 0);
}

export function formatTimeFromHours(hours: number, weeklyPace = 40): string {
  if (hours <= 0) return '';
  const hrsPerDay = weeklyPace / 7;       // 7-day calendar week: pace=40→5.7h/d, pace=20→2.9h/d
  if (hours < hrsPerDay) return `~${Math.round(hours)}h`;
  const days = hours / hrsPerDay;
  if (days < 7) return `~${+(days.toFixed(1))}d`;
  const weeks = hours / weeklyPace;
  return `~${+(weeks.toFixed(1))}w`;
}

export function formatTotalEstimate(tasks: Task[], mode: EstimationMode): string {
  if (mode === 'hours') {
    const total = tasks
      .filter(t => !!t.estimate)
      .reduce((s, t) => s + (parseFloat(t.estimate ?? '0') || 0), 0);
    return total > 0 ? `${+total.toFixed(1)}h` : '';
  }
  const estimated = tasks.filter(t => t.estimate && !!getScalePoint(t.estimate));
  if (estimated.length === 0) return '';
  const total = estimated.reduce((s, t) => s + (getScalePoint(t.estimate!)?.num ?? 0), 0);
  if (total === 0) return '';
  if (mode === 'coffee') return renderCoffeeBadge(String(total));
  return `${total} pts`;
}
