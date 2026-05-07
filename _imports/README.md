# `_imports/` — Reference sources for ongoing refactors

This folder holds **read-only reference copies** of code that's being
imported / refactored into the main `src/` tree. Files here are **not**
compiled by Vite (the folder lives outside `src/`).

## Current contents

### `plateforme-source.jsx`

Snapshot of the original "Plateforme Passation des Marchés AFD" — a
single-file React app (~1040 lines) running on Claude.ai with
`window.storage`. Imported on 2026-05-06 at the start of phase 3.

This file is being **broken up and migrated** into:

- `src/platform/data/*` (catalogs, MEMO_DATA, RETEX_DATA, REF_DOCS,
  checklists)
- `src/platform/components/*` (Flag, Icon, ReviewItem, Sidebar, …)
- `src/platform/pages/*` (Home, Country, Project, Market, Memo, Refs,
  Search, Admin, ChecklistConfig)
- `src/platform/store/platformStore.js` (localStorage CRUD, replaces the
  `window.storage`-based `sG` / `sS` helpers)

Once phase 3 is fully merged, this reference file can be deleted (or
archived) — the contents will live in `src/platform/`.
