// ── Plateforme — migration des projets DTAO legacy ──────────────────────
//
// Phase 3.6 — fold tous les projets DTAO existants (clé localStorage
// `dtao_projects_v2`, posée par la phase 2) dans la structure Plateforme :
//   pays "Non classé"
//   └ projet "DTAO existants"
//      └ 1 marché par projet DTAO, type AO Travaux (pré-qual.) production,
//         avec `editor_data` = la donnée DTAO complète (formData, actors,
//         personnelRows, etc.)
//
// La 3.5 lira `editor_data` au sein du marché pour rebrancher l'Editor
// DTAO, sans toucher à `dtao_projects_v2` qu'on conserve en backup.
//
// Migration idempotente :
//   - Un flag `legacyDtaoMigrated: true` est posé dans la donnée
//     Plateforme pour ne pas re-migrer.
//   - Les projets DTAO importés portent un champ `legacyDtaoId` qui
//     croise vers la clé d'origine (audit/recovery).

import { listProjects } from "../../editors/dtao-travaux/engine/projects/projectStore.js";
import { loadPlatform, savePlatform } from "./platformStore.js";

// Génère un UUID v4 — même pattern que platformStore.js. Fallback pour les
// très vieux navigateurs. Les marchés legacy gardent `M_LEGACY_<dtaoId>`
// (le `dtaoId` est déjà un UUID stable) pour l'audit / anti-doublon.
function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const NON_CLASSE_NAME = "Non classé";
const DTAO_EXISTANTS_NAME = "DTAO existants";
const DEFAULT_TYPE = "AO_TVX_PQ"; // AO Travaux (pré-qual.)
const DEFAULT_TL = "AO Travaux (pré-qual.)";

export function needsLegacyDtaoMigration() {
  if (typeof localStorage === "undefined") return false;
  const platform = loadPlatform();
  if (platform.legacyDtaoMigrated) return false;
  const dtaoProjects = listProjects();
  return Array.isArray(dtaoProjects) && dtaoProjects.length > 0;
}

// Trouve une country existante par nom (insensible à la casse), ou la crée.
function ensureCountry(platform, name) {
  const existing = (platform.countries || []).find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return { platform, countryId: existing.id };

  const id = newId();
  const next = {
    ...platform,
    countries: [...(platform.countries || []), { id, name }],
    projects: { ...(platform.projects || {}), [id]: [] },
  };
  return { platform: next, countryId: id };
}

// Trouve un projet existant par nom au sein d'une country, ou le crée.
function ensureProject(platform, countryId, name) {
  const list = platform.projects[countryId] || [];
  const existing = list.find((p) => p.name === name);
  if (existing) return { platform, projectId: existing.id };

  const id = newId();
  const newProject = {
    id,
    name,
    sec: "",
    dir: "2024",
    secu: "standard",
    verif: "eac",
    mt: "",
    desc: "Projets DTAO importés depuis le store DTAO local (phase 2).",
    lang: "Français",
    tcon: "",
    ctx: "",
    site: "",
    resp: "",
    eq: [],
  };
  const next = {
    ...platform,
    projects: {
      ...platform.projects,
      [countryId]: [...list, newProject],
    },
    markets: { ...(platform.markets || {}), [id]: [] },
  };
  return { platform: next, projectId: id };
}

// Convertit un projet DTAO en marché Plateforme.
function dtaoProjectToMarket(dtaoProject) {
  const createdAt = dtaoProject.createdAt || new Date().toISOString();
  return {
    id: "M_LEGACY_" + dtaoProject.id,
    legacyDtaoId: dtaoProject.id,
    name: dtaoProject.name || "DTAO sans nom",
    type: DEFAULT_TYPE,
    tl: DEFAULT_TL,
    cat: "Travaux",
    role: "production",
    meth: "",
    mont: "",
    st: "",
    date: createdAt.slice(0, 10),
    editor_data: dtaoProject.data || {},
  };
}

// Migration principale — idempotente. Renvoie le nombre de marchés
// importés (utile pour les logs / éventuel toast plus tard).
export function performLegacyDtaoMigration() {
  if (!needsLegacyDtaoMigration()) return 0;

  const dtaoProjects = listProjects();
  if (dtaoProjects.length === 0) {
    // Rien à migrer mais on pose le flag pour ne pas retomber dedans.
    const platform = loadPlatform();
    savePlatform({ ...platform, legacyDtaoMigrated: true });
    return 0;
  }

  let platform = loadPlatform();

  const ensuredCountry = ensureCountry(platform, NON_CLASSE_NAME);
  platform = ensuredCountry.platform;
  const countryId = ensuredCountry.countryId;

  const ensuredProject = ensureProject(platform, countryId, DTAO_EXISTANTS_NAME);
  platform = ensuredProject.platform;
  const projectId = ensuredProject.projectId;

  const newMarkets = dtaoProjects.map(dtaoProjectToMarket);
  const existingMarkets = platform.markets[projectId] || [];

  // Anti-doublon : ne ré-importe pas un dtaoProject déjà présent (par
  // legacyDtaoId). Permet de re-courir la migration si le flag est
  // perdu ou réinitialisé manuellement.
  const knownLegacyIds = new Set(
    existingMarkets.map((m) => m.legacyDtaoId).filter(Boolean),
  );
  const toAdd = newMarkets.filter((m) => !knownLegacyIds.has(m.legacyDtaoId));

  platform = {
    ...platform,
    markets: {
      ...platform.markets,
      [projectId]: [...existingMarkets, ...toAdd],
    },
    legacyDtaoMigrated: true,
  };

  savePlatform(platform);
  return toAdd.length;
}
