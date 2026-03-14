import { useEffect } from "react";
import { useWidgetStore } from "@/store/useWidgetStore";

interface KeyboardShortcutsOptions {
  onCloseContextMenu?: () => void;
  clipboard: string[];
  setClipboard: (ids: string[]) => void;
}

export function useKeyboardShortcuts({
  onCloseContextMenu,
  clipboard,
  setClipboard,
}: KeyboardShortcutsOptions) {
  const undo = useWidgetStore(s => s.undo);
  const redo = useWidgetStore(s => s.redo);
  const clearSelection = useWidgetStore(s => s.clearSelection);
  const deleteSelectedWidgets = useWidgetStore(s => s.deleteSelectedWidgets);
  const duplicateWidgets = useWidgetStore(s => s.duplicateWidgets);
  const selectedWidgetIds = useWidgetStore(s => s.selectedWidgetIds);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't fire when typing in inputs/textareas
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Escape — deselect & close context menu
      if (e.key === 'Escape') {
        clearSelection();
        onCloseContextMenu?.();
        return;
      }

      // Delete / Backspace — delete selected widgets
      if ((e.key === 'Delete' || e.key === 'Backspace') && !ctrl) {
        e.preventDefault();
        deleteSelectedWidgets();
        return;
      }

      // Ctrl+Z — undo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if ((ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+C — copy (save ids to clipboard state)
      if (ctrl && e.key === 'c') {
        if (selectedWidgetIds.length > 0) {
          setClipboard([...selectedWidgetIds]);
        }
        return;
      }

      // Ctrl+V — paste (duplicate clipboard widgets)
      if (ctrl && e.key === 'v') {
        if (clipboard.length > 0) {
          e.preventDefault();
          duplicateWidgets(clipboard);
        }
        return;
      }

      // Ctrl+D — duplicate in place
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedWidgetIds.length > 0) {
          duplicateWidgets([...selectedWidgetIds]);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, redo, clearSelection, deleteSelectedWidgets, duplicateWidgets,
    selectedWidgetIds, clipboard, setClipboard, onCloseContextMenu,
  ]);
}
