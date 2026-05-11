// Tests unitaires des helpers purs de platformStore.
//
// But : poser un filet de sécurité AVANT le refactor Phase 4 qui réécrira
// `loadPlatform/savePlatform` en backend Supabase. Toutes les fonctions
// testées ici sont des transformations data-in/data-out — pas de
// localStorage, pas de Supabase, juste de la donnée immuable.
//
// Exécution (après `npm install`) :
//   npm run test          # mode watch
//   npm run test:run      # une passe puis exit
//
// Si Vitest n'est pas encore installé, le script Node natif équivalent
// vit dans `scripts/verify-store/verify_platform_store.mjs` :
//   npm run test:store

import { describe, it, expect, beforeEach } from "vitest";
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
} from "./platformStore.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("defaultPlatformData", () => {
  it("retourne une structure vide cohérente", () => {
    const d = defaultPlatformData();
    expect(d.countries).toEqual([]);
    expect(d.projects).toEqual({});
    expect(d.markets).toEqual({});
    expect(Array.isArray(d.equipe)).toBe(true);
    expect(d.reviews).toEqual({});
    expect(d.textOverrides).toEqual({});
    expect(d.rexItems).toEqual([]);
  });
});

describe("addCountry", () => {
  it("ajoute un pays avec un UUID v4 et initialise sa liste de projets", () => {
    const d = addCountry(defaultPlatformData(), "Côte d'Ivoire");
    expect(d.countries).toHaveLength(1);
    expect(d.countries[0].name).toBe("Côte d'Ivoire");
    expect(d.countries[0].id).toMatch(UUID_RE);
    expect(d.projects[d.countries[0].id]).toEqual([]);
  });

  it("trim le nom et refuse les noms vides", () => {
    const d = addCountry(defaultPlatformData(), "   ");
    expect(d.countries).toHaveLength(0);

    const d2 = addCountry(defaultPlatformData(), "  Mali  ");
    expect(d2.countries[0].name).toBe("Mali");
  });

  it("ne mute jamais l'input (immuabilité)", () => {
    const src = defaultPlatformData();
    addCountry(src, "Sénégal");
    expect(src.countries).toEqual([]);
  });
});

describe("removeCountry — cascade", () => {
  it("supprime aussi les projets et marchés sous le pays", () => {
    let d = addCountry(defaultPlatformData(), "Tunisie");
    const countryId = d.countries[0].id;
    d = addProject(d, countryId, "Projet A");
    const projectId = d.projects[countryId][0].id;
    d = addMarket(d, projectId, { name: "Marché 1", type: "AO_TVX_PQ" });

    expect(d.projects[countryId]).toHaveLength(1);
    expect(d.markets[projectId]).toHaveLength(1);

    d = removeCountry(d, countryId);
    expect(d.countries).toHaveLength(0);
    expect(d.projects[countryId]).toBeUndefined();
    expect(d.markets[projectId]).toBeUndefined();
  });

  it("est tolérant à un ID legacy (préfixé 'C')", () => {
    let d = defaultPlatformData();
    d = { ...d, countries: [{ id: "C1715000000000", name: "Legacy" }], projects: { C1715000000000: [] } };
    d = removeCountry(d, "C1715000000000");
    expect(d.countries).toHaveLength(0);
  });
});

describe("addProject / removeProject / updateProject", () => {
  let d;
  let countryId;

  beforeEach(() => {
    d = addCountry(defaultPlatformData(), "Mali");
    countryId = d.countries[0].id;
  });

  it("addProject crée un projet UUID avec defaults", () => {
    d = addProject(d, countryId, "Centre médical");
    const p = d.projects[countryId][0];
    expect(p.id).toMatch(UUID_RE);
    expect(p.name).toBe("Centre médical");
    expect(p.dir).toBe("2024");
    expect(p.secu).toBe("standard");
    expect(p.lang).toBe("Français");
    expect(d.markets[p.id]).toEqual([]);
  });

  it("addProject refuse un nom vide ou un countryId manquant", () => {
    expect(addProject(d, countryId, "").projects[countryId]).toEqual([]);
    expect(addProject(d, null, "x").projects[countryId]).toEqual([]);
  });

  it("removeProject supprime aussi les marchés associés", () => {
    d = addProject(d, countryId, "Projet A");
    const projectId = d.projects[countryId][0].id;
    d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
    expect(d.markets[projectId]).toHaveLength(1);

    d = removeProject(d, countryId, projectId);
    expect(d.projects[countryId]).toHaveLength(0);
    expect(d.markets[projectId]).toBeUndefined();
  });

  it("updateProject patche les champs ciblés sans toucher au reste", () => {
    d = addProject(d, countryId, "Projet A");
    const projectId = d.projects[countryId][0].id;
    d = updateProject(d, countryId, projectId, { sec: "Eau", dir: "2019" });
    const p = d.projects[countryId][0];
    expect(p.sec).toBe("Eau");
    expect(p.dir).toBe("2019");
    expect(p.name).toBe("Projet A");
    expect(p.id).toBe(projectId);
  });
});

describe("toggleProjectMember", () => {
  it("ajoute puis retire un membre de l'équipe projet", () => {
    let d = addCountry(defaultPlatformData(), "Maroc");
    const countryId = d.countries[0].id;
    d = addProject(d, countryId, "Projet");
    const projectId = d.projects[countryId][0].id;

    d = toggleProjectMember(d, countryId, projectId, "Alice");
    expect(d.projects[countryId][0].eq).toEqual(["Alice"]);

    d = toggleProjectMember(d, countryId, projectId, "Bob");
    expect(d.projects[countryId][0].eq).toEqual(["Alice", "Bob"]);

    d = toggleProjectMember(d, countryId, projectId, "Alice");
    expect(d.projects[countryId][0].eq).toEqual(["Bob"]);
  });

  it("est no-op si le projet n'existe pas", () => {
    let d = addCountry(defaultPlatformData(), "X");
    const countryId = d.countries[0].id;
    const r = toggleProjectMember(d, countryId, "missing-id", "Alice");
    expect(r).toBe(d);
  });
});

describe("addMarket / removeMarket / updateMarket", () => {
  let d;
  let projectId;

  beforeEach(() => {
    d = addCountry(defaultPlatformData(), "Sénégal");
    const countryId = d.countries[0].id;
    d = addProject(d, countryId, "Projet");
    projectId = d.projects[countryId][0].id;
  });

  it("addMarket pose une date ISO par défaut et UUID id", () => {
    d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
    const m = d.markets[projectId][0];
    expect(m.id).toMatch(UUID_RE);
    expect(m.name).toBe("M1");
    expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("updateMarket patche un champ sans casser les autres", () => {
    d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
    const marketId = d.markets[projectId][0].id;
    d = updateMarket(d, projectId, marketId, { mont: "10M EUR", st: "en cours" });
    const m = d.markets[projectId][0];
    expect(m.mont).toBe("10M EUR");
    expect(m.st).toBe("en cours");
    expect(m.name).toBe("M1");
    expect(m.id).toBe(marketId);
  });

  it("removeMarket retire seulement le marché ciblé", () => {
    d = addMarket(d, projectId, { name: "M1", type: "AO_TVX_PQ" });
    d = addMarket(d, projectId, { name: "M2", type: "AO_TVX_PQ" });
    const firstId = d.markets[projectId][0].id;
    d = removeMarket(d, projectId, firstId);
    expect(d.markets[projectId]).toHaveLength(1);
    expect(d.markets[projectId][0].name).toBe("M2");
  });
});

describe("addEquipeMember", () => {
  it("ajoute un membre unique et ignore les doublons", () => {
    let d = addEquipeMember(defaultPlatformData(), "Maël");
    expect(d.equipe).toContain("Maël");
    const before = d.equipe.length;
    d = addEquipeMember(d, "Maël");
    expect(d.equipe.length).toBe(before);
  });

  it("trim et refuse les noms vides", () => {
    const d = addEquipeMember(defaultPlatformData(), "   ");
    const baseLen = defaultPlatformData().equipe.length;
    expect(d.equipe.length).toBe(baseLen);
  });
});

describe("loadPlatform — robustesse au localStorage corrompu", () => {
  beforeEach(() => {
    // Polyfill localStorage en mémoire pour les tests Node.
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
    };
  });

  it("retourne defaults si la clé est absente", () => {
    const d = loadPlatform();
    expect(d).toEqual(defaultPlatformData());
  });

  it("retourne defaults si le JSON est corrompu", () => {
    globalThis.localStorage.setItem(PLATFORM_KEY, "{ not json");
    const d = loadPlatform();
    expect(d.countries).toEqual([]);
  });

  it("merge defaults + données partielles (champ manquant → default)", () => {
    globalThis.localStorage.setItem(
      PLATFORM_KEY,
      JSON.stringify({ countries: [{ id: "X", name: "Test" }] }),
    );
    const d = loadPlatform();
    expect(d.countries).toEqual([{ id: "X", name: "Test" }]);
    expect(d.rexItems).toEqual([]);
    expect(d.reviews).toEqual({});
  });
});

describe("resetPlatform", () => {
  it("revient à la forme par défaut", () => {
    let d = addCountry(defaultPlatformData(), "X");
    d = addEquipeMember(d, "Alice");
    const reset = resetPlatform();
    expect(reset).toEqual(defaultPlatformData());
  });
});
