# DTAO Travaux PAY — Éditeur interactif

## 🔒 RÈGLES D'OR — PLAGES INTOUCHABLES

**Deux plages du template ne doivent JAMAIS être modifiées par l'export** (ni rechercher-remplacer, ni surlignage rouge, ni conversion jaune→rouge, ni aucune autre intervention) :

### 1. Section VIII — CCAG (pages 152 à 243)
Cahier des Clauses administratives générales. Démarre à la table des matières « Section VIII - Cahier des Clauses administratives générales » (page 152) et se termine à la fin de la page 243 (juste avant la section IX – CCAP).

### 2. Section IX – CCAP, Partie B – Dispositions Spécifiques (pages 259 à 277)
Tableau « Conditions / Sous-Clause / Contenu » à l'intérieur du CCAP. Démarre au titre **« Partie B – Dispositions Spécifiques »** (page 259) et se termine à la fin de la dernière ligne du tableau (page 277, dernière entrée mentionnant les Sous-Clauses 20.4 / 20.5).

### Implémentation

Toute logique de surlignage conditionnel (sûreté, pré-qualif, options A/B, marqueurs `[Rayer la mention inutile]`, helpers CCAP, etc.) doit ignorer les paragraphes situés dans ces plages. À implémenter via une fonction `isInProtectedRange(paraXml, parts, idx)` ou un index de bornes calculé une fois en début d'export. Chaque helper (`makeRedRun`, `highlightParagraphRange`, `highlightParagraphsMatching`, `convertYellowToRedInParaRange`, `convertYellowToRedInMatchingParagraphs`, `replaceField`, etc.) doit vérifier ces bornes avant d'opérer.

Bornes à détecter par anchors texte :
- CCAG start : `Section VIII - Cahier des Clauses administratives générales` (TOC)
- CCAG end : juste avant `Section IX` heading suivant
- CCAP Partie B start : `Partie B – Dispositions Spécifiques`
- CCAP Partie B end : juste avant le heading suivant après le tableau (typiquement `Partie C` ou fin de section)

---

## ⚠️ CORRECTION CRITIQUE — EXPORT .DOCX

**L'export NE DOIT PAS créer un nouveau document.** Il doit **éditer le template Word original** (`template-DTAO.docx`) en faisant du rechercher-remplacer dans le XML interne, puis re-zipper le tout.

Le fichier `template-DTAO.docx` est un vrai document Word binaire (ZIP contenant du XML). Caractéristiques :
- `word/document.xml` : 4,6 Mo
- 904 surlignages jaunes = notes au Maître d'Ouvrage
- 177 occurrences `[insérer...]`, 105 `____`, 29 `[faire un choix]`, 15 `[supprimer...]`
- Pas de `comments.xml` existant (à créer pour les commentaires acteurs)
- 65 fichiers dans l'archive

---

## Contexte métier

Outil d'édition de DTAO Travaux AFD PAY (Février 2024). L'utilisateur est Maître d'Ouvrage. Acteurs : MOA, UGP, MOE, AFD.

## Architecture

- **Frontend** : React (Vite)
- **Export** : JSZip pour éditer le XML du template .docx côté client
- **Pas de backend** — tout côté client
- **Persistance** : localStorage
- **`npm run dev`** sur localhost

## Fichiers sources

- `template-DTAO.docx` : VRAI document Word binaire (NE PAS MODIFIER). Copier dans `public/`.
- `src/data/sections.js` : sections et champs avec contextes

## Charte graphique — Assemblage ingénierie

Police: Open Sans. Rouge: `#E30513`. Violet: `#30323E`. Gris: `#DFE4E8`/`#F2F2F2`. Sidebar fond `#30323E`.

### Assets branding (Supabase Storage)

Logo + sigle officiels servis depuis le bucket public `Branding/logo/` du projet INTERNAL. URL base : `https://hhkofvbptnrtwbazftlm.supabase.co/storage/v1/object/public/Branding/logo/`.

| Fichier | Usage | Composant |
|---|---|---|
| `logo_Ai_rouge_HD.png` | Logo complet (rouge HD) sur l'écran de login | `src/platform/components/AuthGate.jsx` (SignInScreen) |
| `sigle_Ai_rouge.svg` | Sigle `.A` seul dans le bandeau top | `src/platform/components/Header.jsx` |

Ne PAS inliner ces logos dans le code (img base64) — ils vivent dans le bucket pour rester partageables entre apps de l'écosystème Assemblage.

---

## Plateforme — Auth (Supabase INTERNAL partagé)

Le projet Supabase `hhkofvbptnrtwbazftlm` (= INTERNAL) est **partagé** entre 3 apps de l'écosystème Assemblage : `aichantier`, `dao`, `renta`. La table `auth.users` est unique pour les 3 ; chaque app possède sa propre table de profils :

| App | Table profils | Trigger AFTER INSERT auth.users | Fonction |
|---|---|---|---|
| aichantier | `public.aichantier_profiles` | `on_auth_user_created` | `public.aichantier_handle_new_user()` |
| dao | `public.dao_profiles` | `on_auth_user_created_dao` | `public.handle_new_dao_user()` |
| renta | `public.renta_profiles` | `renta_on_auth_user_created` | `extensions.renta_handle_new_user()` |

### Isolation des triggers (migration `isolate_per_app_signup_triggers`, 2026-05-11)

Chaque fonction trigger est wrappée par un sous-bloc `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE LOG ...; END;` autour de son INSERT :

```sql
BEGIN
  BEGIN
    INSERT INTO public.<app>_profiles (...) VALUES (...) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '<fn> failed for user % (%): %', NEW.id, NEW.email, SQLERRM;
  END;
  RETURN NEW;
END;
```

**Raison** : avant cette migration, un schema drift dans une seule app (ex : `aichantier_profiles.full_name` droppée alors que `aichantier_handle_new_user()` y INSERT encore) faisait crasher l'INSERT sur `auth.users`, **ce qui bloquait les signups Google des 3 apps**. Le wrapper transforme un crash app en NO-OP loggué — l'app concernée n'aura pas de row de profil mais les autres ne sont plus affectées, et `auth.users` se peuple correctement.

**Règle d'or** : toute future fonction trigger sur `auth.users` doit suivre ce pattern. Sinon, un bug local re-cascade sur toutes les apps.

### Email domain check

Les emails sont contraints à `^[^@]+@assemblage\.net$` (regex stricte, case-insensitive) via deux fonctions partagées : `is_assemblage_user()` (RLS) et `assemblage_domain_check()` (signup hook). Cf. commit `3b84011` pour les vecteurs d'attaque (suffix/middle-injection) que cette regex bloque par rapport aux prédicats LIKE/split_part naïfs précédents.

---

## EXPORT .DOCX — SPÉCIFICATION TECHNIQUE

### Principe : éditer le ZIP existant

```
template-DTAO.docx (ZIP)
  ├── word/document.xml  ← MODIFIER (rechercher-remplacer)
  ├── word/comments.xml  ← CRÉER (pour commentaires acteurs)
  ├── [Content_Types].xml ← MODIFIER (ajouter type comments)
  ├── word/_rels/document.xml.rels ← MODIFIER (ajouter relation comments)
  └── ... (tout le reste : recopier tel quel)
```

### Dépendances

```bash
npm install jszip file-saver
```

**NE PAS utiliser `docx` (docx-js).** Elle crée des documents neufs, pas d'édition.

### Algorithme

```javascript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

async function exportDocx(formData, actorAssignments, fieldComments, actors, sections) {
  const response = await fetch('/template-DTAO.docx');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  let docXml = await zip.file('word/document.xml').async('string');
  
  // Rechercher-remplacer les champs remplis
  // Créer comments.xml pour les champs avec acteurs
  // Mettre à jour Content_Types et rels
  // Rezipper et télécharger
  
  zip.file('word/document.xml', docXml);
  const blob = await zip.generateAsync({ type: 'blob', 
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, `DTAO_${formData.nom_projet || 'export'}_${new Date().toISOString().slice(0,10)}.docx`);
}
```

### Runs fractionnés (CRITIQUE)

Le texte `[insérer le nom du Projet]` peut être découpé en plusieurs `<w:r>` dans le XML. Stratégie :
1. Remplacement regex simple d'abord (couvre la majorité des cas)
2. Pour les cas fractionnés : parser DOM, concaténer texte par paragraphe, chercher, reconstruire

### Pièges de matching des placeholders

Le template contient des variantes typographiques qui CASSENT les regex naïfs. Toujours vérifier dans le XML avant d'ajouter un `ph`. Pièges connus :

- **Espaces autour de `/`** : `[se tiendra/n'est pas prévue]` (sans espaces) vs `[sont / ne sont pas]` (avec). Déclarer `ph` en tableau avec les 2 variantes.
- **Traits d'union perdus** : `mi-période` → `mipériode` dans certains paragraphes (artéfact d'édition Word).
- **Apostrophes courbes vs droites** : gérées par `normApos()` (Unicode → ASCII).
- **`:` avant `]`** : `[Rayer la mention inutile :]` vs `[Rayer la mention inutile]`. Le regex de marqueurs de suppression doit accepter `\s*:?\s*` avant `]`.
- **Ordre nth** : si un même `ph` apparaît plusieurs fois, vérifier l'ordre d'apparition dans le document. Les guides en début de template peuvent consommer des nth=1 inattendus.
- **Décalage nth après remplacement** : quand plusieurs champs partagent le même `ph` (ex: IS 13.1/13.2/13.5 → `[sont / ne sont pas]` avec nth=1/2/3), chaque remplacement fait disparaître une occurrence. Le code maintient donc un `replacedCountByPh` Map et calcule `effectiveNth = nth - prior` avant chaque appel à `replaceField`. Déclarer les champs du groupe en ordre ascendant de nth dans `FIELD_MAP`.

### captionInline (champs sans placeholder)

Les champs de type `captionInline` (ex: `A l'attention de`, `Adresse`, `Numéro de téléphone`) ciblent un paragraphe dont le texte complet est uniquement la légende + `:`. Logique :

1. Si le paragraphe contient un `<w:tab/>` avec `w:leader="underscore"` (ligne de signature tabulée) → remplacer le tab par la valeur highlighted green.
2. Sinon → appender la valeur après la légende.

Sans le cas 1, la ligne underscore reste visible à côté de la valeur.

### Surlignage rouge conditionnel

Plusieurs blocs du template deviennent inapplicables selon les choix utilisateur. Ils sont surlignés rouge pour que le MOA les supprime manuellement :

| Déclencheur | Fonction | Effet |
|---|---|---|
| `formData.date_convention` = OPTION A ou B | `highlightUnselectedOption` | Surligne le bloc OPTION non retenue entre `[OPTION X...]` et `Fin de l'OPTION X]` |
| `formData.prequalification === "n'est pas"` | `highlightPrequalificationReferences` | Surligne tous les paragraphes contenant "pré-qualif" (guides inclus), sauf ceux du cas SANS pré-qualification (`n'a pas été précédé`, `Cas sans`, `n'a pas été effectuée`) et la ligne IS 4.5 elle-même |
| `formData.reunion_prevue === "n'est pas prévue"` | `highlightReunionBlock` | Surligne Lieu/Date/Heure de IS 7.4 entre "Une réunion préparatoire" et "Une visite du Site" |
| Marqueurs littéraux `[Rayer la mention inutile]`, `[Supprimer la mention inutile]`, `[à supprimer si ...]` | `highlightDeletionMarkers` | Surligne les marqueurs (avec ou sans `:` avant `]`) |
| `formData.surete_applicable === "Non"` (S07-001) | branche `3b-sexies-bis-VI-quater` | (1) Surligne tout le bloc Sûreté de `[A insérer en cas de Travaux en zone classée orange…]` (exclusif de fin) jusqu'à `TROISIEME PARTIE`. (2) Surligne la ligne `Spécifications sûreté` du sommaire Section VII (basse-casse, match strict pour éviter le heading `Spécifications Sûreté`). (3) Surligne le tableau Section III "6. Sûreté" (critères 6.1 à 6.5) du paragraphe `Sûreté` jusqu'à `Section IV Formulaires de Soumission` exclusif. (4) Convertit jaune→rouge les 3 footnotes 26/27/28 dans `word/footnotes.xml` via `convertYellowToRedInFootnoteIds` (footnotes attachées au tableau 6. Sûreté ; ids stables dans le template AFD PAY). |
| `formData.surete_applicable === "Oui – inclure sûreté"` (S07-001) | branche `3b-sexies-bis-VI-quater-pre` | Rouge sur les 2 paragraphes d'ouverture entourés bleu (jusqu'à `Spécifications Sûreté` exclusif) + remplace les 3 guides jaunes par les champs UI S07-002/003/004 (`replaceYellowGuideParagraph`) + rouge sur le guide `[Cocher l'Option N°1…]` (toujours) |
| `formData.conditions_tres_degradees` (S07-005, §4.1) | `highlightParagraphRange` + `highlightParagraphsMatching` / `convertYellowToRedInMatchingParagraphs` | **Non** → rouge sur Option N°1 (bleu) + rouge sur les 4 puces `[à insérer en cas de contexte sécuritaire très dégradé]`. **Oui** → rouge sur Option N°2 + conversion jaune→rouge des marqueurs uniquement (contenu des 4 puces préservé) |
| `formData.escortes_non_prises_en_charge` (S07-006, §4.2) | `highlightParagraphRange` / `convertYellowToRedInParaRange` | **Non** → rouge sur tout le paragraphe escortes (bleu) jusqu'à `Hébergement lors des missions`. **Oui** → conversion jaune→rouge des marqueurs seulement (contenu préservé) |
| `formData.esss_applicable === "Non"` (S-ESSS-01, Section IV pages 66-68) | branche `3b-sexies-bis-VI-septies` (`highlightParagraphRange` + `highlightParagraphsMatching`) | Trois zones rougies : (1) formulaire **Méthodologie ESSS** (page 66) du titre jusqu'à `Liste des Sous-traitants` exclusif ; (2) le paragraphe d'intro `Les Soumissionnaires devront fournir, pour chaque sous-traitant proposé…` (page 67) ; (3) tout le **Formulaire d'engagement ESSS du sous-traitant** (pages 67-68) jusqu'à `Organisation des travaux sur site et Méthode de réalisation` exclusif. Tolère `Sous-?traitants` (artéfact Word "Soustraitants") et `\s*\(ESSS\)` (titre rendu sans espace). |

#### Helpers de surlignage/remplacement sûreté

- `highlightParagraphRange(xml, startRe, endRe)` — peint en rouge tous les paragraphes du range **[start inclusive, end exclusive]**. Skip Section I et TOC.
- `highlightParagraphsMatching(xml, matchRe)` — peint sélectivement les paragraphes dont le texte concaténé matche `matchRe` (pas un range).
- `convertYellowToRedInParaRange(xml, startRe, endRe)` / `convertYellowToRedInMatchingParagraphs(xml, matchRe)` — remplace uniquement `<w:highlight w:val="yellow"/>` → `<w:highlight w:val="red"/>` sur le range/les paragraphes sélectionnés. Permet de rougir les marqueurs draft sans toucher au contenu utile.
- `convertYellowToRedInFootnoteIds(footnotesXml, ids)` — opère sur `word/footnotes.xml` (chargé en parallèle de `document.xml` au début de l'export). Pour chaque `<w:footnote w:id="…">` listé dans `ids`, remplace les surlignages jaunes par rouges. L'export ne charge `footnotes.xml` qu'une fois et le réécrit à la fin si modifié.
- `replaceYellowGuideParagraph(xml, matchRe, newText)` — remplace le corps d'un paragraphe par du texte utilisateur dans un run highlighted green. Utilisé pour que S07-002/003/004 réécrivent les 3 guides jaunes du §1 Sûreté.

#### Clean mode ↔ surlignages rouges

`stripRedContent` détecte un run rouge via `/<w:highlight\s+w:val="red"\s*\/>/i`. **Tous** les chemins ci-dessus produisent ce format (soit via `makeRedRun`, soit via regex replace yellow→red). Vérification empirique : `verify_clean_surete.mjs` (script one-shot hors du repo) replay tous les helpers sur le template réel et asserte 26/26 PASS sur deux scénarios (worst-case suppression + conservation contenu).

### CCAP — Données du Marché (Section IX)

45 champs `CCAP-001` … `CCAP-045` numérotés séquentiellement dans **l'ordre du tableau Word** (SC ascendant, à raffinage `(b)` / `(e)` / `(b)(i)` / `(c)(i)` près). Les `uid` sont stables ; les `id` (clés `formData`) sont distincts et restent inchangés. Renumérotage scripté via `C:/Users/maelb/AppData/Local/Temp/renumber_ccap.mjs` (sentinel double-pass pour éviter les cascades de remplacement).

#### Helpers spécifiques CCAP (au-delà de FIELD_MAP)

Plusieurs sous-clauses ont une géométrie qui empêche un simple substring-replace ; le pipeline les traite via des helpers dédiés AVANT la boucle FIELD_MAP :

| SC | Helper | Effet |
|---|---|---|
| 1.1.6.11 (CCAP-008) | `setCcapEsssCheckboxes` | Bascule les Wingdings ☑/☐ (F0FE/F06F) dans la cellule "Oui ☑ / Non ☐" — anchor sur le DERNIER `Les Spécifications ESSS sont applicables :` (3 occurrences dans le template). |
| 1.1.6.15 (CCAP-009) | `fillCcapConditionsClimatiques` | Remplace les 4 puces jaunes draft par N paragraphes utilisateur (1 par ligne du textarea). |
| 14.1 (CCAP-023..025) | `applyCcap14_1` | Peint en rouge les options non retenues (Forfaitaire / Unitaires / Combinaison) ; si Combinaison, remplit les 2 descripteurs composantes. |
| 14.1(b) (CCAP-026) | `fillCcap14_1_b_Exemptions` | Réécrit le guide jaune avec les exemptions multi-lignes en vert. |
| 14.1(e) (CCAP-027) | `applyCcap14_1_e` | Réécrit "Oui / Non [Supprimer la mention inutile]" : choix=vert, autre+bracket=rouge. |
| 14.2 (CCAP-028) | `fillCcap14_2_AvanceDemarrage` | Réécrit tout le paragraphe `______ % du Montant…[Insérer un nombre entre 10 et 20]` (les underscores ET le bracket disparaissent ensemble). |
| 14.3 (CCAP-030) | `fillCcap14_3_PlafondRetenue` | Même forme que 14.2 pour le plafond. |
| 14.5 (CCAP-031..033) | `applyCcap14_5` | **Non** → 6 paragraphes rouges. **Oui** → remplit les 2 listes FOB / livré-Chantier. |
| 18.1 (CCAP-038/039) | `fillCcap18_1_Delais` | Corrige le typo "Polices applicables" → "Polices d'assurance applicables", remplit les 2 délais, remplace le long guide jaune. |
| 18.3 (CCAP-040) | `fillCcap18_3_Montant` | Réécrit le paragraphe jaune du montant minimum d'assurance. |
| 20.2 (CCAP-041) | `applyCcap20_2_Composition` | Peint en rouge la branche non choisie (Un membre unique / Trois membres) + les 2 guides `[Soit :]`/`[soit :]`. |

**Pourcentage Provisions (CCAP-022, SC 13.5(b)(ii))** : helper `fillCcapPourcentageProvisions` avec toggle `naToggle` (UI) → "Non applicable" si coché, sinon "X %".

**Tableau Tranches (CCAP-004)** : `fillCcapTranchesTable` purge les 5 lignes placeholder et émet une ligne par entrée utilisateur (nom / délai / pénalités). Désactivé si `tranches_marche_existe === "Non"` (toggle CCAP-003).

#### Mécanismes schema généraux utilisés par le CCAP

- **`lockedIf: { condition, value }`** (FieldInput.jsx) — verrouille un champ en lecture seule sur une valeur fixe quand un autre champ matche. Ex : CCAP-020 `penalites_retard_ouvrages` se remplit auto avec "Se référer au tableau…" quand `tranches_marche_existe === "Oui"`. CCAP-042 `crd_liste` verrouillé sur "aucun" quand `crd_composition === "Trois membres"`.
- **`valueOverrideIf(formData)`** (FIELD_MAP, exportDocx.js) — permet à un champ d'EXPORTER une valeur calculée différente de `formData[id]`. Ex : `crd_liste` exporte `"aucun"` quand `crd_composition === "Trois membres"`, peu importe ce que l'utilisateur a tapé. Complément côté export du `lockedIf` côté UI.
- **`stripUnderscores: true`** (FIELD_MAP) — appel à `stripUnderscoreRuns` après le fill pour nettoyer les `_{3,}` qui précèdent ou suivent le bracket dans le run. Utilisé pour CCAP-035 (delai_paiement) et CCAP-037 (multiplicateur_responsabilite).
- **`valueSuffix` / `valueSuffixSkipIf`** — réajoute une unité (" jours.") perdue par le substring-replace ; `valueSuffixSkipIf(formData)` permet à un autre champ (ex : toggle tranches) de désactiver le suffixe pour laisser passer un texte libre.

#### Normalisation NFC/NFD (Word)

Word stocke parfois les accents en forme décomposée (NFD : `e + \u0301`) tandis que le code source utilise NFC (`é`). Les helpers CCAP qui font du `paraText().toLowerCase().includes(...)` doivent appliquer `.normalize('NFC')` au texte extrait. Bug observé sur §18.1 (`Délais de présentation des assurances :`) — fixé en ajoutant `.normalize('NFC')` aux helpers `fillCcap18_1_Delais`, `fillCcap18_3_Montant`, `applyCcap20_2_Composition`.

#### Anchor + ref location (paragraphes)

Pattern récurrent pour localiser un paragraphe cible robustement (immune aux dérives d'index causées par les remplacements amont) :
1. Trouver un anchor texte (heading) dans `parts[i]`.
2. Confirmer la ref de sous-clause (`14.2`, `18.1`, etc.) dans un paragraphe voisin.
3. Trouver le prochain paragraphe avec `<w:highlight w:val="yellow"/>` via `findNextYellowParaIdx(parts, startIdx, window)`.
4. Réécrire ce paragraphe via `rewriteParaWithHighlightedLines(paraXml, lines, color)` qui préserve `<w:p…>` open + `<w:pPr>` et émet des runs frais joinés par `<w:br/>`.

#### Vérifications empiriques

Scripts one-shot hors du repo (`C:/Users/maelb/AppData/Local/Temp/verify_ccap_*.mjs`) replay les helpers contre le template extrait :
- `verify_ccap14.mjs` — `applyCcap14_1` (3 cas) + `fillCcapPourcentageProvisions` → 6/6 PASS
- `verify_ccap_14x.mjs` — 14.1(b) / 14.1(e) / 14.2 / 14.3 / 14.5 → 11/11 PASS
- `verify_ccap_18x.mjs` — 18.1 / 18.3 → 5/5 PASS
- `verify_ccap_20x.mjs` — 20.2 + invariants FIELD_MAP → 5/5 PASS

Les scripts utilisent un grab regex brace-balanced pour extraire les corps de fonctions du source et les chargent via `new Function(...)` sans importer tout `exportDocx.js`.

#### En-têtes intermédiaires UI (App.jsx)

Pour les sections dont les champs sont groupés par sous-clause `SC X.i`, l'App injecte un titre gris au début de chaque transition de major X. Mapping pour le CCAP (table `CCAG_TITLES` dans `App.jsx`) :

| X | Titre |
|---|---|
| 1 | Dispositions générales |
| 2 | Le Maître d'Ouvrage |
| 3 | Le Maître d'Œuvre |
| 4 | L'Entrepreneur |
| 6 | Personnel et main d'œuvre |
| 8 | Commencements, retards, suspensions |
| 13 | Changements et Ajustements |
| 14 | Montant du marché et paiement |
| 17 | Risque et Responsabilité |
| 18 | Assurance |
| 20 | Réclamations, différends et arbitrages |

Format affiché : `SC {X}.x — {Titre}`. Couleur `#8A8F9A`, 12 px, gras, uppercase, fine bordure inférieure `#DFE4E8`. Les sections sans `ref` au format `SC X.i` ou `CCAP X.i` ne déclenchent aucun titre (vérifié : 0 séparateur dans les 20 autres sections, 11 dans CCAP).

### Commentaires Word

Créer `word/comments.xml` :
```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:comment w:id="0" w:author="DTAO Editor" w:date="2025-01-01T00:00:00Z" w:initials="DE">
    <w:p><w:r><w:t>À remplir par l'UGP</w:t></w:r></w:p>
  </w:comment>
</w:comments>
```

Dans document.xml, encadrer le texte :
```xml
<w:commentRangeStart w:id="0"/>
<w:r><w:t>[texte du placeholder]</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>
```

Ajouter dans `[Content_Types].xml` :
```xml
<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>
```

Ajouter dans `word/_rels/document.xml.rels` :
```xml
<Relationship Id="rIdComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>
```

### Fonction escape XML

```javascript
function escapeXml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
```

### Template servi par Vite

Placer `template-DTAO.docx` dans `public/` → accessible via `fetch('/template-DTAO.docx')`.

---

## SPÉCIFICATION INTERFACE

### Sidebar groupée par sections DTAO

```
PRÉAMBULE & GUIDES
  └─ Identification du Marché
SECTION II – DPAO
  ├─ Pré-qualification  ├─ Coordonnées  ├─ Réunion
  ├─ Modalités Offre  ├─ Garanties  ├─ Remise & Ouverture  └─ Évaluation
SECTION III – CRITÈRES
  ├─ Qualification Financière  ├─ Expérience
  ├─ Personnel clé (tableau)  ├─ Matériel clé (tableau)  └─ ESSS
SECTION IV – FORMULAIRES
  └─ Proposition Technique
SECTION VII – SPÉCIFICATIONS
  └─ Sûreté (S07-001 toggle Oui/Non ; si Oui → S07-002/003/004 textarea + S07-005/006 toggles)
SECTIONS V & VI
  └─ Convention AFD
SECTION IX – CCAP
  └─ Données du Marché
```

Onglets spéciaux : 📌 Suivi acteurs | ⚙️ Acteurs

### Système d'acteurs

Défaut : UGP (orange `#E65100`), MOE (bleu `#1565C0`), AFD (vert `#2E7D32`).
CRUD complet. Plusieurs acteurs par champ. Check "Commentaire" indépendant → textarea libre.

### Contexte textuel

Chaque champ affiche en gris italique : `« texte du template… »` (propriété `context` dans sections.js).

### Pas d'astérisques obligatoires

Progression = (remplis + délégués) / total.

### Tableaux structurés

Personnel clé : No | Poste | Exp. gén. | Exp. comp. | Note. Pré-rempli E&S + S&S.
Matériel clé : No | Type | Nombre min. Vide par défaut. Boutons +/×.

### Proposition Technique

7 items template (checkbox + texte éditable). Ajout possible.

### ESSS — Enjeux + Articles

- **Enjeux ESSS** : 15 enjeux fixes `a)` à `o)`, chacun toggle Oui/Non.
- **Articles non applicables** : tableau libre (N° article + explication). **Toujours au moins une ligne vide** (forçage via `useEffect` dans `ArticlesTable.jsx` + stub dans `exportXlsx.js:articlesRowsToTable` qui émet une ligne vide si `filtered.length === 0`). `removeRow` sur la dernière ligne la vide au lieu de la supprimer.

### Round-trip Excel (import)

`importXlsx.js` reconnaît :
- Les 15 enjeux ESSS via préfixe id `__enjeu_X` OU détection contextuelle (ref `a)`–`o)` + label `Applicable (Oui/Non)`). **L'enjeu est détecté AVANT le check proposition technique** pour éviter la collision avec les refs alphabétiques de proposition.
- Les articles ESSS via préfixe `__articles_N` OU flag contextuel `inArticlesTable` (activé par le header `N° d'Article non applicable` et désactivé à la sortie du tableau). Permet de rapatrier les lignes ajoutées par l'utilisateur.
- Retourne `enjeuxEsssValue`, `articlesEsssRows`, `hasEnjeuxEsssSection`, `hasArticlesEsssSection`. `App.jsx:handleImportXlsx` les branche dans `formData.enjeux_esss` et `articlesEsssRows`.

---

## Setup

```bash
npm create vite@latest . -- --template react
npm install jszip file-saver
cp template-DTAO.docx public/
npm run dev
```

## Structure

```
├── CLAUDE.md
├── template-DTAO.docx
├── public/template-DTAO.docx
├── src/
│   ├── App.jsx, main.jsx, index.css
│   ├── components/ (Sidebar, FieldInput, ActorTag, ActorsConfig, ActorChecklist, PersonnelTable, MaterielTable, PropositionTechnique, ProgressBar)
│   ├── data/sections.js
│   ├── export/exportDocx.js
│   └── hooks/usePersistedState.js
```
