// ── Plateforme — import des données legacy localStorage → Supabase ─────
//
// Phase 4 étape 5. Lit la clé `afd_platform_v1` du localStorage (état
// hérité Phase 3) et la pousse vers les tables `dao_*` de Supabase via
// les primitives `supabaseMutations`.
//
// Idempotence :
//   - Le flag `localStorage["dao_legacy_imported"]` est posé à `true`
//     après succès → bouton import disparaît dans Admin.
//   - Côté serveur, le flag `dao_profiles.legacy_platform_migrated` est
//     posé pour l'utilisateur courant (utile pour les autres apps de
//     INTERNAL qui partageraient ce profil).
//   - Dédoublonnage par NOM (case-insensitive) pour `dao_countries` et
//     `dao_equipe` : si un row existe déjà avec le même nom, on réutilise
//     son ID. Pour les projets/marchés, le risque de doublon est laissé
//     au flag idempotent.
//
// Stratégie : inserts séquentiels via les primitives existantes. Avec
// ~5 pays / 10 projets / 20 marchés / 1000 reviews, ça représente ~1100
// round-trips Supabase. À 100 ms/req c'est ~2 min. Acceptable pour un
// one-shot. Si trop lent, batcher en `insert([row1, row2, ...])` plus tard.

import { supabase } from "../supabase/client.js";
import {
  insertCountry,
  insertProject,
  insertMarket,
  upsertReview,
  upsertTextOverride,
  insertRexItem,
  insertCustomRetex,
  insertEquipeMember,
  upsertRefVersion,
  markLegacyMigrated,
} from "./supabaseMutations.js";

const LEGACY_KEY = "afd_platform_v1";
const FLAG_KEY = "dao_legacy_imported";

// ── État ─────────────────────────────────────────────────────────────────

// Retourne le payload legacy parsé ou null si absent / corrompu.
export function readLegacyData() {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Vrai si l'utilisateur n'a pas encore importé ET qu'il y a quelque chose
// à importer (au moins un pays, un marché, ou un retex/rex).
export function shouldOfferImport() {
  if (typeof localStorage === "undefined") return false;
  if (localStorage.getItem(FLAG_KEY) === "true") return false;
  const data = readLegacyData();
  if (!data) return false;
  const nbCountries = (data.countries || []).length;
  const nbProjects = Object.values(data.projects || {}).reduce(
    (n, arr) => n + (arr ? arr.length : 0),
    0,
  );
  const nbMarkets = Object.values(data.markets || {}).reduce(
    (n, arr) => n + (arr ? arr.length : 0),
    0,
  );
  const nbRex = (data.rexItems || []).length + (data.customRetex || []).length;
  return nbCountries + nbProjects + nbMarkets + nbRex > 0;
}

// Stats agrégées pour pré-afficher avant l'import.
export function summarizeLegacyData() {
  const data = readLegacyData();
  if (!data) return null;
  const projects = Object.values(data.projects || {}).reduce(
    (n, arr) => n + (arr ? arr.length : 0),
    0,
  );
  const markets = Object.values(data.markets || {}).reduce(
    (n, arr) => n + (arr ? arr.length : 0),
    0,
  );
  const reviews = Object.values(data.reviews || {}).reduce(
    (n, slot) => n + Object.keys(slot || {}).length,
    0,
  );
  const textOverrides = Object.keys(data.textOverrides || {}).reduce(
    (n, k) => n + Object.keys(data.textOverrides[k] || {}).length,
    0,
  );
  return {
    countries: (data.countries || []).length,
    projects,
    markets,
    reviews,
    textOverrides,
    rexItems: (data.rexItems || []).length,
    customRetex: (data.customRetex || []).length,
    equipe: (data.equipe || []).length,
    refVersions: Object.keys(data.refVersions || {}).length,
  };
}

export function markImportDone() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(FLAG_KEY, "true");
}

// ── Helpers d'import ─────────────────────────────────────────────────────

// Récupère les pays/projets/marchés/membres déjà en BDD pour dédoubler par
// nom. Important : si l'utilisateur (ou un autre membre de l'équipe) a
// déjà créé un pays "Côte d'Ivoire" entre temps, on ne re-crée pas.
async function fetchExistingRefs() {
  const [c, e] = await Promise.all([
    supabase.from("dao_countries").select("id, name"),
    supabase.from("dao_equipe").select("name"),
  ]);
  const countriesByName = {};
  if (c.data) {
    for (const row of c.data) {
      countriesByName[row.name.toLowerCase()] = row.id;
    }
  }
  const equipeSet = new Set();
  if (e.data) {
    for (const row of e.data) equipeSet.add(row.name);
  }
  return { countriesByName, equipeSet };
}

// ── Run import ───────────────────────────────────────────────────────────

/**
 * Importe `afd_platform_v1` (localStorage) → Supabase.
 *
 * @param {object} options
 * @param {(message: string, progress: {done: number, total: number}) => void} options.onProgress
 *   Appelé à chaque step. `progress.total` est l'estimation finale,
 *   `progress.done` le nombre de mutations exécutées.
 * @returns {Promise<object>} stats finales (countries, projects, ...).
 */
export async function importLegacyToSupabase({ onProgress } = {}) {
  const legacy = readLegacyData();
  if (!legacy) {
    throw new Error("Aucune donnée legacy à importer (afd_platform_v1 absent ou invalide).");
  }

  const summary = summarizeLegacyData();
  const total =
    summary.countries +
    summary.projects +
    summary.markets +
    summary.reviews +
    summary.textOverrides +
    summary.rexItems +
    summary.customRetex +
    summary.equipe +
    summary.refVersions;

  let done = 0;
  const report = (msg) => onProgress?.(msg, { done, total });

  const { countriesByName, equipeSet } = await fetchExistingRefs();

  // Maps oldId → newId pour relier projets aux pays, marchés aux projets, etc.
  const countryIdMap = {};
  const projectIdMap = {};
  const marketIdMap = {};
  const stats = {
    countries: 0,
    countriesSkipped: 0,
    projects: 0,
    markets: 0,
    reviews: 0,
    textOverrides: 0,
    rexItems: 0,
    customRetex: 0,
    equipe: 0,
    refVersions: 0,
    errors: [],
  };

  // ── 1) Countries ──────────────────────────────────────────────────────
  for (const c of legacy.countries || []) {
    report(`Pays : ${c.name}`);
    const existingId = countriesByName[c.name.trim().toLowerCase()];
    if (existingId) {
      countryIdMap[c.id] = existingId;
      stats.countriesSkipped++;
    } else {
      try {
        const created = await insertCountry(c.name);
        countryIdMap[c.id] = created.id;
        stats.countries++;
      } catch (err) {
        stats.errors.push(`Pays "${c.name}" : ${err.message}`);
      }
    }
    done++;
  }

  // ── 2) Projects ───────────────────────────────────────────────────────
  for (const oldCountryId of Object.keys(legacy.projects || {})) {
    const newCountryId = countryIdMap[oldCountryId];
    if (!newCountryId) continue; // pays orphelin → on saute
    for (const p of legacy.projects[oldCountryId] || []) {
      report(`Projet : ${p.name}`);
      try {
        const created = await insertProject(newCountryId, {
          name: p.name,
          sec: p.sec,
          dir: p.dir,
          secu: p.secu,
          verif: p.verif,
          mt: p.mt,
          desc: p.desc,
          lang: p.lang,
          tcon: p.tcon,
          ctx: p.ctx,
          site: p.site,
          resp: p.resp,
          eq: p.eq || [],
        });
        projectIdMap[p.id] = created.id;
        stats.projects++;
      } catch (err) {
        stats.errors.push(`Projet "${p.name}" : ${err.message}`);
      }
      done++;
    }
  }

  // ── 3) Markets ────────────────────────────────────────────────────────
  for (const oldProjectId of Object.keys(legacy.markets || {})) {
    const newProjectId = projectIdMap[oldProjectId];
    if (!newProjectId) continue;
    for (const m of legacy.markets[oldProjectId] || []) {
      report(`Marché : ${m.name}`);
      try {
        const created = await insertMarket(newProjectId, {
          name: m.name,
          type: m.type,
          tl: m.tl,
          cat: m.cat,
          role: m.role,
          meth: m.meth,
          mont: m.mont,
          st: m.st,
          dateAmi: m.dateAmi,
          dateLr: m.dateLr,
          dateDp: m.dateDp,
          dateSel: m.dateSel,
          dateSig: m.dateSig,
          notes: m.notes,
          editor_data: m.editor_data || {},
          legacyDtaoId: m.legacyDtaoId || null,
        });
        marketIdMap[m.id] = created.id;
        stats.markets++;
      } catch (err) {
        stats.errors.push(`Marché "${m.name}" : ${err.message}`);
      }
      done++;
    }
  }

  // ── 4) Reviews ────────────────────────────────────────────────────────
  for (const reviewKey of Object.keys(legacy.reviews || {})) {
    const [oldMarketId, tabId] = reviewKey.split("_");
    const newMarketId = marketIdMap[oldMarketId];
    if (!newMarketId) continue;
    const items = legacy.reviews[reviewKey] || {};
    for (const itemId of Object.keys(items)) {
      const entry = items[itemId];
      report(`Review ${itemId}`);
      try {
        await upsertReview(newMarketId, tabId, itemId, {
          status: entry.status,
          comment: entry.comment ?? "",
        });
        stats.reviews++;
      } catch (err) {
        stats.errors.push(`Review ${itemId} (marché ${oldMarketId}) : ${err.message}`);
      }
      done++;
    }
  }

  // ── 5) Text overrides ─────────────────────────────────────────────────
  for (const itemId of Object.keys(legacy.textOverrides || {})) {
    const fields = legacy.textOverrides[itemId];
    for (const field of Object.keys(fields)) {
      report(`Override ${itemId}.${field}`);
      try {
        await upsertTextOverride(itemId, field, fields[field]);
        stats.textOverrides++;
      } catch (err) {
        stats.errors.push(`Override ${itemId}/${field} : ${err.message}`);
      }
      done++;
    }
  }

  // ── 6) Rex items ──────────────────────────────────────────────────────
  for (const r of legacy.rexItems || []) {
    report(`REX : ${r.section || r.id}`);
    try {
      await insertRexItem({
        cat: r.cat,
        doc: r.doc,
        docLabel: r.docLabel,
        section: r.section,
        text: r.text,
        tip: r.tip,
        auteur: r.auteur,
        pays: r.pays,
        projet: r.projet,
        conditions: r.conditions,
        date: r.date,
      });
      stats.rexItems++;
    } catch (err) {
      stats.errors.push(`REX ${r.id} : ${err.message}`);
    }
    done++;
  }

  // ── 7) Custom retex ───────────────────────────────────────────────────
  for (const c of legacy.customRetex || []) {
    report(`Retex perso : ${(c.cm || "").slice(0, 40)}…`);
    try {
      await insertCustomRetex({
        kw: c.kw,
        th: c.th,
        cm: c.cm,
        ed: c.ed,
        pj: c.pj,
      });
      stats.customRetex++;
    } catch (err) {
      stats.errors.push(`Retex ${c.id} : ${err.message}`);
    }
    done++;
  }

  // ── 8) Équipe ─────────────────────────────────────────────────────────
  for (const name of legacy.equipe || []) {
    if (equipeSet.has(name)) {
      done++;
      continue;
    }
    report(`Équipe : ${name}`);
    try {
      await insertEquipeMember(name);
      stats.equipe++;
    } catch (err) {
      // 23505 = duplicate, ignoré côté insertEquipeMember
      stats.errors.push(`Équipe ${name} : ${err.message}`);
    }
    done++;
  }

  // ── 9) Ref versions ───────────────────────────────────────────────────
  for (const docId of Object.keys(legacy.refVersions || {})) {
    const v = legacy.refVersions[docId];
    if (!v || !v.ver) continue;
    report(`Version doc : ${docId}`);
    try {
      await upsertRefVersion(docId, {
        ver: v.ver,
        dir: v.dir,
        archived: v.archived,
        log: v.log || [],
      });
      stats.refVersions++;
    } catch (err) {
      stats.errors.push(`Doc ${docId} : ${err.message}`);
    }
    done++;
  }

  // ── Flag idempotent côté DB + localStorage ────────────────────────────
  try {
    await markLegacyMigrated();
  } catch (err) {
    // Pas bloquant — l'import a abouti, juste le flag profil qui rate.
    stats.errors.push(`Flag dao_profiles : ${err.message}`);
  }
  markImportDone();

  report("Terminé.");
  return stats;
}
