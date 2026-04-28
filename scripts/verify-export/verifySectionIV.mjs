// Vérifie que les 3 fonctions de surlignage rouge de la Section IV ciblent
// les bons paragraphes du template (template-DTAO.docx) :
//   - highlightAnnexe1Revisions    (si prix fermes)
//   - highlightAnnexe2Alternative  (alternative non retenue)
//   - highlightVariantesTechniquesForm (si variantes non autorisées)
//
// Le script ré-implémente la logique des fonctions (copiée depuis
// src/export/exportDocx.js) pour rester autonome — même contraintes que les
// autres scripts verify*.mjs.

import {
  loadTemplateXml,
  splitIntoParagraphs,
  extractRunNodes,
  findSectionIBounds,
  normApos,
} from './_helpers.mjs';

function buildPartPositions(parts) {
  const positions = new Array(parts.length);
  let cur = 0;
  for (let i = 0; i < parts.length; i++) { positions[i] = cur; cur += parts[i].length; }
  return positions;
}

function isTocParagraph(paraXml) {
  return /PAGEREF\s+_Toc/i.test(paraXml) || /<w:pStyle\s+w:val="TOC\d/i.test(paraXml);
}
function findRange(parts, positions, sectI, startRe, endRe) {
  let startIdx = -1, endIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (isTocParagraph(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (startIdx === -1) {
      if (startRe.test(t)) startIdx = i;
    } else {
      if (endRe.test(t)) { endIdx = i; break; }
    }
  }
  return { startIdx, endIdx };
}

const xml = await loadTemplateXml();
const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
const positions = buildPartPositions(parts);
const sectI = findSectionIBounds(xml);

function firstLine(i) {
  if (i < 0) return '(not found)';
  const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
  return t.slice(0, 100);
}

// ── Test 1: Annexe 1 (prix fermes) ──────────────────────────────────────
{
  const r = findRange(parts, positions, sectI,
    /^Annexe 1 [aà] la Soumission\b.*r[eé]vision des prix/i,
    /^Annexe 2 [aà] la Soumission\b/i,
  );
  const ok = r.startIdx !== -1 && r.endIdx !== -1;
  console.log(`\n[Annexe 1] start=${r.startIdx} end=${r.endIdx}  ${ok ? 'OK' : 'FAIL'}`);
  console.log(`  start: ${firstLine(r.startIdx)}`);
  console.log(`  end:   ${firstLine(r.endIdx)}`);
  const nbParas = (r.endIdx - r.startIdx) / 2;
  console.log(`  ${nbParas} paragraphe(s) seraient surlignés`);
}

// ── Test 2a: Annexe 2 Alt B red (Option A retenue) ──────────────────────
{
  const r = findRange(parts, positions, sectI,
    /Tableau\s*:\s*Alternative\s*B/i,
    /^Annexe 3 [aà] la Soumission\b/i,
  );
  const ok = r.startIdx !== -1 && r.endIdx !== -1;
  console.log(`\n[Annexe 2 - Option A → Alt B red] start=${r.startIdx} end=${r.endIdx}  ${ok ? 'OK' : 'FAIL'}`);
  console.log(`  start: ${firstLine(r.startIdx)}`);
  console.log(`  end:   ${firstLine(r.endIdx)}`);
  console.log(`  ${(r.endIdx - r.startIdx) / 2} paragraphe(s)`);
}

// ── Test 2b: Annexe 2 Alt A red (Option B retenue) ──────────────────────
{
  const r = findRange(parts, positions, sectI,
    /Tableau\s*:\s*Alternative\s*A/i,
    /Tableau\s*:\s*Alternative\s*B/i,
  );
  const ok = r.startIdx !== -1 && r.endIdx !== -1;
  console.log(`\n[Annexe 2 - Option B → Alt A red] start=${r.startIdx} end=${r.endIdx}  ${ok ? 'OK' : 'FAIL'}`);
  console.log(`  start: ${firstLine(r.startIdx)}`);
  console.log(`  end:   ${firstLine(r.endIdx)}`);
  console.log(`  ${(r.endIdx - r.startIdx) / 2} paragraphe(s)`);
}

// ── Test 3: Variantes techniques form ──────────────────────────────────
{
  const introRe = /^Proposition pour les [eé]l[eé]ments d\s*es ouvrages pour lesquels des variantes technique\s*s sont autoris[eé]es/i;
  let introIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (isTocParagraph(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (introRe.test(t)) { introIdx = i; break; }
  }
  let startIdx = introIdx;
  if (introIdx !== -1) {
    for (let j = 1; j <= 4; j++) {
      const k = introIdx - 2 * j;
      if (k < 1) break;
      const t = normApos(extractRunNodes(parts[k]).map(r => r.text).join(''));
      if (/^Variantes techniques\s*$/i.test(t)) { startIdx = k; break; }
    }
  }
  let endIdx = -1;
  if (introIdx !== -1) {
    for (let i = introIdx + 2; i < parts.length; i += 2) {
      const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
      if (/M[eé]thodologie\s+environnementale/i.test(t)) { endIdx = i; break; }
    }
  }
  const ok = startIdx !== -1 && endIdx !== -1;
  console.log(`\n[Variantes techniques form] start=${startIdx} end=${endIdx}  ${ok ? 'OK' : 'FAIL'}`);
  console.log(`  start: ${firstLine(startIdx)}`);
  console.log(`  end:   ${firstLine(endIdx)}`);
  console.log(`  ${(endIdx - startIdx) / 2} paragraphe(s)`);
}
