# Guide — Récupérer les données du DTAO local pour migration Supabase

## Contexte (pour le collègue qui détient les données)

L'application DTAO a été migrée vers une plateforme partagée (Supabase + Vercel) qui permet à toute l'équipe Assemblage de voir et co-éditer les mêmes pays / projets / marchés / reviews.

Tes données actuelles (les pays/projets/marchés que tu as créés dans la version locale du DTAO sur ton PC) vivent uniquement dans le **localStorage de ton navigateur**, sur **ta machine**. Elles ne sont pas dans Git, ni dans le cloud, ni nulle part ailleurs. Pour les pousser vers la nouvelle plateforme partagée, il faut les extraire manuellement et les envoyer à Maël qui les importera dans Supabase via un bouton dédié.

**Aucune perte de donnée** : l'extraction est une simple lecture, ton localStorage reste intact sur ta machine après l'opération. Si l'import échoue chez Maël, on peut recommencer autant de fois que nécessaire.

**Aucune donnée sensible** : le contenu exporté est exactement ce que tu vois dans l'app DTAO (intitulés de pays, projets, marchés, contenus des éditeurs DTAO, reviews de checklists, notes). Aucun mot de passe, aucun token, aucune clé.

---

## Procédure (5-10 minutes)

### Étape 1 — Retrouver le bon navigateur

Tes données sont dans **un seul navigateur sur ton PC** — celui où tu as utilisé l'app DTAO. Si tu as utilisé Chrome → Chrome. Si Edge → Edge. Si Firefox → Firefox.

⚠️ Le navigateur doit aussi être **le même profil** (compte Chrome / utilisateur Windows) que celui où tu as travaillé. Si tu as plusieurs profils Chrome, ouvre celui où tu utilisais habituellement le DTAO.

### Étape 2 — Lancer l'ancien DTAO

L'app tournait sur un serveur local lancé via le fichier `dev.bat`. Selon ta version :

- Si tu as un raccourci ou tu sais comment lancer `dev.bat` → lance-le. L'URL est typiquement `http://localhost:5173` ou `http://localhost:5174`.
- Si tu ne sais plus lancer `dev.bat` mais que tu as l'app installée :
  - Ouvre une invite de commande (PowerShell ou CMD)
  - Navigue vers le dossier du repo DAO (ex: `cd C:\Users\<toi>\github\DAO`)
  - Tape `dev.bat`
  - L'URL apparaît dans la console.
- **Si tu n'arrives plus à lancer `dev.bat`** : pas grave, tu peux quand même récupérer les données. Va directement à l'étape 3 sans ouvrir l'URL — l'astuce, c'est que le localStorage existe même si l'app ne tourne pas. Tu auras juste besoin de l'URL exacte que tu utilisais à l'époque pour retrouver le bon `localStorage` (ex: `http://localhost:5174`).

### Étape 3 — Ouvrir l'inspecteur navigateur (F12)

Sur la page de l'app (ou sur n'importe quelle page de `localhost:5174` si l'app ne tourne plus) :

1. Appuie sur **F12** (ou `Ctrl + Shift + I`) pour ouvrir les DevTools
2. Va sur l'onglet **Application** (Chrome / Edge) ou **Storage / Stockage** (Firefox)
3. Dans l'arborescence à gauche : développe **Local Storage** (ou **Stockage local**)
4. Clique sur la ligne `http://localhost:5174` (ou le port que tu utilisais)
5. Tu vois apparaître une liste de clés. Cherche **`afd_platform_v1`**

![Localisation visuelle](.) — l'arborescence ressemble à :
```
Application
└── Storage
    └── Local Storage
        └── http://localhost:5174
            ├── afd_platform_v1   ← celle-ci
            ├── dtao_projects_v2  (éventuel ancien format Phase 2)
            └── ... (autres clés)
```

### Étape 4 — Copier la valeur

**Option A — La plus simple (console)** :

1. Va sur l'onglet **Console** (à côté de Application)
2. Tape exactement :
   ```js
   copy(localStorage.getItem('afd_platform_v1'))
   ```
3. Appuie sur **Entrée**
4. Le navigateur affiche `undefined` — c'est normal, la valeur est dans ton **presse-papiers** (Ctrl+V pour vérifier dans n'importe quel éditeur)

**Option B — Si la console ne marche pas (manuel)** :

1. Revient sur l'onglet **Application** → Local Storage → ta ligne `afd_platform_v1`
2. La **valeur** complète s'affiche dans le panneau bas. Clique dedans
3. **Ctrl+A** pour tout sélectionner, **Ctrl+C** pour copier

### Étape 5 — Sauvegarder le contenu dans un fichier texte

C'est important : la valeur peut être très longue (souvent 100 Ko à 1 Mo). Pour la transmettre proprement :

1. Ouvre **Notepad** (ou n'importe quel éditeur texte)
2. **Ctrl+V** pour coller
3. **Ctrl+S** → enregistre sous le nom `dtao_export_<ton_prénom>_<date>.json` (ex: `dtao_export_jean_2026-05-11.json`)
4. Place-le sur ton bureau ou un dossier facile à retrouver

### Étape 6 — Envoyer le fichier à Maël

Choisis l'option la plus pratique pour toi :

- **Slack / Teams / Discord** : drag-drop le `.json` dans la conversation. Maël le récupère
- **Email** : pièce jointe au mail
- **Drive partagé / OneDrive** : upload, partage le lien
- **Clé USB / partage réseau** si vous êtes au même bureau

Le fichier contient uniquement du contenu métier (intitulés de pays/projets, contenu DTAO, reviews) — pas de mot de passe ni token. Aucun risque de fuite sensible.

### Étape 7 — (optionnel) Conserver une copie de sécurité

Avant de quitter ton navigateur, sauvegarde une 2ᵉ copie du fichier dans un autre dossier. Au cas où l'import ratait et qu'on doive recommencer.

---

## Ce que Maël fait ensuite (pour info)

Maël ouvrira https://dao-mocha-nine.vercel.app → page **Admin** → section **"Importer vos données legacy dans Supabase"** → bouton **"Coller un JSON legacy"** → il colle ton fichier → valide → confirme → l'import démarre.

L'import est **idempotent** :
- Si un pays porte le même nom qu'un déjà présent (insensible à la casse), il est réutilisé sans duplication.
- Les projets, marchés, reviews, etc. sont insérés sous leurs parents respectifs.
- Si Maël lance l'import deux fois (par erreur), le 2ᵉ ne crée pas de doublons (sauf pour les projets/marchés qui n'ont pas de clé naturelle — pour ceux-là tu n'auras pas de doublon si tu n'as importé qu'une fois).

Une fois l'import terminé (généralement 1-3 minutes selon le volume), tu pourras te connecter à https://dao-mocha-nine.vercel.app avec ton compte Google `@assemblage.net` et tu verras **toutes tes données dans le workspace partagé**, accessibles à l'équipe.

---

## Erreurs possibles et solutions

| Symptôme | Cause | Solution |
|---|---|---|
| **`afd_platform_v1` n'apparaît pas dans Local Storage** | Tu n'es pas sur la bonne URL (port différent, mauvais navigateur, mauvais profil) | Essaie `localhost:5173`, `localhost:5174`, ou un autre port. Vérifie que tu es bien dans le navigateur où tu utilisais le DTAO |
| **`null` revient quand je tape `localStorage.getItem('afd_platform_v1')`** | Pareil — pas la bonne URL ou pas le bon profil | Idem |
| **`undefined` revient mais la valeur n'est pas dans le presse-papiers** | Ton navigateur a bloqué la commande `copy()` (rare, surtout sur Firefox) | Utilise l'option B (sélection manuelle Application tab) |
| **Le contenu collé dans Notepad est tronqué** | Notepad gère mal les très grandes lignes | Utilise un éditeur plus robuste : VS Code, Notepad++, ou WordPad |
| **L'app DTAO ne se lance plus avec `dev.bat`** | Node.js désinstallé, fichiers déplacés, etc. | Pas grave — tu peux récupérer le localStorage même sans que l'app tourne, tant que tu connais l'URL (port) sur laquelle elle tournait. Tape `http://localhost:5174` directement dans le navigateur (ça va donner une page d'erreur, c'est normal), puis F12 → Application → Local Storage → l'URL devrait apparaître malgré l'erreur |
| **J'utilisais l'app sur plusieurs PCs / plusieurs navigateurs** | Tu as plusieurs localStorages à fusionner | Répète l'extraction sur chacun, envoie tous les fichiers à Maël qui les importera un par un (le dédoublonnage par nom évitera les copies multiples) |

---

## Si vraiment tu galères

Contacte Maël et propose un **partage d'écran de 5 min** (visio Slack/Teams). Il te guidera pas à pas en direct ; l'extraction prend littéralement 2 clics une fois la bonne page ouverte.

Merci pour ta patience — cette migration est une étape obligatoire pour avoir enfin une plateforme partagée. Après ça, plus jamais besoin de localStorage : toutes tes futures données vivront dans Supabase, accessibles depuis n'importe quel navigateur sans transfert manuel.
