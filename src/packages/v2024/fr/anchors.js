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
