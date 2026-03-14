import { useState, useEffect, useCallback, type RefObject } from "react";
import { X, Download, Copy, Check, FileText, FileImage, Printer, Loader2, Archive } from "lucide-react";
import { marked } from "marked";
import type { Widget, ProjectMeta } from "@/types";
import { CONTEXTS } from "@/constants";
import {
  generateGDDMarkdown,
  downloadMarkdown,
  exportAsPDF,
  exportAsImage,
  captureCanvasPreview,
  type ExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from "@/lib/exportUtils";
import {
  serializeProject,
  validateGrapkenFile,
  downloadGrapken,
  type GrapkenFile,
} from "@/lib/grapkenFormat";

type Format = "markdown" | "pdf" | "image" | "project-file";

interface ExportModalProps {
  widgets: Widget[];
  projectName: string;
  projectMeta: ProjectMeta;
  canvasRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onImportAsNew: (fileData: GrapkenFile) => void;
  onImportReplace: (fileData: GrapkenFile) => void;
}

const FORMAT_TABS: { id: Format; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "markdown",
    label: "Markdown",
    icon: <FileText size={16} />,
    desc: "Structured GDD in Markdown",
  },
  {
    id: "pdf",
    label: "PDF",
    icon: <Printer size={16} />,
    desc: "Print view / PDF",
  },
  {
    id: "image",
    label: "Image",
    icon: <FileImage size={16} />,
    desc: "Canvas snapshot",
  },
  {
    id: "project-file",
    label: "Project File",
    icon: <Archive size={16} />,
    desc: "Export or import .grapken project file",
  },
];

/**
 * Apply a single toggle change as a targeted text transformation on the current
 * markdown, preserving any manual edits the user has made.
 * Falls back to full regeneration only when the transformation requires widget
 * data that cannot be inferred from the text alone (e.g. adding tasks back).
 */
function applyToggleToMarkdown(
  markdown: string,
  key: keyof ExportOptions,
  newOptions: ExportOptions,
  widgets: Widget[],
  projectName: string,
): string {
  switch (key) {

    case 'showStats': {
      if (!newOptions.showStats) {
        // Remove the Project Summary section
        return markdown.replace(/\n\n## Project Summary\n\n(?:\|[^\n]+\n)+\n---/m, '\n\n---');
      }
      // Re-adding stats requires full widget data — regenerate
      return generateGDDMarkdown(widgets, projectName, newOptions);
    }

    case 'showContextIcons': {
      let result = markdown;
      if (!newOptions.showContextIcons) {
        for (const ctx of CONTEXTS) {
          result = result.replaceAll(`## ${ctx.icon} ${ctx.label}`, `## ${ctx.label}`);
        }
      } else {
        for (const ctx of CONTEXTS) {
          if (!result.includes(`## ${ctx.icon} ${ctx.label}`)) {
            result = result.replaceAll(`## ${ctx.label}`, `## ${ctx.icon} ${ctx.label}`);
          }
        }
      }
      return result;
    }

    case 'showExportDate': {
      if (!newOptions.showExportDate) {
        return markdown.replace(/\n> \*Exported .+? · Grapken\*\n/m, '\n');
      }
      if (!markdown.includes('· Grapken*')) {
        const now = new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        return markdown.replace(
          /^(# [^\n]+\n\n)(---)/m,
          `$1> *Exported ${now} · Grapken*\n\n$2`,
        );
      }
      return markdown;
    }

    case 'showWidgetType': {
      if (!newOptions.showWidgetType) {
        return markdown.replace(/\n\*(?:Note|Container|Image|Variables)\*/g, '');
      }
      // Re-add badges by matching headings to widget labels
      const lines = markdown.split('\n');
      const result: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        result.push(lines[i]);
        const m = lines[i].match(/^(#{3,})\s+(.+)/);
        if (m) {
          const label = m[2].replace(/ \*\(Template\)\*$/, '').trim();
          const widget = widgets.find(w => !w.isRoot && w.label === label);
          if (widget) {
            const typeLabel = widget.type === 'markdown' ? 'Note'
              : widget.type === 'image' ? 'Image'
              : widget.type === 'variables' ? 'Variables'
              : 'Container';
            if ((lines[i + 1] ?? '') !== `*${typeLabel}*`) {
              result.push(`*${typeLabel}*`);
            }
          }
        }
      }
      return result.join('\n');
    }

    case 'includeTasks': {
      if (!newOptions.includeTasks) {
        return markdown.replace(/\n\n\*\*Tasks\*\* \(\d+\/\d+ done\)\n(?:- .+\n?)*/g, '');
      }
      // Re-inserting tasks requires full widget data — regenerate
      return generateGDDMarkdown(widgets, projectName, newOptions);
    }

    default:
      // estimateDisplay or future keys: full regeneration
      return generateGDDMarkdown(widgets, projectName, newOptions);
  }
}

export function ExportModal({ widgets, projectName, projectMeta, canvasRef, onClose, onImportAsNew, onImportReplace }: ExportModalProps) {
  const [format, setFormat] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [editableMarkdown, setEditableMarkdown] = useState(() =>
    generateGDDMarkdown(widgets, projectName, DEFAULT_EXPORT_OPTIONS)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<GrapkenFile | null>(null);

  const setOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    const newOptions = { ...options, [key]: value };
    // Technical mode: auto-disable context icons (no emojis in formal docs)
    if (key === 'estimateDisplay' && value === 'technical') {
      newOptions.showContextIcons = false;
    }
    // Some keys can't be applied as text transforms and require full regeneration
    const forceRegen = key === 'estimateDisplay' || (key === 'includeTasks' && value === true) || (key === 'showStats' && value === true) || (key === 'showScaleLegend' && value === true) || (key === 'showAllTasks' && value === true);
    if (isDirty && !forceRegen) {
      setEditableMarkdown(prev => applyToggleToMarkdown(prev, key, newOptions, widgets, projectName));
    } else {
      setEditableMarkdown(generateGDDMarkdown(widgets, projectName, newOptions));
      if (isDirty) setIsDirty(false);
    }
    setOptions(newOptions);
  };

  const rootWidget = widgets.find(w => w.isRoot);
  const hasEstimation =
    !!rootWidget?.projectSettings?.estimationMode &&
    rootWidget.projectSettings.estimationMode !== 'hours';

  const htmlPreview = marked.parse(editableMarkdown, { breaks: true, gfm: true }) as string;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Pre-capture image when switching to image tab
  useEffect(() => {
    if (format === "image" && !imagePreview && !isCapturing && canvasRef.current) {
      handleCapture();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  const handleCapture = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureCanvasPreview(canvasRef.current, projectName);
      setImagePreview(dataUrl);
    } finally {
      setIsCapturing(false);
    }
  }, [canvasRef, projectName]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editableMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (format === "markdown") {
      downloadMarkdown(editableMarkdown, projectName);
    } else if (format === "pdf") {
      exportAsPDF(htmlPreview, projectName);
    } else if (format === "image" && canvasRef.current) {
      exportAsImage(canvasRef.current, projectName);
    } else if (format === "project-file") {
      downloadGrapken(serializeProject(projectMeta, widgets), projectName);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    setPendingImport(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const parsed = validateGrapkenFile(raw);
        if (!parsed) {
          setImportError("Invalid .grapken file — the format is unrecognized or corrupted.");
          return;
        }
        setPendingImport(parsed);
      } catch {
        setImportError("Could not parse file — make sure it is a valid .grapken file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="export-modal-root fixed inset-0 z-[100] flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           style={{ height: "min(82vh, 700px)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Export project</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{projectName}</p>
          </div>

          {/* Format tabs */}
          <div className="flex items-center gap-1 bg-neutral-800 rounded-xl p-1">
            {FORMAT_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFormat(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  format === tab.id
                    ? "bg-indigo-600 text-white shadow"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
                title={tab.desc}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Settings ── */}
        {(format === "markdown" || format === "pdf") && (
          <div className="shrink-0 flex items-center gap-3 px-6 py-2 border-b border-neutral-800 bg-neutral-950/40">
            <span className="text-[11px] text-neutral-500 font-medium uppercase tracking-wide">Settings</span>

            {/* Boolean toggle chips */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: 'showStats',        label: 'Stats'         },
                  { key: 'showExportDate',   label: 'Export date'   },
                  { key: 'showContextIcons', label: 'Section icons' },
                  { key: 'showWidgetType',   label: 'Widget types'  },
                  { key: 'includeTasks',     label: 'Tasks'         },
                  { key: 'showScaleLegend',  label: 'Scale'         },
                  { key: 'showAllTasks',     label: 'Task list'     },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setOption(key, !options[key])}
                  className={`px-2.5 py-1 rounded-md border text-[10px] font-medium transition-colors ${
                    options[key]
                      ? 'border-neutral-600 bg-neutral-700 text-white'
                      : 'border-neutral-800 text-neutral-500 hover:text-neutral-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Right-side controls: estimations + reset */}
            {(hasEstimation || isDirty) && (
              <div className="flex items-center gap-3 ml-auto">
                {/* Estimations — only when project uses custom estimation */}
                {hasEstimation && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      Estimations
                      {isDirty && <span className="text-amber-500 text-[9px] font-medium">· resets edits</span>}
                    </span>
                    <div className="flex rounded-md overflow-hidden border border-neutral-700 text-[10px] font-medium">
                      <button
                        onClick={() => setOption('estimateDisplay', 'visual')}
                        className={`px-2.5 py-1 transition-colors ${options.estimateDisplay === 'visual' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        Visual (emojis)
                      </button>
                      <button
                        onClick={() => setOption('estimateDisplay', 'technical')}
                        className={`px-2.5 py-1 transition-colors ${options.estimateDisplay === 'technical' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        Technical
                      </button>
                    </div>
                  </div>
                )}

                {/* Reset — only when user has manually edited the markdown */}
                {isDirty && (
                  <button
                    onClick={() => {
                      setEditableMarkdown(generateGDDMarkdown(widgets, projectName, options));
                      setIsDirty(false);
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 border border-amber-800 hover:border-amber-600 px-2.5 py-1 rounded-md transition-colors"
                    title="Regenerate from widgets, discarding your edits"
                  >
                    Reset to generated
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Preview ── */}
        <div className="flex-1 overflow-hidden relative">

          {/* Markdown & PDF preview */}
          {(format === "markdown" || format === "pdf") && (
            <div className="h-full overflow-y-auto px-8 py-6 flex flex-col gap-3">
              {format === "markdown" ? (
                <>
                  {/* Editable markdown textarea */}
                  <textarea
                    className="flex-1 w-full min-h-0 resize-none bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-neutral-300 font-mono leading-relaxed p-4 focus:outline-none focus:border-indigo-600 transition-colors"
                    style={{ minHeight: "calc(100% - 48px)" }}
                    value={editableMarkdown}
                    onChange={e => { setEditableMarkdown(e.target.value); setIsDirty(true); }}
                    spellCheck={false}
                  />
                  {/* Info note */}
                  <p className="shrink-0 text-[11px] text-neutral-500 flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-3.5 rounded-full border border-neutral-600 text-center leading-[13px] text-neutral-500 font-bold text-[9px]">i</span>
                    Editing this markdown <span className="text-neutral-400 font-medium">does not affect your widgets</span> — changes apply only to this export. The PDF view will also reflect your edits.
                  </p>
                </>
              ) : (
                // Rendered HTML preview
                <article
                  className="prose-gdd max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              )}
            </div>
          )}

          {/* Image preview */}
          {format === "image" && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
              {isCapturing && (
                <div className="flex flex-col items-center gap-3 text-neutral-400">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm">Capturing canvas...</span>
                </div>
              )}
              {!isCapturing && imagePreview && (
                <div className="w-full h-full overflow-hidden rounded-xl border border-neutral-700 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Canvas preview"
                    className="w-full h-full object-contain bg-neutral-950"
                  />
                </div>
              )}
              {!isCapturing && !imagePreview && (
                <div className="text-neutral-500 text-sm">Could not capture canvas</div>
              )}
            </div>
          )}

          {/* Project File — Export + Import */}
          {format === "project-file" && (
            <div className="h-full overflow-y-auto px-8 py-6 flex flex-col gap-5">

              {/* Export section */}
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">Export project</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Saves the full canvas state — all widgets, tasks, connections, templates, and settings —
                  into a single <code className="text-indigo-400 bg-neutral-900 px-1 rounded">.grapken</code> file.
                  Use the <strong className="text-neutral-300">Export .grapken</strong> button below to download.
                </p>
                <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 font-mono text-[11px] text-neutral-400">
                  <span className="text-neutral-500">{'// .grapken JSON structure'}</span>{"\n"}
                  {"{ "}<span className="text-indigo-300">"version"</span>{": "}<span className="text-green-300">"1"</span>
                  {", "}<span className="text-indigo-300">"project"</span>{": { name, createdAt, updatedAt }"}
                  {", "}<span className="text-indigo-300">"widgets"</span>{": "}<span className="text-amber-300">Widget[]</span>{" }"}
                </div>
              </div>

              {/* Import section */}
              <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">Import project</h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Load a <code className="text-indigo-400 bg-neutral-900 px-1 rounded">.grapken</code> file from disk.
                  Add it as a new project or replace the current project&apos;s contents.
                </p>

                <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-neutral-600 hover:border-indigo-500 cursor-pointer transition-colors text-neutral-400 hover:text-neutral-200 text-sm">
                  <Archive size={16} />
                  <span>{pendingImport ? `Loaded: "${pendingImport.project.name}"` : "Select .grapken file…"}</span>
                  <input type="file" accept=".grapken" className="sr-only" onChange={handleFileSelect} />
                </label>

                {importError && (
                  <p className="mt-2 text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
                    {importError}
                  </p>
                )}
                {importSuccess && (
                  <p className="mt-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 rounded-lg px-3 py-2">
                    {importSuccess}
                  </p>
                )}

                {pendingImport && !importSuccess && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[11px] text-neutral-400">
                      <span className="font-medium text-neutral-200">{pendingImport.widgets.length} widgets</span> from project{" "}
                      <span className="font-medium text-neutral-200">&quot;{pendingImport.project.name}&quot;</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onImportAsNew(pendingImport);
                          setImportSuccess(`Project "${pendingImport.project.name}" added.`);
                          setPendingImport(null);
                          setTimeout(onClose, 1200);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition-colors"
                      >
                        Add as new project
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm(
                            `Replace current project "${projectName}" with "${pendingImport.project.name}"?\n\nThis cannot be undone.`
                          )) return;
                          onImportReplace(pendingImport);
                          setImportSuccess(`Replaced with "${pendingImport.project.name}".`);
                          setPendingImport(null);
                          setTimeout(onClose, 1200);
                        }}
                        className="flex-1 px-3 py-2 rounded-lg text-sm bg-red-900/60 hover:bg-red-900 border border-red-700 text-red-200 transition-colors"
                      >
                        Replace current
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer / Actions ── */}
        <div className="shrink-0 px-6 py-4 border-t border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/80">

          {/* Format hint */}
          <p className="text-xs text-neutral-500">
            {format === "markdown" && "Download the GDD as a .md file"}
            {format === "pdf" && "Opens the browser's print dialog. Choose «Save as PDF»."}
            {format === "image" && "Captures the current canvas state as PNG."}
            {format === "project-file" && "Export the full canvas as a portable .grapken file, or import one above."}
          </p>

          <div className="flex items-center gap-2">
            {/* Copy (only for markdown) */}
            {format === "markdown" && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all"
              >
                {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}

            {/* Recapture (only for image) */}
            {format === "image" && (
              <button
                onClick={handleCapture}
                disabled={isCapturing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 transition-all"
              >
                {isCapturing
                  ? <Loader2 size={15} className="animate-spin" />
                  : <FileImage size={15} />}
                Recapture
              </button>
            )}

            {/* Primary action */}
            <button
              onClick={handleDownload}
              disabled={format === "image" && (isCapturing || !imagePreview)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all active:scale-95"
            >
              <Download size={15} />
              {format === "markdown" && "Download .md"}
              {format === "pdf" && "Open PDF"}
              {format === "image" && "Download PNG"}
              {format === "project-file" && "Export .grapken"}
            </button>
          </div>
        </div>
      </div>

      {/* Inline prose styles (minimal, no Tailwind Typography plugin needed) */}
      <style>{`
        .prose-gdd h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 6px; color: #f1f5f9; }
        .prose-gdd h2 { font-size: 1.2rem; font-weight: 600; margin-top: 1.75rem; margin-bottom: 6px; color: #e2e8f0; border-bottom: 1px solid #334155; padding-bottom: 4px; }
        .prose-gdd h3 { font-size: 1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 4px; color: #cbd5e1; }
        .prose-gdd h4, .prose-gdd h5, .prose-gdd h6 { font-size: 0.875rem; font-weight: 500; margin-top: 1rem; color: #94a3b8; }
        .prose-gdd p { margin-bottom: 0.6rem; color: #94a3b8; font-size: 0.875rem; line-height: 1.6; }
        .prose-gdd blockquote { border-left: 3px solid #4f46e5; padding-left: 12px; color: #64748b; font-style: italic; margin: 0.75rem 0; }
        .prose-gdd hr { border: none; border-top: 1px solid #1e293b; margin: 1.25rem 0; }
        .prose-gdd table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; font-size: 0.8rem; }
        .prose-gdd th, .prose-gdd td { border: 1px solid #1e293b; padding: 5px 10px; text-align: left; color: #94a3b8; }
        .prose-gdd th { background: #0f172a; color: #e2e8f0; font-weight: 600; }
        .prose-gdd code { background: #1e293b; padding: 1px 5px; border-radius: 3px; font-size: 0.8rem; color: #a5b4fc; }
        .prose-gdd pre { background: #0f172a; border-radius: 6px; padding: 10px; overflow-x: auto; margin: 0.5rem 0; }
        .prose-gdd img { max-width: 100%; border-radius: 4px; }
        .prose-gdd em { color: #4f46e5; font-style: normal; font-size: 0.75rem; }
        .prose-gdd strong { color: #e2e8f0; }
        .prose-gdd ul, .prose-gdd ol { padding-left: 1.25rem; margin-bottom: 0.5rem; color: #94a3b8; font-size: 0.875rem; }
        .prose-gdd li { margin-bottom: 2px; }
      `}</style>
    </div>
  );
}
