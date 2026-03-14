import type { Widget, LocalOverrides, InstanceMode } from "@/types";

// Get all template widgets
export const getTemplates = (widgets: Widget[]): Widget[] => {
  return widgets.filter(w => w.isTemplate === true);
};

// Get all instances of a specific template
export const getTemplateInstances = (widgets: Widget[], templateId: string): Widget[] => {
  return widgets.filter(w => w.templateRef === templateId);
};

// Resolve the effective value for a property, considering inheritance
export const resolvePropertyValue = <T,>(
  widget: Widget,
  property: keyof LocalOverrides,
  template?: Widget
): T => {
  if (widget.isTemplate) {
    return (widget as any)[property] as T;
  }
  if (!widget.templateRef || !template) {
    return (widget as any)[property] as T;
  }

  const mode = widget.instanceMode || 'override';

  if (mode === 'strict') {
    return (template as any)[property] as T;
  }

  if (mode === 'override') {
    if (widget.localOverrides && property in widget.localOverrides) {
      return widget.localOverrides[property] as T;
    }
    return (template as any)[property] as T;
  }

  if (mode === 'additive') {
    const localValue = widget.localOverrides?.[property];
    const templateValue = (template as any)[property];

    if (
      property === 'content' &&
      typeof templateValue === 'object' &&
      typeof localValue === 'object' &&
      templateValue !== null &&
      localValue !== null &&
      !Array.isArray(templateValue) &&
      !Array.isArray(localValue)
    ) {
      return { ...templateValue, ...localValue } as T;
    }

    if (localValue !== undefined) {
      return localValue as T;
    }
    return templateValue as T;
  }

  return (widget as any)[property] as T;
};

// Get the resolved (effective) widget state
// Note: Transform properties (x, y, width, height) and connections (children) are NOT inherited
export const getResolvedWidget = (widget: Widget, widgets: Widget[]): Widget => {
  if (!widget.templateRef) {
    return widget;
  }

  const template = widgets.find(w => w.id === widget.templateRef);
  if (!template) {
    return widget;
  }

  return {
    ...widget,
    label: resolvePropertyValue<string>(widget, 'label', template),
    content: resolvePropertyValue<typeof widget.content>(widget, 'content', template),
    context: resolvePropertyValue<Widget['context']>(widget, 'context', template),
    branchColor: resolvePropertyValue<string>(widget, 'branchColor', template),
    // x, y, width, height, children are NOT inherited
  };
};

// Check if a property has been overridden locally
export const isPropertyOverridden = (widget: Widget, property: keyof LocalOverrides): boolean => {
  return !!(widget.localOverrides && property in widget.localOverrides);
};

// Create a new instance of a template
// Note: Transform properties (x, y, width, height) and connections (children) are NOT copied
export const createTemplateInstance = (
  template: Widget,
  id: string,
  parentId: string,
  overrides?: Partial<LocalOverrides>
): Widget => {
  const defaultWidth = template.type === 'container' ? 400 : 300;
  const defaultHeight =
    template.type === 'variables' ? 250 : template.type === 'container' ? 300 : 200;

  return {
    type: template.type,
    label: template.label,
    content: template.content,
    context: template.context,
    branchColor: template.branchColor,
    rootId: template.rootId,
    id,
    parentId,
    isTemplate: false,
    templateRef: template.id,
    instanceMode: 'override' as InstanceMode,
    localOverrides: overrides || {},
    children: [],
    createdAt: Date.now(),
    x: (overrides as any)?.x ?? 100,
    y: (overrides as any)?.y ?? 100,
    width: defaultWidth,
    height: defaultHeight,
  };
};

// Propagate changes from template to all instances
// Note: Transform and connection properties are NOT propagated
export const propagateTemplateChanges = (
  widgets: Widget[],
  templateId: string,
  changes: Partial<Widget>
): Widget[] => {
  return widgets.map(widget => {
    if (widget.id === templateId || widget.templateRef !== templateId) {
      return widget;
    }

    const mode = widget.instanceMode || 'override';

    const nonInheritedProps = [
      'id', 'parentId', 'templateRef', 'instanceMode', 'localOverrides',
      'children', 'createdAt', 'x', 'y', 'width', 'height',
    ];

    if (mode === 'strict') {
      const filteredChanges = { ...changes };
      for (const prop of nonInheritedProps) {
        delete (filteredChanges as any)[prop];
      }
      return {
        ...widget,
        ...filteredChanges,
        id: widget.id,
        parentId: widget.parentId,
        templateRef: widget.templateRef,
        instanceMode: widget.instanceMode,
        localOverrides: widget.localOverrides,
        children: widget.children,
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
      };
    }

    if (mode === 'override' || mode === 'additive') {
      const updatedWidget = { ...widget };
      for (const key of Object.keys(changes) as (keyof Widget)[]) {
        if (nonInheritedProps.includes(key)) continue;
        if (widget.localOverrides && key in widget.localOverrides) continue;
        (updatedWidget as any)[key] = changes[key];
      }
      return updatedWidget;
    }

    return widget;
  });
};
