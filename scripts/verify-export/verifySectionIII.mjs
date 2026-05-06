// Regression : vérifie les transformations Section III
//  1. IS 33.1 "ne sera pas" → surligner le bloc Marge de préférence
//  2. IS 4.5 "n'est pas"    → surligner le guide jaune "[sinon supprimer …]"
//  3. IS 4.5 "est"          → supprimer le bloc 3.3 (jusqu'à fin Sûreté)
//                             en préservant la sectPr portrait rId37.
//
// Lancement : `node scripts/verify-export/verifySectionIII.mjs`

import {
  loadTemplateXml,
  normApos,
  stripTags,
  extractRunNodes,
  makeRedRun,
  findSectionIBounds,
  buildPartPositions,
} from './_helpers.mjs';
import {
  MARGE_PREFERENCE_HEADER_ANCHOR,
  NO_PREQUAL_GUIDE_ANCHORS,
  NO_PREQUAL_HEADER_ANCHOR,
} from '../../src/data/templateAnchors.js';

// ── Miroirs des fonctions de src/engine/export/exportDocx.js ────────────────────

function highlightMargePreferenceBlock(xml, margePreference) {
  if (margePreference !== 'ne sera pas') return { xml, paraCount: 0, runCount: 0, range: null };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (!/<w:pStyle\s+w:val="Heading1"/.test(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (MARGE_PREFERENCE_HEADER_ANCHOR.test(t)) { startIdx = i; break; }
  }
  if (startIdx === -1) return { xml, paraCount: 0, runCount: 0, range: null };
  let endIdx = parts.length;
  for (let i = startIdx + 2; i < parts.length; i += 2) {
    if (/<w:pStyle\s+w:val="Heading1"/.test(parts[i])) { endIdx = i; break; }
  }
  let paraCount = 0;
  let runCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let lastEnd = 0;
    let changed = false;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) { out += makeRedRun(r.rPr, r.text); runCount++; changed = true; }
      else out += r.xml;
    }
    out += para.slice(lastEnd);
    if (changed) { parts[i] = out; paraCount++; }
  }
  return { xml: parts.join(''), paraCount, runCount, range: [startIdx, endIdx] };
}

function highlightNoPrequalGuide(xml) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let paraCount = 0;
  let runCount = 0;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (!NO_PREQUAL_GUIDE_ANCHORS.some((re) => re.test(t))) continue;
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let lastEnd = 0;
    let changed = false;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) { out += makeRedRun(r.rPr, r.text); runCount++; changed = true; }
      else out += r.xml;
    }
    out += para.slice(lastEnd);
    if (changed) { parts[i] = out; paraCount++; }
  }
  return { xml: parts.join(''), paraCount, runCount };
}

function removeNoPrequalQualificationBlock(xml, prequalification) {
  if (prequalification !== 'est') return { xml, removed: 0, preservedSectPr: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const positions = buildPartPositions(parts);
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (NO_PREQUAL_HEADER_ANCHOR.test(t)) { startIdx = i; break; }
  }
  if (startIdx === -1) return { xml, removed: 0, preservedSectPr: false };
  let endIdx = -1;
  for (let i = startIdx + 2; i < parts.length; i += 2) {
    if (/<w:pStyle\s+w:val="TITLESECTION"/.test(parts[i])) { endIdx = i; break; }
  }
  if (endIdx === -1) return { xml, removed: 0, preservedSectPr: false };
  let keptSectPrPara = '';
  let removedParaCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    removedParaCount++;
    const para = parts[i];
    if (!/<w:sectPr\b/.test(para)) continue;
    if (/w:orient="landscape"/.test(para)) continue;
    keptSectPrPara = para;
  }
  if (keptSectPrPara) removedParaCount--;
  const before = xml.slice(0, positions[startIdx]);
  const after = xml.slice(positions[endIdx]);
  return {
    xml: before + keptSectPrPara + after,
    removed: removedParaCount,
    preservedSectPr: !!keptSectPrPara,
    startIdx,
    endIdx,
  };
}

// ── Scénarios ─────────────────────────────────────────────────────────────
const xml0 = await loadTemplateXml();

console.log('=== A. IS 33.1 "ne sera pas" — surligner bloc Marge de préférence ===');
{
  const r = highlightMargePreferenceBlock(xml0, 'ne sera pas');
  console.log(`  range=[${r.range?.[0]}, ${r.range?.[1]}) paraCount=${r.paraCount} runCount=${r.runCount}`);
  console.log(`  → attendu 9 paragraphes (Heading1 "Marge de préférence" → Heading1 "Qualification")`);
}

console.log('\n=== A.neg IS 33.1 "sera" (no-op) ===');
{
  const r = highlightMargePreferenceBlock(xml0, 'sera');
  console.log(`  paraCount=${r.paraCount} (attendu 0)`);
}

console.log('\n=== B. IS 4.5 "n\'est pas" — surligner guide jaune ===');
{
  const r = highlightNoPrequalGuide(xml0);
  console.log(`  paraCount=${r.paraCount} runCount=${r.runCount}`);
  console.log(`  → attendu 1 paragraphe / 1 run ("[sinon supprimer toute cette section]")`);
}

console.log('\n=== C. IS 4.5 "est" — supprimer bloc 3.3 ===');
{
  const r = removeNoPrequalQualificationBlock(xml0, 'est');
  console.log(`  paragraphes retirés: ${r.removed}`);
  console.log(`  bytes retirés: ${xml0.length - r.xml.length}`);
  console.log(`  sectPr portrait préservée: ${r.preservedSectPr}`);

  const hasPortrait = /<w:sectPr[^>]*>\s*<w:headerReference[^>]*r:id="rId37"/.test(r.xml);
  const hasLandscape = /<w:sectPr[^>]*>\s*<w:headerReference[^>]*r:id="rId38"/.test(r.xml);
  console.log(`  rId37 (portrait Section III header) présent: ${hasPortrait}`);
  console.log(`  rId38 (landscape Section III header) supprimé: ${!hasLandscape}`);

  const countOpen = (t) => (r.xml.match(new RegExp(`<${t}\\b`, 'g')) || []).length;
  const countClose = (t) => (r.xml.match(new RegExp(`</${t}>`, 'g')) || []).length;
  let allBalanced = true;
  for (const t of ['w:tbl', 'w:tr', 'w:tc', 'w:p', 'w:sectPr']) {
    const o = countOpen(t);
    const c = countClose(t);
    if (o !== c) allBalanced = false;
    console.log(`    <${t}> opens=${o} closes=${c} ${o === c ? 'OK' : 'DÉSÉQUILIBRÉ'}`);
  }
  console.log(`  XML bien formé (balises équilibrées): ${allBalanced}`);
}

console.log('\n=== C.neg IS 4.5 "n\'est pas" (no-op) ===');
{
  const r = removeNoPrequalQualificationBlock(xml0, "n'est pas");
  console.log(`  removed=${r.removed} (attendu 0)`);
}

console.log('\n=== Garde Section I (règle d\'or) ===');
{
  const sectI = findSectionIBounds(xml0);
  const o1 = highlightMargePreferenceBlock(xml0, 'ne sera pas').xml;
  const o2 = highlightNoPrequalGuide(o1).xml;
  const countRed = (xml) => (xml.slice(sectI.startPos, sectI.endPos).match(/<w:highlight\s+w:val="red"\/>/g) || []).length;
  console.log(`  Section I [${sectI.startPos}..${sectI.endPos}) red runs  before=${countRed(xml0)}  after highlight-A+B=${countRed(o2)}`);
}
