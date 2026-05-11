// ── Plateforme — client Supabase singleton ─────────────────────────────
//
// Phase 4 : point d'entrée unique vers Supabase. Tous les modules du
// store (mutations, hooks, useMarketEditor) importent `supabase` d'ici.
// Singleton car :
//   - une seule websocket Realtime par session (ne pas multiplier)
//   - une seule session auth partagée
//
// Configuration via variables d'env Vite (préfixe VITE_ obligatoire) :
//   - VITE_SUPABASE_URL  : https://<ref>.supabase.co
//   - VITE_SUPABASE_KEY  : clé publishable (sb_publishable_*) ou anon legacy
//
// Si l'env est manquant (oubli .env.local, build mal configuré), on log
// un warning explicite plutôt que de planter à la 1ère requête — facilite
// le debug en preview Vercel.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] env manquant : VITE_SUPABASE_URL et VITE_SUPABASE_KEY ne sont pas définis. " +
      "Toute requête Supabase échouera. Vérifier .env.local (dev) ou les variables Vercel (prod).",
  );
}

export const supabase = createClient(url || "", key || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Realtime : on partage le client global pour le hook usePlatformData.
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// Helper : URL Supabase utilisée pour les redirects OAuth. Utile dans les
// composants Auth pour calculer où Google doit renvoyer l'utilisateur après
// signin. `window.location.origin` au runtime — pas de hardcode du domaine.
export function getRedirectUrl(path = "/") {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
