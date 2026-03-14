import type { Widget, ImageContent, EstimationMode, Task } from "@/types";
import { CONTEXTS } from "@/constants";
import { renderEstimateExport, buildScaleLegendMd, totalEstimateHours, formatTimeFromHours } from "@/lib/estimationScale";

// ─── Export Options ─────────────────────────────────────────────────────────

export interface ExportOptions {
  estimateDisplay: 'visual' | 'technical';
  showWidgetType: boolean;
  includeTasks: boolean;
  showExportDate: boolean;
  showContextIcons: boolean;
  showStats: boolean;
  showScaleLegend: boolean;
  showAllTasks: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  estimateDisplay: 'visual',
  showWidgetType: true,
  includeTasks: true,
  showExportDate: true,
  showContextIcons: true,
  showStats: true,
  showScaleLegend: true,
  showAllTasks: true,
};

// ─── Table of Contents ──────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // remove emoji & special chars
    .trim()
    .replace(/\s+/g, '-');
}

interface TocEntry {
  label: string;
  level: number;  // 0 = context section (h2), 1 = widget (h3), 2 = child (h4), etc.
}

function collectTocEntries(
  widget: Widget,
  allWidgets: Widget[],
  depth: number,
  options: ExportOptions,
): TocEntry[] {
  const contentMd = getWidgetContentMd(widget);
  const hasTasks = options.includeTasks && (widget.tasks?.length ?? 0) > 0;

  const children = widget.children
    .map(id => allWidgets.find(w => w.id === id))
    .filter((w): w is Widget => !!w);

  const childEntries = children.flatMap(c =>
    collectTocEntries(c, allWidgets, depth + 1, options),
  );

  // Skip empty widgets (same rule as buildWidgetSection)
  if (!contentMd && !hasTasks && childEntries.length === 0) return [];

  return [{ label: widget.label, level: depth }, ...childEntries];
}

function buildTableOfContents(
  contextGroups: Map<string, Widget[]>,
  allWidgets: Widget[],
  options: ExportOptions,
): string {
  const tocLines: string[] = ['## Table of Contents', ''];

  for (const ctx of CONTEXTS) {
    const group = contextGroups.get(ctx.id);
    if (!group) continue;

    const ctxLabel = options.showContextIcons
      ? `${ctx.icon} ${ctx.label}`
      : ctx.label;
    tocLines.push(`- [${ctxLabel}](#${slugify(ctxLabel)})`);

    for (const widget of group) {
      const entries = collectTocEntries(widget, allWidgets, 1, options);
      for (const entry of entries) {
        const indent = '  '.repeat(entry.level);
        tocLines.push(`${indent}- [${entry.label}](#${slugify(entry.label)})`);
      }
    }
  }

  return tocLines.join('\n');
}

// ─── Markdown GDD Generation ───────────────────────────────────────────────

function buildTasksMd(
  tasks: Task[],
  allWidgets: Widget[],
  estimationMode?: EstimationMode,
  estimateDisplay: 'visual' | 'technical' = 'visual',
): string {
  if (!tasks.length) return '';
  const tech = estimateDisplay === 'technical';
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const lines: string[] = [`**Tasks** (${doneCount}/${tasks.length} done)`];
  for (const task of tasks) {
    const check = task.status === 'done' ? 'x' : ' ';
    const inProgress = task.status === 'in-progress' ? (tech ? ' [IN PROGRESS]' : ' ◔') : '';
    const badges: string[] = [];
    if (task.priority === 'high') badges.push(tech ? 'HIGH' : '🔴 High');
    else if (task.priority === 'medium') badges.push(tech ? 'MEDIUM' : '🟡 Medium');
    if (task.estimate && estimationMode) {
      badges.push(renderEstimateExport(task.estimate, estimationMode, estimateDisplay));
    }
    if (task.realTime != null) badges.push(tech ? `Real: ${task.realTime}h` : `⏱ ${task.realTime}h`);
    // BlockedBy references
    if (task.blockedBy?.length) {
      const blockerNames = task.blockedBy.map(bid => {
        for (const w of allWidgets) {
          const t = w.tasks?.find(tt => tt.id === bid);
          if (t) return `"${t.title}"`;
        }
        return bid;
      });
      badges.push(tech ? `BLOCKED BY ${blockerNames.join(', ')}` : `⛔ blocked by ${blockerNames.join(', ')}`);
    }
    const suffix = badges.length ? ` *(${badges.join(' · ')})*` : '';
    lines.push(`- [${check}] ${task.title}${inProgress}${suffix}`);
  }
  return lines.join('\n');
}

function getWidgetContentMd(widget: Widget): string {
  const { type, content } = widget;

  if (!content) return "";

  if (type === "markdown" && typeof content === "string") {
    return content;
  }

  if (type === "image") {
    const img = content as ImageContent;
    const desc = img.description ? img.description : widget.label;
    return img.url ? `![${desc}](${img.url})\n\n${img.description ?? ""}` : "";
  }

  if (type === "variables" && typeof content === "object" && !Array.isArray(content)) {
    const vars = content as Record<string, string | number>;
    const entries = Object.entries(vars);
    if (entries.length === 0) return "";
    const rows = entries.map(([k, v]) => `| \`${k}\` | ${v} |`).join("\n");
    return `| Variable | Value |\n|----------|-------|\n${rows}`;
  }

  return "";
}

function buildWidgetSection(
  widget: Widget,
  allWidgets: Widget[],
  headingLevel: number,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): string {
  const hashes = "#".repeat(Math.min(headingLevel, 6));
  const typeLabel =
    widget.type === "markdown"
      ? "Note"
      : widget.type === "image"
      ? "Image"
      : widget.type === "variables"
      ? "Variables"
      : "Container";

  const templateBadge = widget.isTemplate ? " *(Template)*" : "";
  const title = `${hashes} ${widget.label}${templateBadge}`;

  const contentMd = getWidgetContentMd(widget);
  const contentBlock = contentMd ? `\n\n${contentMd}` : "";

  // Recurse into children
  const children = widget.children
    .map(childId => allWidgets.find(w => w.id === childId))
    .filter((w): w is Widget => !!w);

  const childrenMd = children
    .map(child => buildWidgetSection(child, allWidgets, headingLevel + 1, options))
    .filter(s => s !== '')
    .join("\n\n");

  const childrenBlock = childrenMd ? `\n\n${childrenMd}` : "";

  // Tasks section
  const rootWidget = allWidgets.find(w => w.isRoot);
  const estimationMode = rootWidget?.projectSettings?.estimationMode;
  const tasksMd = (options.includeTasks && widget.tasks?.length)
    ? buildTasksMd(widget.tasks, allWidgets, estimationMode, options.estimateDisplay)
    : '';
  const tasksBlock = tasksMd ? `\n\n${tasksMd}` : '';

  // Type badge only for non-root widgets when option is enabled
  const typeBadge = (!widget.isRoot && options.showWidgetType) ? `\n*${typeLabel}*` : "";

  // Skip empty widgets (no content, no tasks, no children)
  if (!contentMd && !tasksMd && !childrenMd && !widget.isRoot) return '';

  return `${title}${typeBadge}${contentBlock}${tasksBlock}${childrenBlock}`;
}

export function generateGDDMarkdown(
  widgets: Widget[],
  projectName: string,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
): string {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rootWidget = widgets.find(w => w.isRoot);
  const lines: string[] = [];

  // Document header
  lines.push(`# ${projectName}`);
  lines.push("");
  if (options.showExportDate) {
    lines.push(`> *Exported ${now} · Grapken*`);
    lines.push("");
  }
  lines.push("---");

  // ── Project Summary ──────────────────────────────────────────────────────
  const allTasks = widgets.flatMap(w => w.tasks ?? []);
  const estimationMode = rootWidget?.projectSettings?.estimationMode;

  if (options.showStats && allTasks.length > 0) {
    const done = allTasks.filter(t => t.status === 'done').length;
    const inProg = allTasks.filter(t => t.status === 'in-progress').length;
    const todo = allTasks.filter(t => t.status === 'todo').length;
    const pct = Math.round((done / allTasks.length) * 100);
    const highPri = allTasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const blocked = allTasks.filter(t => t.blockedBy?.length).length;
    const widgetCount = widgets.filter(w => !w.isRoot).length;

    lines.push("");
    lines.push("## Project Summary");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Widgets | ${widgetCount} |`);
    lines.push(`| Tasks | ${allTasks.length} (${done} done · ${inProg} in progress · ${todo} todo) |`);
    lines.push(`| Completion | **${pct}%** |`);
    if (highPri > 0) lines.push(`| High priority | ${highPri} remaining |`);
    if (blocked > 0) lines.push(`| Blocked tasks | ${blocked} |`);

    // Estimation mode & total effort
    if (estimationMode) {
      const modeLabels: Record<string, string> = {
        'number': 'Fibonacci points',
        't-shirt': 'T-Shirt sizes',
        'emoji': 'Emoji scale',
        'coffee': 'Coffee cups',
        'hours': 'Hours',
      };
      const modeLabel = modeLabels[estimationMode] ?? estimationMode;
      const estimatedTasks = allTasks.filter(t => !!t.estimate);
      if (estimatedTasks.length > 0) {
        const totalHours = totalEstimateHours(estimatedTasks);
        const timeStr = formatTimeFromHours(totalHours);
        lines.push(`| Estimation | ${modeLabel} (${estimatedTasks.length}/${allTasks.length} estimated${timeStr ? ` · ${timeStr}` : ''}) |`);
      } else {
        lines.push(`| Estimation | ${modeLabel} |`);
      }
    }

    lines.push("");
    lines.push("---");
  }

  // Root widget overview
  if (rootWidget) {
    const rootContent = getWidgetContentMd(rootWidget);
    if (rootContent) {
      lines.push("");
      lines.push("## Overview");
      lines.push("");
      lines.push(rootContent);
      lines.push("");
      lines.push("---");
    }
  }

  // Scale legend (when estimation is configured and not hours)
  if (options.showScaleLegend && estimationMode && estimationMode !== 'hours') {
    lines.push("");
    lines.push(buildScaleLegendMd(estimationMode, options.estimateDisplay));
    lines.push("");
    lines.push("---");
  }

  // Group non-root, top-level widgets (parentId === null or parentId === rootWidget.id) by context
  // "Top-level" means they have no parent or their parent is root
  const rootId = rootWidget?.id;

  // We want to organise by context. We'll collect all widgets that are NOT
  // root and build the tree starting from those whose parentId is root or null.
  const topLevelWidgets = widgets.filter(w => {
    if (w.isRoot) return false;
    return w.parentId === null || w.parentId === rootId;
  });

  // Group by context preserving CONTEXTS order
  const groups = new Map<string, Widget[]>();
  for (const ctx of CONTEXTS) {
    const group = topLevelWidgets.filter(w => w.context === ctx.id);
    if (group.length > 0) {
      groups.set(ctx.id, group);
    }
  }

  // Table of contents (only for documents with enough content)
  const totalTopLevel = topLevelWidgets.length;
  if (totalTopLevel > 4 || groups.size > 1) {
    lines.push("");
    lines.push(buildTableOfContents(groups, widgets, options));
    lines.push("");
    lines.push("---");
  }

  for (const ctx of CONTEXTS) {
    const group = groups.get(ctx.id);
    if (!group) continue;

    const ctxMeta = CONTEXTS.find(c => c.id === ctx.id)!;
    lines.push("");
    lines.push(options.showContextIcons
      ? `## ${ctxMeta.icon} ${ctxMeta.label}`
      : `## ${ctxMeta.label}`
    );
    lines.push("");

    for (const widget of group) {
      lines.push(buildWidgetSection(widget, widgets, 3, options));
      lines.push("");
    }

    lines.push("---");
  }

  // ── All Tasks ───────────────────────────────────────────────────────────
  if (options.showAllTasks && allTasks.length > 0) {
    const tech = options.estimateDisplay === 'technical';
    const done = allTasks.filter(t => t.status === 'done').length;
    const inProg = allTasks.filter(t => t.status === 'in-progress').length;
    const todo = allTasks.filter(t => t.status === 'todo').length;

    lines.push("");
    lines.push(`## All Tasks (${allTasks.length})`);
    lines.push("");
    lines.push(`> ${done} done · ${inProg} in progress · ${todo} todo`);
    lines.push("");

    // Build table header based on available data
    const hasEstimates = estimationMode && allTasks.some(t => !!t.estimate);
    const hasRealTime = allTasks.some(t => t.realTime != null);
    const hasBlocked = allTasks.some(t => t.blockedBy?.length);

    const cols = ['Status', 'Task', 'Widget', 'Priority'];
    if (hasEstimates) cols.push('Estimate');
    if (hasRealTime) cols.push('Real time');
    if (hasBlocked) cols.push('Blocked by');

    lines.push(`| ${cols.join(' | ')} |`);
    lines.push(`|${cols.map(() => '---').join('|')}|`);

    for (const widget of widgets) {
      if (!widget.tasks?.length) continue;
      for (const task of widget.tasks) {
        const statusLabel = task.status === 'done'
          ? (tech ? 'Done' : '✅')
          : task.status === 'in-progress'
          ? (tech ? 'In progress' : '◔')
          : (tech ? 'Todo' : '○');
        const priLabel = task.priority === 'high'
          ? (tech ? 'High' : '🔴')
          : task.priority === 'medium'
          ? (tech ? 'Medium' : '🟡')
          : (tech ? 'Low' : '⚪');

        const row = [statusLabel, task.title, widget.label, priLabel];

        if (hasEstimates) {
          row.push(task.estimate && estimationMode
            ? renderEstimateExport(task.estimate, estimationMode, options.estimateDisplay)
            : '–');
        }
        if (hasRealTime) {
          row.push(task.realTime != null ? `${task.realTime}h` : '–');
        }
        if (hasBlocked) {
          if (task.blockedBy?.length) {
            const names = task.blockedBy.map(bid => {
              for (const w of widgets) {
                const found = w.tasks?.find(tt => tt.id === bid);
                if (found) return found.title;
              }
              return '?';
            });
            row.push(names.join(', '));
          } else {
            row.push('–');
          }
        }

        lines.push(`| ${row.join(' | ')} |`);
      }
    }

    // Totals row
    if (hasEstimates && estimationMode) {
      const totalHours = totalEstimateHours(allTasks);
      const timeStr = formatTimeFromHours(totalHours);
      if (timeStr) {
        lines.push("");
        lines.push(`**Total effort:** ${timeStr}`);
      }
    }

    lines.push("");
    lines.push("---");
  }

  return lines.join("\n");
}

// ─── Download helpers ───────────────────────────────────────────────────────

export function downloadMarkdown(markdown: string, projectName: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "_")}.gdd.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(widgets: Widget[], projectName: string): void {
  const data = JSON.stringify(widgets, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "_")}.gdd.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF via print window ───────────────────────────────────────────────────

export function exportAsPDF(htmlContent: string, projectName: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${projectName} — GDD</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #1a1a2e;
      padding: 48px 60px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; margin-bottom: 4px; color: #1a1a2e; }
    h2 { font-size: 1.4rem; margin-top: 2rem; margin-bottom: 0.75rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; color: #2d3748; }
    h3 { font-size: 1.1rem; margin-top: 1.25rem; margin-bottom: 0.4rem; color: #4a5568; }
    h4, h5, h6 { font-size: 0.95rem; margin-top: 1rem; margin-bottom: 0.3rem; color: #718096; }
    p { margin-bottom: 0.75rem; }
    blockquote { border-left: 3px solid #a0aec0; padding-left: 12px; color: #718096; font-style: italic; margin: 0.75rem 0; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 12px; text-align: left; }
    th { background: #f7fafc; font-weight: 600; }
    code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; }
    pre { background: #f1f5f9; border-radius: 6px; padding: 12px; overflow-x: auto; margin: 0.75rem 0; }
    img { max-width: 100%; height: auto; border-radius: 4px; margin: 0.5rem 0; }
    em { color: #718096; }
    strong { color: #2d3748; }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
${htmlContent}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`);

  printWindow.document.close();
}

// ─── Image via html-to-image ────────────────────────────────────────────────

function shouldCapture(node: HTMLElement): boolean {
  // Exclude the export modal and any element flagged with data-export-ignore
  if (node.classList?.contains("export-modal-root")) return false;
  if ((node as HTMLElement).dataset?.exportIgnore === "true") return false;
  return true;
}

function injectTitleOverlay(el: HTMLElement, title: string): HTMLDivElement {
  const div = document.createElement("div");
  div.style.cssText = [
    "position:absolute",
    "top:16px",
    "left:50%",
    "transform:translateX(-50%)",
    "z-index:9999",
    "background:rgba(10,10,10,0.82)",
    "color:#e2e8f0",
    "padding:8px 20px",
    "border-radius:10px",
    "font-size:17px",
    "font-weight:700",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "border:1px solid rgba(99,102,241,0.45)",
    "letter-spacing:0.02em",
    "pointer-events:none",
    "white-space:nowrap",
  ].join(";");
  div.textContent = title;
  el.appendChild(div);
  return div;
}

export async function exportAsImage(
  canvasEl: HTMLElement,
  projectName: string
): Promise<void> {
  const { toPng } = await import("html-to-image");

  const titleEl = injectTitleOverlay(canvasEl, projectName);
  try {
    const dataUrl = await toPng(canvasEl, {
      backgroundColor: "#0a0a0a",
      pixelRatio: 1,
      filter: shouldCapture,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${projectName.replace(/\s+/g, "_")}.gdd.png`;
    a.click();
  } finally {
    canvasEl.removeChild(titleEl);
  }
}

export async function captureCanvasPreview(
  canvasEl: HTMLElement,
  projectName: string
): Promise<string> {
  const { toPng } = await import("html-to-image");

  const titleEl = injectTitleOverlay(canvasEl, projectName);
  try {
    return await toPng(canvasEl, {
      backgroundColor: "#0a0a0a",
      pixelRatio: 1,
      filter: shouldCapture,
    });
  } finally {
    canvasEl.removeChild(titleEl);
  }
}
