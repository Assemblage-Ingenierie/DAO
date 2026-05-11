// ── Plateforme — primitives CRUD Supabase (Phase 4) ────────────────────
//
// Couche fine entre l'app et la DB. Chaque fonction = 1 requête Supabase
// ciblée + mapping snake_case → camelCase à la sortie. Aucune logique
// d'état React ici — c'est `usePlatformData` qui orchestre l'hydratation
// initiale, le Realtime et l'optimistic update.
//
// Conventions :
//   - Mutations renvoient toujours l'objet inséré/mis à jour côté JS
//     (déjà passé par le mapper) pour permettre l'optimistic confirm.
//   - Erreurs : on throw l'objet Supabase tel quel. Les helpers du hook
//     posent les toasts et le rollback.
//   - `fetchPlatformData()` fait toutes les requêtes en parallèle et
//     retourne la même forme de graphe que l'ancien `loadPlatform()`
//     localStorage — facilite la cutover des pages.

import { supabase } from "../supabase/client.js";
import {
  country,
  customRetex,
  equipeFromDbList,
  equipeMember,
  market,
  profile,
  project,
  refVersion,
  refVersionsFromDbList,
  review,
  reviewsFromDbList,
  rexItem,
  textOverride,
  textOverridesFromDbList,
} from "./mappers.js";

// Sentinelle uniforme — facilite le debug en remontant le contexte.
function throwIfError(error, context) {
  if (error) {
    const err = new Error(`[supabase ${context}] ${error.message || error.code}`);
    err.cause = error;
    throw err;
  }
}

// ── Hydratation initiale ─────────────────────────────────────────────────

// Fetch parallèle des 9 tables visibles dans `data` côté pages. Cible la
// même forme qu'`loadPlatform()` (localStorage) pour limiter le diff sur
// les pages consommatrices. `dao_profiles` n'entre pas dans `data` —
// récupérée séparément par le hook auth.
export async function fetchPlatformData() {
  const [
    countriesRes,
    projectsRes,
    marketsRes,
    reviewsRes,
    textOverridesRes,
    rexItemsRes,
    customRetexRes,
    equipeRes,
    refVersionsRes,
  ] = await Promise.all([
    supabase.from("dao_countries").select("*").order("name"),
    supabase.from("dao_projects").select("*").order("name"),
    supabase.from("dao_markets").select("*").order("created_at"),
    supabase.from("dao_reviews").select("*"),
    supabase.from("dao_text_overrides").select("*"),
    supabase.from("dao_rex_items").select("*").order("created_at"),
    supabase.from("dao_custom_retex").select("*").order("created_at"),
    supabase.from("dao_equipe").select("*").order("name"),
    supabase.from("dao_ref_versions").select("*"),
  ]);

  throwIfError(countriesRes.error, "fetch countries");
  throwIfError(projectsRes.error, "fetch projects");
  throwIfError(marketsRes.error, "fetch markets");
  throwIfError(reviewsRes.error, "fetch reviews");
  throwIfError(textOverridesRes.error, "fetch text_overrides");
  throwIfError(rexItemsRes.error, "fetch rex_items");
  throwIfError(customRetexRes.error, "fetch custom_retex");
  throwIfError(equipeRes.error, "fetch equipe");
  throwIfError(refVersionsRes.error, "fetch ref_versions");

  const countries = countriesRes.data.map(country.fromDb);
  const projectsFlat = projectsRes.data.map(project.fromDb);
  const marketsFlat = marketsRes.data.map(market.fromDb);

  // Reconstitue les index par countryId / projectId (forme historique).
  const projectsByCountry = {};
  for (const c of countries) projectsByCountry[c.id] = [];
  for (const p of projectsFlat) {
    if (!projectsByCountry[p.countryId]) projectsByCountry[p.countryId] = [];
    projectsByCountry[p.countryId].push(p);
  }

  const marketsByProject = {};
  for (const p of projectsFlat) marketsByProject[p.id] = [];
  for (const m of marketsFlat) {
    if (!marketsByProject[m.projectId]) marketsByProject[m.projectId] = [];
    marketsByProject[m.projectId].push(m);
  }

  return {
    countries,
    projects: projectsByCountry,
    markets: marketsByProject,
    reviews: reviewsFromDbList(reviewsRes.data),
    textOverrides: textOverridesFromDbList(textOverridesRes.data),
    rexItems: rexItemsRes.data.map(rexItem.fromDb),
    customRetex: customRetexRes.data.map(customRetex.fromDb),
    equipe: equipeFromDbList(equipeRes.data),
    refVersions: refVersionsFromDbList(refVersionsRes.data),
  };
}

// ── dao_profiles ─────────────────────────────────────────────────────────

// Lit le profil du user courant (auto-créé par le trigger on_auth_user_created_dao).
// Renvoie null si pas de session active.
export async function fetchCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("dao_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  throwIfError(error, "fetch profile");
  return data ? profile.fromDb(data) : null;
}

export async function markLegacyMigrated() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("dao_profiles")
    .update({ legacy_platform_migrated: true })
    .eq("id", user.id);
  throwIfError(error, "mark legacy migrated");
}

// ── dao_countries ────────────────────────────────────────────────────────

export async function insertCountry(name) {
  const { data, error } = await supabase
    .from("dao_countries")
    .insert(country.toDb({ name }))
    .select()
    .single();
  throwIfError(error, "insert country");
  return country.fromDb(data);
}

export async function updateCountry(id, patch) {
  const { data, error } = await supabase
    .from("dao_countries")
    .update(country.toDb(patch))
    .eq("id", id)
    .select()
    .single();
  throwIfError(error, "update country");
  return country.fromDb(data);
}

export async function deleteCountry(id) {
  const { error } = await supabase.from("dao_countries").delete().eq("id", id);
  throwIfError(error, "delete country");
}

// ── dao_projects ─────────────────────────────────────────────────────────

export async function insertProject(countryId, partial) {
  const payload = project.toDb({
    countryId,
    dir: "2024",
    secu: "standard",
    verif: "eac",
    lang: "Français",
    eq: [],
    ...partial,
  });
  const { data, error } = await supabase
    .from("dao_projects")
    .insert(payload)
    .select()
    .single();
  throwIfError(error, "insert project");
  return project.fromDb(data);
}

export async function updateProject(id, patch) {
  const { data, error } = await supabase
    .from("dao_projects")
    .update(project.toDb(patch))
    .eq("id", id)
    .select()
    .single();
  throwIfError(error, "update project");
  return project.fromDb(data);
}

export async function deleteProject(id) {
  const { error } = await supabase.from("dao_projects").delete().eq("id", id);
  throwIfError(error, "delete project");
}

// ── dao_markets ──────────────────────────────────────────────────────────

export async function insertMarket(projectId, partial) {
  const payload = market.toDb({ projectId, ...partial });
  const { data, error } = await supabase
    .from("dao_markets")
    .insert(payload)
    .select()
    .single();
  throwIfError(error, "insert market");
  return market.fromDb(data);
}

export async function updateMarket(id, patch) {
  const { data, error } = await supabase
    .from("dao_markets")
    .update(market.toDb(patch))
    .eq("id", id)
    .select()
    .single();
  throwIfError(error, "update market");
  return market.fromDb(data);
}

export async function deleteMarket(id) {
  const { error } = await supabase.from("dao_markets").delete().eq("id", id);
  throwIfError(error, "delete market");
}

// Patch ciblé sur une seule clé du editor_data du marché. Évite de
// renvoyer tout le JSONB (50+ ko parfois) à chaque frappe — important
// pour le debounce 250 ms du DTAO Editor (cf. useMarketEditor).
//
// Postgres `jsonb_set` est appelé côté DB pour ne modifier qu'une clé.
// Si la clé n'existe pas, elle est créée. Si le path contient des
// éléments inexistants, ils sont aussi créés (option `true` à la fin).
export async function patchMarketEditorData(marketId, key, value) {
  const { data, error } = await supabase.rpc("dao_patch_market_editor_data", {
    p_market_id: marketId,
    p_key: key,
    p_value: value,
  });
  throwIfError(error, "patch market editor_data");
  return data ? market.fromDb(data) : null;
}

// Rename un marché (sync entre PREA-002 et market.name côté UI).
export async function renameMarket(id, newName) {
  return updateMarket(id, { name: newName });
}

// ── dao_reviews ──────────────────────────────────────────────────────────

// Upsert atomique : si la (market_id, tab_id, item_id) row existe, on
// la met à jour ; sinon on insert. Permet aux pages de faire
// `setReview(marketId, tabId, itemId, { status: 'ok' })` sans se soucier
// de l'existence préalable.
export async function upsertReview(marketId, tabId, itemId, patch) {
  const payload = {
    market_id: marketId,
    tab_id: tabId,
    item_id: itemId,
    ...review.toDb(patch),
  };
  const { data, error } = await supabase
    .from("dao_reviews")
    .upsert(payload, { onConflict: "market_id,tab_id,item_id" })
    .select()
    .single();
  throwIfError(error, "upsert review");
  return review.fromDb(data);
}

// ── dao_text_overrides ──────────────────────────────────────────────────

export async function upsertTextOverride(itemId, field, value) {
  const { data, error } = await supabase
    .from("dao_text_overrides")
    .upsert(
      { item_id: itemId, field, value },
      { onConflict: "item_id,field" },
    )
    .select()
    .single();
  throwIfError(error, "upsert text_override");
  return textOverride.fromDb(data);
}

// ── dao_rex_items ────────────────────────────────────────────────────────

export async function insertRexItem(partial) {
  const { data, error } = await supabase
    .from("dao_rex_items")
    .insert(rexItem.toDb(partial))
    .select()
    .single();
  throwIfError(error, "insert rex_item");
  return rexItem.fromDb(data);
}

export async function deleteRexItem(id) {
  const { error } = await supabase.from("dao_rex_items").delete().eq("id", id);
  throwIfError(error, "delete rex_item");
}

// ── dao_custom_retex ─────────────────────────────────────────────────────

export async function insertCustomRetex(partial) {
  const { data, error } = await supabase
    .from("dao_custom_retex")
    .insert(customRetex.toDb({ custom: true, ...partial }))
    .select()
    .single();
  throwIfError(error, "insert custom_retex");
  return customRetex.fromDb(data);
}

export async function deleteCustomRetex(id) {
  const { error } = await supabase.from("dao_custom_retex").delete().eq("id", id);
  throwIfError(error, "delete custom_retex");
}

// ── dao_equipe ───────────────────────────────────────────────────────────

export async function insertEquipeMember(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const { error } = await supabase
    .from("dao_equipe")
    .insert(equipeMember.toDb(trimmed))
    .select()
    .single();
  // Idempotent : "duplicate key" est silencieux (le user a déjà ajouté ce nom).
  if (error && error.code !== "23505") {
    throwIfError(error, "insert equipe");
  }
  return trimmed;
}

export async function deleteEquipeMember(name) {
  const { error } = await supabase.from("dao_equipe").delete().eq("name", name);
  throwIfError(error, "delete equipe");
}

// ── dao_ref_versions ─────────────────────────────────────────────────────

// Le JS gère 1 ligne par docId (la version courante). Upsert sur la PK
// composite (doc_id, ver) — si le `ver` change, on insère une nouvelle
// ligne (le fromDb prendra alors la 1ère rencontrée). Pour rester en
// 1 ligne par docId tel que le code actuel l'attend, on delete les
// anciennes versions du même docId avant l'upsert.
export async function upsertRefVersion(docId, partial) {
  const { ver } = partial;
  if (!ver) throw new Error("upsertRefVersion: 'ver' required");

  // Étape 1 : supprime les anciennes lignes pour ce docId (≠ ver)
  await supabase
    .from("dao_ref_versions")
    .delete()
    .eq("doc_id", docId)
    .neq("ver", ver);

  // Étape 2 : upsert sur (doc_id, ver)
  const { data, error } = await supabase
    .from("dao_ref_versions")
    .upsert(
      refVersion.toDb({ docId, ...partial }),
      { onConflict: "doc_id,ver" },
    )
    .select()
    .single();
  throwIfError(error, "upsert ref_version");
  return refVersion.fromDb(data);
}
