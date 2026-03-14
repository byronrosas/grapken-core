import React from "react";
import { FileText, Image as ImageIcon, Settings, Folder } from "lucide-react";
import type { Widget, ContextType, ImageContent } from "@/types";
import { CONTEXTS } from "@/constants";

export const hasWidgetContent = (widget: Widget): boolean => {
  if (!widget.content) return false;

  switch (widget.type) {
    case 'markdown':
      return typeof widget.content === 'string' && widget.content.trim().length > 0;
    case 'image': {
      const imgContent = widget.content as ImageContent;
      return !!imgContent.url || !!imgContent.description;
    }
    case 'variables': {
      const varsContent = widget.content as Record<string, any>;
      return Object.keys(varsContent).length > 0;
    }
    case 'container':
      return false;
    default:
      return false;
  }
};

export const getDefaultContent = (type: Widget['type']): Widget['content'] => {
  switch (type) {
    case 'markdown':   return '';
    case 'image':      return { url: '', description: '' };
    case 'variables':  return {};
    case 'container':  return null;
    default:           return null;
  }
};

// Module-level counter — persists across calls for the browser tab lifetime
let widgetCounter = 0;

export const generateId = (): string => {
  widgetCounter++;
  return `widget-${Date.now()}-${widgetCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateTimestamp = (): number => Date.now();

export const createRootWidget = (): Widget => {
  const id = `root-${Date.now()}`;
  return {
    id,
    type: 'markdown',
    label: 'My Game Project',
    content:
      '# My Game Project\n\nWelcome to your Game Design Document!\n\nStart by adding child widgets to organize your game design.',
    parentId: null,
    rootId: null,
    context: 'general',
    children: [],
    branchColor: '#8b5cf6',
    createdAt: Date.now(),
    isRoot: true,
    x: 400,
    y: 200,
    width: 350,
    height: 250,
  };
};

export const getContextIcon = (context: ContextType): string => {
  return CONTEXTS.find(c => c.id === context)?.icon || '📝';
};

export const getWidgetIcon = (type: Widget['type']): React.ReactElement => {
  switch (type) {
    case 'markdown':   return React.createElement(FileText,  { size: 16 });
    case 'image':      return React.createElement(ImageIcon, { size: 16 });
    case 'variables':  return React.createElement(Settings,  { size: 16 });
    case 'container':  return React.createElement(Folder,    { size: 16 });
  }
};
