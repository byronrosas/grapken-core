import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Download, Undo2, Redo2, ChevronRight, ChevronLeft,
  ChevronDown, Plus, X, AlertTriangle, HardDrive,
} from "lucide-react";
import { PROJECT_VERSION } from "@/constants";
import { useHistory } from "@/hooks/useHistory";
import type { ProjectMeta } from "@/types";

// ── localStorage usage helper ─────────────────────────────────────────────────

function measureLocalStorage(): { used: number; total: number } {
  try {
    let bytes = 0;
    for (const key of Object.keys(localStorage)) {
      bytes += ((localStorage.getItem(key) ?? '').length + key.length) * 2;
    }
    return { used: bytes, total: 5 * 1024 * 1024 }; // 5 MB typical limit
  } catch {
    return { used: 0, total: 5 * 1024 * 1024 };
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface HeaderProps {
  projectName: string;
  projects: ProjectMeta[];
  activeProjectId: string;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
  onExport: () => void;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
}

export function Header({
  projectName,
  projects,
  activeProjectId,
  isSidebarVisible,
  onToggleSidebar,
  onExport,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
}: HeaderProps) {
  const { undo, redo, canUndo, canRedo } = useHistory();

  // ── Dropdown state ──────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Delete confirmation state ────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState<ProjectMeta | null>(null);
  const [confirmName, setConfirmName] = useState('');

  // ── localStorage indicator state ─────────────────────────────────────────────
  const [storage, setStorage] = useState({ used: 0, total: 5 * 1024 * 1024 });

  useEffect(() => {
    setStorage(measureLocalStorage());
  }, [projects]); // recompute whenever project list changes

  const storagePct = storage.used / storage.total;
  const storageLabel = `${formatBytes(storage.used)} / ${formatBytes(storage.total)}`;
  const storageColor =
    storagePct > 0.8 ? 'text-red-400 border-red-500/40 bg-red-500/10'
    : storagePct > 0.5 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    : 'text-neutral-400 border-white/[0.06] bg-white/[0.03]';

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreatingNew(false);
        setNewName('');
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim() || 'New Project';
    onCreateProject(name);
    setNewName('');
    setCreatingNew(false);
    setOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDelete || confirmName !== pendingDelete.name) return;
    onDeleteProject(pendingDelete.id);
    setPendingDelete(null);
    setConfirmName('');
    setOpen(false);
  };

  return (
    <>
      <header
        className="h-14 flex items-center justify-between px-6 z-50 relative"
        style={{
          background: "rgba(7,7,14,0.92)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.035)",
          boxShadow: "0 4px 40px -8px rgba(0,0,0,0.6)",
        }}
      >
        {/* Scan line at bottom — animated light sweep */}
        <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden pointer-events-none">
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.45) 50%, transparent 100%)",
              backgroundSize: "40% 100%",
              animation: "landing-shimmer 6s ease-in-out infinite",
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Logo */}
          <img src="/logoGrapken.png" alt="Grapken" width={110} height={28} className="h-7 w-auto" />
          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Project switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setOpen(v => !v); setCreatingNew(false); setNewName(''); }}
              className="flex items-center gap-1 group"
            >
              <h2 className="text-lg font-semibold text-neutral-300 group-hover:text-white transition-colors">
                {projectName}
              </h2>
              <ChevronDown
                size={13}
                className={`text-neutral-500 group-hover:text-neutral-300 transition-all ${open ? 'rotate-180' : ''}`}
              />
            </button>

            {open && (
              <div className="absolute top-full left-0 mt-2 bg-[#07070f] border border-white/[0.06] rounded-lg shadow-2xl min-w-[220px] z-50 py-1" style={{ backdropFilter: "blur(24px)" }}>
                {projects.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1 px-3 py-2 hover:bg-white/[0.04] group/item"
                  >
                    <button
                      className="flex-1 text-left text-sm flex items-center gap-2 min-w-0"
                      onClick={() => { onSwitchProject(p.id); setOpen(false); }}
                    >
                      <span className="w-4 shrink-0 text-violet-500 text-xs">
                        {p.id === activeProjectId ? '✓' : ''}
                      </span>
                      <span className={`truncate ${p.id === activeProjectId ? 'text-violet-400' : 'text-neutral-400'}`}>
                        {p.name}
                      </span>
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); setPendingDelete(p); setConfirmName(''); }}
                        className="opacity-0 group-hover/item:opacity-100 text-neutral-600 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                        title="Delete project"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}

                <div className="border-t border-white/[0.04] my-1" />

                {creatingNew ? (
                  <form onSubmit={handleCreate} className="px-3 py-2 flex gap-2">
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Project name"
                      className="flex-1 bg-white/[0.03] border border-violet-500/40 rounded px-2 py-1 text-sm text-neutral-300 outline-none min-w-0"
                    />
                    <button
                      type="submit"
                      className="text-xs text-violet-400 hover:text-violet-300 px-1 shrink-0 transition-colors"
                    >
                      Create
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setCreatingNew(true)}
                    className="w-full text-left px-3 py-2 text-sm text-violet-400 hover:bg-white/[0.04] flex items-center gap-2 transition-colors"
                  >
                    <Plus size={12} /> New Project
                  </button>
                )}
              </div>
            )}
          </div>

          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-violet-500/[0.08] text-violet-400 border border-violet-800/50">
            {PROJECT_VERSION}
          </span>

          {/* Dynamic localStorage indicator */}
          <span
            className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border transition-colors ${storageColor}`}
            title={`localStorage usage: ${storageLabel}`}
          >
            <HardDrive size={11} />
            {storageLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 hover:bg-white/[0.05] rounded-lg text-neutral-600 hover:text-neutral-300 disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 hover:bg-white/[0.05] rounded-lg text-neutral-600 hover:text-neutral-300 disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>

          <div className="w-px h-5 bg-white/[0.06] mx-2" />

          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/[0.05] rounded-lg text-neutral-600 hover:text-neutral-300 transition-colors"
            title={isSidebarVisible ? 'Hide properties panel' : 'Show properties panel'}
          >
            {isSidebarVisible ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <div className="w-px h-5 bg-white/[0.06] mx-2" />

          <button
            onClick={onExport}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95"
            style={{
              background: "linear-gradient(135deg, #6d28d9, #7c3aed)",
              boxShadow: "0 0 20px -4px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
            title="Export project"
          >
            {/* Shimmer */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
                animation: "landing-shimmer 1.5s ease-in-out infinite",
              }}
            />
            <Download size={14} />
            Export
          </button>
        </div>
      </header>

      {/* Delete confirmation modal */}
      {pendingDelete && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setPendingDelete(null); setConfirmName(''); }}
          />
          <div className="relative bg-[#07070f] border border-white/[0.06] rounded-xl shadow-2xl p-6 w-[340px] flex flex-col gap-4" style={{ backdropFilter: "blur(24px)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <h3 className="text-sm font-semibold text-neutral-200">Delete project</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This will permanently delete{' '}
              <span className="text-neutral-200 font-medium">"{pendingDelete.name}"</span>{' '}
              and all its content. This cannot be undone.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-500">
                Type <span className="text-neutral-300 font-medium">{pendingDelete.name}</span> to confirm:
              </label>
              <input
                autoFocus
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleDeleteConfirm(); if (e.key === 'Escape') { setPendingDelete(null); setConfirmName(''); } }}
                placeholder={pendingDelete.name}
                className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-neutral-300 outline-none focus:border-red-500/50 placeholder-neutral-700 transition-colors"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setPendingDelete(null); setConfirmName(''); }}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={confirmName !== pendingDelete.name}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Delete project
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
