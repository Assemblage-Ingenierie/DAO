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
