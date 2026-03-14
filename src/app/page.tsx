import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { GripVertical } from "lucide-react";
import type { PortSide, ContextType } from "@/types";
import { useWidgetStore } from "@/store/useWidgetStore";
import { useCanvas } from "@/hooks/useCanvas";
import { useConnections } from "@/hooks/useConnections";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getTemplates } from "@/lib/templateSystem";
import { createRootWidget } from "@/lib/widgetUtils";
import { DEFAULT_CANVAS_SIZE, CANVAS_EDGE_BUFFER, CANVAS_INCREMENT, WIDGET_TYPES } from "@/constants";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConnectionLayer } from "@/components/ConnectionLayer";
import { MiniMap } from "@/components/MiniMap";
import { WidgetCard } from "@/components/WidgetCard";
import { WidgetProperties } from "@/components/WidgetProperties";
import { ContextMenu } from "@/components/ContextMenu";
import { ExportModal } from "@/components/ExportModal";
import { PortMenu } from "@/components/PortMenu";
import { CanvasCreateMenu } from "@/components/CanvasCreateMenu";
import { WidgetTaskPanel } from "@/components/WidgetTaskPanel";

export default function GameDesignTool() {
  // ── Local UI state (not persisted) ────────────────────────────────────────
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMinimapVisible, setIsMinimapVisible] = useState(true);
  const [clipboard, setClipboard] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ widgetId: string; x: number; y: number } | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [lastUsedContext, setLastUsedContext] = useState<ContextType>('general');
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [canvasCreateMenu, setCanvasCreateMenu] = useState<{ canvasX: number; canvasY: number } | null>(null);
  const [canvasDropMenu, setCanvasDropMenu] = useState<{
    fromWidgetId: string;
    fromSide: PortSide;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  const canvasAreaRef = useRef<HTMLElement>(null);
  // Suppress the canvas click event that fires immediately after a connection drag ends
  const suppressNextCanvasClick = useRef(false);

  // ── Store ──────────────────────────────────────────────────────────────────
  const widgets = useWidgetStore(s => s.widgets);
  const isLoaded = useWidgetStore(s => s.isLoaded);
  const selectedWidgetId = useWidgetStore(s => s.selectedWidgetId);
  const selectedWidgetIds = useWidgetStore(s => s.selectedWidgetIds);
  const setSelectedWidgetId = useWidgetStore(s => s.setSelectedWidgetId);
  const toggleWidgetSelection = useWidgetStore(s => s.toggleWidgetSelection);
  const clearSelection = useWidgetStore(s => s.clearSelection);
  const updateWidget = useWidgetStore(s => s.updateWidget);
  const deleteWidget = useWidgetStore(s => s.deleteWidget);
  const createChildWidget = useWidgetStore(s => s.createChildWidget);
  const createChildFromTemplate = useWidgetStore(s => s.createChildFromTemplate);
  const setParentContainer = useWidgetStore(s => s.setParentContainer);
  const removeChildFromContainer = useWidgetStore(s => s.removeChildFromContainer);
  const duplicateWidgets = useWidgetStore(s => s.duplicateWidgets);
  const addTask = useWidgetStore(s => s.addTask);
  const updateTask = useWidgetStore(s => s.updateTask);
  const deleteTask = useWidgetStore(s => s.deleteTask);
  const projects = useWidgetStore(s => s.projects);
  const activeProjectId = useWidgetStore(s => s.activeProjectId);
  const switchProject = useWidgetStore(s => s.switchProject);
  const createProject = useWidgetStore(s => s.createProject);
  const deleteProject = useWidgetStore(s => s.deleteProject);
  const addStandaloneWidget = useWidgetStore(s => s.addStandaloneWidget);
  const createStandaloneFromTemplate = useWidgetStore(s => s.createStandaloneFromTemplate);
  const importAsNewProject = useWidgetStore(s => s.importAsNewProject);
  const importReplaceCurrentProject = useWidgetStore(s => s.importReplaceCurrentProject);

  // ── Canvas size (reactive, starts at 2000×2000, expands with widgets) ─────
  const canvasSize = useMemo(() => {
    if (widgets.length === 0) return { w: DEFAULT_CANVAS_SIZE, h: DEFAULT_CANVAS_SIZE };
    let maxRight = DEFAULT_CANVAS_SIZE, maxBottom = DEFAULT_CANVAS_SIZE;
    for (const w of widgets) {
      maxRight  = Math.max(maxRight,  w.x + w.width);
      maxBottom = Math.max(maxBottom, w.y + w.height);
    }
    return {
      w: Math.max(DEFAULT_CANVAS_SIZE, Math.ceil((maxRight  + CANVAS_EDGE_BUFFER) / CANVAS_INCREMENT) * CANVAS_INCREMENT),
      h: Math.max(DEFAULT_CANVAS_SIZE, Math.ceil((maxBottom + CANVAS_EDGE_BUFFER) / CANVAS_INCREMENT) * CANVAS_INCREMENT),
    };
  }, [widgets]);

  // ── Canvas & connection hooks ──────────────────────────────────────────────
  const {
    canvasScale,
    setCanvasScale,
    isDraggingCanvas,
    isInteracting,
    canvasOffset,
    setCanvasOffset,
    snapToGrid,
    setSnapToGrid,
    handleMouseDownCanvas,
    handleMouseMoveCanvas,
    handleMouseUpCanvas,
    handleWheelCanvas,
    centerOnRoot,
    zoomToFit,
  } = useCanvas();

  // ── Viewport size tracking (for virtualization) ────────────────────────────
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoaded]);

  // ── Wheel navigation (non-passive so preventDefault works) ─────────────────
  // React's onWheel may be passive in some environments — attach directly to DOM.
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;

    function hasScrollableParent(target: EventTarget | null): boolean {
      let node = target as Element | null;
      while (node && node !== el) {
        if (node.tagName === 'TEXTAREA') return true;
        const style = window.getComputedStyle(node);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return true;
        node = node.parentElement;
      }
      return false;
    }

    const handler = (e: WheelEvent) => {
      // Pinch gesture (ctrlKey) must always be intercepted to prevent browser zoom.
      // Pan gesture (no ctrlKey) defers to the widget if it has scrollable content.
      if (!e.ctrlKey && hasScrollableParent(e.target)) return;
      const rect = el.getBoundingClientRect();
      handleWheelCanvas(e, rect);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [handleWheelCanvas, isLoaded]); // re-run after canvas mounts (isLoaded: false→true)

  // ── Widget virtualization (only render widgets in/near viewport) ────────────
  const VIRT_PADDING = 300;
  const visibleWidgetIds = useMemo((): Set<string> => {
    const vpW = viewportSize.w || canvasAreaRef.current?.clientWidth || 0;
    const vpH = viewportSize.h || canvasAreaRef.current?.clientHeight || 0;
    if (vpW === 0) return new Set(widgets.map(w => w.id)); // SSR / not-yet-mounted guard

    const { x: ox, y: oy } = canvasOffset;
    const left   = -ox / canvasScale - VIRT_PADDING;
    const top    = -oy / canvasScale - VIRT_PADDING;
    const right  = (vpW - ox) / canvasScale + VIRT_PADDING;
    const bottom = (vpH - oy) / canvasScale + VIRT_PADDING;

    const ids = new Set<string>();
    for (const w of widgets) {
      if (selectedWidgetIds.includes(w.id)) { ids.add(w.id); continue; }
      if (w.x < right && w.x + w.width > left && w.y < bottom && w.y + w.height > top) {
        ids.add(w.id);
      }
    }
    // Always include parent containers of visible children (prevents orphaned connections)
    for (const w of widgets) {
      if (ids.has(w.id) && w.parentId) ids.add(w.parentId);
    }
    return ids;
  }, [widgets, canvasOffset, canvasScale, viewportSize, selectedWidgetIds]);

  // ── Hydration (SSR safety) ─────────────────────────────────────────────────
  useEffect(() => {
    const storedData = localStorage.getItem('game-design-db');
    if (!storedData) {
      const { widgets: w, isLoaded: loaded } = useWidgetStore.getState();
      if (!loaded && w.length === 0) {
        const rootWidget = createRootWidget();
        const defaultId = 'default';
        useWidgetStore.setState({
          widgets: [rootWidget],
          projects: [{ id: defaultId, name: rootWidget.label, createdAt: Date.now(), updatedAt: Date.now() }],
          activeProjectId: defaultId,
          isLoaded: true,
          history: [[rootWidget]],
          historyStep: 0,
        });
      }
    } else {
      useWidgetStore.persist.rehydrate();
    }
  }, []);

  const {
    draggedConnection,
    hoveredPort,
    setHoveredPort,
    handleConnectionDragStart,
    handleInputPortDragStart,
  } = useConnections(
    useCallback((fromWidgetId: string, fromSide: PortSide, mouseX: number, mouseY: number) => {
      const rect = canvasAreaRef.current?.getBoundingClientRect();
      const canvasX = (mouseX - (rect?.left ?? 0) - canvasOffset.x) / canvasScale;
      const canvasY = (mouseY - (rect?.top ?? 0) - canvasOffset.y) / canvasScale;
      suppressNextCanvasClick.current = true;
      setCanvasDropMenu({ fromWidgetId, fromSide, canvasX, canvasY });
    }, [canvasOffset, canvasScale])
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useKeyboardShortcuts({
    onCloseContextMenu: () => { setContextMenu(null); setCanvasDropMenu(null); },
    clipboard,
    setClipboard,
  });

  // ── Auto center on first load ──────────────────────────────────────────────
  const hasAutoZoomed = useRef(false);
  useEffect(() => {
    if (isLoaded && !hasAutoZoomed.current) {
      hasAutoZoomed.current = true;
      // Wait one frame so <main> is in the DOM and has a measured clientWidth/Height
      requestAnimationFrame(() => {
        const el = canvasAreaRef.current;
        if (!el) return;
        const root = useWidgetStore.getState().widgets.find(w => w.isRoot);
        if (root) {
          centerOnRoot(root, el.clientWidth, el.clientHeight);
        } else {
          const ws = useWidgetStore.getState().widgets;
          zoomToFit(ws, el.clientWidth, el.clientHeight);
        }
      });
    }
  }, [isLoaded, centerOnRoot, zoomToFit]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const rootWidget = widgets.find(w => w.isRoot);
  const projectName = projects.find(p => p.id === activeProjectId)?.name
    ?? rootWidget?.label
    ?? 'Untitled Project';
  const activeProject = projects.find(p => p.id === activeProjectId);
  const templates = getTemplates(widgets);

  const selectedWidget = selectedWidgetId
    ? widgets.find(w => w.id === selectedWidgetId)
    : null;

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950 text-neutral-400">
        <div className="animate-pulse">Loading GDD Architect...</div>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isHiddenByMinimizedContainer = (widget: (typeof widgets)[number]): boolean => {
    return widgets.some(w =>
      w.type === 'container' && w.isMinimized && w.children.includes(widget.id)
    );
  };

  // Walk up the parentId chain: if ANY ancestor has isFolded, this widget is hidden
  const isHiddenByFoldedAncestor = (widget: (typeof widgets)[number]): boolean => {
    let parentId = widget.parentId;
    while (parentId) {
      const ancestor = widgets.find(w => w.id === parentId);
      if (!ancestor) break;
      if (ancestor.isFolded) return true;
      parentId = ancestor.parentId;
    }
    return false;
  };

  const isWidgetHidden = (widget: (typeof widgets)[number]): boolean =>
    isHiddenByMinimizedContainer(widget) || isHiddenByFoldedAncestor(widget);

  const handleZoomToFit = () => {
    const el = canvasAreaRef.current;
    if (!el) return;
    zoomToFit(widgets, el.clientWidth, el.clientHeight);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col h-screen bg-neutral-950 text-neutral-200 font-sans overflow-hidden ${
        isDraggingCanvas || isDraggingWidget ? "dragging" : ""
      }`}
    >
      <Header
        projectName={projectName}
        projects={projects}
        activeProjectId={activeProjectId}
        isSidebarVisible={isSidebarVisible}
        onToggleSidebar={() => setIsSidebarVisible(v => !v)}
        onExport={() => setIsExportOpen(true)}
        onSwitchProject={switchProject}
        onCreateProject={createProject}
        onDeleteProject={deleteProject}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <main
          ref={canvasAreaRef}
          className="flex-1 relative bg-neutral-950 cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onMouseLeave={handleMouseUpCanvas}
          onClick={e => {
            // Suppress the click that fires directly after a connection drag ends
            if (suppressNextCanvasClick.current) {
              suppressNextCanvasClick.current = false;
              return;
            }
            // Deselect when clicking directly on the canvas background
            if ((e.target as HTMLElement).closest('[data-draggable="widget"]')) return;
            clearSelection();
            setContextMenu(null);
            setCanvasDropMenu(null);
            setCanvasCreateMenu(null);
          }}
          onDoubleClick={e => {
            // Do NOT open create menu when double-clicking on a widget
            if ((e.target as HTMLElement).closest('[data-draggable="widget"]')) return;
            const rect = canvasAreaRef.current?.getBoundingClientRect();
            const canvasX = (e.clientX - (rect?.left ?? 0) - canvasOffset.x) / canvasScale;
            const canvasY = (e.clientY - (rect?.top ?? 0) - canvasOffset.y) / canvasScale;
            setCanvasCreateMenu({ canvasX, canvasY });
          }}
          onContextMenu={e => {
            // Prevent browser context menu on canvas background
            if (!(e.target as HTMLElement).closest('[data-draggable="widget"]')) {
              e.preventDefault();
            }
          }}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#4b5563 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Infinite canvas container */}
          <div
            className="absolute origin-top-left"
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
              width: `${canvasSize.w}px`,
              height: `${canvasSize.h}px`,
              willChange: 'transform',
              transition: isInteracting ? 'none' : 'transform 150ms ease-out',
            }}
          >
            {/* SVG connection layer — behind widgets */}
            <ConnectionLayer
              draggedConnection={draggedConnection}
              canvasOffset={canvasOffset}
              canvasScale={canvasScale}
              canvasAreaRef={canvasAreaRef}
              canvasSize={canvasSize}
              visibleWidgetIds={visibleWidgetIds}
            />

            {/* Widget cards */}
            {widgets.map(widget => {
              if (isWidgetHidden(widget)) return null;
              if (!visibleWidgetIds.has(widget.id)) return null;
              return (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  isSelected={selectedWidgetIds.includes(widget.id)}
                  onSelect={() => setSelectedWidgetId(widget.id)}
                  onShiftSelect={id => toggleWidgetSelection(id)}
                  onUpdate={updates => updateWidget(widget.id, updates)}
                  onDelete={() => deleteWidget(widget.id)}
                  canvasScale={canvasScale}
                  siblings={widgets}
                  snapToGrid={snapToGrid}
                  onCreateChild={createChildWidget}
                  onConnectionDragStart={handleConnectionDragStart}
                  onInputPortDragStart={handleInputPortDragStart}
                  hoveredPort={hoveredPort}
                  setHoveredPort={setHoveredPort}
                  draggedConnection={draggedConnection}
                  onDragStateChange={setIsDraggingWidget}
                  onContextMenu={(widgetId, x, y) => {
                    setSelectedWidgetId(widgetId);
                    setContextMenu({ widgetId, x, y });
                  }}
                  templates={templates}
                  onCreateFromTemplate={createChildFromTemplate}
                />
              );
            })}

            {/* Task panels — rendered as canvas siblings to avoid stacking context */}
            {widgets.filter(w => w.isTaskPanelOpen && !isWidgetHidden(w) && visibleWidgetIds.has(w.id)).map(widget => (
              <div
                key={`task-panel-${widget.id}`}
                style={{
                  position: 'absolute',
                  left: widget.x + widget.width + 8,
                  top: widget.y,
                  zIndex: 40,
                }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                <WidgetTaskPanel
                  widget={widget}
                  projectSettings={rootWidget?.projectSettings}
                  onAddTask={title => addTask(widget.id, title)}
                  onUpdateTask={(taskId, updates) => updateTask(widget.id, taskId, updates)}
                  onDeleteTask={taskId => deleteTask(widget.id, taskId)}
                  onToggleView={view => updateWidget(widget.id, { taskView: view })}
                  onClose={() => updateWidget(widget.id, { isTaskPanelOpen: false })}
                />
              </div>
            ))}

            {/* Drop-to-create floating PortMenu */}
            {canvasDropMenu && (() => {
              const sourceWidget = widgets.find(w => w.id === canvasDropMenu.fromWidgetId);
              if (!sourceWidget) return null;
              return (
                <div
                  key="canvas-drop-menu"
                  style={{ position: 'absolute', left: canvasDropMenu.canvasX, top: canvasDropMenu.canvasY, width: 0, height: 0, zIndex: 200 }}
                  onClick={e => e.stopPropagation()}
                >
                  <PortMenu
                    side={canvasDropMenu.fromSide}
                    widget={sourceWidget}
                    onCreateChild={(type, context) => {
                      createChildWidget(canvasDropMenu.fromWidgetId, type, context, {
                        x: canvasDropMenu.canvasX,
                        y: canvasDropMenu.canvasY,
                      });
                      setCanvasDropMenu(null);
                    }}
                    onClose={() => setCanvasDropMenu(null)}
                    templates={templates}
                    onCreateFromTemplate={templateId => {
                      createChildFromTemplate(canvasDropMenu.fromWidgetId, templateId, {
                        x: canvasDropMenu.canvasX,
                        y: canvasDropMenu.canvasY,
                      });
                      setCanvasDropMenu(null);
                    }}
                  />
                </div>
              );
            })()}

            {/* Double-click-to-create floating menu */}
            {canvasCreateMenu && (
              <div
                key="canvas-create-menu"
                style={{ position: 'absolute', left: canvasCreateMenu.canvasX, top: canvasCreateMenu.canvasY, width: 0, height: 0, zIndex: 200 }}
                onClick={e => e.stopPropagation()}
              >
                <CanvasCreateMenu
                  onCreateWidget={(type, context) => {
                    addStandaloneWidget(type, context, canvasCreateMenu.canvasX, canvasCreateMenu.canvasY);
                    setCanvasCreateMenu(null);
                  }}
                  onClose={() => setCanvasCreateMenu(null)}
                  templates={templates}
                  onCreateFromTemplate={templateId => {
                    createStandaloneFromTemplate(templateId, canvasCreateMenu.canvasX, canvasCreateMenu.canvasY);
                    setCanvasCreateMenu(null);
                  }}
                  defaultContext={lastUsedContext}
                  onContextChange={setLastUsedContext}
                />
              </div>
            )}
          </div>

          {/* Mini-Map */}
          {isMinimapVisible ? (
            <MiniMap
              canvasScale={canvasScale}
              canvasOffset={canvasOffset}
              setCanvasOffset={setCanvasOffset}
              viewportRef={canvasAreaRef}
              onHide={() => setIsMinimapVisible(false)}
            />
          ) : (
            <button
              data-export-ignore="true"
              onClick={() => setIsMinimapVisible(true)}
              className="absolute bottom-6 left-6 z-40 p-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
              title="Show mini-map"
            >
              <div className="w-4 h-4 bg-neutral-600 rounded border border-neutral-400" />
            </button>
          )}
        </main>

        {/* Sidebar — Properties panel */}
        <aside
          className={`border-l border-neutral-800 bg-neutral-900/90 flex flex-col z-40 overflow-y-auto transition-all duration-300 ${
            isSidebarVisible ? "w-80" : "w-0 border-l-0"
          }`}
        >
          {isSidebarVisible && (
            <>
              {selectedWidget ? (
                <WidgetProperties
                  widget={selectedWidget}
                  updateWidget={updates => updateWidget(selectedWidgetId!, updates)}
                  siblings={widgets}
                  setParentContainer={parentId =>
                    setParentContainer(selectedWidgetId!, parentId)
                  }
                  removeChildFromContainer={childId =>
                    removeChildFromContainer(selectedWidgetId!, childId)
                  }
                />
              ) : selectedWidgetIds.length > 1 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-60">
                  <p className="text-neutral-300 font-medium">{selectedWidgetIds.length} selected</p>
                  <p className="text-xs text-neutral-500 mt-2">Del to delete · Ctrl+D to duplicate</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50">
                  <div className="bg-neutral-800 p-4 rounded-full mb-4">
                    <GripVertical size={32} className="text-neutral-600" />
                  </div>
                  <p className="text-neutral-400">Select a widget to edit its properties</p>
                  <p className="text-xs text-neutral-500 mt-2">Shift+click for multi-select</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      <Footer
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid(v => !v)}
        onZoomToFit={handleZoomToFit}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          widgetId={contextMenu.widgetId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicateWidgets([contextMenu.widgetId])}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && activeProject && (
        <ExportModal
          widgets={widgets}
          projectName={projectName}
          projectMeta={activeProject}
          canvasRef={canvasAreaRef}
          onClose={() => setIsExportOpen(false)}
          onImportAsNew={importAsNewProject}
          onImportReplace={importReplaceCurrentProject}
        />
      )}
    </div>
  );
}
