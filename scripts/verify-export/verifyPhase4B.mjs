// Regression: simule les trois fonctions Phase 4B — IS 11.1(b) / IS 15.1 /
// IS 32.1 — contre le template-DTAO.docx et vérifie qu'elles ciblent les bons
// paragraphes sans empiéter sur Section I.
//
// Lancement : `node scripts/verify-export/verifyPhase4B.mjs`
//
// Les implémentations des fonctions sont copiées à l'identique depuis
// `src/export/exportDocx.js`. Si vous modifiez l'une des fonctions ci-dessous,
// synchronisez l'autre côté — la divergence est détectable en relisant les
// compteurs attendus imprimés en fin de script.

import {
  loadTemplateXml,
  normApos,
  stripTags,
  extractRunNodes,
  hasYellowHighlight,
  makeRedRun,
  findSectionIBounds,
  buildPartPositions,
} from './_helpers.mjs';

// ─── Implémentations miroir de src/export/exportDocx.js ───────────────────

function highlightUnselectedPriceFormats(xml, typePrix) {
  if (!typePrix) return { xml, count: 0 };
  const optionMap = {
    'Bordereau des Prix et DQE (prix unitaires)': 0,
    'Prix global et forfaitaire': 1,
    'Combinaison prix unitaires + forfaitaire': 2,
  };
  const selectedIdx = optionMap[typePrix];
  if (selectedIdx === undefined) return { xml, count: 0 };
  const rowRes = [
    /\[pour les march[eé]s [aà] prix unitaires\]/i,
    /\[pour les march[eé]s [aà] prix global et forfaitaire\]/i,
    /\[pour les march[eé]s combinant/i,
  ];
  const orRe = /^\s*\[ou\]\s*$/i;
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (rowRes[0].test(t)) { startIdx = i; break; }
  }
  if (startIdx === -1) return { xml, count: 0 };
  const block = [];
  let cur = startIdx;
  for (let k = 0; k < 3; k++) {
    block.push({ idx: cur, kind: 'row', optIdx: k });
    if (k === 2) break;
    cur += 2;
    if (cur >= parts.length) return { xml, count: 0 };
    const tOr = normApos(extractRunNodes(parts[cur]).map((r) => r.text).join(''));
    if (!orRe.test(tOr)) return { xml, count: 0 };
    block.push({ idx: cur, kind: 'or' });
    cur += 2;
    if (cur >= parts.length) return { xml, count: 0 };
    const tRow = normApos(extractRunNodes(parts[cur]).map((r) => r.text).join(''));
    if (!rowRes[k + 1].test(tRow)) return { xml, count: 0 };
  }
  let count = 0;
  for (const entry of block) {
    const para = parts[entry.idx];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let lastEnd = 0;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (!r.text) { out += r.xml; continue; }
      let shouldRed;
      if (entry.kind === 'or') shouldRed = true;
      else if (entry.optIdx !== selectedIdx) shouldRed = true;
      else shouldRed = hasYellowHighlight(r.rPr);
      if (shouldRed) { out += makeRedRun(r.rPr, r.text); count++; }
      else out += r.xml;
    }
    out += para.slice(lastEnd);
    parts[entry.idx] = out;
  }
  return { xml: parts.join(''), count, block };
}

function highlightUnselectedMonnaieOption(xml, optionMonnaie) {
  if (!optionMonnaie) return { xml, count: 0 };
  const isA = /Option\s*A/i.test(optionMonnaie);
  const isB = /Option\s*B/i.test(optionMonnaie);
  if (!isA && !isB) return { xml, count: 0 };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let anchorIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (/L'Option B refl[eè]te mieux les besoins/i.test(t)) { anchorIdx = i; break; }
  }
  if (anchorIdx === -1) return { xml, count: 0 };
  let optAHead = -1;
  let priviLabel = -1;
  let optBHead = -1;
  let endIdx = parts.length;
  for (let i = anchorIdx + 2; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (optAHead === -1 && /^Option A \(/i.test(t)) { optAHead = i; continue; }
    if (priviLabel === -1 && /^\[Option [aà] privil[eé]gier\]\s*$/i.test(t)) { priviLabel = i; continue; }
    if (optBHead === -1 && /^Option B \(/i.test(t)) { optBHead = i; continue; }
    if (optBHead !== -1 && (/^IS\s+\d/.test(t) || /^Section\s+[IVX]/i.test(t))) { endIdx = i; break; }
    if (i - anchorIdx > 40) { endIdx = i; break; }
  }
  if (optAHead === -1 || optBHead === -1) return { xml, count: 0 };
  const redIndices = new Set();
  redIndices.add(anchorIdx);
  if (priviLabel !== -1) redIndices.add(priviLabel);
  const addRange = (from, to) => { for (let i = from; i < to; i += 2) redIndices.add(i); };
  if (isA) addRange(optBHead, endIdx);
  else addRange(optAHead, priviLabel !== -1 ? priviLabel : optBHead);
  let count = 0;
  for (const i of redIndices) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let lastEnd = 0;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) { out += makeRedRun(r.rPr, r.text); count++; }
      else out += r.xml;
    }
    out += para.slice(lastEnd);
    parts[i] = out;
  }
  return { xml: parts.join(''), count, anchorIdx, optAHead, priviLabel, optBHead, endIdx, redIndices: [...redIndices] };
}

function highlightUnselectedConversionOption(xml, optionConversion) {
  if (!optionConversion) return { xml, count: 0 };
  const sel = String(optionConversion).trim().toUpperCase();
  if (sel !== 'A' && sel !== 'B') return { xml, count: 0 };
  const isA = sel === 'A';
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let anchorIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (/conform[eé]ment [aà] la proc[eé]dure correspondant [aà] l'Option/i.test(t)) { anchorIdx = i; break; }
  }
  if (anchorIdx === -1) return { xml, count: 0 };
  let optAHead = -1;
  let optBHead = -1;
  let endIdx = parts.length;
  for (let i = anchorIdx + 2; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map((r) => r.text).join(''));
    if (optAHead === -1 && /^Option A \(/i.test(t)) { optAHead = i; continue; }
    if (optBHead === -1 && /^Option B \(/i.test(t)) { optBHead = i; continue; }
    if (optBHead !== -1 && (/^IS\s+\d/.test(t) || /^Section\s+[IVX]/i.test(t))) { endIdx = i; break; }
    if (i - anchorIdx > 40) { endIdx = i; break; }
  }
  if (optAHead === -1 || optBHead === -1) return { xml, count: 0 };
  const redIndices = new Set();
  const addRange = (from, to) => { for (let i = from; i < to; i += 2) redIndices.add(i); };
  if (isA) addRange(optBHead, endIdx);
  else addRange(optAHead, optBHead);
  let count = 0;
  for (const i of redIndices) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let lastEnd = 0;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) { out += makeRedRun(r.rPr, r.text); count++; }
      else out += r.xml;
    }
    out += para.slice(lastEnd);
    parts[i] = out;
  }
  return { xml: parts.join(''), count, anchorIdx, optAHead, optBHead, endIdx, redIndices: [...redIndices] };
}

// ─── Scénarios de vérification ────────────────────────────────────────────

const xml0 = await loadTemplateXml();

console.log('=== IS 11.1(b) — user selects "Bordereau des Prix et DQE (prix unitaires)" ===');
{
  const { xml: out, count, block } = highlightUnselectedPriceFormats(xml0, 'Bordereau des Prix et DQE (prix unitaires)');
  console.log(`  runs painted: ${count}`);
  if (block) {
    for (const b of block) {
      const para = out.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g)[b.idx];
      const t = normApos(stripTags(para));
      const redRuns = (para.match(/<w:highlight\s+w:val="red"\/>/g) || []).length;
      console.log(`    ${b.kind === 'or' ? '[ou]' : `row${b.optIdx}`}  idx=${b.idx} red-runs=${redRuns}  "${t.slice(0, 90)}"`);
    }
  }
}

console.log('\n=== IS 15.1 — user selects "Option A – Monnaie nationale uniquement" ===');
{
  const r = highlightUnselectedMonnaieOption(xml0, 'Option A – Monnaie nationale uniquement');
  console.log(`  runs painted: ${r.count}`);
  console.log(`  anchor=${r.anchorIdx} optA=${r.optAHead} priviLabel=${r.priviLabel} optB=${r.optBHead} end=${r.endIdx}`);
}

console.log('\n=== IS 15.1 — user selects "Option B – Monnaies nationale et étrangères" ===');
{
  const r = highlightUnselectedMonnaieOption(xml0, 'Option B – Monnaies nationale et étrangères');
  console.log(`  runs painted: ${r.count}`);
  console.log(`  anchor=${r.anchorIdx} optA=${r.optAHead} priviLabel=${r.priviLabel} optB=${r.optBHead} end=${r.endIdx}`);
}

console.log('\n=== IS 32.1 — option_conversion = "A" ===');
{
  const r = highlightUnselectedConversionOption(xml0, 'A');
  console.log(`  runs painted: ${r.count}`);
  console.log(`  anchor=${r.anchorIdx} optA=${r.optAHead} optB=${r.optBHead} end=${r.endIdx}`);
}

console.log('\n=== IS 32.1 — option_conversion = "B" ===');
{
  const r = highlightUnselectedConversionOption(xml0, 'B');
  console.log(`  runs painted: ${r.count}`);
  console.log(`  anchor=${r.anchorIdx} optA=${r.optAHead} optB=${r.optBHead} end=${r.endIdx}`);
}

console.log('\n=== Contrôle négatif : type_prix vide ===');
{
  const { count } = highlightUnselectedPriceFormats(xml0, '');
  console.log(`  runs painted: ${count} (attendu 0)`);
}

console.log('\n=== Garde Section I (règle d\'or) ===');
{
  const sectI = findSectionIBounds(xml0);
  const out1 = highlightUnselectedPriceFormats(xml0, 'Bordereau des Prix et DQE (prix unitaires)').xml;
  const out2 = highlightUnselectedMonnaieOption(out1, 'Option A – Monnaie nationale uniquement').xml;
  const out3 = highlightUnselectedConversionOption(out2, 'A').xml;
  const countRed = (xml) => (xml.slice(sectI.startPos, sectI.endPos).match(/<w:highlight\s+w:val="red"\/>/g) || []).length;
  console.log(`  Section I [${sectI.startPos}..${sectI.endPos}) red runs  before=${countRed(xml0)}  after=${countRed(out3)} (attendu 0/0)`);
}
