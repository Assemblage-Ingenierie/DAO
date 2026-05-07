// ── Plateforme — store localStorage ──────────────────────────────────────
//
// Persistance localStorage du modèle de données Plateforme. Couche
// transitoire avant Supabase (phase 4). Une seule clé `afd_platform_v1`
// contient tout le graphe pays → projets → marchés + reviews + équipe.
//
// Modèle (extrait du single-file `_imports/plateforme-source.jsx`,
// ligne 480) :
//   {
//     countries:   [{ id, name }],
//     projects:    { [countryId]: [{ id, name, sec, dir, secu, verif, mt,
//                                    desc, lang, tcon, ctx, site, resp, eq[] }] },
//     markets:     { [projectId]: [{ id, name, type, tl, cat, role, meth,
//                                    mont, st, date, dateAmi, dateLr,
//                                    dateDp, dateSel, dateSig, notes }] },
//     equipe:      [string],
//     reviews:     { [marketId+"_"+tab]: { [itemId]: { status, comment } } },
//     textOverrides: { [itemId]: { text, tip } },
//     rexItems:    [{ id, cat, doc, docLabel, section, text, tip, auteur,
//                     pays, projet, conditions, date }]
//   }
//
// Le couplage avec le DTAO (un marché AO Travaux production = un projet
// DTAO) viendra en 3.5 via un slot `editor_data` dans market.

import { DEQ } from "../data/types.js";

export const PLATFORM_KEY = "afd_platform_v1";

// Forme par défaut pour un store vierge — équipe = DEQ par défaut.
export function defaultPlatformData() {
  return {
    countries: [],
    projects: {},
    markets: {},
    equipe: DEQ,
    reviews: {},
    textOverrides: {},
    rexItems: [],
  };
}

export function loadPlatform() {
  if (typeof localStorage === "undefined") return defaultPlatformData();
  try {
    const raw = localStorage.getItem(PLATFORM_KEY);
    if (!raw) return defaultPlatformData();
    const parsed = JSON.parse(raw);
    return { ...defaultPlatformData(), ...parsed };
  } catch (e) {
    console.error("[platformStore] load failed:", e);
    return defaultPlatformData();
  }
}

export function savePlatform(data) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLATFORM_KEY, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("afd:platform-changed"));
    }
  } catch (e) {
    console.error("[platformStore] save failed:", e);
  }
}

// ── Helpers immutables — purs (data in / data out) ──────────────────────
// Les pages les composent avec savePlatform pour persister.

export function addCountry(data, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return data;
  const id = "C" + Date.now();
  return {
    ...data,
    countries: [...data.countries, { id, name: trimmed }],
    projects: { ...data.projects, [id]: [] },
  };
}

export function removeCountry(data, countryId) {
  const next = { ...data, countries: data.countries.filter((c) => c.id !== countryId) };
  const projectsCopy = { ...data.projects };
  const marketsCopy = { ...data.markets };
  (data.projects[countryId] || []).forEach((p) => {
    delete marketsCopy[p.id];
  });
  delete projectsCopy[countryId];
  next.projects = projectsCopy;
  next.markets = marketsCopy;
  return next;
}

export function addProject(data, countryId, name) {
  const trimmed = (name || "").trim();
  if (!trimmed || !countryId) return data;
  const id = "P" + Date.now();
  const newProject = {
    id,
    name: trimmed,
    sec: "",
    dir: "2024",
    secu: "standard",
    verif: "eac",
    mt: "",
    desc: "",
    lang: "Français",
    tcon: "",
    ctx: "",
    site: "",
    resp: "",
    eq: [],
  };
  return {
    ...data,
    projects: {
      ...data.projects,
      [countryId]: [...(data.projects[countryId] || []), newProject],
    },
    markets: { ...data.markets, [id]: [] },
  };
}

export function removeProject(data, countryId, projectId) {
  const projectsCopy = {
    ...data.projects,
    [countryId]: (data.projects[countryId] || []).filter((p) => p.id !== projectId),
  };
  const marketsCopy = { ...data.markets };
  delete marketsCopy[projectId];
  return { ...data, projects: projectsCopy, markets: marketsCopy };
}

export function updateProject(data, countryId, projectId, updates) {
  return {
    ...data,
    projects: {
      ...data.projects,
      [countryId]: (data.projects[countryId] || []).map((p) =>
        p.id === projectId ? { ...p, ...updates } : p,
      ),
    },
  };
}

export function toggleProjectMember(data, countryId, projectId, memberName) {
  const project = (data.projects[countryId] || []).find((p) => p.id === projectId);
  if (!project) return data;
  const eq = project.eq || [];
  const newEq = eq.includes(memberName)
    ? eq.filter((n) => n !== memberName)
    : [...eq, memberName];
  return updateProject(data, countryId, projectId, { eq: newEq });
}

export function addMarket(data, projectId, market) {
  if (!projectId) return data;
  const id = "M" + Date.now();
  const fullMarket = {
    id,
    date: new Date().toISOString().slice(0, 10),
    ...market,
  };
  return {
    ...data,
    markets: {
      ...data.markets,
      [projectId]: [...(data.markets[projectId] || []), fullMarket],
    },
  };
}

export function removeMarket(data, projectId, marketId) {
  return {
    ...data,
    markets: {
      ...data.markets,
      [projectId]: (data.markets[projectId] || []).filter((m) => m.id !== marketId),
    },
  };
}

export function updateMarket(data, projectId, marketId, updates) {
  return {
    ...data,
    markets: {
      ...data.markets,
      [projectId]: (data.markets[projectId] || []).map((m) =>
        m.id === marketId ? { ...m, ...updates } : m,
      ),
    },
  };
}

export function addEquipeMember(data, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return data;
  if ((data.equipe || []).includes(trimmed)) return data;
  return { ...data, equipe: [...(data.equipe || []), trimmed] };
}

export function resetPlatform() {
  return defaultPlatformData();
}
