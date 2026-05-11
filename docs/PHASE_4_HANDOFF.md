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

1. **Schéma Supabase** — créer les tables (toutes préfixées `dao_*` pour le namespacing si plusieurs apps partagent l'instance) :
   - `dao_profiles(id uuid PK references auth.users, email, display_name, created_at)` — extension de `auth.users` pour stocker les infos affichables (avatar, nom préféré) et permettre des FK propres depuis les autres tables.
   - `dao_countries(id uuid PK, name, created_by uuid references auth.users, created_at, updated_at)`
   - `dao_projects(id uuid PK, country_id, name, sec, dir, secu, verif, mt, desc, lang, tcon, ctx, site, resp, eq[], created_by, created_at, updated_at)`
   - `dao_markets(id uuid PK, project_id, name, type, tl, cat, role, meth, mont, st, date_ami, date_lr, date_dp, date_sel, date_sig, notes, editor_data jsonb, legacy_dtao_id, created_by, created_at, updated_at)`
   - `dao_reviews(market_id, tab_id, item_id, status, comment, updated_by, updated_at, primary key (market_id, tab_id, item_id))`
   - `dao_text_overrides(item_id, field, value, updated_by, updated_at, primary key (item_id, field))` — modifs d'items de checklist
   - `dao_rex_items(id uuid PK, cat, doc, doc_label, section, text, tip, auteur, pays, projet, conditions, date, created_by, created_at)`
   - `dao_equipe(name text PK)`
   - `dao_ref_versions(doc_id, ver, dir, archived, log jsonb[], updated_by, updated_at, primary key (doc_id, ver))`

   Le schéma se déduit du contenu de `src/platform/store/platformStore.js` (commentaires en tête + helpers `addCountry`, `addProject`, `addMarket`, etc.). Convention noms de colonnes : snake_case côté SQL, camelCase côté JS, mapping au boundary du store (cf. point 9 de la code review).

2. **Auth Supabase** — **Google OAuth, chaque membre de l'équipe avec son propre compte Google, workspace partagé** (décision Maël, 2026-05-11). Pas de magic-link email, pas de compte partagé. Implémentation :
   - Provider OAuth Google dans le dashboard Supabase Auth.
   - Restriction du domaine d'email à `@assemblage.net` (sinon n'importe quel compte Google peut s'inscrire — soit hook `before_user_created` qui rejette les autres domaines, soit policy RLS qui contrôle `auth.jwt() ->> 'email' LIKE '%@assemblage.net'`).
   - **RLS = "tout utilisateur authentifié `@assemblage.net` peut tout lire et tout écrire"** — workspace partagé, pas de silos par user. Toutes les tables (`countries`, `projects`, `markets`, `reviews`, `text_overrides`, `rex_items`, `equipe`, `ref_versions`) ont la même policy : `USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'email' LIKE '%@assemblage.net')`.
   - On garde tout de même une colonne `created_by uuid references auth.users(id)` sur les tables principales (countries/projects/markets/reviews) pour l'audit ("qui a créé/modifié quoi") — non utilisée par les policies, juste affichée dans l'UI plus tard si besoin.

3. **Réécrire `src/platform/store/platformStore.js` — décomposition en mutations ciblées** (décision archi du code review du 2026-05-11, voir section ci-dessous). L'approche initialement envisagée — "remplacer les `localStorage.getItem/setItem` derrière la même API `loadPlatform/savePlatform`" — n'est **pas viable** : `savePlatform()` re-sérialise tout le graphe pays+projets+marchés+reviews à chaque mutation. Sur localStorage c'est gratuit, sur HTTP c'est un round-trip réseau (et un conflit potentiel) par frappe utilisateur.

   À la place, on remplace l'API monolithique par des mutations granulaires alignées sur le schéma SQL :
   - `loadPlatform()` reste (single fetch au démarrage, hydrate le state React)
   - `savePlatform()` disparaît
   - À la place : `addCountry / removeCountry / updateCountry`, `addProject / removeProject / updateProject`, `addMarket / removeMarket / updateMarket / patchMarketEditorData(id, key, value)`, `upsertReview(marketId, tabId, itemId, patch)`, `setTextOverride(itemId, field, value)`, etc. — chaque appel = une requête Supabase ciblée.
   - Toutes les pages qui font aujourd'hui `setData(prev => ({...prev, reviews: {...}}))` doivent être réécrites pour appeler la mutation atomique correspondante. C'est invasif (au moins `Market.jsx`, `Project.jsx`, `ChecklistConfig.jsx`, `Admin.jsx`, `Home.jsx`) mais c'est le seul moyen d'avoir un store cohérent + des mises à jour realtime utilisables.
   - Le hook `usePlatformData` retournera `{ data, mutations }` au lieu de `[data, setData]`. Les mutations posent l'update local optimistiquement puis confirment côté Supabase (rollback en cas d'erreur).

4. **Adapter les hooks — Supabase Realtime, pas refetch** (décision 2026-05-11, conséquence du workspace partagé). Le pattern "refetch après chaque mutation" est rejeté pour deux raisons : (1) si Alice édite, Bob doit voir le changement sans recharger sa page — un refetch local ne suffit pas, (2) avec mutations ciblées, le refetch complet du graphe à chaque tick est gaspilleur. À la place :
   - Le hook `usePlatformData` ouvre **un seul channel Supabase Realtime** au montage et écoute `postgres_changes` sur toutes les tables `dao_*` :
     ```js
     const channel = supabase
       .channel("dao-platform")
       .on("postgres_changes", { event: "*", schema: "public", table: "dao_countries" }, applyCountryChange)
       .on("postgres_changes", { event: "*", schema: "public", table: "dao_projects" }, applyProjectChange)
       .on("postgres_changes", { event: "*", schema: "public", table: "dao_markets" }, applyMarketChange)
       .on("postgres_changes", { event: "*", schema: "public", table: "dao_reviews" }, applyReviewChange)
       .subscribe();
     ```
   - Chaque handler patche **localement** le state React (insertion / update / delete d'une seule ligne). Pas de refetch du graphe entier — c'est la consequence directe de la décision "mutations ciblées" : un INSERT sur `dao_reviews` ne refetch QUE cette review, pas les 80 autres.
   - `useMarketEditor` continue de garder son debounce 250 ms côté write (sinon une frappe = une mutation Supabase). Le Realtime de l'éditeur est utile pour le cas où Bob renomme un marché que Maël a ouvert — Maël voit le nouveau nom apparaître. Réécriture concurrente du même `editor_data` : last-write-wins (cf. décision concurrency).
   - **Optimistic updates** : chaque mutation côté UI pose immédiatement l'update local AVANT la confirmation Supabase. Si la requête échoue, rollback + toast d'erreur. Le Realtime echo de notre propre mutation est ignoré (on filtre par `eq("id", lastMutationId)` ou via le `commit_timestamp` Supabase).

5. **Migration des données legacy localStorage → Supabase** — sémantique adaptée au workspace partagé. Aujourd'hui chaque user a SA propre `afd_platform_v1` en localStorage. Avec workspace partagé Supabase, **on ne migre qu'une seule fois, depuis un seul user**. Stratégie :
   - Au premier login, le code détecte si la table `dao_countries` est vide côté Supabase (= "personne n'a encore migré").
   - Si vide ET que l'utilisateur courant a une `afd_platform_v1` non triviale en localStorage → propose une **action manuelle** "Importer mes données locales dans le workspace équipe" (bouton dans Admin). Pas de push silencieux automatique — l'utilisateur valide avant que ses données deviennent visibles par les autres.
   - Une fois l'import effectué, flag `legacyPlatformMigrated: true` dans `dao_profiles` du user qui a poussé. Les autres users ne verront jamais le bouton car la table n'est plus vide.
   - `migrateLegacyDtao.js` (localStorage `dtao_projects_v2` → `afd_platform_v1`) reste inchangé pour la transition — il continue de tourner avant l'import Supabase. Le pipeline complet devient : `dtao_projects_v2` → `afd_platform_v1` (local, idempotent, déjà fait) → import manuel → `dao_countries/projects/markets/...` (Supabase, une seule fois).
   - Idempotence par `legacyDtaoId` conservée côté `dao_markets` pour permettre l'audit "ce marché vient du DTAO importé du <date>" et bloquer un éventuel double import.

6. **Vercel** — connecter le repo `Assemblage-Ingenierie/DAO`, branche `main`. Vercel détecte Vite automatiquement. Configuration :
   - **Variables d'env** : `VITE_SUPABASE_URL` (URL du projet Supabase, ex: `https://xxx.supabase.co`), `VITE_SUPABASE_KEY` (clé publishable, format `sb_publishable_*`, RLS fait la sécurité). À poser pour les 3 environnements Vercel (Production, Preview, Development). Voir `.env.example` pour le template.
   - **Build command** : par défaut (`npm run build`). **Output directory** : `dist`. **Install command** : par défaut (`npm install`).
   - **Auto-deploy au push `main`** activé. Les PR ouvrent automatiquement un déploiement Preview avec leur propre URL — pratique pour valider une migration avant merge.
   - **Routing** : pas de `vercel.json` à créer. `HashRouter` règle les routes côté client, donc Vercel sert juste `dist/index.html` et le SPA prend la main. Le `template-DTAO.docx` (4,6 Mo) dans `public/` est servi statiquement.
   - **Supabase Auth callback URL** : ajouter `https://<projet>.vercel.app/auth/callback` (et l'URL prod custom domain quand on aura un) dans la liste des URLs autorisées du provider Google côté Supabase.

7. **Smoke test multi-navigateur** — devient **le** critère d'acceptation Phase 4 (sans ça, pas la peine de switcher localStorage → Supabase). Procédure :
   - Login avec 2 comptes Google `@assemblage.net` sur 2 navigateurs/profils distincts (Chrome user 1 + Chrome user 2, ou Chrome + Firefox).
   - User 1 : crée un pays → projet → marché Travaux production. User 2 : voit apparaître les 3 lignes en moins de 2 secondes (Realtime).
   - User 1 : ouvre l'Éditeur DTAO sur le marché, remplit 3 champs. User 2 : recharge le marché, voit les 3 valeurs (vérifie que le debounce 250 ms a bien flush vers Supabase).
   - User 2 : modifie un statut review (C/NC/NA) avec commentaire. User 1 : voit le statut basculer instantanément + le commentaire apparaître (Realtime sur `dao_reviews`).
   - User 1 : ferme l'onglet en cours d'édition d'un champ texte. Réouvre. Le dernier état persisté apparaît (vérifie le flush `beforeunload` via `sendBeacon`).
   - User 1 ET User 2 éditent simultanément le même champ d'un marché : last-write-wins constaté, pas de crash, pas de boucle infinie de patchs Realtime.
   - Bonus : login depuis un compte Google `@gmail.com` (non-Assemblage) → rejeté avec message d'erreur clair côté UI.

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

---

## État d'avancement Phase 4 (mis à jour 2026-05-11 — Phase 4 livrée)

| Étape | Statut | Détails |
|---|---|---|
| 1 — Schéma SQL | ✅ | 10 tables `dao_*`, RLS, Realtime, trigger auto-profil, seed `dao_equipe`. Migrations `dao_initial_schema` + `dao_schema_advisor_fixes` + `dao_patch_market_editor_data_rpc`. |
| 2 — Auth Google OAuth | ✅ | Hook `assemblage_domain_check` (`assemblage_before_user_created_hook`) activé. Restriction `@assemblage.net`. Provider Google partagé avec AI Chantier. |
| 3 — Réécriture store JS | ✅ | `supabase/client.js`, `store/mappers.js`, `store/supabaseMutations.js` (22 primitives), `store/usePlatformData.js` (hook `[data, mutate, status, session]` avec Realtime + optimistic + rollback). 7 pages migrées de `setData(prev=>…)` à `await mutate.X(…)`. `useMarketEditor.js` réécrit (RPC + debounce 250ms + flush beforeunload). |
| 4 — Hooks Realtime | ✅ | Intégré au hook unique `usePlatformData`. Channel `dao-platform-<uuid>` unique par mount (évite le bug "cannot add postgres_changes callbacks after subscribe()"). Channel `market-<id>` row-specific dans `useMarketEditor`. |
| 5 — Import legacy | 🟡 partiel | UI Admin avec textarea "Coller JSON legacy" déployée. Côté Maël : reste à extraire `localStorage.getItem('afd_platform_v1')` depuis le navigateur du collègue où l'app tournait, puis coller dans Admin. |
| 6 — Vercel | ✅ | Projet `dao` (scope `malo-4406s-projects`) lié à `Assemblage-Ingenierie/DAO`. URL prod : https://dao-mocha-nine.vercel.app. Env vars Production + Development OK ; Preview à ajouter manuellement via dashboard (CLI bug). Auto-deploy on push `main` actif. |
| 7.1 — Smoke test solo | ✅ | 7/7 checks PASS : persistence, cadrage projet, marché + DTAO Editor + flush, review checklist, cascade delete pays, MemoRetex perso, sign out/in. |
| 7.2 — Smoke test multi-user | ⏸ | À faire quand un 2ᵉ compte `@assemblage.net` est disponible. Valide Realtime sync entre 2 onglets + last-write-wins. |

### Fixes notables découverts pendant les tests

| Commit / Migration | Bug | Cause |
|---|---|---|
| `8deedd1` | Page blanche post-login OAuth | `supabase.channel("dao-platform")` réutilisait le channel existant après ré-exec du useEffect (events `INITIAL_SESSION` + `SIGNED_IN` rapprochés au login). Fix : nom unique par mount `dao-platform-${crypto.randomUUID()}`. |
| `999d2a5` | React error #310 en cliquant "Checklist →" | `Market.jsx` avait 6 hooks (useState, useMemo) **après** un early return `if (!market) return ...`. Pas un problème en Phase 3 (data sync) mais réveillé par les fluctuations Realtime. Fix : extraire le corps en sous-composant `<MarketContent>` qui ne monte que si market existe. |
| Migration `harden_assemblage_email_check` | Suite security review Observation 1 : les deux fonctions de check email (RLS `is_assemblage_user` et hook signup `assemblage_domain_check`) utilisaient des prédicats faibles (`LIKE '%@assemblage.net'` et `split_part(.., '@', 2)`). Aucune des deux ne rejetait correctement les emails à plusieurs `@` (ex: `attacker@evil.com@assemblage.net` passait la RLS ; `attacker@assemblage.net@evil.com` passait le hook). Fix : regex stricte `^[^@]+@assemblage\.net$` (case-insensitive via `~*`) appliquée aux deux fonctions. Tests 8/8 PASS : tous les vecteurs d'attaque bloqués, les emails légitimes (toutes casses) passent. Note : `email_verified` n'est pas ajouté car non exposé au top-level du JWT Supabase v2 (vit uniquement dans `user_metadata` user-editable, interdit en authz). À revisiter si Supabase l'expose en top-level ou via `app_metadata`. |

### Tâches résiduelles (non bloquantes)

- **Preview env vars** sur Vercel : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY` pour l'environnement Preview via le dashboard (le CLI a un bug sur cette commande spécifique).
- **Site URL Supabase Auth** : pointe encore sur `https://aichantier.assemblage.net`. Pas bloquant car `redirectTo: window.location.origin` est passé explicitement par AuthGate, mais à harmoniser quand un custom domain DAO sera posé.
- **Import legacy** : en attente de l'extraction JSON par le collègue.
- **Nettoyage données test** : la "Côte d'Ivoire" créée pendant mes tests MCP reste dans `dao_countries`. À supprimer par Maël via l'UI ou TRUNCATE côté Supabase si reset complet souhaité.

### Backlog hardening (Observations security review, non critiques aujourd'hui)

- [x] **Observation 1 — Regex stricte email** : ✅ appliquée (migration `harden_assemblage_email_check`).
- [ ] **Observation 2 — `FORCE ROW LEVEL SECURITY` sur les tables `dao_*`** + scoping `id = auth.uid()` sur les UPDATE de `dao_profiles`. Aujourd'hui le workspace partagé est intentionnel ; ces durcissements sont du belt-and-suspenders contre une future faille SECURITY DEFINER ou contre un user d'une autre app de INTERNAL qui voudrait écraser le profil d'un collègue.
- [ ] **Observation 3 — Pinner `redirectTo` à l'URL canonique** (au lieu de `window.location.origin`) pour réduire la surface phishing. Faible ROI, attendre custom domain.
- [ ] **Observation 4 — Retirer les paths user-specifiques dans `vite.config.js`** quand le workflow externe de Maël aura été remplacé (probablement quand Phase 5+ tournera enfin sur le workflow Vercel standard).

## Code review pré-migration (2026-05-11)

Audit exhaustif effectué avant d'écrire la première ligne de SQL. Repo globalement très propre (architecture engine/pack/store nette, helpers de store déjà purs, DTAO bien découplé). Les findings ci-dessous sont organisés par priorité ; certains conditionnent la Phase 4, d'autres sont des quick wins indépendants à passer d'abord.

### Décisions actées
- **Granularité de l'API store** : option **mutations ciblées** (vs. `savePlatform(graphe entier)`). Cf. étape 3 ci-dessus. Refactor invasif mais c'est la seule approche compatible avec Realtime et la collaboration multi-user.
- **Auth Supabase** : **Google OAuth, un compte Google par membre Assemblage, workspace partagé équipe**. RLS = lecture/écriture pour tout user authentifié `@assemblage.net`. Colonne `created_by` posée pour audit, pas pour scoping.
- **Concurrency** : **last-write-wins**. À 3-5 users qui éditent rarement le même marché au même moment, l'overhead d'un champ `version int` + check optimiste sur chaque update ne se justifie pas. Si un cas de conflit visible apparaît plus tard, on ajoutera `updated_at` + `If-Match` côté update à ce moment-là.
- **Namespacing des tables** : la table d'extension d'auth (profile utilisateur, role, etc.) s'appelle **`dao_profiles`** (pas `profiles`) pour ne pas collisionner si l'instance Supabase héberge d'autres applis Assemblage plus tard. **Question ouverte** : faut-il également préfixer toutes les autres tables (`dao_countries`, `dao_projects`, `dao_markets`, `dao_reviews`, etc.) pour la cohérence, ou ne préfixer que `dao_profiles` qui est la seule à risque de collision (les autres noms sont métier-spécifiques à AFD/passation) ? Reco par défaut : préfixer tout en `dao_*` — c'est 30 secondes de schéma, et ça documente clairement quelle app possède quelle table.
- **Concurrency model** : ouvert — last-write-wins ou versioned-update (`updated_at`/`version` int). Reco par défaut : last-write-wins (3-5 users max, peu de conflits simultanés).

### Quick wins préalables à la migration (1h chacun, indépendants)
- [ ] **(point 3) XSS dans `src/platform/utils/exportReviewNote.js:279`** — `w.document.write(html)` avec `html` construit par concat de strings contenant `market.name`, commentaires, etc. (tous user-controlled). Aujourd'hui mono-user = théorique, demain multi-user = vrai. Escaper HTML (helper `escapeXml` standard, déjà utilisé côté DTAO export).
- [ ] **(point 5) IDs en `crypto.randomUUID()`** — remplacer `"C" + Date.now()` (et `"P"`, `"M"`) dans `platformStore.js:74,98,159` + `migrateLegacyDtao.js:43,58` par `crypto.randomUUID()` avec fallback (pattern déjà en place dans `editors/dtao-travaux/engine/projects/projectStore.js:75`). Compatible Postgres PK uuid.
- [ ] **(point 11) Vitest + tests unitaires** — `package.json` n'a pas de runner de tests. Les helpers de `platformStore.js` sont purs (data in / data out), exactement ce qu'il faut tester avant de muter. 10 tests sur `addCountry`, `removeCountry`, `addProject`, `addMarket`, `removeMarket`, `updateMarket`, `toggleProjectMember`, `addEquipeMember`, `loadPlatform` (avec JSON corrompu), `loadPlatform` (avec champ manquant) → filet de sécurité pour le refactor.

### Findings bloquants Phase 4 (intégrés au plan)
- [x] **(point 1) Décomposition de `savePlatform`** — couvert par l'étape 3 réécrite ci-dessus.
- [x] **(point 2) Race condition write-after-read dans `useMarketEditor.persistMarket`** — couvert par la décomposition (mutation ciblée `patchMarketEditorData(id, key, value)` au lieu de read full / write full).
- [x] **(point 4) Reviews écrites sans debounce** (`Market.jsx:504`) — couvert par la mutation atomique `upsertReview(marketId, tabId, itemId, patch)`.

### Findings à traiter pendant Phase 4
- [ ] **(point 6) `loadPlatform()` ne valide pas le type de `parsed`** — `{ ...defaultPlatformData(), ...parsed }` plante en silence si `parsed` est une string ou un nombre. Ajouter `if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaultPlatformData()`. Trivial.
- [ ] **(point 7) IIFE bootstrap synchrone dans `App.jsx:51-60`** — la migration legacy en Supabase sera async. Déplacer dans un `useEffect` racine + écran d'attente.
- [ ] **(point 8) Flush du debounce à l'unmount** (`useMarketEditor.js:80-92`) — Promise non-attendue au `beforeunload`. Prévoir `navigator.sendBeacon` ou endpoint Edge Function pour le flush.
- [ ] **(point 9) Convention snake_case vs camelCase** — commentaire schéma `platformStore.js:11-25` dit `dateAmi, dateLr, dateDp` ; HANDOFF dit `date_ami, date_lr, date_dp`. Postgres = snake_case. Mapper côté store dans le wrapper Supabase (`mapMarketFromDb` / `mapMarketToDb`). Décision : conserver camelCase côté JS (toutes les pages l'utilisent), convertir au boundary.
- [ ] **(point 10) `locateMarket` dupliqué** entre `Market.jsx:415-437` et `useMarketEditor.js:18-37` — devient inutile après Supabase (`select * from markets where id=?`). Bonne occasion de supprimer les deux.

### Findings non-bloquants (à laisser pour plus tard)
- **(point 12) Tous les composants re-render à chaque mutation** (`usePlatformData` retourne objet entier) — acceptable jusqu'à ce qu'on sente une latence visible. Plan B : Zustand avec sélecteurs (14 ko).
- **(point 13) `eslint-disable react-hooks/exhaustive-deps`** dans `Editor.jsx:62-64` — pas un bug, mais ajouter une ligne de commentaire expliquant l'intent "run-once-per-projectId".
- **(point 14) Audit secrets** — RÉSOLU : tous les matches `password|secret|api_key|token` sont des faux positifs (mot français "Caractère secret" dans une loi marché Comores, variable `tokenRe` regex, placeholder template Word). Aucun credential en clair dans le repo. OK pour pousser sur Vercel privé.

### Observations positives (à préserver)
- Helpers de store **purs** (data in / data out) — réutilisables tels quels côté Supabase via wrapper async.
- **DTAO Editor totalement store-agnostic** : `Editor.jsx` reçoit `setData` via props et ne sait pas d'où vient la donnée. La promesse "ne pas toucher au DTAO" tient — il suffit que `useMarketEditor` retourne la même forme `[project, setData, onRename, parentInfo]`.
- **Migration legacy idempotente** avec flag `legacyDtaoMigrated` + `legacyDtaoId` conservé pour audit. Reproduire ce pattern pour `legacyPlatformMigrated` côté Supabase.
- **`crypto.randomUUID()` avec fallback** dans `projectStore.js:75` — exactement ce que veut Postgres en PK uuid. À étendre à `platformStore` (point 5).
- **`useMemo` correctement placé** dans `Market.jsx` pour `tabItems`, `filteredItems`, `sections`, `status`.
- **CCAG/CCAP plages intouchables** verrouillées dans `CLAUDE.md` (sections VIII p.152-243 et IX partie B p.259-277) — discipline d'export visible. Phase 4 ne touche à rien de ça.
