// Regression: vérifie les cinq corrections de fin de Phase 4B :
//  1. IS 32.1 — placeholders FIELD_MAP sans espace parasite avant `]`
//  2. Guides statiques toujours rouges (IS 7.4, 14.5, 22.1, 25.1, 33.1)
//  3. IS 13.5 — bloc conditionnel quand variantes délais = "ne sont pas"
//  4. IS 34.1 — guide conditionnel quand sous-traitants désignés = "ne prévoit pas"
//  5. Section I intacte (règle d'or)
//
// Lancement : `node scripts/verify-export/verifyCorrections.mjs`

import { loadTemplateXml, splitIntoParagraphs } from './_helpers.mjs';
import {
  STATIC_GUIDE_ANCHORS,
  IS_13_5_VARIANTES_DELAIS_ANCHORS,
  IS_34_1_SOUS_TRAITANTS_ANCHORS,
} from '../../src/data/templateAnchors.js';

const xml = await loadTemplateXml();
const paras = splitIntoParagraphs(xml);

// ── 1. IS 32.1 — FIELD_MAP sans espace parasite ─────────────────────────
const fm1 = "[Insérer la monnaie, normalement la monnaie nationale du Maître d'Ouvrage]";
const fm2 = "[habituellement on utilisera la banque centrale du pays du Maître d'Ouvrage]";
const hit1 = paras.findIndex((p) => p.combined.includes(fm1));
const hit2 = paras.findIndex((p) => p.combined.includes(fm2));
console.log('=== IS 32.1 FIELD_MAP ph (sans espace parasite) ===');
console.log(`  monnaie_evaluation ph → para idx ${hit1} ${hit1 >= 0 ? 'MATCH' : 'MISS'}`);
console.log(`  source_taux_change ph → para idx ${hit2} ${hit2 >= 0 ? 'MATCH' : 'MISS'}`);

// ── 2. Guides statiques toujours rouges ─────────────────────────────────
console.log('\n=== Guides statiques (STATIC_GUIDE_ANCHORS) ===');
const labels = [
  'IS 7.4 mi-période',
  'IS 14.5 prix révisables',
  'IS 22.1 e-guide',
  'IS 22.1 e-procédure',
  'IS 25.1 e-ouverture',
  'IS 33.1 marge préférence',
];
let staticTotal = 0;
STATIC_GUIDE_ANCHORS.forEach((re, idx) => {
  const hits = paras.map((p, i) => ({ p, i })).filter((x) => re.test(x.p.text));
  console.log(`  ${labels[idx]} → ${hits.length} hit(s)`);
  hits.forEach((h) => console.log(`     idx=${h.i}: ${h.p.text.slice(0, 100)}`));
  staticTotal += hits.length;
});
console.log(`  total paragraphes guides statiques : ${staticTotal}`);

// ── 3. IS 13.5 ancres conditionnelles ──────────────────────────────────
console.log('\n=== IS 13.5 variantes délais (quand "ne sont pas") ===');
const vdLabels = ['montant ajustement', 'pénalité'];
IS_13_5_VARIANTES_DELAIS_ANCHORS.forEach((re, idx) => {
  const hits = paras.map((p, i) => ({ p, i })).filter((x) => re.test(x.p.text));
  console.log(`  ${vdLabels[idx]} → ${hits.length} hit(s)`);
  hits.forEach((h) => console.log(`     idx=${h.i}: ${h.p.text.slice(0, 100)}`));
});

// ── 4. IS 34.1 ancres conditionnelles ──────────────────────────────────
console.log('\n=== IS 34.1 sous-traitants (quand "ne prévoit pas") ===');
IS_34_1_SOUS_TRAITANTS_ANCHORS.forEach((re) => {
  const hits = paras.map((p, i) => ({ p, i })).filter((x) => re.test(x.p.text));
  console.log(`  guide listing → ${hits.length} hit(s)`);
  hits.forEach((h) => console.log(`     idx=${h.i}: ${h.p.text.slice(0, 100)}`));
});

// ── 5. Garde Section I ─────────────────────────────────────────────────
console.log('\n=== Garde Section I (règle d\'or) ===');
const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
let sectI = -1;
let sectII = -1;
let m;
while ((m = paraRe.exec(xml)) !== null) {
  if (!/<w:pStyle\s+w:val="TITLESECTION"/.test(m[0])) continue;
  const t = m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (sectI === -1 && /^Section\s+I\s+/i.test(t)) sectI = m.index;
  else if (sectII === -1 && /^Section\s+II\s+/i.test(t)) { sectII = m.index; break; }
}

const allAnchors = [
  ...STATIC_GUIDE_ANCHORS,
  ...IS_13_5_VARIANTES_DELAIS_ANCHORS,
  ...IS_34_1_SOUS_TRAITANTS_ANCHORS,
];
let sectIHits = 0;
for (const re of allAnchors) {
  paras.forEach((p, i) => {
    if (p.start >= sectI && p.start < sectII && re.test(p.text)) {
      sectIHits++;
      console.log(`  WARN: ancre matche en Section I idx=${i}: ${p.text.slice(0, 90)}`);
    }
  });
}
console.log(`  Section I [${sectI}..${sectII}) hits: ${sectIHits} (attendu 0)`);
