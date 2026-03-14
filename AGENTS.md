# Grapken — Agent & Contributor Guide

Instructions for AI coding agents (GitHub Copilot, Cursor, Claude, etc.) and human contributors working in this repository.

---

## Project Overview

Grapken is a **visual node-based editor** for creating Game Design Documents (GDDs). Users place widgets (characters, mechanics, levels, tasks...) on an infinite blueprint and connect them to show dependencies and relationships.

- **Runtime:** Bun (Node.js ≥ 20 also works)
- **Stack:** React 19, TypeScript 5, Vite 6, Tailwind CSS 4, Zustand 5
- **All data** is stored in `localStorage` — no backend, no database

---

## Key Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server → http://localhost:5173
bun run build        # Type-check + production build → dist/
bun run typecheck    # TypeScript check only (no emit)
bun run lint         # ESLint
bun run preview      # Preview production build locally
```

**Before submitting a PR:** `bun run typecheck && bun run build` must pass with no errors.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Main editor — root route /
│   ├── landing/          # Marketing page — /landing
│   ├── terms/            # Terms of Service — /terms
│   └── privacy/          # Privacy Policy — /privacy
├── components/           # React UI components (canvas, widgets, panels, modals)
├── hooks/                # Custom hooks: useCanvas, useConnections, useHistory,
│                         #   useKeyboardShortcuts, useMinimap
├── lib/                  # Pure TypeScript logic (no React): export utils, stats,
│                         #   templates, connection geometry, estimation scale
├── store/
│   └── useWidgetStore.ts # Central Zustand store — persisted to localStorage
├── types/                # Shared TypeScript types
└── constants/            # Widget types, context definitions, defaults
```

**State:** Everything lives in `useWidgetStore`. There is no server state, no API calls, no async data fetching in the core editor.

**Routing:** React Router 7 with `BrowserRouter`. Routes are defined in `src/App.tsx`.

**Styling:** Tailwind CSS 4 utility classes only. No CSS modules, no styled-components.

---

## Coding Conventions

- **No `"use client"` directives** — this is not Next.js
- **No `next/*` imports** — use `react-router-dom` for links, native `<img>` for images
- **Components** are function components with TypeScript. No class components.
- **Imports** use the `@/` alias (maps to `src/`)
- **Commit messages** follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

---

## Contribution Rules

1. Open an issue before starting significant work
2. Branch naming: `feat/your-feature`, `fix/your-bug`, `docs/your-change`
3. All contributors must sign the [CLA](https://cla-assistant.io/byronrosas/grapken-core) — the bot will prompt on first PR
4. PRs must pass `bun run typecheck && bun run build`
5. Keep changes focused — one feature or fix per PR

---

## What's in Scope for `grapken-core`

This repo is the **open-source core** (local, offline, solo use). Features that require a server, user accounts, or real-time sync are **Grapken Pro** and are out of scope for PRs here.

Items tagged `[core]` in the roadmap are fair game. Items tagged `[pro]` are not.
