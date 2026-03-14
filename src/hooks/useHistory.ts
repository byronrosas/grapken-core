import { useWidgetStore } from "@/store/useWidgetStore";

export function useHistory() {
  const undo = useWidgetStore(s => s.undo);
  const redo = useWidgetStore(s => s.redo);
  const canUndo = useWidgetStore(s => s.historyStep > 0);
  const canRedo = useWidgetStore(s => s.historyStep < s.history.length - 1);
  return { undo, redo, canUndo, canRedo };
}
