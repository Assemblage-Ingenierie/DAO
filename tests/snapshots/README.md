# Snapshot de référence

Cet oracle sert à valider que le refactor de la **phase 1** (extraction du package FR) ne casse pas l'export Word. L'export généré après refactor doit être **identique** au snapshot ci-dessous (différences de timestamps tolérées).

## Fichiers

- **`dtao-snapshot-ref.docx`** — export Word de référence (généré le 2026-04-29 sur le proto FR commit `49d0141`).
- **`dtao-snapshot-ref.xlsx`** — état métier exporté en Excel par l'app (round-trip), source unique du projet de référence.

## Projet de référence : "Projet d'Appui à la Formation Agricole Rurale (PAFAR)"

Couverture des types de champs :
- text, textarea, select, toggle, date, time, mirror
- personnel_table, materiel_table, enjeux_list, articles_table, tranchesTable, multi_check_extensible, bullet_list

Cas conditionnels couverts (déclenchent les surlignages rouges) :
- Sûreté S07-001 = `Oui – inclure sûreté`
- Tranches du marché CCAP-003 = `Oui`
- ESSS S-ESSS-01 = `Oui`
- Réunion préparatoire = `se tiendra`
- Pré-qualification = `est`

## Procédure de reproduction de l'état

1. Lancer le serveur de dev : `npm run dev`.
2. Dans l'app, cliquer **📤 Importer .xlsx** dans la sidebar.
3. Sélectionner `tests/snapshots/dtao-snapshot-ref.xlsx`.
4. Confirmer l'écrasement si demandé.
5. Cliquer **Export safe** → un nouveau `.docx` est téléchargé.

## Procédure de comparaison après refactor

```bash
# Extraire le XML interne du snapshot et de l'export courant
unzip -p tests/snapshots/dtao-snapshot-ref.docx word/document.xml > /tmp/ref.xml
unzip -p ~/Downloads/DTAO_Projet_*.docx word/document.xml > /tmp/new.xml

# Comparer
diff /tmp/ref.xml /tmp/new.xml
```

**Tolérance** : différences de timestamps ou ordre d'attributs XML uniquement.
**Bug** : toute différence textuelle ou structurelle = régression à investiguer.

## Quand mettre à jour ce snapshot

- À la fin de la phase 1 (refactor iso-fonctionnel) → on garde **le même** snapshot, l'export doit rester identique.
- À la phase 3 (ajout du pack EN) → on ajoute `dtao-snapshot-ref-en.{docx,xlsx}` à côté.
- Si le pack FR évolue en v2025 (hypothétique) → on archive l'ancien snapshot dans `tests/snapshots/v2024/` et on en crée un nouveau pour la nouvelle version.
