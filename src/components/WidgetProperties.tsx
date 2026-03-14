import { X } from "lucide-react";
import type { Widget, ImageContent, InstanceMode, EstimationMode, ProjectSettings } from "@/types";
import { CONTEXTS, WIDGET_TYPES } from "@/constants";
import { hasWidgetContent, getDefaultContent } from "@/lib/widgetUtils";

interface WidgetPropertiesProps {
  widget: Widget;
  updateWidget: (updates: Partial<Widget>) => void;
  siblings: Widget[];
  setParentContainer: (parentId: string | null) => void;
  removeChildFromContainer: (childId: string) => void;
}

export function WidgetProperties({
  widget,
  updateWidget,
  siblings,
  setParentContainer,
  removeChildFromContainer,
}: WidgetPropertiesProps) {

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateWidget({ content: e.target.value });
  };

  const handleVariableChange = (key: string, val: string | number) => {
    const current = widget.content as Record<string, any> || {};
    updateWidget({ content: { ...current, [key]: val } });
  };

  const addVariable = () => {
    const current = widget.content as Record<string, any> || {};
    updateWidget({ content: { ...current, [`new_var_${Date.now()}`]: 0 } });
  };

  const removeVariable = (key: string) => {
    const current = widget.content as Record<string, any> || {};
    const newVars = { ...current };
    delete newVars[key];
    updateWidget({ content: newVars });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-sm font-bold text-neutral-300 mb-1">
          {widget.type === 'container' ? 'Group' : 'Widget'} Properties
        </h2>
        <p className="text-xs text-neutral-500">ID: {widget.id}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Label */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-neutral-400 uppercase">Label</label>
          <input
            type="text"
            value={widget.label}
            onChange={e => updateWidget({ label: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Widget Title"
          />
        </div>

        {/* Widget Type */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-neutral-400 uppercase">Widget Type</label>
          <div className="grid grid-cols-2 gap-2">
            {WIDGET_TYPES.map(wt => (
              <button
                key={wt.type}
                onClick={() => {
                  const hasContent = hasWidgetContent(widget);
                  if (hasContent && widget.type !== wt.type) {
                    const confirmed = window.confirm(
                      'Changing widget type will clear current content. Continue?'
                    );
                    if (!confirmed) return;
                  }
                  updateWidget({ type: wt.type, content: getDefaultContent(wt.type) });
                }}
                className={`text-xs flex items-center justify-center gap-2 p-2 rounded-md border transition-all ${
                  widget.type === wt.type
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                {wt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-neutral-400 uppercase">Context</label>
          <div className="grid grid-cols-2 gap-2">
            {CONTEXTS.map(ctx => (
              <button
                key={ctx.id}
                onClick={() => updateWidget({ context: ctx.id, branchColor: ctx.color })}
                className={`text-xs flex items-center justify-center gap-2 p-2 rounded-md border transition-all ${
                  widget.context === ctx.id
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                }`}
              >
                <span>{ctx.icon}</span>
                {ctx.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-neutral-400 uppercase">Size (Visual)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={widget.width}
              onChange={e => updateWidget({ width: Number(e.target.value) })}
              className="w-1/2 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={widget.height}
              onChange={e => updateWidget({ height: Number(e.target.value) })}
              className="w-1/2 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Markdown content */}
        {widget.type === 'markdown' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-neutral-400 uppercase">Markdown Content</label>
            <textarea
              value={String(widget.content || '')}
              onChange={handleContentChange}
              className="w-full h-48 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-mono text-xs"
              placeholder="# Heading&#10;&#10;- List Item&#10;- List Item"
            />
          </div>
        )}

        {/* Image content */}
        {widget.type === 'image' && (() => {
          const imageContent = (widget.content as ImageContent) || { url: '', description: '' };
          return (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase">Image URL</label>
                <input
                  type="text"
                  value={imageContent.url || ''}
                  onChange={e => updateWidget({ content: { ...imageContent, url: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mt-1"
                  placeholder="https://..."
                />
              </div>
              {imageContent.url && (
                <div className="rounded-md overflow-hidden border border-neutral-800 bg-black">
                  <img
                    src={imageContent.url}
                    alt={imageContent.description || 'Preview'}
                    className="w-full h-32 object-cover"
                    width={300}
                    height={128}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-neutral-400 uppercase">Description</label>
                <textarea
                  value={imageContent.description || ''}
                  onChange={e => updateWidget({ content: { ...imageContent, description: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mt-1 resize-none"
                  placeholder="Describe this image..."
                  rows={3}
                />
              </div>
            </div>
          );
        })()}

        {/* Variables content */}
        {widget.type === 'variables' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-neutral-400 uppercase">Variables</label>
              <button onClick={addVariable} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                + Add
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(widget.content as Record<string, any> || {}).map(([key, value], index) => (
                <div key={`prop-var-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={e => {
                      const current = widget.content as Record<string, any> || {};
                      const entries = Object.entries(current);
                      const newEntries = entries.map(([k, v]) => k === key ? [e.target.value, v] : [k, v]);
                      updateWidget({ content: Object.fromEntries(newEntries) });
                    }}
                    className="bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1 text-xs flex-1 font-mono"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={e =>
                      handleVariableChange(
                        key,
                        isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)
                      )
                    }
                    className="bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1 text-xs font-mono w-16"
                  />
                  <button
                    onClick={() => removeVariable(key)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parent container */}
        {widget.type !== 'container' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-neutral-400 uppercase">Parent Container</label>
            <select
              value={widget.parentId || ''}
              onChange={e => setParentContainer(e.target.value || null)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm"
            >
              <option value="">None (Root)</option>
              {siblings
                .filter(s => s.id !== widget.id && s.type === 'container')
                .map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
            </select>
          </div>
        )}

        {/* Nested items (container) */}
        {widget.type === 'container' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-neutral-400 uppercase">Nested Items</label>
            <div className="space-y-1">
              {widget.children.length === 0 ? (
                <span className="text-xs text-neutral-500 italic">No widgets nested yet</span>
              ) : (
                widget.children.map(childId => {
                  const child = siblings.find(s => s.id === childId);
                  if (!child) return null;
                  return (
                    <div
                      key={childId}
                      className="text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 flex justify-between"
                    >
                      <span>{child.label}</span>
                      <button
                        onClick={() => removeChildFromContainer(childId)}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Template System */}
        {!widget.isRoot && (
          <div className="space-y-3 border-t border-neutral-800 pt-4">
            <label className="text-xs font-medium text-neutral-400 uppercase">Template System</label>

            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2">
              <span className="text-xs text-neutral-300">Mark as Template</span>
              <button
                onClick={() => updateWidget({ isTemplate: !widget.isTemplate })}
                className={`w-10 h-5 rounded-full transition-colors ${
                  widget.isTemplate ? 'bg-amber-500' : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    widget.isTemplate ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {widget.isTemplate && (
              <p className="text-[10px] text-amber-400/70">
                ⚡ This widget is now a master template. Changes will propagate to all instances.
              </p>
            )}

            {!widget.isTemplate && (
              <div className="space-y-2">
                <label className="text-xs text-neutral-500">Inherit from Template</label>
                <select
                  value={widget.templateRef || ''}
                  onChange={e => {
                    const templateId = e.target.value || undefined;
                    if (templateId) {
                      const template = siblings.find(s => s.id === templateId);
                      if (template) {
                        updateWidget({
                          templateRef: templateId,
                          instanceMode: 'override',
                          type: template.type,
                        });
                      }
                    } else {
                      updateWidget({
                        templateRef: undefined,
                        instanceMode: undefined,
                        localOverrides: undefined,
                      });
                    }
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">None (Independent)</option>
                  {siblings
                    .filter(s => s.isTemplate && s.id !== widget.id && s.type === widget.type)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.type})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {widget.templateRef && (
              <div className="space-y-2">
                <label className="text-xs text-neutral-500">Instance Mode</label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { mode: 'strict'   as InstanceMode, label: 'Strict',    icon: '🔒', desc: 'Locked to template'   },
                      { mode: 'override' as InstanceMode, label: 'Override',  icon: '✏️', desc: 'Local changes allowed' },
                      { mode: 'additive' as InstanceMode, label: 'Additive',  icon: '➕', desc: 'Merge with template'   },
                    ] as const
                  ).map(({ mode, label, icon, desc }) => (
                    <button
                      key={mode}
                      onClick={() => updateWidget({ instanceMode: mode })}
                      className={`text-[10px] flex flex-col items-center gap-1 p-2 rounded-md border transition-all ${
                        widget.instanceMode === mode
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700'
                      }`}
                      title={desc}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {widget.localOverrides && Object.keys(widget.localOverrides).length > 0 && (
                  <div className="mt-2 p-2 bg-neutral-950 border border-neutral-800 rounded-md">
                    <p className="text-[10px] text-neutral-500 mb-1">Local Overrides:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(widget.localOverrides).map(key => (
                        <span
                          key={key}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Project Settings — only for root widget */}
        {widget.isRoot && (
          <div className="space-y-3 border-t border-neutral-800 pt-4">
            <label className="text-xs font-medium text-neutral-400 uppercase">Project Settings</label>

            <div className="space-y-2">
              <label className="text-xs text-neutral-500">Estimation Mode</label>
              <select
                value={widget.projectSettings?.estimationMode ?? ''}
                onChange={e => {
                  const mode = (e.target.value || undefined) as EstimationMode | undefined;
                  const current = widget.projectSettings ?? { allowRealTime: false };
                  updateWidget({ projectSettings: { ...current, estimationMode: mode } });
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="number">Numbers (1 · 2 · 3 · 5 · 8 · 13)</option>
                <option value="t-shirt">T-Shirt (XS → XXL)</option>
                <option value="coffee">Coffee (☕ → ☕×13)</option>
                <option value="emoji">Emoji (😊 → 🚨)</option>
                <option value="hours">Hours (free)</option>
              </select>
            </div>

            {widget.projectSettings?.estimationMode && (
              <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2">
                <div>
                  <span className="text-xs text-neutral-300">Real Time Tracking</span>
                  <p className="text-[10px] text-neutral-600 mt-0.5">Log actual hours on completed tasks</p>
                </div>
                <button
                  onClick={() => {
                    const current = widget.projectSettings ?? { allowRealTime: false };
                    updateWidget({ projectSettings: { ...current, allowRealTime: !current.allowRealTime } });
                  }}
                  className={`flex-shrink-0 w-10 h-5 rounded-full transition-colors ${
                    widget.projectSettings?.allowRealTime ? 'bg-indigo-500' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      widget.projectSettings?.allowRealTime ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            )}
            {widget.projectSettings?.estimationMode && (
              <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2">
                <div>
                  <span className="text-xs text-neutral-300">Weekly pace</span>
                  <p className="text-[10px] text-neutral-600 mt-0.5">Hours/week for forecast</p>
                </div>
                <input
                  type="number"
                  min={1} max={80} step={1}
                  value={widget.projectSettings?.weeklyPace ?? 20}
                  onChange={e => {
                    const v = Math.max(1, Math.min(80, parseInt(e.target.value) || 20));
                    const current = widget.projectSettings ?? { allowRealTime: false };
                    updateWidget({ projectSettings: { ...current, weeklyPace: v } });
                  }}
                  className="w-14 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 text-right outline-none focus:border-indigo-500/60"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
