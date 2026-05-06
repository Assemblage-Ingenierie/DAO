// ── Project store (localStorage-backed) ───────────────────────────────────
//
// Pure JS module that owns the multi-project storage. Encapsulates reads/
// writes to `localStorage["dtao_projects_v2"]` so the rest of the app
// (Editor, ProjectList page, hooks) doesn't deal with the storage mechanic.
//
// Project shape:
//   {
//     id: string,                // crypto.randomUUID()
//     name: string,              // user-chosen display name
//     schemaVersion: string,     // e.g. "v2024"
//     language: string,          // e.g. "fr"
//     createdAt: string,         // ISO timestamp
//     updatedAt: string,         // ISO timestamp
//     data: {                    // the 10 sub-stores from the legacy app
//       formData, actorAssignments, fieldComments, actors,
//       personnelRows, materielRows, propositionItems,
//       bulletListItems, articlesEsssRows, tranchesRows
//     }
//   }
//
// Storage layer is intentionally **pack-agnostic**: it doesn't import from
// `src/packages/*`. Defaults (the initial DEFAULT_ACTORS etc.) are passed
// in by the caller when creating a new project. This keeps the door open
// for a Supabase swap in phase 4 — just replace this module with a
// network-backed equivalent that exposes the same API.

const STORAGE_KEY = 'dtao_projects_v2';

// ── Internal: read / write the whole tableau ─────────────────────────────

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt JSON → start fresh rather than crash. The migration helper
    // will recover from legacy keys on next load if they exist.
    return [];
  }
}

function writeAll(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

// ── Public API ───────────────────────────────────────────────────────────

/** List all projects (full objects, including data). */
export function listProjects() {
  return readAll();
}

/** Return one project by id, or null if not found. */
export function getProject(id) {
  return readAll().find((p) => p.id === id) || null;
}

/**
 * Create a new project and persist it. `meta` carries identity/labels;
 * `initialData` is the contents of the 10 sub-stores at creation time.
 * Returns the freshly-created project.
 */
export function createProject(meta, initialData) {
  const now = new Date().toISOString();
  const project = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: meta.name || 'Nouveau projet',
    schemaVersion: meta.schemaVersion,
    language: meta.language,
    createdAt: now,
    updatedAt: now,
    data: initialData || {},
  };
  const all = readAll();
  all.push(project);
  writeAll(all);
  return project;
}

/**
 * Update the `data` field of a project. Touches `updatedAt` automatically.
 * No-op if the id doesn't exist. Returns the updated project, or null.
 */
export function updateProjectData(id, data) {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], data, updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[idx];
}

/** Rename a project. Returns the updated project, or null if not found. */
export function renameProject(id, name) {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], name, updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[idx];
}

/** Remove a project. Returns true if something was removed. */
export function deleteProject(id) {
  const all = readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}

/**
 * Deep-clone a project under a new id. The new project gets fresh
 * createdAt/updatedAt. Returns the new project, or null if source missing.
 */
export function duplicateProject(id, newName) {
  const src = getProject(id);
  if (!src) return null;
  const cloned = JSON.parse(JSON.stringify(src.data));
  return createProject(
    {
      name: newName || `${src.name} (copie)`,
      schemaVersion: src.schemaVersion,
      language: src.language,
    },
    cloned,
  );
}
