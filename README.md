# DTAO Travaux PAY — Éditeur interactif

Outil web pour éditer le DTAO Travaux AFD PAY (Février 2024) côté Maître d'Ouvrage. L'export produit un `.docx` issu du template officiel (rechercher-remplacer dans le XML, sans régénérer le document) et un `.xlsx` round-trip pour la saisie collaborative.

## Stack

- React 18 + Vite
- JSZip + file-saver pour l'édition du template Word côté client
- Pas de backend ; persistance via `localStorage`

## Setup

```bash
npm install
npm run dev
```

Le template `template-DTAO.docx` doit être présent dans `public/` (déjà commité).

## Scripts

- `npm run dev` — serveur de développement Vite
- `npm run build` — build de production dans `dist/`
- `npm run preview` — prévisualise le build

## Documentation

Voir [`CLAUDE.md`](CLAUDE.md) pour la spec technique complète (plages intouchables du template, helpers de surlignage conditionnel, helpers CCAP, normalisation NFC/NFD, vérifications empiriques).
