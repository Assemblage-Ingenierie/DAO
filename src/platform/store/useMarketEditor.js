// ── Plateforme — hook adaptateur DTAO Editor ↔ Supabase markets (Phase 4) ──
//
// Phase 4 : remplace l'ancienne version localStorage. Fournit toujours à
// `Editor.jsx` la même forme `[project, setData, onRename, parentInfo]`,
// alimentée maintenant par le slot `editor_data` JSONB d'une row
// `dao_markets`.
//
// Différences clés vs version localStorage :
//   - Fetch initial par ID via `select * from dao_markets where id = ?`
//     (vs scan de tout le graphe). Le projet et le pays parents sont
//     récupérés en parallèle pour câbler `parentInfo`.
//   - `setData(key, value)` est debouncé 250 ms (inchangé), mais persiste
//     via RPC `dao_patch_market_editor_data` au lieu d'un savePlatform
//     global. La RPC patche une seule clé du JSONB côté DB — pas de
//     round-trip avec le blob entier.
//   - Souscription Realtime sur la row du marché courant : si un autre
//     user renomme le marché ou édite un champ DTAO, on rafraîchit
//     localement (sauf pour les keys qu'on est en train d'éditer — on
//     respecte le "last-write-wins" sans clignotement).
//   - Flush du write en suspens à l'unmount + sur `beforeunload`.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/client.js";
import {
  patchMarketEditorData,
  renameMarket,
} from "./supabaseMutations.js";
import {
  country as countryMapper,
  market as marketMapper,
  project as projectMapper,
} from "./mappers.js";

// ── Fetch initial : market + parents ────────────────────────────────────

async function fetchMarketWithParents(marketId) {
  // 1) market
  const { data: m, error: mErr } = await supabase
    .from("dao_markets")
    .select("*")
    .eq("id", marketId)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!m) return null;
  const market = marketMapper.fromDb(m);

  // 2) project parent
  const { data: p, error: pErr } = await supabase
    .from("dao_projects")
    .select("*")
    .eq("id", market.projectId)
    .maybeSingle();
  if (pErr) throw pErr;
  const project = p ? projectMapper.fromDb(p) : null;

  // 3) country grand-parent
  let country = null;
  if (project) {
    const { data: c, error: cErr } = await supabase
      .from("dao_countries")
      .select("*")
      .eq("id", project.countryId)
      .maybeSingle();
    if (cErr) throw cErr;
    country = c ? countryMapper.fromDb(c) : null;
  }

  return { market, project, country };
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useMarketEditor(marketId) {
  const [snapshot, setSnapshot] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Refs pour orchestrer le debounce des patches éditeur. `pendingPatchesRef`
  // accumule les key→value en attente de flush ; `flushTimerRef` est le
  // setTimeout courant. Coalescer permet de regrouper plusieurs frappes
  // proches en un seul round-trip RPC.
  const pendingPatchesRef = useRef({});
  const flushTimerRef = useRef(null);

  // Garde une copie fraîche de marketId pour les flush différés.
  const marketIdRef = useRef(marketId);
  marketIdRef.current = marketId;

  // ── Fetch + Realtime row-specifique ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setSnapshot(null);

    if (!marketId) {
      setLoaded(true);
      return;
    }

    fetchMarketWithParents(marketId)
      .then((result) => {
        if (cancelled) return;
        setSnapshot(result);
        setLoaded(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[useMarketEditor] fetch failed:", err);
        if (!cancelled) {
          setSnapshot(null);
          setLoaded(true);
        }
      });

    // Realtime : on n'écoute QUE les changements de cette row spécifique.
    // Le filtre `id=eq.<uuid>` côté Supabase évite de recevoir les events
    // de tous les marchés.
    const channel = supabase
      .channel(`market-${marketId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dao_markets",
          filter: `id=eq.${marketId}`,
        },
        (payload) => {
          if (cancelled) return;
          // On ignore l'echo de nos propres patches en cours : tant
          // qu'un flush est en attente, on garde notre version locale
          // (sinon la barre d'édition clignote pendant la frappe).
          if (flushTimerRef.current !== null) return;
          const next = marketMapper.fromDb(payload.new);
          setSnapshot((prev) =>
            prev ? { ...prev, market: next } : null,
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [marketId]);

  // ── Debounced flush + beforeunload safety ─────────────────────────────

  const flush = useCallback(() => {
    const mId = marketIdRef.current;
    const pending = pendingPatchesRef.current;
    pendingPatchesRef.current = {};
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (!mId || Object.keys(pending).length === 0) return;

    // Patche chaque clé en parallèle. Si plusieurs frappes touchent la
    // même clé (ex: 5 caractères tapés en 250 ms sur formData), seule
    // la dernière valeur survit côté `pending` — c'est précisément
    // le comportement de coalescence voulu.
    const promises = Object.entries(pending).map(([key, value]) =>
      patchMarketEditorData(mId, key, value).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`[useMarketEditor] flush '${key}' failed:`, err);
        // Pas de rollback automatique : la valeur reste en RAM, le user
        // peut continuer à éditer. Le serveur a une version périmée,
        // mais c'est le contrat last-write-wins.
      }),
    );
    return Promise.allSettled(promises);
  }, []);

  // beforeunload : tente un flush best-effort. Le navigateur peut tuer
  // l'onglet avant la fin de la requête fetch — c'est attendu.
  useEffect(() => {
    function handler() {
      if (Object.keys(pendingPatchesRef.current).length === 0) return;
      flush();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flush]);

  // Flush au démontage et au changement d'id (cleanup safe-exit).
  useEffect(() => {
    return () => {
      if (Object.keys(pendingPatchesRef.current).length > 0) {
        flush();
      }
    };
  }, [marketId, flush]);

  // ── API : project / setData / onRename / parentInfo ───────────────────

  // Vue "project-like" attendue par l'Editor — wrapping de market.editor_data.
  const project = snapshot
    ? {
        id: marketId,
        name: snapshot.market.name,
        data: snapshot.market.editor_data || {},
      }
    : null;

  // setData(key, valueOrFn) : applique localement immédiatement, et
  // schedule un flush 250 ms plus tard. Si setData est rappelé avant
  // l'échéance, le timer est réarmé (coalesce).
  const setData = useCallback(
    (key, valueOrFn) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const oldValue = prev.market.editor_data?.[key];
        const newValue = typeof valueOrFn === "function" ? valueOrFn(oldValue) : valueOrFn;
        const nextEditorData = { ...(prev.market.editor_data || {}), [key]: newValue };
        const nextMarket = { ...prev.market, editor_data: nextEditorData };

        // Stash la valeur ciblée dans le buffer de flush. Si deux
        // setData rapprochés touchent la même clé, le 2e écrase le 1er.
        pendingPatchesRef.current[key] = newValue;
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flush();
        }, 250);

        return { ...prev, market: nextMarket };
      });
    },
    [flush],
  );

  // onRename : pas debounced (1 seul appel quand l'utilisateur valide).
  // Si plusieurs renames rapides (bug UI), seul le dernier persiste —
  // last-write-wins.
  const onRename = useCallback(
    async (newName) => {
      if (!newName || !marketIdRef.current) return;
      setSnapshot((prev) => {
        if (!prev) return prev;
        return { ...prev, market: { ...prev.market, name: newName } };
      });
      try {
        await renameMarket(marketIdRef.current, newName);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[useMarketEditor] rename failed:", err);
      }
    },
    [],
  );

  const parentInfo = snapshot
    ? {
        projectId: snapshot.project?.id ?? null,
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

  // Tant que le fetch initial n'est pas terminé, on retourne null project
  // pour que l'Editor affiche son placeholder "Marché introuvable" — le
  // composant gère déjà ce cas.
  if (!loaded) {
    return [null, setData, onRename, parentInfo];
  }

  return [project, setData, onRename, parentInfo];
}
