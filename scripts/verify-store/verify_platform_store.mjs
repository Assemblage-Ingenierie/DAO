// Runner Node natif équivalent aux tests Vitest de `platformStore.test.js`.
//
// But : permettre de valider les helpers purs SANS avoir installé vitest
// (qui pèse plusieurs Mo et nécessite un `npm install` complet — pas
// toujours possible si node_modules vit sur Google Drive, cf. dev.bat).
// Pattern aligné sur les scripts `scripts/verify-export/verify_*.mjs`
// déjà présents dans le repo.
//
// Exécution :
//   npm run test:store
//   # ou directement
//   node --test scripts/verify-store/verify_platform_store.mjs
//
// Les tests Vitest dans `src/platform/store/platformStore.test.js` sont
// la source de vérité — ce script est un mirror pour validation rapide.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultPlatformData,
  addCountry,
  removeCountry,
  addProject,
  removeProject,
  updateProject,
  toggleProjectMember,
  addMarket,
  removeMarket,
  updateMarket,
  addEquipeMember,
  resetPlatform,
  loadPlatform,
  PLATFORM_KEY,
} from "../../src/platform/store/platformStore.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test("defaultPlatformData — forme cohérente", () => {
  const d = defaultPlatformData();
  assert.deepEqual(d.countries, []);
  assert.deepEqual(d.projects, {});
  assert.deepEqual(d.markets, {});
  assert.ok(Array.isArray(d.equipe));
  assert.deepEqual(d.reviews, {});
  assert.deepEqual(d.textOverrides, {});
  assert.deepEqual(d.rexItems, []);
});

test("addCountry — UUID v4 + slot projet initialisé", () => {
  const d = addCountry(defaultPlatformData(), "Côte d'Ivoire");
  assert.equal(d.countries.length, 1);
  assert.equal(d.countries[0].name, "Côte d'Ivoire");
  assert.match(d.countries[0].id, UUID_RE);
  assert.deepEqual(d.projects[d.countries[0].id], []);
});

test("addCountry — trim + refuse nom vide", () => {
  assert.equal(addCountry(defaultPlatformData(), "   ").countries.length, 0);
  assert.equal(addCountry(defaultPlatformData(), "  Mali  ").countries[0].name, "Mali");
});

test("addCountry — immutable (ne mute pas l'input)", () => {
  const src = defaultPlatformData();
  addCountry(src, "Sénégal");
  assert.deepEqual(src.countries, []);
});

test("removeCountry — cascade projets + marchés", () => {
  let d = addCountry(defaultPlatformData(), "Tunisie");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "Projet A");
  const projectId = d.projects[countryId][0].id;
  d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
  assert.equal(d.projects[countryId].length, 1);
  assert.equal(d.markets[projectId].length, 1);

  d = removeCountry(d, countryId);
  assert.equal(d.countries.length, 0);
  assert.equal(d.projects[countryId], undefined);
  assert.equal(d.markets[projectId], undefined);
});

test("removeCountry — tolérant à un ID legacy 'C<timestamp>'", () => {
  let d = defaultPlatformData();
  d = { ...d, countries: [{ id: "C1715000000000", name: "Legacy" }], projects: { C1715000000000: [] } };
  d = removeCountry(d, "C1715000000000");
  assert.equal(d.countries.length, 0);
});

test("addProject — UUID + defaults métier", () => {
  let d = addCountry(defaultPlatformData(), "Mali");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "Centre médical");
  const p = d.projects[countryId][0];
  assert.match(p.id, UUID_RE);
  assert.equal(p.name, "Centre médical");
  assert.equal(p.dir, "2024");
  assert.equal(p.secu, "standard");
  assert.equal(p.lang, "Français");
  assert.deepEqual(d.markets[p.id], []);
});

test("addProject — refus nom vide / countryId manquant", () => {
  let d = addCountry(defaultPlatformData(), "Mali");
  const countryId = d.countries[0].id;
  assert.deepEqual(addProject(d, countryId, "").projects[countryId], []);
  assert.deepEqual(addProject(d, null, "x").projects[countryId], []);
});

test("removeProject — cascade marchés", () => {
  let d = addCountry(defaultPlatformData(), "Mali");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "P");
  const projectId = d.projects[countryId][0].id;
  d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
  d = removeProject(d, countryId, projectId);
  assert.equal(d.projects[countryId].length, 0);
  assert.equal(d.markets[projectId], undefined);
});

test("updateProject — patch ciblé, autres champs préservés", () => {
  let d = addCountry(defaultPlatformData(), "Mali");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "P");
  const projectId = d.projects[countryId][0].id;
  d = updateProject(d, countryId, projectId, { sec: "Eau", dir: "2019" });
  const p = d.projects[countryId][0];
  assert.equal(p.sec, "Eau");
  assert.equal(p.dir, "2019");
  assert.equal(p.name, "P");
  assert.equal(p.id, projectId);
});

test("toggleProjectMember — add then remove", () => {
  let d = addCountry(defaultPlatformData(), "Maroc");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "P");
  const projectId = d.projects[countryId][0].id;
  d = toggleProjectMember(d, countryId, projectId, "Alice");
  assert.deepEqual(d.projects[countryId][0].eq, ["Alice"]);
  d = toggleProjectMember(d, countryId, projectId, "Bob");
  assert.deepEqual(d.projects[countryId][0].eq, ["Alice", "Bob"]);
  d = toggleProjectMember(d, countryId, projectId, "Alice");
  assert.deepEqual(d.projects[countryId][0].eq, ["Bob"]);
});

test("toggleProjectMember — no-op si projet introuvable", () => {
  let d = addCountry(defaultPlatformData(), "X");
  const countryId = d.countries[0].id;
  const r = toggleProjectMember(d, countryId, "missing-id", "Alice");
  assert.equal(r, d);
});

test("addMarket — date ISO par défaut + UUID", () => {
  let d = addCountry(defaultPlatformData(), "Sénégal");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "P");
  const projectId = d.projects[countryId][0].id;
  d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
  const m = d.markets[projectId][0];
  assert.match(m.id, UUID_RE);
  assert.equal(m.name, "M1");
  assert.match(m.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("updateMarket — patch sans casse + id préservé", () => {
  let d = addCountry(defaultPlatformData(), "Sénégal");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "P");
  const projectId = d.projects[countryId][0].id;
  d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
  const marketId = d.markets[projectId][0].id;
  d = updateMarket(d, projectId, marketId, { mont: "10M EUR", st: "en cours" });
  const m = d.markets[projectId][0];
  assert.equal(m.mont, "10M EUR");
  assert.equal(m.st, "en cours");
  assert.equal(m.name, "M1");
  assert.equal(m.id, marketId);
});

test("removeMarket — retire seulement le marché ciblé", () => {
  let d = addCountry(defaultPlatformData(), "Sénégal");
  const countryId = d.countries[0].id;
  d = addProject(d, countryId, "P");
  const projectId = d.projects[countryId][0].id;
  d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
  d = addMarket(d, projectId, { name: "M2", type: "AO_TVX_PQ" });
  const firstId = d.markets[projectId][0].id;
  d = removeMarket(d, projectId, firstId);
  assert.equal(d.markets[projectId].length, 1);
  assert.equal(d.markets[projectId][0].name, "M2");
});

test("addEquipeMember — unique + trim + refus vide", () => {
  let d = addEquipeMember(defaultPlatformData(), "Maël");
  assert.ok(d.equipe.includes("Maël"));
  const before = d.equipe.length;
  d = addEquipeMember(d, "Maël");
  assert.equal(d.equipe.length, before);
  const baseLen = defaultPlatformData().equipe.length;
  const d2 = addEquipeMember(defaultPlatformData(), "   ");
  assert.equal(d2.equipe.length, baseLen);
});

test("loadPlatform — defaults si clé absente", () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const d = loadPlatform();
  assert.deepEqual(d, defaultPlatformData());
});

test("loadPlatform — defaults si JSON corrompu", () => {
  const store = { [PLATFORM_KEY]: "{ not json" };
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const d = loadPlatform();
  assert.deepEqual(d.countries, []);
});

test("loadPlatform — merge defaults + données partielles", () => {
  const store = {
    [PLATFORM_KEY]: JSON.stringify({ countries: [{ id: "X", name: "Test" }] }),
  };
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const d = loadPlatform();
  assert.deepEqual(d.countries, [{ id: "X", name: "Test" }]);
  assert.deepEqual(d.rexItems, []);
  assert.deepEqual(d.reviews, {});
});

test("resetPlatform — retourne defaults", () => {
  assert.deepEqual(resetPlatform(), defaultPlatformData());
});
