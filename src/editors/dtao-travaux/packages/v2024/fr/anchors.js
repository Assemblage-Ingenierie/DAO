// ── Template paragraph anchors ─────────────────────────────────────────────
//
// Chaque ancre est une regex appliquée au texte concaténé d'un paragraphe
// (après normalisation des apostrophes via normApos). Les ancres servent à
// identifier précisément les paragraphes du template Word qui doivent être
// surlignés en rouge à l'export.
//
// ⚠️ Pièges template (voir CLAUDE.md) :
//   - Word insère parfois un espace là où on attendrait un trait d'union :
//     « mi période » au lieu de « mi-période » → on utilise `mi[-\s]?p[eé]riode`.
//   - Word a avalé le « l » de « si la réglementation » en IS 33.1 → tolérance
//     via `.*r[eé]glementation`.
//   - Les virgules/espaces peuvent être décalés : « autorisées , le » → on
//     tolère `\s*,?\s*`.
//   - Les guillemets autour de « prévoit » en IS 34.1 peuvent contenir des
//     espaces et alterner droits/courbes.
//   - Les apostrophes courbes (U+2018/U+2019/U+02BC) sont normalisées en
//     ASCII par normApos() avant test, donc les regexes utilisent `'`.

// Ancres TOUJOURS surlignées en rouge. Ce sont des guides AFD que le MOA
// doit relire puis supprimer manuellement une fois la cellule DPAO finalisée.
export const STATIC_GUIDE_ANCHORS = [
  // IS 7.4 — suggestion de date de réunion préparatoire (entre « Date : » et
  // « Heure : »).
  /^\[de pr[eé]f[eé]rence [aà] mi[-\s]?p[eé]riode de pr[eé]paration des Offres\]\s*$/i,
  // IS 14.5 — recommandation AFD permanente sur la révision des prix
  // (sections.js : « toujours surligné en rouge »).
  /^\[Il est recommand[eé] d'adopter des prix r[eé]visables/i,
  // IS 22.1 — guide soumission électronique (deux paragraphes). La soumission
  // électronique exige une approbation préalable AFD et n'est pas offerte
  // par défaut.
  /^\[L'option de soumission [eé]lectronique n[eé]cessite une approbation pr[eé]alable de l'AFD/i,
  /^Dans le cas o[uù] les Offres peuvent [eê]tre remises [eé]lectroniquement, la proc[eé]dure de remise d'Offres/i,
  // IS 25.1 — guide ouverture électronique des plis.
  /^\[La proc[eé]dure d'ouverture des plis remis par voie [eé]lectronique, lorsqu'elle est applicable/i,
  // IS 33.1 — portée de la marge de préférence (tolérance « l » avalé dans
  // « si la réglementation »).
  /^\[A n'inclure que si .*r[eé]glementation locale l'exige/i,
];

// IS 13.5 — bloc ajustement/pénalité surligné quand les variantes de délais
// ne sont PAS autorisées (`formData.variantes_delais === "ne sont pas"`).
export const IS_13_5_VARIANTES_DELAIS_ANCHORS = [
  // « Si les variantes sont autorisées, le montant d'ajustement … »
  /^Si les variantes sont autoris[eé]es\s*,?\s*le montant d'ajustement/i,
  // « [Le Marché devra mentionner une pénalité de retard …] »
  /^\[Le March[eé] devra mentionner une p[eé]nalit[eé] de retard/i,
];

// IS 34.1 — guide listing sous-traitants, surligné quand le MOA ne prévoit
// PAS de sous-traitants désignés (`formData.sous_traitants_designes === "ne prévoit pas"`).
export const IS_34_1_SOUS_TRAITANTS_ANCHORS = [
  // « [si la mention retenue ci-dessus est "prévoit", alors lister …] »
  /^\[si la mention retenue ci.dessus est\s*["']?\s*pr[eé]voit\s*["']?/i,
];

// ── Section III — Marge de préférence ──────────────────────────────────────
// IS 33.1 « ne sera pas » → le bloc entier « 2 Marge de préférence » doit
// être surligné rouge pour que le MO le supprime. Le bloc est identifié par :
//   - son titre Heading1 « Marge de préférence » (paragraphe d'ouverture)
//   - se termine juste avant le Heading1 suivant (« Qualification »)
// → voir highlightMargePreferenceBlock dans exportDocx.js (approche par plage
//   Heading1→Heading1, pas par ancre unique).
export const MARGE_PREFERENCE_HEADER_ANCHOR = /^Marge de pr[eé]f[eé]rence\s*$/i;

// ── Section III — Pas de pré-qualification ─────────────────────────────────
// IS 4.5 « n'est pas » → surligner rouge la phrase jaune
// « [sinon supprimer toute cette section] » qui précède tout le bloc
// « 3.3 Qualification si une Pré-qualification n'a pas été effectuée ».
// Le MO doit effacer cette phrase de guidage une fois la section finalisée.
export const NO_PREQUAL_GUIDE_ANCHORS = [
  /^\[sinon supprimer toute cette section\]\s*$/i,
];

// ── Section III — Bloc 3.3 à supprimer si pré-qualification effectuée ──────
// IS 4.5 « est » → tout le bloc « 3.3 Qualification si une Pré-qualification
// n'a pas été effectuée » (du titre jusqu'à la fin du tableau 6. Sûreté
// inclus) est retiré du document. Voir removeNoPrequalQualificationBlock.
// Le template contient un artefact Word : « Pré qualification » avec espace
// au lieu de trait d'union — on tolère les deux.
export const NO_PREQUAL_HEADER_ANCHOR = /^Qualification si une Pr[eé][\s-]?qualification n'a pas [eé]t[eé] effectu[eé]e\s*:?\s*$/i;

// ── Section IV — Modèle de Garantie de Soumission ──────────────────────────
// S02-024 « n'est pas » → toute la lettre type "Modèle de Garantie de
// Soumission" (Garantie bancaire) devient inapplicable et est surlignée rouge
// du titre jusqu'au titre suivant ("Modèle de Déclaration de Garantie de
// Soumission") exclusif.
export const MODELE_GARANTIE_SOUMISSION_START_RE = /^Modèle de Garantie de Soumission\s*$/i;
export const MODELE_GARANTIE_SOUMISSION_END_RE = /^Modèle de Déclaration de Garantie de Soumission\s*$/i;

// ── Section IV — Modèle de Déclaration de Garantie de Soumission ──────────
// S02-025 « n'est pas » → la déclaration de garantie de soumission est
// inapplicable. Range : du titre jusqu'à la Section V (« Critères
// d'éligibilité »). L'apostrophe peut être courbe ou droite dans le template.
export const MODELE_DECL_GARANTIE_START_RE = /^Modèle de Déclaration de Garantie de Soumission\s*$/i;
export const MODELE_DECL_GARANTIE_END_RE = /^Section V\b|Critères d[’']éligibilité/i;

// ── Sections V & VI — guides jaunes Convention AFD ─────────────────────────
// Toujours convertir jaune→rouge les paragraphes de guidage entre les titres
// de Section V (Critères d'éligibilité) et Section VII (Spécifications des
// Travaux). Helper à utiliser : convertYellowToRedInRange (variant qui exige
// que les anchors soient sur des paragraphes Heading-styled, pour ne pas
// matcher accidentellement un item de liste numéroté).
export const SECTIONS_V_VI_START_RE = /^Section V\b.*Critères d[’']éligibilité/i;
export const SECTIONS_V_VI_END_RE = /^Section VII\b.*Spécifications des Travaux/i;

// ── Convention AFD — marqueurs OPTION A/B (toujours rouges) ────────────────
// Cinq alternatives compound-regex pour rougir tous les guides "draft"
// associés au choix de Convention AFD (avant/à partir du 1er février 2024).
// Le MOA doit toujours nettoyer ces marqueurs avant remise du DAO aux
// soumissionnaires, indépendamment de date_convention.
export const AFD_CONVENTION_OPTION_MARKERS_RE = new RegExp([
  // Guide paragraph introducing each OPTION A/B block (Annexe X, Section X,
  // ou Déclaration d'Intégrité — Annexe 3 à la Soumission)
  "^\\s*\\[Le contenu de (?:l'(?:Annexe|annexe)|la\\s+Section\\s+[A-Z]+|la\\s+Déclaration d'Intégrité)",
  // Explanation bullets
  "^Pour tout March[ée] financ[ée] par l'AFD via une Convention de Financement sign[ée]e\\s+(?:avant|[àa]\\s+partir)",
  // OPTION A/B opening marker (also matches "Version de Déclaration d'Intégrité")
  "^\\s*\\[OPTION\\s+[AB]\\s*[\\u2013\\u2014\\-]\\s*Version",
  // "(Sinon supprimer cette partie...)" sub-line
  "^\\s*\\(Sinon supprimer cette partie",
  // "Fin de l'OPTION X]" closing marker
  "^\\s*Fin de l'OPTION\\s+[AB]\\]",
].join('|'), 'i');

// ── IS 7.4 — bloc Réunion préparatoire ────────────────────────────────────
// reunion_prevue === "n'est pas prévue" → surligner rouge les lignes
// Lieu/Date/Heure entre le paragraphe "Une réunion préparatoire" (start
// inclusif) et "Une visite du Site" (end inclusif — le helper d'origine
// surlignait jusqu'à et compris cette ligne). Strings simples (pas
// d'anchorage `^…$`) car le texte cible apparaît au milieu d'autres mots.
export const REUNION_START_RE = /Une réunion préparatoire/;
export const REUNION_END_RE = /Une visite du Site/;

// ── Marqueurs littéraux de suppression — toujours surlignés rouge ──────────
// Le template contient des marqueurs "[Rayer la mention inutile]" / "[à
// supprimer si …]" etc. Le MOA doit toujours les rougir pour les supprimer
// avant remise. Un prefilter rapide (`SUPPRIMER_RAYER_PREFILTER`) évite de
// scanner tous les paragraphes — la majorité ne contiennent pas ces mots.
export const DELETION_MARKER_PATTERNS = [
  /\[Rayer la mention inutile\s*:?\s*\]/gi,
  /\[Supprimer la mention inutile\s*:?\s*\]/gi,
  /\[à supprimer si [^\]]+\]/gi,
  /\[Section à supprimer si [^\]]+\]/gi,
  /Supprimer la mention inutile/g,
  /rayer la mention inutile/g,
];
export const SUPPRIMER_RAYER_PREFILTER = /[Ss]upprimer|[Rr]ayer/;

// ── Section III §3.2 — note "Le montant devrait se situer…" (toujours red) ─
// Note éditoriale au MOA jouxtant le titre "Chiffre d'affaires annuel
// minimum". Toujours convertie jaune→rouge pour suppression — n'est jamais
// conservée dans le DAO final.
export const CHIFFRE_AFFAIRES_NOTE_RE = /Le montant devrait se situer entre 1\.5 et 2 fois l['’]estimation du montant annuel facturé/i;

// ── Section III §4.2(b)(ii) — Sous-traitant spécialisé ─────────────────────
// sst_specialise_autorise === "Non" → la ligne (ii) du tableau de
// qualification est inapplicable. Range : du placeholder draft "[ajouter le
// critère suivant…]" jusqu'au heading "Qualification Environnementale,
// Sociale, Santé et Sécurité (ESSS)" exclusif (qui démarre la sous-section
// suivante).
export const SST_SPECIALISE_START_RE = /^\[ajouter le critère suivant si un sous-traitant spécialisé est autorisé/i;
export const SST_SPECIALISE_END_RE = /^Qualification Environnementale,\s*Sociale,\s*Santé et Sécurité\s*\(ESSS\)\s*$/i;

// ── IS 11.1(b) — Layout Bordereau / Prix global / Combinaison ──────────────
// Trois lignes alternées par "[ou]" dans le DPAO, surlignée en rouge selon le
// choix `type_prix`. L'ordre rowAnchors[0..2] doit matcher l'ordre du template
// (unitaires / global-forfaitaire / combinaison) — utilisé comme index par
// highlightUnselectedPriceFormats pour décider quelle ligne reste jaune.
export const PRICE_FORMAT_ROW_ANCHORS = [
  /\[pour les march[eé]s [aà] prix unitaires\]/i,
  /\[pour les march[eé]s [aà] prix global et forfaitaire\]/i,
  /\[pour les march[eé]s combinant/i,
];
export const PRICE_FORMAT_OR_RE = /^\s*\[ou\]\s*$/i;

// ── Section IV "Tableaux de prix" guide — séquence 6 paragraphes ───────────
// Le bloc d'introduction "Tableaux de prix" (page 60) est une séquence stricte
// de 6 paragraphes. anchors[0] localise l'intro, anchors[1..5] valident la
// structure avant la conversion sélective jaune→rouge selon `type_prix`.
export const TABLEAUX_DE_PRIX_GUIDE_ANCHORS = [
  /Insérer.*formulaire de Bordereau des prix.*Détail quantitatif/i,
  /^ou$/i,
  /un formulaire de Prix Global et Forfaitaire et de décomposition/i,
  /^ou$/i,
  /les deux formulaires pour un march[ée] combinant/i,
  /Et insérer le texte ci-dessous comme introduction\]/i,
];

// ── IS 15.1 — Monnaie option (anchor + privilégier label) ──────────────────
// Le DPAO IS 15.1 présente Option A (monnaie nationale) vs Option B (nationale
// + étrangères) via un guide commençant par "L'Option B reflète mieux les
// besoins". Le label "[Option à privilégier]" sépare A et B et doit aussi
// être rougi quand A est choisi.
export const MONNAIE_OPTION_ANCHOR_RE = /L'Option B refl[eè]te mieux les besoins/i;
export const MONNAIE_OPTION_PRIVILEGIER_RE = /^\[Option [aà] privil[eé]gier\]\s*$/i;

// ── IS 32.1 — Conversion option (anchor) ───────────────────────────────────
// Anchor sur la phrase introductive de la cellule IS 32.1 ("…conformément à
// la procédure correspondant à l'Option") qui précède les blocs Option A / B.
export const CONVERSION_OPTION_ANCHOR_RE = /conform[eé]ment [aà] la proc[eé]dure correspondant [aà] l'Option/i;

// ── A/B headers + IS/Section boundary (partagés IS 15.1 + IS 32.1) ─────────
// Les deux helpers (Monnaie / Conversion) scannent en avant pour trouver les
// headers "Option A (" / "Option B (" puis la frontière de cellule (heading
// IS suivant ou Section romaine).
export const OPTION_A_HEADER_RE = /^Option A \(/i;
export const OPTION_B_HEADER_RE = /^Option B \(/i;
export const SECTION_OR_IS_BOUNDARY_RE = /^IS\s+\d|^Section\s+[IVX]/i;

// ── Annexe 1 (Révision des prix) — range start/end ─────────────────────────
// `prix_revisables === "fermes"` → tout le bloc "Annexe 1 à la Soumission —
// Données relatives à la révision des prix" devient inapplicable. Range :
// du titre Annexe 1 (inclus) au titre Annexe 2 (exclusif).
export const ANNEXE_1_REVISIONS_START_RE = /^Annexe 1 [aà] la Soumission\b.*r[eé]vision des prix/i;
export const ANNEXE_1_REVISIONS_END_RE = /^Annexe 2 [aà] la Soumission\b/i;

// ── Annexe 2 (Alternative A / B) — selon option_monnaie ────────────────────
// L'Annexe 2 carry les deux Alternatives. Option A → rouge Alternative B
// (range AltB → Annexe 3). Option B → rouge Alternative A (range AltA → AltB).
export const ANNEXE_2_ALT_A_RE = /Tableau\s*:\s*Alternative\s*A/i;
export const ANNEXE_2_ALT_B_RE = /Tableau\s*:\s*Alternative\s*B/i;
export const ANNEXE_3_HEADER_RE = /^Annexe 3 [aà] la Soumission\b/i;

// ── Section IV formulaire "Variantes techniques" ───────────────────────────
// `variantes_techniques === "ne sont pas"` → le formulaire Variantes
// techniques (titre + intro + tableau 4-colonnes) est inapplicable. Anchor
// sur l'intro (unique en Section IV+, distincte du titre dupliqué en TOC),
// puis walk-back pour le titre et walk-forward pour le heading suivant
// "Méthodologie environnementale…".
export const VARIANTES_TECH_INTRO_RE = /^Proposition pour les [eé]l[eé]ments d\s*es ouvrages pour lesquels des variantes technique\s*s sont autoris[eé]es/i;
export const VARIANTES_TECH_TITLE_RE = /^Variantes techniques\s*$/i;
export const METHODOLOGIE_ESSS_HEADER_RE = /M[eé]thodologie\s+environnementale/i;

// ── ESSS — chapitre complet (Section VII) ──────────────────────────────────
// Démarre au guide draft "[Dans le cas de travaux pour lesquels la gestion
// du Chantier…]" (qui sit juste au-dessus de la Table des matières du
// chapitre ESSS) et se termine juste AVANT le paragraphe "[A insérer en
// cas de Travaux en zone classée orange…]" qui démarre le bloc Sûreté
// suivant. Range partagé par 2 rules :
//   - 'esss-non-chapter-block'           : highlight-range si Non
//   - 'esss-oui-chapter-yellow-to-red'   : yellow-to-red-range si Oui
export const ESSS_CHAPTER_START_RE = /^\[Dans le cas de travaux pour lesquels la gestion du Chantier/i;
export const ESSS_CHAPTER_END_RE = /^\[A\s+ins[ée]rer en cas de Travaux en zone class[ée]e orange/i;

// ── ESSS — ligne "Contenu" du sommaire Section VII ─────────────────────────
// Tolère le typo singulier "Environnementale" du template. End anchor =
// la ligne suivante du sommaire ("Spécifications sûreté", basse-casse pour
// éviter de matcher le heading "Spécifications Sûreté" du chapitre).
export const ESSS_CONTENU_LINE_START_RE = /^Spécifications Environnementales?,\s+Sociales?,\s+Santé et Sécurité \(ESSS\) de gestion des travaux\s*$/i;
export const SPECIFICATIONS_SURETE_TOC_LINE_RE = /^Spécifications s[ûu]ret[ée]\s*$/i;

// ── ESSS — bloc "Exemple de situation" (illustratif, à supprimer si Oui) ───
export const ESSS_EXEMPLE_SITUATION_START_RE = /^Exemple de situation de travaux et suppression de certaines clauses/i;
export const ESSS_EXEMPLE_SITUATION_END_RE = /^Dans les présentes Spécifications ESSS/i;

// ── Section IV — formulaire "Prix ESSS" ────────────────────────────────────
// 'Oui'  → yellow-to-red sur 2 notes draft (matching).
// 'Non'  → highlight-range tout le bloc Prix ESSS du titre au titre suivant
//          (Bordereau de Prix Unitaires Sûreté, exclusif).
// `BORDEREAU_SURETE_TITLE_RE` est aussi utilisé en 1.7.3 (rule Bordereau Sûreté).
export const ESSS_PRIX_DRAFT_NOTES_RE = /^\[(?:Ce bordereau de prix unitaires est à insérer|Si des Spécifications ESSS ne sont pas incluses dans les Documents d'Appel d'Offres, ce prix ESSS doit être supprimé)/i;
export const ESSS_PRIX_TITLE_RE = /^Prix Environnemental,?\s*Social,?\s*Santé et Sécurité\s*\(ESSS\)\s*$/i;
export const BORDEREAU_SURETE_TITLE_RE = /^Bordereau de Prix Unitaires S[ûu]ret[ée]\s*$/i;

// ── Section IV — formulaires "Méthodologie ESSS" et "Engagement ESSS" ──────
// Si esss_applicable=Non : 3 zones rougies (Méthodologie page 66, intro
// engagement page 67, Formulaire d'engagement pages 67-68). Tolérance Word :
//   - "Sous-traitants" peut perdre son trait d'union (`Sous-?traitants`)
//   - le titre Méthodologie peut ne pas avoir d'espace avant "(ESSS)"
//     (`\s*` couvre les deux cas)
export const ESSS_METHODOLOGIE_TITLE_RE = /^Méthodologie environnementale,\s*sociale,\s*santé et sécurité\s*\(ESSS\)\s*$/i;
export const LISTE_SOUS_TRAITANTS_TITLE_RE = /^Liste des Sous-?traitants\s*$/i;
export const ESSS_ENGAGEMENT_INTRO_RE = /^Les Soumissionnaires devront fournir, pour chaque sous-?traitant proposé, l'engagement que ce dernier a lu, compris et se conformera aux exigences ESSS/i;
export const ESSS_FORMULAIRE_ENGAGEMENT_TITLE_RE = /^Formulaire d'engagement ESSS du sous-?traitant\s*$/i;
export const ORGANISATION_TRAVAUX_HEADER_RE = /^Organisation des travaux sur site et Méthode de réalisation\s*$/i;

// ── Section IV — Bordereau de Prix Unitaires Sûreté (rule #16) ─────────────
// 'Oui – inclure sûreté' → yellow-to-red sur 2 notes draft.
// 'Non' → highlight-range tout le bloc (titre → Formulaires de la Proposition
// Technique exclusif). `BORDEREAU_SURETE_TITLE_RE` est défini plus haut
// (réutilisé : endRe en 1.7.2 Prix ESSS Non, startRe ici).
export const BORDEREAU_SURETE_DRAFT_NOTES_RE = /^\[(?:Ce bordereau de prix unitaires est à insérer dans le Bordereau des Prix|Si des spécifications sûreté ne sont pas incluses dans les Documents d'Appel d'Offres, ce bordereau)/i;
export const FORMULAIRES_PROPOSITION_TECHNIQUE_TITLE_RE = /^Formulaires de la Proposition Technique\s*$/i;

// ── Spécifications Sûreté — bloc d'ouverture (rule #18a) ───────────────────
// Le paragraphe "[A insérer en cas de Travaux en zone classée orange…]"
// sert de double-anchor : end-exclusif du chapitre ESSS (1.7.2) ET début
// inclusif des chapitres Sûreté Oui (rules 18a, range jusqu'à
// "Spécifications Sûreté" exclu) et Sûreté Non (rule 19a, range jusqu'à
// "TROISIEME PARTIE" exclu).
export const SURETE_OPENING_GUIDE_RE = /^\[A\s+ins[ée]rer en cas de Travaux en zone class[ée]e orange/i;
export const SPECIFICATIONS_SURETE_HEADING_RE = /^Sp[ée]cifications\s+S[ûu]ret[ée]\s*$/i;

// ── S07-002 / S07-003 / S07-004 — guides à remplacer par les valeurs UI ────
// 3 paragraphes jaunes du Préambule Sûreté qui se réécrivent avec le contenu
// utilisateur (textareas) via replaceYellowGuideParagraph.
export const SURETE_S07_002_GUIDE_RE = /^\[Ins[ée]rer une description du contexte s[ée]curitaire\b/i;
export const SURETE_S07_003_GUIDE_RE = /^\[D[ée]crire les r[ôo]les et responsabilit[ée]s, t[âa]ches et mise [àa] disposition de moyens par le Ma[îi]tre d'Ouvrage\b/i;
export const SURETE_S07_004_GUIDE_RE = /^\[Il conviendra le cas [ée]ch[ée]ant de pr[ée]ciser les r[ôo]les\b/i;

// ── S07-005 (rules #18c, #18d, #18e) ───────────────────────────────────────
// Le guide "[Cocher l'Option N°1...]" est toujours rougi quand Sûreté Oui.
// Les options N°1 et N°2 sont mutuellement exclusives selon
// `conditions_tres_degradees` (Oui → N°1 retenue, N°2 rouge ; Non → N°2
// retenue, N°1 rouge).
export const SURETE_COCHER_OPTION_GUIDE_RE = /^\[Cocher l'Option N°1 en cas de contexte s[ée]curitaire tr[èe]s d[ée]grad[ée]/i;
export const SURETE_OPTION_N1_HEADING_RE = /^Option N°1\s*:?\s*$/i;
export const SURETE_OPTION_N2_HEADING_RE = /^Option N°2\s*:?\s*$/i;
export const SURETE_4_2_DEPLACEMENT_HEADING_RE = /^4\.2\s*D[ée]placement\b/i;
// Marqueur jaune des 4 bullets dispersés dans §4.2/§4.3/§4.4/§5.
//   Oui → seule la marque jaunit→rouge (contenu pertinent reste).
//   Non → tout le paragraphe est rougit (bullet inapplicable).
export const SURETE_DEGRADE_BULLETS_MARKER_RE = /^\[[àa]\s+ins[ée]rer en cas de contexte s[ée]curitaire tr[èe]s d[ée]grad[ée]\s*;\s*sinon supprimer\]/i;

// ── S07-006 — bullet escortes (rule #18f) ──────────────────────────────────
// Le bullet mélange un marqueur jaune "[à insérer en cas d'escortes…]" avec
// du texte pertinent ("Identification du prestataire chargé…"). Range borné
// par le heading suivant "Hébergement lors des missions".
export const SURETE_ESCORTES_MARKER_RE = /^\[[àa]\s+ins[ée]rer en cas d'escortes jug[ée]es n[ée]cessaires/i;
export const SURETE_HEBERGEMENT_HEADING_RE = /^H[ée]bergement lors des missions\s*$/i;

// ── Spécifications Sûreté — chapitre complet Section VII (rule #19a) ───────
// Range : SURETE_OPENING_GUIDE_RE (start) → "TROISIEME PARTIE - Marché"
// (end exclusif).
export const TROISIEME_PARTIE_HEADING_RE = /^TROISIEME\s+PARTIE\b/i;

// ── Section VII sommaire — ligne basse-casse (rule #19b) ───────────────────
// Match strict casse pour cibler la ligne du sommaire "Spécifications sûreté"
// SANS toucher le heading "Spécifications Sûreté" (capitalisé) qui apparaît
// plus loin dans le chapitre. Distincte de SPECIFICATIONS_SURETE_TOC_LINE_RE
// (1.7.2 — flag /i, utilisée comme endRe non-strict).
export const SURETE_SOMMAIRE_LIGNE_RE = /^Spécifications sûreté\s*$/;

// ── Section III — tableau "6. Sûreté" (rule #19c) ──────────────────────────
// Le titre du groupe est rendu comme un paragraphe contenant uniquement
// "Sûreté" (l'auto-numérotation "6." est portée par le style de liste).
// Match strict casse pour éviter d'autres "Sûreté" du document. End anchor
// = heading suivant "Section IV Formulaires de Soumission".
export const SURETE_SECTION_III_TITLE_RE = /^Sûreté\s*$/;
export const SECTION_IV_FORMULAIRES_HEADING_RE = /^Section IV\s+Formulaires de Soumission\s*$/i;

// Note rule #19d (Sûreté Non — footnotes 26/27/28) : les IDs de footnote sont
// passés directement comme array littéral dans la rule via `footnoteIds:
// ['26', '27', '28']`, pas via une ancre. Le dispatcher (op
// 'yellow-to-red-footnotes') prend `op.footnoteIds` tel quel.

// ════════════════════════════════════════════════════════════════════════
// CCAP HELPERS ANCHORS (phase 1.8) — paramétrisation des 13 helpers CCAP
// nommés. Chaque export ci-dessous est un anchor template (regex ou string)
// utilisé par UN helper pour localiser sa cible dans le document. Les
// helpers conservent leur API actuelle ; seules les regex inline sont
// promues ici. Détails XML (yellow highlight, Wingdings F0FE/F06F, pPr,
// underscores littéraux, etc.) restent intra-helper car ce sont des
// implémentation details, pas des anchors template.
// ════════════════════════════════════════════════════════════════════════

// ── CCAP — Tableau "Résumé des Tranches" (Article 1.1.3.3) ────────────────
// Le caption "Résumé des Tranches" apparaît plusieurs fois (guides + table) ;
// on cible la DERNIÈRE occurrence (= le tableau réel) — d'où le flag /g.
export const CCAP_TRANCHES_CAPTION_RE = /Résumé des Tranches/g;
export const CCAP_TRANCHES_TABLE_HEADER_RE = /Nom\/Description des Tranches[\s\S]*Article 1\.1\.3\.3[\s\S]*Pénalités de retard/;

// ── CCAP §1.1.6.11 — Spécifications ESSS applicables (cases Wingdings) ────
// L'anchor "Les Spécifications ESSS sont applicables :" apparaît 3× dans le
// template (2 guides + le slot CCAP réel) — le helper cible la DERNIÈRE
// occurrence. Match par includes() après normApos sur le texte concaténé.
export const CCAP_ESSS_CHECKBOXES_ANCHOR_TEXT = "Les Spécifications ESSS sont applicables :";

// ── CCAP §1.1.6.15 — Conditions Climatiques Exceptionnellement Défavorables
// Anchor sur la phrase d'introduction de la SC (« "Conditions Climatiques
// Exceptionnellement Défavorables" signifie : »). Tolère guillemets droits/
// absents (`"?…"?`) et accents NFD (`D[ée]favorables`).
export const CCAP_CONDITIONS_CLIMATIQUES_ANCHOR_RE = /^"?Conditions Climatiques Exceptionnellement D[ée]favorables"?\s+signifie\s*:/i;

// ── CCAP §14.1 — Type de Marché (3 options exclusives) ────────────────────
// Heading + ref + 8 labels : header guide, 3 options, 2 séparateurs [ou],
// 2 descriptions composantes (Combinaison). Boundary = sous-clause 14.1(x).
export const CCAP_14_1_HEADING_TEXT_LC = 'montant du marché';
export const CCAP_14_1_REF_TEXT = '14.1';
export const CCAP_14_1_HEADER_GUIDE_RE = /^\[Choisir l[''']option correspondant/i;
export const CCAP_14_1_OPT_FORFAITAIRE_RE = /^Le march[ée] est [àa] Prix Global et Forfaitaire$/i;
export const CCAP_14_1_OPT_UNITAIRES_RE = /^Le March[ée] est [àa] Prix Unitaires$/i;
export const CCAP_14_1_OPT_COMBINAISON_RE = /^Le March[ée] est une combinaison/i;
export const CCAP_14_1_OU_SEPARATOR_RE = /^\[ou\]$/i;
export const CCAP_14_1_DESC_FORF_RE = /^La Composante [àa] Prix Global et Forfaitaire consiste/i;
export const CCAP_14_1_DESC_UNIT_RE = /^La Composante [àa] Prix Unitaires consiste/i;
export const CCAP_14_1_SUB_REF_BOUNDARY_RE = /^14\.1\(/i;

// ── CCAP §13.5(b)(ii) — Pourcentage Sommes provisionnelles ────────────────
// Comparaison lowercase substring sur le heading + comparaison `startsWith`
// sur la ref (qui peut être suivie de texte additionnel selon l'export).
export const CCAP_13_5_B_II_HEADING_LC_INCLUDES = "pourcentage pour l'ajustement des sommes provisionnelles";
export const CCAP_13_5_B_II_REF_PREFIX_LC = '13.5(b)(ii)';

// ── CCAP §14.1(b) — Exemptions de droits, taxes et impôts ─────────────────
export const CCAP_14_1_B_REF_TEXT = '14.1(b)';

// ── CCAP §14.1(e) — Toggle Oui/Non + suffix "[Supprimer la mention inutile]"
export const CCAP_14_1_E_REF_TEXT = '14.1(e)';
export const CCAP_14_1_E_SUPPRIMER_SUFFIX_TEXT = '[Supprimer la mention inutile]';

// ── CCAP §14.2 — Avance de Démarrage (heading + ref) ──────────────────────
export const CCAP_14_2_HEADING_TEXT_LC = "paiement de l'avance de démarrage";
export const CCAP_14_2_REF_TEXT = '14.2';

// ── CCAP §14.3 — Plafond de la Retenue de Garantie (heading + ref) ────────
export const CCAP_14_3_HEADING_TEXT_LC = 'plafond de la retenue de garantie';
export const CCAP_14_3_REF_TEXT = '14.3';

// ── CCAP §14.5 — Equipements et Matériaux (heading + guide + sub-refs) ────
// Heading lowercase compare ; guide regex tolère trait d'union/espace/NBSP
// dans "Sous-Clause" (artéfact Word). Boundary = sous-clause 14.6.
export const CCAP_14_5_HEADING_TEXT_LC = 'equipements et matériaux';
export const CCAP_14_5_GUIDE_RE = /^\[Si la Sous[- ]?Clause\s*14\.5\s*s/i;
export const CCAP_14_5_FOB_REF_PREFIX_LC = '14.5(b)(i)';
export const CCAP_14_5_ONSITE_REF_PREFIX_LC = '14.5(c)(i)';
export const CCAP_14_5_NEXT_SUBCLAUSE_RE = /^14\.6(\b|$)/i;

// ── CCAP §18.1 — Délais de présentation des assurances ────────────────────
// Heading regex tolère NFC/NFD sur `é` ; labels Attestation / Polices ;
// underscore + jours patterns ; boundary 18.x ou Montant minimum (18.3).
export const CCAP_18_1_HEADING_RE = /^d[ée]lais de pr[ée]sentation des assurances\s*:?\s*$/i;
export const CCAP_18_1_REF_TEXT = '18.1';
export const CCAP_18_1_ATTESTATION_LABEL_RE = /^Attestation\s+d'assurance/i;
export const CCAP_18_1_POLICES_LABEL_RE = /^Polices\b.*applicables?/i;
export const CCAP_18_1_UNDERSCORE_JOURS_RE = /^_+\s*jours\.?$/i;
export const CCAP_18_1_UNDERSCORE_ONLY_RE = /^_+$/i;
export const CCAP_18_1_SUB_REF_BOUNDARY_RE = /^18\.\d/;
// Typo template "Polices applicables" → corrigé en "Polices d'assurance applicables"
export const CCAP_18_1_POLICES_OLD_LABEL_LC = 'polices applicables';
export const CCAP_18_1_POLICES_NEW_LABEL_TEXT = "Polices d'assurance applicables";

// ── CCAP §18.3 — Montant minimum de l'assurance ──────────────────────────
export const CCAP_18_3_HEADING_RE = /^Montant minimum de l'assurance contre les atteintes/i;
export const CCAP_18_3_REF_TEXT = '18.3';

// ── CCAP §20.2 — Composition du CRD (Un membre unique / Trois membres) ────
// Heading + ref + 4 labels (2 guides "[Soit :]" / "[soit :]" + 2 options).
// Boundary = "Liste de membres potentiels" ou sous-clause 20.x.
export const CCAP_20_2_HEADING_RE = /^Le CRD doit comprendre$/i;
export const CCAP_20_2_REF_TEXT = '20.2';
export const CCAP_20_2_GUIDE_SOIT_UPPER_RE = /^\[Soit\s*:?\s*\]$/i;
export const CCAP_20_2_OPT_UN_MEMBRE_RE = /^Un membre unique$/i;
export const CCAP_20_2_GUIDE_SOIT_LOWER_RE = /^\[soit\s*:?\s*\]$/i;
export const CCAP_20_2_OPT_TROIS_MEMBRES_RE = /^Trois membres$/i;
export const CCAP_20_2_LISTE_BOUNDARY_RE = /^Liste de membres potentiels/i;
export const CCAP_20_2_SUB_REF_BOUNDARY_RE = /^20\.\d/;

// ── CCAP Partie A — notes jaunes "draft" à rougir si le champ est rempli ───
// 7 paragraphes de guidage du CCAP (ex: "[Si des tranches sont utilisées…]",
// "[cocher la / les case(s) correspondante(s)]") qui doivent être convertis
// jaune→rouge dès que le champ associé est rempli (la décision est prise,
// la note guide n'est plus utile). Sinon le jaune est conservé. Chaque rule
// a son trigger `fieldFilled: <field>` distinct. Tolérances Word :
//   - "Sous-Clause" peut perdre son trait d'union → `Sous-?Clause`
//   - NBSP autour des numéros (8.1, 8.4) → `\s*`
//   - "Œ"/"œ" peut être encodé séparément → `(?:Œ|œ)`
export const CCAP_DRAFT_TRANCHES_REFS_RE = /Si des [Tt]ranches sont utilisées, se référer au [Tt]ableau/;
export const CCAP_DRAFT_1_1_6_15_CLIMAT_RE = /Conditions Climatiques Exceptionnellement Défavorables visées à l'alinéa c\) de la Sous-?Clause\s*8\.4/;
export const CCAP_DRAFT_2_1_DELAI_ACCES_RE = /Si plusieurs Tranches sont prévues, et si un seul délai d'accès/;
export const CCAP_DRAFT_3_1_POUVOIRS_MOE_RE = /Le Maître d'Ouvrage peut décider de limiter davantage les pouvoirs du Maître d'(?:Œ|œ)uvre/;
export const CCAP_DRAFT_4_1_DOCS_ENTREPRENEUR_RE = /Le Maître d'Ouvrage peut décider de demander la fourniture de documents/;
export const CCAP_DRAFT_4_1_COCHER_CASES_RE = /cocher la \/ les case\(s\) correspondante\(s\)/;
export const CCAP_DRAFT_8_1_COMMENCEMENT_RE = /Insérer la liste des conditions telles que spécifiées dans le Sous-?Clause\s*8\.1 des CCAG/;

// ── Préambule / TOC / Cover page ──────────────────────────────────────────
// Pre-amble auto-strip (entre "Préambule" et "Table des matières"), date de
// référence sur la page de garde ("FÉVRIER 2024"), et le TITLEINTRO du guide
// "Quelle est l'utilité de la Préqualification" (supprimé en bloc quand le
// MOA n'a pas fait de pré-qualification).
export const PREAMBLE_HEADING_RE = /^Pr[eé]\s*ambule\s*$/i;
export const TOC_HEADING_RE = /^Table des mati[eè]res\s*$/i;
export const COVER_DATE_RE = /^F[EÉ]VRIER\s+2024$/i;
export const UTILITY_PREQUAL_TITLE_RE = /Quelle est l'utilit[eé] de la Pr[eé]qualification/i;

// ── AAO letter conditional blocks ─────────────────────────────────────────
// Le template porte 2 lettres AAO (avec / sans pré-qualif) à choisir selon le
// projet. Boundaries text-based, robustes hyphen vs en-dash.
export const AAO_BLOCK_PREQUALIFIES_HEADING_RE = /^Avis d'Appel d'Offres\s*[-–]\s*Lettre aux Soumissionnaires pr[eé][-\s]?qualifi[eé]s\s*$/i;
export const AAO_BLOCK_NON_PREQUAL_HEADING_RE = /^Avis d'Appel d'Offres\s*[-–]\s*Cas sans pr[eé][-\s]?qualification\s*$/i;
export const SPEC_TRAVAUX_HEADING_RE = /^Sp[eé]cifications des Travaux\s*$/i;

// "Modèle d'Avis d'Appel d'Offres" délimite le début du bloc à remplir avec
// les placeholders (nom MOA, ref AOI, dates…). La fin de scan est marquée
// soit par "Notes relatives à la préparation" soit par "Spécifications des
// Travaux" (le premier rencontré).
export const MODELE_AAO_HEADING_RE = /Modèle d'Avis d'Appel d'Offres/i;
export const AAO_END_OF_SCAN_RE = /Notes relatives à la préparation|^Spécifications des Travaux\s*$/i;

// ── Italic captions on cover-area signature pages ─────────────────────────
// Pages d'intro AAO : un italic centered "[Nom du Maître d'Ouvrage]" ou
// "[Nom du Marché]" surplombe une ligne underscore tabulée à pré-remplir.
export const CAPTION_NOM_MOA_RE = /^\s*\[Nom du Ma[îi]tre\s*d'Ouvrage\]\s*$/;
export const CAPTION_NOM_MARCHE_RE = /^\s*\[Nom du March[ée]\]\s*$/;

// ── ESSS Articles non applicables (Section IV) ────────────────────────────
// Header de la table "N° d'Article non applicable / [insérer les explications…]".
export const ARTICLES_NON_APPLICABLES_TABLE_HEADER_RE = /Numéro d'Article non applicable[\s\S]*insérer les explications/;

// ── Anchors propres au document de Pré-qualification (mode prequal) ──────
// Utilisés par les rules `prequalOnly: true` pour piloter le surlignage
// rouge conditionnel des sections optionnelles du doc préqual.

// Critère 5.4 — Expérience spécifique de transfert de compétence ESSS.
// Heading marquant le début du bloc à éventuellement supprimer si
// `transfert_competence === "Non – supprimer 5.4"`.
export const PREQUAL_CRITERE_5_4_HEADING_RE = /^Critère\s+5\.4\b.*transfert\s+de\s+compétence/i;
// Heading suivant qui marque la fin du bloc 5.4.
export const PREQUAL_CRITERE_5_5_HEADING_RE = /^Critère\s+5\.5\b/i;
// Marqueur "[A supprimer si le transfert de compétence n'est pas un enjeu]"
// — toujours surligné rouge comme guide MOA, indépendamment du choix.
export const PREQUAL_5_4_SUPPRIMER_MARKER_RE = /\[A\s+supprimer\s+si\s+le\s+transfert\s+de\s+compétence\s+n['’]\s*est\s+pas\s+un\s+enjeu\]/i;

// Critère 6 — Sûreté. Le bloc complet (6.1 à 6.5) doit être surligné rouge
// quand `surete_applicable === "Non"` (pas de zone classée orange/rouge MEAE).
// Démarre au heading "Sûreté" qui précède le tableau 6.1-6.5 ; finit au
// heading "Section IV" suivant (Formulaires de Candidature).
export const PREQUAL_SURETE_HEADING_RE = /^Sûreté\s*$/i;
export const PREQUAL_SECTION_IV_HEADING_RE = /^Section\s+IV\b.*Formulaires\s+de\s+Candidature/i;

// ── Pré-qualification surlignage ──────────────────────────────────────────
// PREQUAL_RE: le mot lui-même (avec/sans tiret, e/é). Tout paragraphe qui le
// contient doit être surligné rouge SAUF s'il matche l'une des PREQUAL_EXCLUDE_RES
// (cas "sans pré-qualification", clauses dual-case, etc.).
export const PREQUAL_RE = /pr[eé]-?qualif/i;
export const PREQUAL_EXCLUDE_RES = [
  /n'a pas été précédé/i,
  /n'a pas été effectuée/i,
  /Cas sans pr[eé]-?qualif/i,
  /\[Section à supprimer si une pr[eé]-?qualif/i,
  /\[est \/ n'est pas\][\s\S]*pr[eé]-?qualif/i,
  // DPAO IS 4.5 after placeholder replacement ("n'est pas" baked in)
  /\[supprimer la mention inutile\]/i,
  // Préambule §3 — texte méta qui décrit le DTAO lui-même
  /Ce DTAO a été adapté des Documents Type/i,
  // IS 17.1 — clause conditionnelle (pré-qualif + examen a posteriori)
  /Conformément aux dispositions de la Section III[\s\S]*Critères d'évaluation et de qualification/i,
  // IS 17.3 — règle sur changement de structure post pré-qualif
  /Tout changement dans la structure ou la composition du Soumissionnaire/i,
  // IS 34.3 — contrepartie conditionnelle de 34.4
  /Lorsque l'Appel d'Offres a été précédé/i,
  // IS 37.1 — règle sur modifications après pré-qualif / invitation
  /Toute modification dans la structure ou composition d'un Soumissionnaire/i,
  // IS 37.2 — traite les deux cas explicitement
  /Le Maître d'Ouvrage s'assurera que le Soumissionnaire/i,
  // Évaluation ESSS — formulation générique "qualification ou de pré-qualification"
  /Chaque critère de qualification ou de pr[eé]-?qualification ESSS/i,
  // Section III §1.3 Marchés pour lots multiples
  /Les Soumissionnaires ont le choix de soumissionner pour un ou plusieurs lots/i,
];
