// ── Plateforme — hook adaptateur DTAO Editor ↔ Plateforme markets ────────
//
// Phase 3.5 — fournit à Editor.jsx la même interface qu'`useProject` du
// store DTAO legacy (`[project, setData]` + onRename), mais alimenté par
// le slot `editor_data` d'un marché Plateforme.
//
// Le marché vit sous `data.markets[projectId]`, indexé par projectId.
// On repère le marché par ID en parcourant tous les groupes (cf. la
// méthode existante dans Project.jsx et Market.jsx). Les patches sont
// debouncés (250 ms) comme dans `useProject` pour éviter une écriture
// localStorage par frappe utilisateur.

import { useCallback, useEffect, useRef, useState } from "react";
import { loadPlatform, savePlatform } from "./platformStore.js";

// Trouve un marché et son projet/pays par ID. Retourne un objet
// { market, projectId, project, country } ou null si introuvable.
function locateMarket(platform, marketId) {
  for (const pId of Object.keys(platform.markets || {})) {
    const list = platform.markets[pId] || [];
    const market = list.find((m) => m.id === marketId);
    if (market) {
      let project = null;
      let country = null;
      for (const cId of Object.keys(platform.projects || {})) {
        const found = (platform.projects[cId] || []).find((p) => p.id === pId);
        if (found) {
          project = found;
          country = (platform.countries || []).find((c) => c.id === cId) || null;
          break;
        }
      }
      return { market, projectId: pId, project, country };
    }
  }
  return null;
}

// Persiste le market modifié dans le store Plateforme.
function persistMarket(marketId, marketUpdater) {
  const platform = loadPlatform();
  const located = locateMarket(platform, marketId);
  if (!located) return;
  const { projectId } = located;
  const list = platform.markets[projectId] || [];
  const nextList = list.map((m) => (m.id === marketId ? marketUpdater(m) : m));
  savePlatform({
    ...platform,
    markets: { ...platform.markets, [projectId]: nextList },
  });
}

// Hook miroir d'`useProject` : retourne `[project, setData, onRename,
// parentInfo]` où `project` a la forme `{ id, name, data: {…} }` que
// l'Editor consomme. `parentInfo` expose `{ projectId, project, country }`
// pour permettre à la route de fabriquer le `backTo`.
export function useMarketEditor(marketId) {
  // Snapshot initial du marché — on prend la donnée de référence depuis
  // le store, puis l'Editor en devient l'unique writer pendant la session.
  const [snapshot, setSnapshot] = useState(() => {
    if (!marketId) return null;
    const platform = loadPlatform();
    return locateMarket(platform, marketId);
  });

  const saveTimerRef = useRef(null);
  const pendingMarketRef = useRef(null);

  // Recharge si marketId change.
  useEffect(() => {
    if (!marketId) {
      setSnapshot(null);
      return;
    }
    const platform = loadPlatform();
    setSnapshot(locateMarket(platform, marketId));
  }, [marketId]);

  // Flush du write en suspens à l'unmount ou au changement d'id.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (pendingMarketRef.current && marketId) {
          const next = pendingMarketRef.current;
          persistMarket(marketId, () => next);
        }
        saveTimerRef.current = null;
        pendingMarketRef.current = null;
      }
    };
  }, [marketId]);

  // Vue "project-like" attendue par l'Editor.
  const project = snapshot
    ? {
        id: marketId,
        name: snapshot.market.name,
        data: snapshot.market.editor_data || {},
      }
    : null;

  const setData = useCallback(
    (key, valueOrFn) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const oldValue = prev.market.editor_data?.[key];
        const newValue =
          typeof valueOrFn === "function" ? valueOrFn(oldValue) : valueOrFn;
        const nextEditorData = { ...(prev.market.editor_data || {}), [key]: newValue };
        const nextMarket = { ...prev.market, editor_data: nextEditorData };
        const next = { ...prev, market: nextMarket };

        // Debounce 250 ms — coalesce une rafale d'edits en une seule
        // écriture localStorage.
        pendingMarketRef.current = nextMarket;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          if (pendingMarketRef.current) {
            const finalMarket = pendingMarketRef.current;
            persistMarket(marketId, () => finalMarket);
            pendingMarketRef.current = null;
          }
          saveTimerRef.current = null;
        }, 250);

        return next;
      });
    },
    [marketId],
  );

  const onRename = useCallback(
    (newName) => {
      if (!newName || !marketId) return;
      // Le rename est fréquent (sync bidirectionnel avec PREA-002) — on le
      // répercute aussi dans le snapshot React + persiste via la même
      // file de debounce. On bypass le ref car name est court à écrire.
      setSnapshot((prev) => {
        if (!prev) return prev;
        const nextMarket = { ...prev.market, name: newName };
        return { ...prev, market: nextMarket };
      });
      persistMarket(marketId, (m) => ({ ...m, name: newName }));
    },
    [marketId],
  );

  const parentInfo = snapshot
    ? {
        projectId: snapshot.projectId,
        project: snapshot.project,
        country: snapshot.country,
        marketType: snapshot.market.type,
        marketCat: snapshot.market.cat,
        marketRole: snapshot.market.role,
      }
    : {
        projectId: null,
        project: null,
        country: null,
        marketType: null,
        marketCat: null,
        marketRole: null,
      };

  return [project, setData, onRename, parentInfo];
}
