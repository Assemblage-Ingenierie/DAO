# Phase 4 — Migration vers Supabase + déploiement Vercel

## Contexte

C'est une app React (Vite) interne Assemblage qui sert deux usages combinés :

1. **Plateforme Passation des Marchés AFD** — pilotage de nos appels d'offres : pays → projets → marchés, avec checklists de revue (DAO, AMI, DP, etc.) basées sur les Directives AFD 2024 et notre checklist APM. Memo pays, retex projet, référentiel des docs-types AFD.
2. **DTAO Travaux PAY** — éditeur interactif qui produit le document Word d'un Dossier Type d'Appel d'Offres Travaux (template AFD-M0030). C'est le module qui s'ouvre quand on clique « Éditeur DTAO → » sur un marché de catégorie Travaux + production.

Phases livrées (sur `main`, repo `Assemblage-Ingenierie/DAO`) :

- **Phase 1** : refactor multi-pack du DTAO (engine générique + pack FR v2024 isolé, prêt pour pack EN/ES plus tard)
- **Phase 2** : multi-projet en localStorage (HashRouter + plusieurs DTAO en parallèle)
- **Phase 3** : fusion Plateforme + DTAO en une seule app (commit `153c6f3` sur main)

## Stack actuelle

```
src/
├── App.jsx                  shell HashRouter + 11 routes
├── editors/dtao-travaux/    le module DTAO complet, store-agnostic
│                            (reçoit project/setData via props, ne sait
│                            pas d'où vient sa data)
└── platform/
    ├── components/          Sidebar, Header, ShellLayout, Flag, Icon, ReviewItem
    ├── data/                catalogues statiques (types de marché, secteurs,
    │                        memo codes par pays, retex, ref docs, checklists)
    ├── pages/               Home, Country, Project, Market, Search, MemoRetex,
    │                        MemoCodes, RefDocs, Admin, ChecklistConfig
    ├── store/               platformStore.js + usePlatformData.js +
    │                        useMarketEditor.js (le point d'entrée de Phase 4)
    ├── utils/               exportReviewNote.js (HTML imprimable)
    └── styles.css
```

**Toute la persistance vit aujourd'hui dans `localStorage`** — une seule clé `afd_platform_v1` contient le graphe complet (pays / projets / marchés / reviews / équipe). Les anciens projets DTAO sont migrés automatiquement au premier chargement et stockés dans le slot `editor_data` du marché correspondant.

## Mission Phase 4

Remplacer la couche localStorage par **Supabase** (Postgres + Auth + Realtime) et déployer sur **Vercel**. À la fin :

- Plusieurs membres de l'équipe peuvent se connecter et voir/éditer les mêmes données
- Le déploiement se met à jour automatiquement quand on push sur `main`
- Le DTAO Editor continue de fonctionner exactement comme avant (la couche d'abstraction est déjà prévue)

## Étapes proposées (dans l'ordre)

1. **Schéma Supabase** — créer les tables :
   - `countries(id, name, owner)`
   - `projects(id, country_id, name, sec, dir, secu, verif, mt, desc, lang, tcon, ctx, site, resp, eq[])`
   - `markets(id, project_id, name, type, tl, cat, role, meth, mont, st, date_ami, date_lr, date_dp, date_sel, date_sig, notes, editor_data jsonb, legacy_dtao_id)`
   - `reviews(market_id, tab_id, item_id, status, comment, primary key composite)`
   - `text_overrides(item_id, field, value)` — pour les modifs d'items de checklist
   - `rex_items(id, cat, doc, doc_label, section, text, tip, auteur, pays, projet, conditions, date)`
   - `equipe(name)`
   - `ref_versions(doc_id, ver, dir, archived, log jsonb[])`

   Le schéma se déduit du contenu de `src/platform/store/platformStore.js` (commentaires en tête + helpers `addCountry`, `addProject`, `addMarket`, etc.).

2. **Auth Supabase** — définir le modèle. Reco simple pour une v1 : login email magic-link, RLS qui scope par utilisateur (chacun voit ses données). Ou compte partagé Assemblage si on préfère que toute l'équipe voit tout. À discuter avec Maël.

3. **Réécrire `src/platform/store/platformStore.js`** — remplacer `localStorage.getItem/setItem` par des requêtes Supabase. **L'API publique du module ne change pas** (`loadPlatform`, `savePlatform`, `addCountry`, `removeCountry`, etc.) — c'est le point d'abstraction prévu pour ce switch. Le reste du code (toutes les pages) consomme ces fonctions et n'a pas à être touché.

4. **Adapter les hooks** — `usePlatformData.js` et `useMarketEditor.js` doivent rester réactifs : option simple = refetch après chaque mutation ; option propre = Supabase Realtime channels.

5. **Migration des données existantes** — `src/platform/store/migrateLegacyDtao.js` actuellement migre `dtao_projects_v2` (localStorage) → `afd_platform_v1` (localStorage). Il faut une nouvelle étape qui pousse `afd_platform_v1` vers Supabase au premier login. Idempotente, à appeler une fois par utilisateur.

6. **Vercel** — connecter le repo `Assemblage-Ingenierie/DAO`, branch `main`. Vercel détecte Vite tout seul. Variables d'env à configurer : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Build command par défaut. Output dir `dist`. Auto-deploy au push activé.

7. **Smoke test** — créer un projet → marché Travaux production → ouvrir Éditeur DTAO → remplir 2 ou 3 champs → recharger → données persistées. Bonus : ouvrir l'app dans 2 navigateurs avec le même login, vérifier que les modifs apparaissent (avec ou sans realtime selon ce qui a été choisi).

## Fichiers à lire en priorité

| Fichier | Pourquoi |
|---|---|
| `CLAUDE.md` | Doc générale du projet (toutes les règles d'export DTAO, charte graphique) |
| `src/platform/store/platformStore.js` | Schéma de données + l'API à réécrire |
| `src/platform/store/usePlatformData.js` | Le hook React, court (~40 lignes) |
| `src/platform/store/useMarketEditor.js` | L'adapter DTAO Editor — debounce 250 ms à conserver |
| `src/platform/store/migrateLegacyDtao.js` | Pattern de migration idempotent |
| `src/App.jsx` | Le shell, bootstrap des migrations |

## À NE PAS toucher pour Phase 4

- `src/editors/dtao-travaux/**` — toute la logique DTAO. C'est désormais "store-agnostic" : il reçoit ses données via props depuis App.jsx. Tant que `useMarketEditor` retourne la même forme `[project, setData, onRename, parentInfo]`, l'éditeur ne s'aperçoit de rien.
- `src/platform/data/**` — catalogues statiques (TYPES, MEMO_DATA, RETEX_DATA, checklists, etc.). Du contenu, pas du runtime.
- `_imports/plateforme-source.jsx` — référence read-only de l'app d'origine, à supprimer une fois Phase 4 stable.

## Conseils / écueils

- **MCP Claude Supabase + Vercel** sont disponibles. Fais-toi assister par Claude pour générer le schéma SQL, les RLS policies, et la config Vercel — tu y gagneras beaucoup de temps. Ouvre une session Claude dans le repo, demande-lui de lire `src/platform/store/platformStore.js` et de proposer un schéma Supabase équivalent.
- Le DTAO Editor sauve **debouncé à 250 ms**. Pour Supabase, garder ce debounce sinon on écrit à chaque frappe sur le réseau — coûteux et lent. Le pattern actuel est dans `useMarketEditor.js`.
- `editor_data` est stocké en **JSONB Postgres**. C'est le plus simple, ça matche la forme actuelle (un blob de 10 sous-stores). Pas besoin de l'éclater en colonnes.
- Pour la migration localStorage → Supabase, ne supprime jamais la donnée localStorage tant qu'on n'est pas sûr que la migration a réussi côté serveur. Pose un flag `legacyMigrated: true` après confirmation, comme c'est déjà fait pour `legacyDtaoMigrated`.
- Pour Vercel, le hash router (`HashRouter`) évite les soucis de fallback 404 sur les routes deep — pas besoin de configurer `vercel.json` avec un rewrite. Fonctionne out-of-the-box.

## Contacts

- Code : https://github.com/Assemblage-Ingenierie/DAO (branche `main`, dernier commit `153c6f3`)
- Référent côté métier : Maël
- Si tu pivotes sur l'auth ou le modèle de données, fais signe — certains champs (ex : `legacyDtaoId` sur les marchés migrés) sont conservés pour audit, ne pas drop sans réflexion.
