import { createProject } from './projectStore.js';

// ── Legacy → multi-project migration ──────────────────────────────────────
// Until phase 2 the app stored a single project across 10 distinct
// localStorage keys (dtao_formData, dtao_actorAssignments, …). Phase 2
// unifies storage under a single keyed list (dtao_projects_v2).
//
// On the first launch after the upgrade, this helper detects the legacy
// keys, regroups their values into one project, and delegates to
// projectStore.createProject. Legacy keys are left in place as a safety
// backup — they're orphan storage afterwards (~0.5–5 MB) but cause no
// runtime problem and may help with manual recovery.

const NEW_STORE_KEY = 'dtao_projects_v2';

const LEGACY_KEY_TO_DATA_FIELD = {
  dtao_formData: 'formData',
  dtao_actorAssignments: 'actorAssignments',
  dtao_fieldComments: 'fieldComments',
  dtao_actors: 'actors',
  dtao_personnelRows: 'personnelRows',
  dtao_materielRows: 'materielRows',
  dtao_propositionItems: 'propositionItems',
  dtao_bulletListItems: 'bulletListItems',
  dtao_articlesEsssRows: 'articlesEsssRows',
  dtao_tranchesRows: 'tranchesRows',
};

/**
 * Returns true iff the new store is empty AND at least one legacy key
 * exists — i.e. there is something to migrate.
 */
export function needsLegacyMigration() {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem(NEW_STORE_KEY)) return false;
  for (const legacyKey of Object.keys(LEGACY_KEY_TO_DATA_FIELD)) {
    if (localStorage.getItem(legacyKey) !== null) return true;
  }
  return false;
}

/**
 * Read all legacy keys, JSON-parse each, and create a single project
 * carrying that data. Returns the new project, or null if there was
 * nothing to migrate.
 *
 * `meta.schemaVersion` and `meta.language` should match the active pack
 * (the legacy data was always v2024/fr in practice — but we don't hard-
 * code it here so the engine remains pack-agnostic).
 *
 * `meta.fallbackName` is used when formData.nom_projet is empty.
 */
export function performLegacyMigration({ schemaVersion, language, fallbackName = 'Mon DTAO' }) {
  if (!needsLegacyMigration()) return null;

  const data = {};
  for (const [legacyKey, dataField] of Object.entries(LEGACY_KEY_TO_DATA_FIELD)) {
    const raw = localStorage.getItem(legacyKey);
    if (raw === null) continue;
    try {
      data[dataField] = JSON.parse(raw);
    } catch {
      // Corrupt JSON for that key — skip it, the rest still migrate.
    }
  }

  // Prefer the project's own nom_projet as the display name, fall back
  // to the user-supplied default ("Mon DTAO").
  const trimmed =
    typeof data.formData?.nom_projet === 'string'
      ? data.formData.nom_projet.trim()
      : '';
  const name = trimmed || fallbackName;

  return createProject({ name, schemaVersion, language }, data);
}
