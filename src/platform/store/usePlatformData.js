// ── Plateforme — hook React de connexion au store ─────────────────────
//
// Pont entre `platformStore.js` (localStorage) et React. Charge les
// données au montage, expose `data` + `setData(updater|next)` qui sauve
// automatiquement dans localStorage et déclenche un event global pour
// les autres consommateurs ouverts dans la page.
//
// Pattern miroir de `useProject` côté DTAO (engine/projects/useProject.js)
// mais sans debounce ni cas multi-projet — la Plateforme garde un graphe
// unique sous une seule clé.

import { useCallback, useEffect, useState } from "react";
import { loadPlatform, savePlatform } from "./platformStore.js";

const CHANGE_EVENT = "afd:platform-changed";

export function usePlatformData() {
  const [data, setLocalData] = useState(() => loadPlatform());

  // Sync entre composants/pages ouverts dans la même fenêtre — quand un
  // composant sauve, les autres se rechargent depuis localStorage.
  useEffect(() => {
    function handleChange() {
      setLocalData(loadPlatform());
    }
    if (typeof window !== "undefined") {
      window.addEventListener(CHANGE_EVENT, handleChange);
      return () => window.removeEventListener(CHANGE_EVENT, handleChange);
    }
  }, []);

  // setData accepte soit une nouvelle valeur, soit un updater (prev) => next.
  // Persiste tout de suite et notifie les autres consommateurs.
  const setData = useCallback((updater) => {
    setLocalData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      savePlatform(next);
      return next;
    });
  }, []);

  return [data, setData];
}
