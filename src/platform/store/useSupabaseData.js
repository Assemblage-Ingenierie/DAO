// ── Plateforme — hook orchestrateur Supabase (Phase 4) ─────────────────
//
// ⚠️ FOUNDATION — pas encore câblé. À la place du legacy `usePlatformData`
// (localStorage), ce hook hydrate depuis Supabase + souscrit Realtime sur
// les 9 tables `dao_*`. La cutover des pages se fera dans un commit
// séparé (chaque page passe de `[data, setData]` → `[data, mutate]`).
//
// API publique :
//   `const [data, mutate, status, session] = useSupabaseData()`
//
//   - `data`     : graphe complet (countries/projects/markets/reviews/...)
//                  même forme qu'`loadPlatform()` pour minimiser le diff
//                  côté pages.
//   - `mutate`   : objet de mutations granulaires. Chaque méthode est
//                  async, applique optimistiquement le patch local et
//                  commit vers Supabase ; en cas d'erreur, rollback.
//   - `status`   : "loading" | "ready" | "error" | "unauthenticated".
//   - `session`  : objet auth Supabase (ou null).

import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/client.js";
import {
  fetchPlatformData,
  insertCountry,
  updateCountry,
  deleteCountry,
  insertProject,
  updateProject,
  deleteProject,
  insertMarket,
  updateMarket,
  deleteMarket,
  upsertReview,
  upsertTextOverride,
  insertRexItem,
  deleteRexItem,
  insertCustomRetex,
  deleteCustomRetex,
  insertEquipeMember,
  deleteEquipeMember,
  upsertRefVersion,
} from "./supabaseMutations.js";
import {
  country as countryMapper,
  project as projectMapper,
  market as marketMapper,
  rexItem as rexItemMapper,
  customRetex as customRetexMapper,
  refVersion as refVersionMapper,
} from "./mappers.js";

// Graphe vide — utilisé tant que le fetch initial n'est pas terminé,
// pour que les pages ne crashent pas en lisant `data.countries.map(...)`.
function emptyGraph() {
  return {
    countries: [],
    projects: {},
    markets: {},
    reviews: {},
    textOverrides: {},
    rexItems: [],
    customRetex: [],
    equipe: [],
    refVersions: {},
  };
}

// ── Reducers internes (optimistic + Realtime apply réutilisent) ──────

function applyCountryUpsert(data, c) {
  const exists = data.countries.some((x) => x.id === c.id);
  const countries = exists
    ? data.countries.map((x) => (x.id === c.id ? c : x))
    : [...data.countries, c];
  const projects = data.projects[c.id] ? data.projects : { ...data.projects, [c.id]: [] };
  return { ...data, countries, projects };
}

function applyCountryDelete(data, id) {
  const countries = data.countries.filter((c) => c.id !== id);
  const projects = { ...data.projects };
  const markets = { ...data.markets };
  (data.projects[id] || []).forEach((p) => {
    delete markets[p.id];
  });
  delete projects[id];
  return { ...data, countries, projects, markets };
}

function applyProjectUpsert(data, p) {
  const list = data.projects[p.countryId] || [];
  const exists = list.some((x) => x.id === p.id);
  const nextList = exists ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p];
  const projects = { ...data.projects, [p.countryId]: nextList };
  const markets = data.markets[p.id] ? data.markets : { ...data.markets, [p.id]: [] };
  return { ...data, projects, markets };
}

function applyProjectDelete(data, id) {
  const projects = {};
  for (const cId of Object.keys(data.projects)) {
    projects[cId] = (data.projects[cId] || []).filter((p) => p.id !== id);
  }
  const markets = { ...data.markets };
  delete markets[id];
  return { ...data, projects, markets };
}

function applyMarketUpsert(data, m) {
  const list = data.markets[m.projectId] || [];
  const exists = list.some((x) => x.id === m.id);
  const nextList = exists ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m];
  return { ...data, markets: { ...data.markets, [m.projectId]: nextList } };
}

function applyMarketDelete(data, id) {
  const markets = {};
  for (const pId of Object.keys(data.markets)) {
    markets[pId] = (data.markets[pId] || []).filter((m) => m.id !== id);
  }
  const reviews = { ...data.reviews };
  for (const key of Object.keys(reviews)) {
    if (key.startsWith(id + "_")) delete reviews[key];
  }
  return { ...data, markets, reviews };
}

function applyReviewUpsert(data, r) {
  const key = r.marketId + "_" + r.tabId;
  const slot = data.reviews[key] || {};
  return {
    ...data,
    reviews: {
      ...data.reviews,
      [key]: { ...slot, [r.itemId]: { status: r.status, comment: r.comment } },
    },
  };
}

function applyReviewDelete(data, r) {
  const key = r.marketId + "_" + r.tabId;
  if (!data.reviews[key]) return data;
  const next = { ...data.reviews[key] };
  delete next[r.itemId];
  return { ...data, reviews: { ...data.reviews, [key]: next } };
}

function applyTextOverrideUpsert(data, t) {
  const slot = data.textOverrides[t.itemId] || {};
  return {
    ...data,
    textOverrides: { ...data.textOverrides, [t.itemId]: { ...slot, [t.field]: t.value } },
  };
}

function applyRexItemUpsert(data, r) {
  const exists = data.rexItems.some((x) => x.id === r.id);
  const rexItems = exists
    ? data.rexItems.map((x) => (x.id === r.id ? r : x))
    : [...data.rexItems, r];
  return { ...data, rexItems };
}

function applyRexItemDelete(data, id) {
  return { ...data, rexItems: data.rexItems.filter((r) => r.id !== id) };
}

function applyCustomRetexUpsert(data, c) {
  const exists = data.customRetex.some((x) => x.id === c.id);
  const customRetex = exists
    ? data.customRetex.map((x) => (x.id === c.id ? c : x))
    : [...data.customRetex, c];
  return { ...data, customRetex };
}

function applyCustomRetexDelete(data, id) {
  return { ...data, customRetex: data.customRetex.filter((c) => c.id !== id) };
}

function applyEquipeAdd(data, name) {
  if (data.equipe.includes(name)) return data;
  return { ...data, equipe: [...data.equipe, name] };
}

function applyEquipeDelete(data, name) {
  return { ...data, equipe: data.equipe.filter((n) => n !== name) };
}

function applyRefVersionUpsert(data, v) {
  return {
    ...data,
    refVersions: {
      ...data.refVersions,
      [v.docId]: { ver: v.ver, dir: v.dir, archived: v.archived, log: v.log },
    },
  };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useSupabaseData() {
  const [data, setData] = useState(emptyGraph);
  const [status, setStatus] = useState("loading");
  const [session, setSession] = useState(null);

  // Garde une référence fraîche à `data` pour les mutations async qui ont
  // besoin de lire l'état courant en-dehors d'un setData updater (ex:
  // toggleProjectMember doit calculer le nouveau tableau `eq` à partir de
  // l'ancien). Sans cette ref, les closures captureraient une version
  // périmée au moment de la création de `mutate`.
  const dataRef = useRef(data);
  dataRef.current = data;

  // Auth session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Hydratation au login
  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setStatus("unauthenticated");
      setData(emptyGraph());
      return;
    }
    setStatus("loading");
    fetchPlatformData()
      .then((graph) => {
        if (!cancelled) {
          setData(graph);
          setStatus("ready");
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[useSupabaseData] initial fetch failed:", err);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Realtime subscription sur les 9 tables (dao_profiles exclue)
  useEffect(() => {
    if (!session || status !== "ready") return;

    const channel = supabase.channel("dao-platform");

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_countries" }, (p) => {
        setData((d) =>
          p.eventType === "DELETE"
            ? applyCountryDelete(d, p.old.id)
            : applyCountryUpsert(d, countryMapper.fromDb(p.new)),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_projects" }, (p) => {
        setData((d) =>
          p.eventType === "DELETE"
            ? applyProjectDelete(d, p.old.id)
            : applyProjectUpsert(d, projectMapper.fromDb(p.new)),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_markets" }, (p) => {
        setData((d) =>
          p.eventType === "DELETE"
            ? applyMarketDelete(d, p.old.id)
            : applyMarketUpsert(d, marketMapper.fromDb(p.new)),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_reviews" }, (p) => {
        setData((d) => {
          if (p.eventType === "DELETE") {
            return applyReviewDelete(d, {
              marketId: p.old.market_id,
              tabId: p.old.tab_id,
              itemId: p.old.item_id,
            });
          }
          return applyReviewUpsert(d, {
            marketId: p.new.market_id,
            tabId: p.new.tab_id,
            itemId: p.new.item_id,
            status: p.new.status,
            comment: p.new.comment ?? "",
          });
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_text_overrides" }, (p) => {
        if (p.eventType === "DELETE") return;
        setData((d) =>
          applyTextOverrideUpsert(d, {
            itemId: p.new.item_id,
            field: p.new.field,
            value: p.new.value,
          }),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_rex_items" }, (p) => {
        setData((d) =>
          p.eventType === "DELETE"
            ? applyRexItemDelete(d, p.old.id)
            : applyRexItemUpsert(d, rexItemMapper.fromDb(p.new)),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_custom_retex" }, (p) => {
        setData((d) =>
          p.eventType === "DELETE"
            ? applyCustomRetexDelete(d, p.old.id)
            : applyCustomRetexUpsert(d, customRetexMapper.fromDb(p.new)),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_equipe" }, (p) => {
        setData((d) =>
          p.eventType === "DELETE"
            ? applyEquipeDelete(d, p.old.name)
            : applyEquipeAdd(d, p.new.name),
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dao_ref_versions" }, (p) => {
        setData((d) => {
          if (p.eventType === "DELETE") {
            if (d.refVersions[p.old.doc_id]?.ver === p.old.ver) {
              const next = { ...d.refVersions };
              delete next[p.old.doc_id];
              return { ...d, refVersions: next };
            }
            return d;
          }
          return applyRefVersionUpsert(d, refVersionMapper.fromDb(p.new));
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, status]);

  // ── Mutate API ───────────────────────────────────────────────────────
  //
  // Pattern optimistic : apply local immédiat → commit Supabase → rollback
  // si erreur. L'écho Realtime de notre propre mutation rejoue idempotent
  // (même id, setData(applyXxxUpsert) remplace par la version finale).
  const mutate = useRef(null);
  if (!mutate.current) {
    const optimistic = async (apply, call) => {
      let snapshot = null;
      setData((d) => {
        snapshot = d;
        return apply(d);
      });
      try {
        return await call();
      } catch (err) {
        if (snapshot) setData(snapshot);
        throw err;
      }
    };

    mutate.current = {
      // ── countries ──
      addCountry: async (name) => {
        const trimmed = (name || "").trim();
        if (!trimmed) return null;
        const tempId = crypto.randomUUID();
        const result = await optimistic(
          (d) => applyCountryUpsert(d, { id: tempId, name: trimmed }),
          async () => insertCountry(trimmed),
        );
        setData((d) => applyCountryUpsert(applyCountryDelete(d, tempId), result));
        return result;
      },
      removeCountry: (id) =>
        optimistic((d) => applyCountryDelete(d, id), async () => deleteCountry(id)),

      // ── projects ──
      addProject: async (countryId, name) => {
        const trimmed = (name || "").trim();
        if (!trimmed || !countryId) return null;
        const tempId = crypto.randomUUID();
        const opt = {
          id: tempId,
          countryId,
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
        const result = await optimistic(
          (d) => applyProjectUpsert(d, opt),
          async () => insertProject(countryId, { name: trimmed }),
        );
        setData((d) => applyProjectUpsert(applyProjectDelete(d, tempId), result));
        return result;
      },
      updateProject: async (countryId, projectId, patch) =>
        optimistic(
          (d) => {
            const found = (d.projects[countryId] || []).find((p) => p.id === projectId);
            if (!found) return d;
            return applyProjectUpsert(d, { ...found, ...patch });
          },
          async () => updateProject(projectId, patch),
        ),
      removeProject: (projectId) =>
        optimistic((d) => applyProjectDelete(d, projectId), async () => deleteProject(projectId)),
      toggleProjectMember: async (countryId, projectId, memberName) => {
        // Calcule nextEq UNE fois, le réutilise pour l'apply local ET le call.
        const list = dataRef.current.projects[countryId] || [];
        const found = list.find((p) => p.id === projectId);
        if (!found) return null;
        const eq = found.eq || [];
        const nextEq = eq.includes(memberName)
          ? eq.filter((n) => n !== memberName)
          : [...eq, memberName];
        return optimistic(
          (d) => {
            const cur = (d.projects[countryId] || []).find((p) => p.id === projectId);
            if (!cur) return d;
            return applyProjectUpsert(d, { ...cur, eq: nextEq });
          },
          async () => updateProject(projectId, { eq: nextEq }),
        );
      },

      // ── markets ──
      addMarket: async (projectId, partial) => {
        const tempId = crypto.randomUUID();
        const opt = {
          id: tempId,
          projectId,
          name: partial.name || "Marché",
          type: partial.type || "",
          tl: partial.tl || "",
          cat: partial.cat || "",
          role: partial.role || "production",
          meth: partial.meth || "",
          mont: partial.mont || "",
          st: partial.st || "",
          dateAmi: partial.dateAmi || "",
          dateLr: partial.dateLr || "",
          dateDp: partial.dateDp || "",
          dateSel: partial.dateSel || "",
          dateSig: partial.dateSig || "",
          notes: partial.notes || "",
          editor_data: partial.editor_data || {},
          legacyDtaoId: partial.legacyDtaoId || null,
        };
        const result = await optimistic(
          (d) => applyMarketUpsert(d, opt),
          async () => insertMarket(projectId, partial),
        );
        setData((d) => applyMarketUpsert(applyMarketDelete(d, tempId), result));
        return result;
      },
      updateMarket: async (projectId, marketId, patch) =>
        optimistic(
          (d) => {
            const found = (d.markets[projectId] || []).find((m) => m.id === marketId);
            if (!found) return d;
            return applyMarketUpsert(d, { ...found, ...patch });
          },
          async () => updateMarket(marketId, patch),
        ),
      removeMarket: (marketId) =>
        optimistic((d) => applyMarketDelete(d, marketId), async () => deleteMarket(marketId)),

      // ── reviews ──
      upsertReview: async (marketId, tabId, itemId, patch) => {
        const cur = dataRef.current.reviews[marketId + "_" + tabId]?.[itemId];
        const merged = {
          status: patch.status !== undefined ? patch.status : cur?.status,
          comment: patch.comment !== undefined ? patch.comment : cur?.comment ?? "",
        };
        return optimistic(
          (d) => applyReviewUpsert(d, { marketId, tabId, itemId, ...merged }),
          async () => upsertReview(marketId, tabId, itemId, merged),
        );
      },

      // ── text_overrides ──
      setTextOverride: (itemId, field, value) =>
        optimistic(
          (d) => applyTextOverrideUpsert(d, { itemId, field, value }),
          async () => upsertTextOverride(itemId, field, value),
        ),

      // ── rex_items ──
      addRexItem: async (partial) => {
        const tempId = crypto.randomUUID();
        const result = await optimistic(
          (d) => applyRexItemUpsert(d, { id: tempId, ...partial }),
          async () => insertRexItem(partial),
        );
        setData((d) => applyRexItemUpsert(applyRexItemDelete(d, tempId), result));
        return result;
      },
      removeRexItem: (id) =>
        optimistic((d) => applyRexItemDelete(d, id), async () => deleteRexItem(id)),

      // ── custom_retex ──
      addCustomRetex: async (partial) => {
        const tempId = crypto.randomUUID();
        const result = await optimistic(
          (d) => applyCustomRetexUpsert(d, { id: tempId, custom: true, ...partial }),
          async () => insertCustomRetex(partial),
        );
        setData((d) => applyCustomRetexUpsert(applyCustomRetexDelete(d, tempId), result));
        return result;
      },
      removeCustomRetex: (id) =>
        optimistic((d) => applyCustomRetexDelete(d, id), async () => deleteCustomRetex(id)),

      // ── equipe ──
      addEquipeMember: async (name) => {
        const trimmed = (name || "").trim();
        if (!trimmed) return null;
        return optimistic(
          (d) => applyEquipeAdd(d, trimmed),
          async () => insertEquipeMember(trimmed),
        );
      },
      removeEquipeMember: (name) =>
        optimistic((d) => applyEquipeDelete(d, name), async () => deleteEquipeMember(name)),

      // ── ref_versions ──
      upsertRefVersion: async (docId, partial) => {
        const cur = dataRef.current.refVersions[docId];
        const merged = {
          ver: partial.ver ?? cur?.ver ?? "v1",
          dir: partial.dir ?? cur?.dir ?? "",
          archived: partial.archived ?? cur?.archived ?? false,
          log: partial.log ?? cur?.log ?? [],
        };
        return optimistic(
          (d) => applyRefVersionUpsert(d, { docId, ...merged }),
          async () => upsertRefVersion(docId, merged),
        );
      },

      // ── auth helpers (UI signin/signout) ──
      signInWithGoogle: async () => {
        return supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
      },
      signOut: async () => {
        return supabase.auth.signOut();
      },
    };
  }

  return [data, mutate.current, status, session];
}

// Exposé séparément pour les mutations qui ne passent pas par l'hydratation
// du graphe (ex: countries/projects/markets côté admin). Les autres
// (updateCountry) ne sont pas dans l'API mutate parce qu'aucune page ne
// les appelle aujourd'hui — à étendre quand le besoin apparaît.
export { updateCountry };
