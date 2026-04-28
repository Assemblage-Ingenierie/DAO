import JSZip from 'jszip';
// `saveAs` was imported from `file-saver`, but that package is stored as
// a 0-byte cloud-only placeholder in this Google Drive shared folder.
// Use the local equivalent in src/utils/saveBlob.js instead.
import { saveAs } from '../utils/saveBlob.js';
import {
  STATIC_GUIDE_ANCHORS,
  IS_13_5_VARIANTES_DELAIS_ANCHORS,
  IS_34_1_SOUS_TRAITANTS_ANCHORS,
  MARGE_PREFERENCE_HEADER_ANCHOR,
  NO_PREQUAL_GUIDE_ANCHORS,
  NO_PREQUAL_HEADER_ANCHOR,
} from '../data/templateAnchors.js';
import { isFilled } from '../utils/fieldStatus.js';
import { isEnjeuEsssLabel } from '../data/enjeuxEsss.js';

// ── CCAP Partie A — Notes jaunes "draft" à rougir si le champ est rempli ────
// Règle : chaque note bracketée jaune devient rouge si le champ relié a une
// valeur (= la décision est prise, la note guide n'est plus utile). Sinon le
// jaune est conservé. Les regex sont appliquées au texte concaténé du
// paragraphe (après normalisation NFC + apostrophes droites).
const CCAP_YELLOW_DRAFTS = [
  // SC 1.1.3.3 / 1.1.5.6 / 8.7&14.15(b) — "[Si des tranches sont utilisées...]"
  { paraTextRe: /Si des [Tt]ranches sont utilisées, se référer au [Tt]ableau/,
    isFilled: (fd) => isFilled(fd?.tranches_marche_existe), name: 'SC tranches refs' },
  // SC 1.1.6.15 — Conditions Climatiques (long guide). Template: "SousClause" + NBSP.
  { paraTextRe: /Conditions Climatiques Exceptionnellement Défavorables visées à l'alinéa c\) de la Sous-?Clause\s*8\.4/,
    isFilled: (fd) => isFilled(fd?.conditions_climatiques_defavorables), name: 'SC 1.1.6.15 climat guide' },
  // SC 2.1 — délai d'accès tranches
  { paraTextRe: /Si plusieurs Tranches sont prévues, et si un seul délai d'accès/,
    isFilled: (fd) => isFilled(fd?.delai_acces), name: 'SC 2.1 délai accès' },
  // SC 3.1 — pouvoirs MOE
  { paraTextRe: /Le Maître d'Ouvrage peut décider de limiter davantage les pouvoirs du Maître d'(?:Œ|œ)uvre/,
    isFilled: (fd) => isFilled(fd?.obligations_moe), name: 'SC 3.1 pouvoirs MOE' },
  // SC 4.1 — fourniture documents entrepreneur (paragraphe principal)
  { paraTextRe: /Le Maître d'Ouvrage peut décider de demander la fourniture de documents/,
    isFilled: (fd) => isFilled(fd?.obligations_entrepreneur), name: 'SC 4.1 docs entrepreneur' },
  // SC 4.1 — "[cocher la / les case(s) correspondante(s)]" (marqueur court)
  { paraTextRe: /cocher la \/ les case\(s\) correspondante\(s\)/,
    isFilled: (fd) => isFilled(fd?.obligations_entrepreneur), name: 'SC 4.1 cocher cases' },
  // SC 8.1 — Date de Commencement (3 lignes possibles dans le bracket). Template: "SousClause" + NBSP.
  { paraTextRe: /Insérer la liste des conditions telles que spécifiées dans le Sous-?Clause\s*8\.1 des CCAG/,
    isFilled: (fd) => isFilled(fd?.date_commencement), name: 'SC 8.1 commencement' },
];

// ── Utilities ──────────────────────────────────────────────────────────────

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Normalize curly/smart apostrophes to ASCII for comparison (1:1 length mapping)
function normApos(s) {
  return s.replace(/[\u2018\u2019\u02BC]/g, "'");
}

function fmtDate(v) {
  try { return new Date(v).toLocaleDateString('fr-FR'); }
  catch { return String(v); }
}

function fmtValue(value, isDate) {
  if (value === undefined || value === null || value === '') return '';
  if (isDate) return fmtDate(value);
  return Array.isArray(value) ? value.join(', ') : String(value);
}

// ── Enclosing-run detection ────────────────────────────────────────────────
// For a character offset `pos` in xml, locate the <w:r>…</w:r> that contains it.

function findEnclosingRun(xml, pos) {
  // Walk back: find the nearest '<w:r ' or '<w:r>' before pos.
  let runStart = -1;
  for (let i = pos; i >= 0; i--) {
    if (xml[i] === '<' && xml.startsWith('<w:r', i)) {
      const after = xml[i + 4];
      if (after === ' ' || after === '>' || after === '\t' || after === '\n' || after === '\r') {
        runStart = i;
        break;
      }
    }
  }
  if (runStart === -1) return null;
  const runEndIdx = xml.indexOf('</w:r>', pos);
  if (runEndIdx === -1) return null;
  return { start: runStart, end: runEndIdx + '</w:r>'.length };
}

// Extract rPr (run properties) from a raw <w:r>…</w:r> block.
function extractRPr(runXml) {
  const m = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return m ? m[0] : '';
}

// True if the run properties contain <w:highlight w:val="yellow"/>.
// Yellow highlight marks actual placeholders to fill (as opposed to italic
// captions under signature lines that share the same bracketed text).
function hasYellowHighlight(rPr) {
  if (!rPr) return false;
  return /<w:highlight\b[^>]*\bw:val\s*=\s*["']yellow["']/i.test(rPr);
}

// Extract text from a simple single-<w:t> run.
function extractRunText(runXml) {
  const m = runXml.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/);
  return m ? m[1] : '';
}

// Build a <w:r> with given rPr and text content (preserves whitespace).
function makeRun(rPr, text) {
  if (!text) return '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

// Return the rPr XML with any existing <w:highlight> stripped and a new
// highlight (default green) added. Also strips <w:i/> and <w:iCs/> so that
// inserted user values never inherit the italic formatting used for template
// placeholders. If the rPr is empty, wrap a fresh <w:rPr>.
function withHighlight(rPr, color = 'green') {
  let cleaned = (rPr || '')
    .replace(/<w:highlight\b[^/]*\/>/gi, '')
    .replace(/<w:i\s*\/>/gi, '')
    .replace(/<w:iCs\s*\/>/gi, '');
  if (!cleaned) return `<w:rPr><w:highlight w:val="${color}"/></w:rPr>`;
  return cleaned.replace('</w:rPr>', `<w:highlight w:val="${color}"/></w:rPr>`);
}

function withGreenHighlight(rPr) { return withHighlight(rPr, 'green'); }
function withRedHighlight(rPr) { return withHighlight(rPr, 'red'); }

// Build a <w:r> carrying `value` with a green highlight merged into the
// surrounding rPr. Used for every user-supplied insertion.
function makeHighlightedRun(rPr, text) {
  if (!text) return '';
  return `<w:r>${withGreenHighlight(rPr)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function makeRedRun(rPr, text) {
  if (!text) return '';
  return `<w:r>${withRedHighlight(rPr)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

// Build comment anchor prefix/suffix given a list of numeric commentIds.
function commentAnchorStart(ids) {
  return ids.map(id => `<w:commentRangeStart w:id="${id}"/>`).join('');
}
function commentAnchorEnd(ids) {
  const ends = ids.map(id => `<w:commentRangeEnd w:id="${id}"/>`).join('');
  const refs = ids.map(id =>
    `<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`
  ).join('');
  return ends + refs;
}

// ── Single-run replacement with optional comment anchors ──────────────────

// Replace nth occurrence of `search` in xml.
// If commentIds provided, inserted text is wrapped with comment anchors.
// `value` may be empty: in that case we keep the placeholder text and only anchor it.
function replaceSimple(xml, search, nth, value, commentIds) {
  const normXml = normApos(xml);
  const normSearch = normApos(search);
  let count = 0, pos = 0, foundAt = -1;
  while (pos < normXml.length) {
    const idx = normXml.indexOf(normSearch, pos);
    if (idx === -1) break;
    if (++count === nth) { foundAt = idx; break; }
    pos = idx + 1;
  }
  if (foundAt === -1) return null;

  const run = findEnclosingRun(xml, foundAt);
  if (!run) return null;
  const runXml = xml.slice(run.start, run.end);
  const rPr = extractRPr(runXml);
  const runText = extractRunText(runXml);
  if (!runText) return null;

  // Locate the placeholder INSIDE the run's text (normalised comparison).
  const normRunText = normApos(runText);
  const placeholderIdx = normRunText.indexOf(normSearch);
  if (placeholderIdx === -1) return null; // placeholder likely split across runs

  const before = runText.slice(0, placeholderIdx);
  const after  = runText.slice(placeholderIdx + normSearch.length);
  // If the caller provided a value, the insertion is highlighted green;
  // otherwise we keep the placeholder text (comment-only case) in its original
  // formatting.
  const insertedText = value || runText.slice(placeholderIdx, placeholderIdx + normSearch.length);
  const insertRun = value ? makeHighlightedRun(rPr, insertedText) : makeRun(rPr, insertedText);

  let replacement = '';
  replacement += makeRun(rPr, before);
  if (commentIds?.length) replacement += commentAnchorStart(commentIds);
  replacement += insertRun;
  if (commentIds?.length) replacement += commentAnchorEnd(commentIds);
  replacement += makeRun(rPr, after);

  return xml.slice(0, run.start) + replacement + xml.slice(run.end);
}

// ── Split-run paragraph-level replacement ─────────────────────────────────
// Used when the placeholder is fragmented across several <w:r> runs.
// We rebuild the whole paragraph replacing only the matched span.

function extractRunNodes(para) {
  const result = [];
  const re = /<w:r[ >][\s\S]*?<\/w:r>/g;
  let m;
  while ((m = re.exec(para)) !== null) {
    const runXml = m[0];
    const text = extractRunText(runXml);
    result.push({
      start: m.index,
      end: m.index + runXml.length,
      xml: runXml,
      rPr: extractRPr(runXml),
      text,
    });
  }
  return result;
}

function replaceSplitRun(xml, search, nth, value, commentIds) {
  const normSearch = normApos(search);
  let count = 0, done = false;

  const result = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
    if (done) return para;
    const runs = extractRunNodes(para);
    if (runs.length === 0) return para;

    // Concatenate run texts; track character ranges.
    let combined = '';
    const ranges = runs.map(r => {
      const start = combined.length;
      combined += normApos(r.text);
      return { ...r, cStart: start, cEnd: combined.length };
    });

    const idx = combined.indexOf(normSearch);
    if (idx === -1) return para;
    if (++count < nth) return para;
    done = true;

    const phEnd = idx + normSearch.length;
    // Use first impacted run's rPr as the formatting anchor.
    const firstRun = ranges.find(r => r.cEnd > idx);
    const rPr = firstRun ? firstRun.rPr : '';
    const insertedText = value || combined.slice(idx, phEnd);

    // Build the new run list: keep runs fully outside the span as-is,
    // rewrite the ones that overlap the span.
    let out = '';
    let lastEnd = 0;
    let injected = false;
    for (const r of ranges) {
      // gap between previous end and this run (whitespace/inter-run markup)
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;

      if (r.cEnd <= idx || r.cStart >= phEnd) {
        // run fully outside the span — keep untouched
        out += r.xml;
        continue;
      }
      // run overlaps the span
      const localBefore = r.text.slice(0, Math.max(0, idx - r.cStart));
      const localAfter  = r.cEnd > phEnd ? r.text.slice(phEnd - r.cStart) : '';
      out += makeRun(r.rPr, localBefore);
      if (!injected) {
        if (commentIds?.length) out += commentAnchorStart(commentIds);
        out += value ? makeHighlightedRun(rPr, insertedText) : makeRun(rPr, insertedText);
        if (commentIds?.length) out += commentAnchorEnd(commentIds);
        injected = true;
      }
      out += makeRun(r.rPr, localAfter);
    }
    out += para.slice(lastEnd);
    return out;
  });

  return done ? result : null;
}

// ── Master replace ────────────────────────────────────────────────────────

function singleReplace(xml, search, nth, value, commentIds) {
  const s = replaceSimple(xml, search, nth, value, commentIds);
  if (s !== null) return s;
  const sr = replaceSplitRun(xml, search, nth, value, commentIds);
  return sr; // null if not found
}

// Paragraph-by-paragraph scan that replaces EVERY occurrence of `search`.
// Handles simple and split-run cases uniformly. Comment anchors are attached
// to the very first occurrence only (across all paragraphs).
// Returns { xml, count } where count = number of replacements performed.
function replaceAllGlobal(xml, search, value, commentIds) {
  const normSearch = normApos(search);
  let anchorsApplied = false;
  let total = 0;
  let skipped = 0;

  const result = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
    if (!para.includes('<w:r')) return para;
    let current = para;
    let searchFromChar = 0;
    for (let k = 0; k < 200; k++) { // safety cap per paragraph
      const runs = extractRunNodes(current);
      if (runs.length === 0) break;
      let combined = '';
      const ranges = runs.map(r => {
        const start = combined.length;
        combined += normApos(r.text);
        return { ...r, cStart: start, cEnd: combined.length };
      });
      const idx = combined.indexOf(normSearch, searchFromChar);
      if (idx === -1) break;
      const phEnd = idx + normSearch.length;
      const firstImpact = ranges.find(r => r.cEnd > idx);
      const rPr = firstImpact?.rPr ?? '';

      // Skip occurrences that are not yellow-highlighted (italic captions, etc.)
      if (!hasYellowHighlight(rPr)) {
        searchFromChar = idx + 1;
        skipped++;
        continue;
      }

      const useAnchors = !anchorsApplied && commentIds?.length;

      let out = '';
      let lastEnd = 0;
      let injected = false;
      for (const r of ranges) {
        out += current.slice(lastEnd, r.start);
        lastEnd = r.end;
        if (r.cEnd <= idx || r.cStart >= phEnd) {
          out += r.xml;
          continue;
        }
        const localBefore = r.text.slice(0, Math.max(0, idx - r.cStart));
        const localAfter  = r.cEnd > phEnd ? r.text.slice(phEnd - r.cStart) : '';
        out += makeRun(r.rPr, localBefore);
        if (!injected) {
          if (useAnchors) out += commentAnchorStart(commentIds);
          out += makeHighlightedRun(rPr, value);
          if (useAnchors) {
            out += commentAnchorEnd(commentIds);
            anchorsApplied = true;
          }
          injected = true;
        }
        out += makeRun(r.rPr, localAfter);
      }
      out += current.slice(lastEnd);
      current = out;
      // After replacement, continue searching after the inserted value.
      searchFromChar = idx + normApos(value).length;
      total++;
    }
    return current;
  });

  return { xml: result, count: total, skipped, anchorsApplied };
}

// ── Signature line filling ────────────────────────────────────────────────
// Captions can appear in the template in 4 signature-line patterns:
//   (a) current para: "Label :" + <w:tab/> with underscore leader → replace tab
//   (b) prev para:    "_____________" textual underscores         → replace run text
//   (c) prev para:    <w:tab/> with underscore leader (empty text) → replace tab
//   (d) prev para:    genuinely empty                              → insert run

// Replace the first sequence of 3+ underscores in a paragraph's text with
// `value`. The underscore run is split into three <w:r>: before (original
// formatting), value (green-highlighted, inherits rPr), after (original).
function replaceUnderscoresInPara(paraXml, value) {
  const runs = extractRunNodes(paraXml);
  for (const r of runs) {
    const m = r.text.match(/_{3,}/);
    if (!m) continue;
    const before = r.text.slice(0, m.index);
    const after = r.text.slice(m.index + m[0].length);
    const rebuilt =
      makeRun(r.rPr, before) +
      makeHighlightedRun(r.rPr, value) +
      makeRun(r.rPr, after);
    return paraXml.slice(0, r.start) + rebuilt + paraXml.slice(r.end);
  }
  return paraXml;
}

// True if the paragraph has no visible text content (whitespace only).
function paraIsEmpty(paraXml) {
  const runs = extractRunNodes(paraXml);
  return runs.map(r => r.text).join('').trim() === '';
}

// True if the paragraph has a tab with underscore leader defined in <w:tabs>
// AND a <w:tab/> element in its text flow (which draws the actual line).
function paraHasUnderscoreTabLeader(paraXml) {
  return /<w:tabs>[\s\S]*?<w:tab\b[^/]*w:leader\s*=\s*["']underscore["']/i.test(paraXml)
      && /<w:tab\s*\/>/.test(paraXml);
}

// Remove the <w:tab/> run (if any) AND the underscore-leader tab-stop from <w:tabs>
// in a paragraph that has them. Used to clean up caption paragraphs whose visible
// "____________" line would otherwise stay next to the value we filled elsewhere.
function stripUnderscoreTabLeader(paraXml) {
  const runs = extractRunNodes(paraXml);
  let out = paraXml;
  const tabRun = runs.find(r => /<w:tab\s*\/>/.test(r.xml) && !/<w:t[\s>]/.test(r.xml));
  if (tabRun) {
    // Recompute offsets on `out` just in case (they haven't changed yet).
    out = out.slice(0, tabRun.start) + out.slice(tabRun.end);
  }
  // Remove the underscore-leader tab stop(s) from <w:tabs>.
  out = out.replace(
    /<w:tab\b[^/]*\bw:leader\s*=\s*["']underscore["'][^/]*\/>/gi,
    ''
  );
  // If <w:tabs> is now empty, drop it entirely.
  out = out.replace(/<w:tabs>\s*<\/w:tabs>/g, '');
  return out;
}

// Strip runs of 3+ underscores (possibly surrounded by whitespace) from every
// <w:t> in the given paragraph. Template placeholders are sometimes preceded by
// decorative underscore rows that should disappear once the value is filled;
// because those underscores can sit INSIDE a larger text run (e.g.
// "arantie de Soumission ____________ "), we scrub at the <w:t> level rather
// than drop entire runs.
function stripUnderscoreRuns(paraXml) {
  return paraXml.replace(
    /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g,
    (full, open, text, close) => {
      if (!/_{3,}/.test(text)) return full;
      const cleaned = text.replace(/\s*_{3,}\s*/g, ' ').replace(/ {2,}/g, ' ');
      return open + cleaned + close;
    }
  );
}

// After a field has been filled (somewhere in the document), find the paragraph
// that contains a green-highlighted run whose text matches `valueText`, and strip
// any sibling underscore-runs in that same paragraph. Also, if `caption`
// is provided, strip the <w:tab/> underscore leader from the nearest preceding
// paragraph whose text matches `caption` (nth=1).
function cleanupUnderscoresAroundValue(xml, valueText, { caption } = {}) {
  if (!valueText) return xml;
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const vEsc = escapeXml(valueText);
  // Rough match: a green-highlighted run containing the value text.
  const valRunRe = new RegExp(
    '<w:r\\b[^>]*>\\s*<w:rPr>[\\s\\S]*?<w:highlight\\s+w:val\\s*=\\s*["\']green["\'][^>]*/>[\\s\\S]*?</w:rPr>\\s*<w:t(?:\\s[^>]*)?>' +
    vEsc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '</w:t></w:r>'
  );
  let targetIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (valRunRe.test(parts[i])) { targetIdx = i; break; }
  }
  if (targetIdx === -1) return xml;
  // (a) strip underscore runs in the same paragraph
  parts[targetIdx] = stripUnderscoreRuns(parts[targetIdx]);
  // (b) if a caption is given, walk back to the nearest paragraph whose plain
  // text starts with it, and strip its <w:tab/> underscore leader.
  if (caption) {
    const capNorm = normApos(caption).toLowerCase();
    const capEsc = capNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const capRe = new RegExp('^' + capEsc, 'i');
    for (let j = targetIdx - 2; j >= 1; j -= 2) {
      const para = parts[j];
      const runs = extractRunNodes(para);
      if (runs.length === 0) continue;
      const combined = normApos(runs.map(r => r.text).join('')).trim();
      if (!combined) continue;
      if (capRe.test(combined)) {
        if (paraHasUnderscoreTabLeader(para)) {
          parts[j] = stripUnderscoreTabLeader(para);
        }
        break;
      }
      // Don't walk too far — stop after a few paragraphs of unrelated text.
      if (combined.length > 10 && !capRe.test(combined)) break;
    }
  }
  return parts.join('');
}

// Replace the first tab-only <w:r>…</w:r> (one that contains <w:tab/> and no
// <w:t>) with a text run carrying `value`. Implemented by isolating runs via
// extractRunNodes — a regex over the raw paragraph string backtracks across
// runs because of the nested <w:rPr>…</w:rPr> pattern.
function replaceTabWithValue(paraXml, rPr, value) {
  const runs = extractRunNodes(paraXml);
  const tabRun = runs.find(r => /<w:tab\s*\/>/.test(r.xml) && !/<w:t[\s>]/.test(r.xml));
  if (!tabRun) return paraXml;
  return paraXml.slice(0, tabRun.start) + makeHighlightedRun(rPr, value) + paraXml.slice(tabRun.end);
}

// Insert a new highlighted run (inheriting the caption's rPr) just before </w:p>.
function insertRunBeforeParaEnd(paraXml, rPr, value) {
  const endIdx = paraXml.lastIndexOf('</w:p>');
  if (endIdx === -1) return paraXml;
  return paraXml.slice(0, endIdx) + makeHighlightedRun(rPr, value) + paraXml.slice(endIdx);
}

// Try to fill the signature line associated with paragraph at `parts[i]`
// (assumed to be a caption paragraph). Returns a string describing which case
// was applied, or null if nothing matched.
function tryFillAdjacentSignatureLine(parts, i, rPr, value) {
  const para = parts[i];

  // (a) current paragraph itself has an underscore tab leader
  if (paraHasUnderscoreTabLeader(para)) {
    parts[i] = replaceTabWithValue(para, rPr, value);
    return 'tab(self)';
  }
  if (i < 2) return null;
  // Never walk across a table-cell or row boundary: the "caption above an
  // underscore signature line" pattern only applies to non-table layouts.
  // Inside a table, a label lives in its own cell and the previous paragraph
  // (in XML order) is typically the LAST cell of the PREVIOUS row — wholly
  // unrelated to the label. Without this guard, e.g. the "Nom du Maître
  // d'Ouvrage :" label cell in Formulaire EXP-4.2(a) would try to fill the
  // underscore line in the "équivalent €" cell of the row above.
  const gap = parts[i - 1] || '';
  if (/<\/w:tc>|<\/w:tr>/.test(gap)) return null;
  const prev = parts[i - 2];

  // (b) prev has textual underscores
  const withUnd = replaceUnderscoresInPara(prev, value);
  if (withUnd !== prev) {
    parts[i - 2] = withUnd;
    return 'underscores(prev)';
  }
  // (c) prev has underscore tab leader
  if (paraHasUnderscoreTabLeader(prev)) {
    parts[i - 2] = replaceTabWithValue(prev, rPr, value);
    return 'tab(prev)';
  }
  // (d) prev is empty
  if (paraIsEmpty(prev)) {
    parts[i - 2] = insertRunBeforeParaEnd(prev, rPr, value);
    return 'empty(prev)';
  }
  return null;
}

// For every non-yellow occurrence of the bracketed placeholder (italic caption
// under a signature line), fill the adjacent signature line.
function replaceUnderscoreBeforeLabels(xml, search, value) {
  const normSearch = normApos(search);
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const tally = { underscores: 0, empty: 0, tabSelf: 0, tabPrev: 0 };

  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    if (!para.includes('<w:r')) continue;
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let combined = '';
    const ranges = runs.map(r => {
      const start = combined.length;
      combined += normApos(r.text);
      return { ...r, cStart: start, cEnd: combined.length };
    });
    const idx = combined.indexOf(normSearch);
    if (idx === -1) continue;
    const firstImpact = ranges.find(r => r.cEnd > idx);
    const rPr = firstImpact?.rPr ?? '';
    if (hasYellowHighlight(rPr)) continue;

    const result = tryFillAdjacentSignatureLine(parts, i, rPr, value);
    if (result === 'tab(self)') tally.tabSelf++;
    else if (result === 'underscores(prev)') tally.underscores++;
    else if (result === 'tab(prev)') tally.tabPrev++;
    else if (result === 'empty(prev)') tally.empty++;
  }
  const total = tally.underscores + tally.empty + tally.tabSelf + tally.tabPrev;
  return { xml: parts.join(''), count: total, tally };
}

// Fill the two signature underscore lines on the Section VIII CCAG page de
// garde. Template structure (paragraphs 3931→3935):
//   3931: <w:p> with tab w:leader="underscore" + <w:tab/> run  ← signature line
//   3932: italic "[Nom du Maître d'Ouvrage]" caption            ← KEEP AS-IS
//   3933: empty spacer
//   3934: <w:p> with tab w:leader="underscore" + <w:tab/> run  ← signature line
//   3935: italic "[Nom du Marché]" caption                     ← KEEP AS-IS
// Requirement: the underscore line IS replaced by the filled value (bold,
// centered, size 14, green highlight). The italic bracket caption BELOW each
// line must remain visible (it's the label telling the reader what the line is).
// Nom du Marché value = "Travaux de " + PREA-003 (identification_travaux),
// unless PREA-003 already starts with "Travaux de ".
// Called BEFORE the FIELD_MAP generic pass so the generic `[Nom du Maître
// d'Ouvrage]` replacement no longer touches the caption paragraph 3932.
function fillCcagPageGarde(xml, nomMaitre, identTravaux) {
  const nomMarche = identTravaux
    ? (/^\s*travaux\s+de\b/i.test(identTravaux)
        ? identTravaux
        : `Travaux de ${identTravaux}`)
    : '';
  if (!nomMaitre && !nomMarche) return { xml, filled: 0 };

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  let filled = 0;
  // Regex that identifies the "empty underscore signature line" paragraph:
  //  - tab stops include a right underscore leader
  //  - body contains at least one <w:r>...<w:tab/>...</w:r>
  const isUnderscoreSigLine = (p) =>
    /<w:tab\b[^/]*w:leader="underscore"/.test(p) &&
    /<w:r\b[^>]*>[\s\S]*?<w:tab\/>[\s\S]*?<\/w:r>/.test(p);
  // Also consume stale fills: if a previous run has already inserted our value,
  // don't double-fill on subsequent exports of the same session (defensive).
  const alreadyFilled = (p, value) =>
    new RegExp(`<w:t[^>]*>${
      value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "(?:'|&apos;)")
    }<\\/w:t>`).test(p);

  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    // Find paragraphs that are the italic bracket captions on the CCAG page.
    if (!/<w:jc w:val="center"\/>/.test(para)) continue;
    if (!/<w:i\s*\/>/.test(para)) continue;
    const txt = normApos(
      [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('')
    );
    let value = null;
    if (/^\s*\[Nom du Ma[îi]tre\s*d'Ouvrage\]\s*$/.test(txt)) value = nomMaitre;
    else if (/^\s*\[Nom du March[ée]\]\s*$/.test(txt))       value = nomMarche;
    if (!value) continue;

    // Look backward up to ~4 paragraphs for the underscore signature line.
    let sigIdx = -1;
    for (let step = 2; step <= 8; step += 2) {
      const j = i - step;
      if (j < 1) break;
      if (isUnderscoreSigLine(parts[j])) { sigIdx = j; break; }
    }
    if (sigIdx === -1) continue;
    if (alreadyFilled(parts[sigIdx], value)) continue; // idempotent

    const sigPara = parts[sigIdx];
    const openTagMatch = sigPara.match(/^<w:p\b[^>]*>/);
    const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
    const pPrMatch = sigPara.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    // Keep pPr (preserves spacing + tabs for compatibility) but enforce
    // center alignment and strip italic defaults.
    let pPr = pPrMatch
      ? pPrMatch[0].replace(/<w:i\s*\/>/g, '').replace(/<w:iCs\s*\/>/g, '')
      : '<w:pPr></w:pPr>';
    if (/<w:jc\s+w:val=/.test(pPr)) {
      pPr = pPr.replace(/<w:jc\s+w:val="[^"]*"\/>/, '<w:jc w:val="center"/>');
    } else {
      pPr = pPr.replace('</w:pPr>', '<w:jc w:val="center"/></w:pPr>');
    }
    // OOXML size is in half-points → 28 = 14pt.
    const rPr = `<w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/><w:highlight w:val="green"/></w:rPr>`;
    const runXml = `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
    parts[sigIdx] = `${openTag}${pPr}${runXml}</w:p>`;
    filled++;
  }
  return { xml: parts.join(''), filled };
}

// Fill signature lines whose caption is a RAW label string (no brackets) that
// appears alone in its paragraph, optionally followed by ":".
// Example: "Nom du Maître d'Ouvrage :" in a paragraph whose previous paragraph
// contains "_____________".
function fillCaptionSignatureLines(xml, captions, value) {
  const normCaps = captions.map(c => normApos(c));
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const tally = { underscores: 0, empty: 0, tabSelf: 0, tabPrev: 0, skipped: 0 };

  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    if (!para.includes('<w:r')) continue;
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    const combined = normApos(runs.map(r => r.text).join(''));
    // Strip trailing ":" and whitespace for equality test.
    const textTrimmed = combined.replace(/\s+$/,'').replace(/\s*:$/,'').trim();
    const matchedCap = normCaps.find(cap => textTrimmed === cap);
    if (!matchedCap) continue;

    // Skip yellow — it's a real fill placeholder, not a caption.
    if (/<w:highlight\s+w:val="yellow"/i.test(para)) { tally.skipped++; continue; }

    const rPr = runs[0]?.rPr ?? '';
    const result = tryFillAdjacentSignatureLine(parts, i, rPr, value);
    if (result === 'tab(self)') tally.tabSelf++;
    else if (result === 'underscores(prev)') tally.underscores++;
    else if (result === 'tab(prev)') tally.tabPrev++;
    else if (result === 'empty(prev)') tally.empty++;
  }
  const total = tally.underscores + tally.empty + tally.tabSelf + tally.tabPrev;
  return { xml: parts.join(''), count: total, tally };
}

// If `global` is true, replace every occurrence of the placeholder.
// Comment anchors are attached only on the FIRST occurrence.
function replaceField(xml, search, nth, value, commentIds, global) {
  if (global && value) {
    const { xml: out, count, skipped } = replaceAllGlobal(xml, search, value, commentIds);
    // For each non-yellow bracketed label, fill the signature line nearby.
    const { xml: out2, count: sigCount, tally } = replaceUnderscoreBeforeLabels(out, search, value);
    const skipMsg = skipped ? ` (${skipped} non-jaune ignoré${skipped > 1 ? 's' : ''})` : '';
    const sigMsg = sigCount ? ` +${sigCount} ligne(s) signature (${tally.underscores}und/${tally.empty}vide/${tally.tabSelf}tab/${tally.tabPrev}tabPrev)` : '';
    if (count === 0 && skipped === 0 && sigCount === 0) {
      console.warn(`[exportDocx] Placeholder global introuvable: "${search.slice(0, 70)}"`);
    } else {
      console.log(`[exportDocx] ${count} remplacement(s)${skipMsg}${sigMsg} pour "${search.slice(0, 50)}…"`);
    }
    return out2;
  }
  // Non-global OR global-without-value: single nth-based replacement.
  const r = singleReplace(xml, search, nth || 1, value, commentIds);
  if (r === null) {
    console.warn(`[exportDocx] Placeholder introuvable (nth=${nth}): "${search.slice(0, 70)}"`);
    return xml;
  }
  return r;
}

// ── Field map ─────────────────────────────────────────────────────────────

// `ph` may be a string or an array of strings (multiple placeholder variants
// that all map to the same field). Each variant is replaced independently.
const FIELD_MAP = [
  // ── Identification (global: propagés dans tout le document) ──────────
  //  `captions` = raw labels (no brackets) that appear alone — possibly
  //  followed by ":" — in a paragraph whose adjacent signature line should
  //  be filled with the value.
  { id: 'nom_projet',             global: true,
    ph: ["[insérer le nom du Projet]", "[nom du Projet]", "[Nom du Projet]"],
    captions: ["Nom du Projet"] },
  { id: 'identification_travaux', global: true,
    ph: ["[Insérer l'identification des Travaux]", "[insérer une brève description des travaux]", "[nom du Marché]"] },
  { id: 'nom_maitrise_ouvrage',   global: true,
    ph: ["[insérer le nom du Maître d'Ouvrage]", "[nom du Maître d'Ouvrage]", "[Nom du Maître d'Ouvrage]"],
    captions: ["Nom du Maître d'Ouvrage"] },
  { id: 'pays',                   global: true,
    ph: ["[insérer le pays]", "[Pays]"] },
  { id: 'ref_aoi',                global: true,
    ph: ["[insérer la référence]", "[Référence de l'AOI]", "[référence de l'AOI]"] },
  { id: 'date_emission',          global: true, isDate: true,
    ph: ["[insérer la date]", "[Date de publication de l'AAO]"] },
  { id: 'nombre_lots',            ph: "[indiquer si non applicable]",
    // Sibling caption paragraph ends in a <w:tab/> with underscore leader;
    // strip that line so it doesn't visually compete with the filled value.
    stripUnderscores: { caption: "Nombre et numéro d'identification des lots" } },

  // ── Préqualification ─────────────────────────────────────────────────
  { id: 'prequalification',  ph: "[est / n'est pas]", nth: 1, choice: ["est", "n'est pas"] },
  { id: 'max_groupement',    ph: '[insérer un nombre maximum, par exemple trois, sinon indiquer la mention "sans objet"]' },

  // ── Coordonnées (label captions, pas de placeholder) ─────────────────
  { id: 'contact_attention', captionInline: "A l'attention de" },
  { id: 'contact_adresse',   captionInline: "Adresse" },
  { id: 'contact_tel',       captionInline: "Numéro de téléphone" },
  { id: 'contact_email',     captionInline: "Adresse électronique" },
  { id: 'contact_web',       captionInline: "Adresse de la page Web" },

  // ── Réunion ──────────────────────────────────────────────────────────
  { id: 'reunion_prevue',  ph: ["[se tiendra / n'est pas prévue]", "[se tiendra/n'est pas prévue]"], choice: ["se tiendra", "n'est pas prévue"] },
  { id: 'reunion_lieu',    captionInline: "Lieu" },
  // reunion_date fills the "Date :" caption at IS 7.4 (nth=1 for Date captions).
  // The standalone guide paragraph "[de préférence à mi-période ...]" stays as
  // a yellow-highlighted guide for the MOA to delete manually.
  { id: 'reunion_date',    captionInline: "Date", nth: 1, isDate: true },
  { id: 'reunion_heure',   captionInline: "Heure", isTime: true },
  { id: 'visite_site',     ph: "[sera / ne sera pas]", nth: 1, choice: ["sera", "ne sera pas"] },

  // ── Offre ────────────────────────────────────────────────────────────
  { id: 'type_prix',              ph: "[Rayer la mention inutile]", deleteHint: true },
  { id: 'documents_additionnels', ph: "[insérer la liste des documents additionnels, le cas échéant]" },
  { id: 'offres_variantes',       ph: "[sont / ne sont pas]", nth: 1, choice: ["sont", "ne sont pas"] },
  { id: 'variantes_techniques',   ph: "[sont / ne sont pas]", nth: 2, choice: ["sont", "ne sont pas"] },
  { id: 'variantes_delais',       ph: "[sont / ne sont pas]", nth: 3, choice: ["sont", "ne sont pas"] },
  { id: 'ajustement_variante_montant', ph: "[insérer montant et monnaie]" },
  { id: 'prix_revisables',        ph: "[révisables / fermes]", choice: ["révisables", "fermes"] },
  // Template: "libellés en ____________" — 12 underscores.
  { id: 'monnaie_nationale',      ph: "____________", nth: 1 },
  // Template: "sera de _____________________ [insérer nombre entre 90 et 120] jours."
  // Strip the leading underscores row that sits in the same paragraph.
  { id: 'validite_offre',         ph: "[insérer nombre entre 90 et 120]", stripUnderscores: true },
  { id: 'actualisation_prix',     ph: '[insérer formule ou "selon un coefficient d\'actualisation"]' },

  // ── Garanties ────────────────────────────────────────────────────────
  { id: 'garantie_soumission',  ph: "[est / n'est pas]", nth: 2, choice: ["est", "n'est pas"] },
  // Template: "Déclaration de Garantie de Soumission ____________ [est / n'est pas] requise."
  // The 12 underscores before the placeholder must be stripped on fill.
  { id: 'declaration_garantie', ph: "[est / n'est pas]", nth: 3, choice: ["est", "n'est pas"], stripUnderscores: true },
  { id: 'montant_garantie',     ph: "[insérer montant entre 1% et 3% de l'estimation du Montant du Marché et préciser la monnaie]" },
  { id: 'autres_garanties',     ph: '[indiquer "Néant" si pas applicable]' },
  // Template: "période de _________________ [insérer le nombre d'années] ans."
  { id: 'exclusion_annees',     ph: "[insérer le nombre d'années]", stripUnderscores: true },

  // ── Remise ───────────────────────────────────────────────────────────
  { id: 'copies_offre',   ph: "[insérer le nombre]", nth: 1 },
  { id: 'habilitation',   ph: '[insérer par exemple "un pouvoir de l\'autorité compétente établi au nom du signataire de l\'Offre".]' },
  { id: 'remise_attention', captionInline: "A l'attention de", nth: 2 },
  { id: 'remise_adresse',   captionInline: "Adresse complète", nth: 1 },
  // IS 22.1 template has separate "Date :" / "Heure :" caption paragraphs,
  // not a combined "[insérer la date et l'heure]" placeholder. date_limite is
  // the 2nd "Date :" caption in document order (1st = IS 7.4 réunion).
  { id: 'date_limite',    captionInline: "Date", nth: 2, isDate: true },
  { id: 'heure_limite',   captionInline: "Heure", nth: 2, isTime: true },
  { id: 'ouverture_adresse', captionInline: "Adresse complète", nth: 2 },
  { id: 'ouverture_date', captionInline: "Date", nth: 3, isDate: true },
  { id: 'ouverture_heure', captionInline: "Heure", nth: 3, isTime: true },

  // ── Évaluation ───────────────────────────────────────────────────────
  // Template placeholders include "du Maître d'Ouvrage" suffix — must match exactly.
  // Template visually shows a trailing space before the closing bracket, but
  // the actual <w:t> runs concatenate to `… du Maître d'Ouvrage]` with NO
  // space. Match the real run text — otherwise the yellow placeholder never
  // fills in IS 32.1.
  { id: 'monnaie_evaluation',      ph: "[Insérer la monnaie, normalement la monnaie nationale du Maître d'Ouvrage]" },
  { id: 'source_taux_change',      ph: "[habituellement on utilisera la banque centrale du pays du Maître d'Ouvrage]" },
  { id: 'option_conversion',       ph: "[A / B]", choice: ["A", "B"] },
  { id: 'marge_preference',        ph: "[sera / ne sera pas]", nth: 2, choice: ["sera", "ne sera pas"] },
  { id: 'sous_traitants_designes', ph: "[prévoit / ne prévoit pas]", choice: ["prévoit", "ne prévoit pas"] },

  // ── Qualification financière ──────────────────────────────────────────
  // S03-001 — fills the long bracket in 3.1 row of the Section III table; the
  // template wording is verbose ("au montant de trois à quatre mois … pour le
  // marché"), distinct from the IS-level shorthand. Match the table form here.
  { id: 'capacite_financiere', ph: "[insérer le montant en € correspondant au montant de trois à quatre mois de facturation de travaux pour le marché]" },
  // S03-002 / S03-003 — `stripUnderscores` strips the 6–8 leading `____` runs
  // ("d'au moins ________ [insérer montant…]" / "sur les ______ [insérer le
  // nombre d'années…]") that sit immediately before each bracket in the 3.2
  // template row. Without this flag the underscores remained visible next to
  // the green-filled value.
  { id: 'ca_minimum',          ph: "[insérer montant en équivalent € en toutes lettres et en chiffres]", stripUnderscores: true },
  { id: 'ca_periode',          ph: "[insérer le nombre d'années, généralement 5 ans et au minimum 3 ans]", nth: 1, stripUnderscores: true },
  // 3.2 row — Groupement d'entreprises columns. Two yellow placeholders per
  // column ([letters] + [digits%]). Each cell appears once in the template.
  { id: 'ca_membre_pct_lettres', ph: "[vingt-cinq]" },
  { id: 'ca_membre_pct_chiffre', ph: "[25%]", valueSuffix: '%' },
  { id: 'ca_unique_pct_lettres', ph: "[quarante]" },
  { id: 'ca_unique_pct_chiffre', ph: "[40%]", valueSuffix: '%' },

  // ── Qualification expérience ──────────────────────────────────────────
  // §4.1 row — `stripUnderscores` cleans the leading `____` runs around each
  // bracket ("au cours des ______ [insérer le nombre d'années…]" and
  // "à partir du 1er janvier de l'année _______ [insérer l'année]").
  { id: 'exp_generale_annees',       ph: "[insérer le nombre d'années, généralement 5 ans et au minimum 3 ans]", nth: 2, stripUnderscores: true },
  { id: 'exp_generale_annee_depart', ph: "[insérer l'année]", nth: 1, stripUnderscores: true },
  { id: 'exp_specifique_n',          ph: "[insérer des valeurs pour N, normalement deux, et V]" },
  { id: 'exp_specifique_v',          ph: "[insérer la valeur de V]" },
  { id: 'exp_specifique_annee',      ph: "[insérer l'année, la période à considérer est généralement de 5 à 10 ans]" },
  // §4.2(b) — the inline placeholder in the main "Condition Requise" cell ends
  // with "tel qu'applicable]" in the template (was missing from the previous
  // ph, so S03-009 was never filling). The "Un membre" column has its own
  // placeholder ending in "minimum requis]".
  { id: 'exp_activites_cles',        ph: "[fournir la liste des activités en indiquant le volume, le nombre ou le taux de production tel qu'applicable]" },
  { id: 'exp_activites_un_membre',   ph: "[fournir la liste des activités en indiquant le minimum requis]" },
  // §4.2(b)(ii) — Sous-traitant spécialisé. Filled only when the toggle
  // `sst_specialise_autorise` is "Oui" (when "Non", the entire row is painted
  // red downstream — see the dedicated branch in the export pipeline). When
  // toggle is anything other than "Oui", export an empty value so the yellow
  // placeholder stays untouched (and gets red-painted by the Non branch).
  { id: 'sst_specialise_description',
    ph: "[ajouter le critère suivant si un sous-traitant spécialisé est autorisé et décrire la nature et les caractéristiques des travaux spécialisés]",
    valueOverrideIf: (fd) => fd.sst_specialise_autorise === 'Oui' ? fd.sst_specialise_description : '' },

  // ── ESSS ─────────────────────────────────────────────────────────────
  { id: 'exp_esss_nombre', ph: "[insérer nombre, normalement deux]" },
  { id: 'exp_esss_annees', ph: "[insérer nombre d'années, entre 5 et 10 ans]" },

  // ── CCAP ─────────────────────────────────────────────────────────────
  // CCAP-005 (SC 1.1.3.3) — placeholder "_________ jours." (9 underscores) au para 5515.
  // Le suffixe " jours." disparaît à la substitution; on le rétablit via valueSuffix.
  // Si CCAP-003 = Non (pas de tranches) on saute le suffixe pour laisser
  // l'utilisateur mettre une unité libre ("540 jours" ou "18 mois").
  { id: 'delai_achevement_ouvrages', ph: "_________ jours.", valueSuffix: " jours.",
    valueSuffixSkipIf: (formData) => formData.tranches_marche_existe === 'Non' },
  // CCAP-006 (SC 1.1.3.7) — la valeur par défaut "365 jours." apparaît dans la
  // définition (para 4180 "an signifie 365 jours.") puis dans la Partie A
  // (para 5519). nth=2 vise le bon paragraphe.
  { id: 'periode_garantie',          ph: "365 jours.", nth: 2, valueSuffix: " jours." },
  { id: 'delai_acces',          ph: "__________ jours après la Date de Commencement", underscorePrefix: "__________ jours" },
  { id: 'garantie_bonne_exec',  ph: "[indiquer un chiffre entre 5 et 10]" },
  { id: 'heures_travail',       ph: "[Indiquer les heures normales de travail.]" },
  { id: 'date_commencement',    ph: "[Insérer conditions, date, ou date de signature de l'Acte d'Engagement]" },
  { id: 'penalites_max',        ph: "[Insérer un pourcentage ne dépassant pas 10]" },
  // CCAP-028 (avance_demarrage, SC 14.2) — handled by fillCcap14_2_AvanceDemarrage:
  // the template paragraph starts with "______ %" and the placeholder
  // "[Insérer un nombre entre 10 et 20…]" sits at the END. Replacing the
  // bracket alone would leave the underscores intact, so we rewrite the
  // whole paragraph in the pipeline below.
  { id: 'retenue_garantie',     ph: "[Insérer un pourcentage de retenue entre 5 et 10]" },
  // CCAP-030 (plafond_retenue, SC 14.3) — same shape as 14.2: rewritten by
  // fillCcap14_3_PlafondRetenue in the pipeline.
  // CCAP-035 (delai_paiement, SC 14.7) — the cell reads "dans un délai de
  // _______ [insérer un nombre s'il est différent de 56] jours.". Replacing
  // just the bracket leaves the leading underscores; strip them after fill.
  { id: 'delai_paiement',       ph: "[insérer un nombre s'il est différent de 56]", stripUnderscores: true },
  // CCAP-036 (taux_interet_etrangere, SC 14.8) — single yellow run at end
  // of the cell, no underscores around it.
  { id: 'taux_interet_etrangere', ph: "[insérer EURIBOR + 200 pb]" },
  // CCAP-037 (multiplicateur_responsabilite, SC 17.6) — yellow placeholder
  // preceded by "_______ " in the same paragraph; clean up the underscores
  // after the value lands.
  { id: 'multiplicateur_responsabilite', ph: "[insérer un multiplicateur égal ou supérieur à un, n'excédant pas trois]", stripUnderscores: true },
  { id: 'montant_min_decompte', ph: "[Insérer un montant, 10.000 EUR par exemple]" },
  // CCAP-042 (crd_liste, SC 20.2) — template uses straight ASCII quotes
  // around "aucun" and a NBSP before ";". When the user selected
  // crd_composition = "Trois membres", auto-override the value to "aucun"
  // (matches the lockedIf in the schema).
  { id: 'crd_liste',
    ph: '[Insérer la(les) liste(s) de membres potentiels, uniquement lorsque le CRD comprend un membre unique\u00a0; sinon, ins\u00e9rer "aucun".]',
    valueOverrideIf: (formData) => formData.crd_composition === 'Trois membres' ? 'aucun' : null },
  // CCAP-043 (nomination_crd, SC 20.3) — template ph ends with "ou une
  // autre association régionale d'ingénieurs.]" (longer than the previous
  // approximation that ended with "ou autre]").
  { id: 'nomination_crd',
    ph: "[Insérer le nom de la personne officielle ou de l'entité procédant à la désignation, i.e. Président du FIDIC ou une autre association régionale d'ingénieurs.]" },
  { id: 'institution_arbitrage',
    ph: "[Insérer le nom de l'institution arbitrale si elle est différente de la Chambre de Commerce Internationale.]" },
  { id: 'lieu_arbitrage',
    ph: "[Insérer le lieu de l'arbitrage\u00a0: il doit être neutre, c'est-à-dire être ni le pays du Maître d'Ouvrage ni le pays du siège de l'Entrepreneur.]" },
];

// ── Inline caption fill (for fields without bracketed placeholders) ──────
// Finds a paragraph whose content starts with "<caption>" (optionally followed
// by " :" or ": "). Appends the value as a green-highlighted run right after
// the caption text inside the same paragraph, respecting nth occurrence.
function fillInlineCaption(xml, caption, value, nth = 1, isDate = false, isTime = false) {
  if (!value) return xml;
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const captionNorm = normApos(caption).toLowerCase();
  const capEsc = captionNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Prefix match: caption followed by ":" and ANY trailing content (filled or not).
  // We count ALL such paragraphs across fills so `nth` is stable in document order.
  const prefixRe = new RegExp('^' + capEsc + '\\s*:');
  // Pure form: caption + optional ":" + only whitespace → unfilled, safe to fill.
  const pureRe = new RegExp('^' + capEsc + '\\s*:?\\s*$');
  let matchCount = 0;
  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    if (!para.includes('<w:r')) continue;
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    const combined = normApos(runs.map(r => r.text).join('')).trim();
    const combinedLower = combined.toLowerCase();
    const isPrefix = prefixRe.test(combinedLower);
    const isPure = pureRe.test(combinedLower);
    if (!isPrefix && !isPure) continue;
    // Only count paragraphs that are either empty captions ready to fill (pure),
    // or captions we've already filled (green-highlighted run present). Guide
    // paragraphs like "Date : [Date de publication de l'AAO]" must NOT count,
    // otherwise they poison nth and push values onto the wrong slot.
    const hasGreen = /<w:highlight\s+w:val\s*=\s*["']green["']/.test(para);
    if (!isPure && !hasGreen) continue;
    matchCount++;
    if (matchCount !== nth) continue;
    // If the nth match is already filled (non-empty after caption), do nothing:
    // we don't want to double-fill a paragraph that a prior field already wrote to.
    if (!isPure) return xml;

    // Ensure paragraph ends with ":" — append ": " then the value run
    const rPr = runs[runs.length - 1]?.rPr ?? runs[0]?.rPr ?? '';
    // If the paragraph carries a tab with underscore leader (signature-line
    // style: "Caption :\t<underscore-line>"), replace the tab run with the
    // value instead of appending after the line.
    if (paraHasUnderscoreTabLeader(para)) {
      parts[i] = replaceTabWithValue(para, rPr, value);
      return parts.join('');
    }
    const endIdx = para.lastIndexOf('</w:p>');
    if (endIdx === -1) return xml;
    // If no ":" present, add ": "
    const needsColon = !/[:]\s*$/.test(combined);
    const prefix = needsColon ? ' : ' : ' ';
    const newPara = para.slice(0, endIdx)
      + makeRun(rPr, prefix)
      + makeHighlightedRun(rPr, value)
      + para.slice(endIdx);
    parts[i] = newPara;
    return parts.join('');
  }
  return xml;
}

// ── Red highlighting of deletion markers ─────────────────────────────────
// Generic phrases the template uses to indicate the user should delete or
// rayer text. We wrap each occurrence in a red highlight so the user spots
// them instantly in the exported document.
// ── Section I bounds helper (règle d'or) ─────────────────────────────────
// Per project spec, Section I "Instructions aux Soumissionnaires" must not
// receive any red-highlight intervention: every paragraph between its
// TITLESECTION heading and the next TITLESECTION (Section II DPAO) is
// protected. Highlight functions use these byte bounds to skip paragraphs
// that fall inside Section I.
//
// Returns { startPos, endPos } in absolute byte positions. Either can be -1
// if the heading cannot be located — in which case callers fall back to
// their normal behavior (no skip).
function findSectionIBounds(xml) {
  const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let startPos = -1;
  let endPos = -1;
  let m;
  paraRe.lastIndex = 0;
  while ((m = paraRe.exec(xml)) !== null) {
    if (!/<w:pStyle\s+w:val="TITLESECTION"/.test(m[0])) continue;
    const txt = stripTags(m[0]);
    if (startPos === -1 && /^Section\s+I\s+Instructions aux Soumissionnaires/i.test(txt)) {
      startPos = m.index;
    } else if (startPos !== -1) {
      endPos = m.index;
      break;
    }
  }
  return { startPos, endPos };
}

// Compute cumulative byte offsets for a parts array produced by
// `xml.split(/(<w:p[ >]…)/g)`. positions[i] = start byte of parts[i] in
// the original xml. Used together with findSectionIBounds to decide
// whether a paragraph is inside Section I and must be skipped.
function buildPartPositions(parts) {
  const positions = new Array(parts.length);
  let cur = 0;
  for (let i = 0; i < parts.length; i++) {
    positions[i] = cur;
    cur += parts[i].length;
  }
  return positions;
}

const DELETION_MARKER_PATTERNS = [
  /\[Rayer la mention inutile\s*:?\s*\]/gi,
  /\[Supprimer la mention inutile\s*:?\s*\]/gi,
  /\[à supprimer si [^\]]+\]/gi,
  /\[Section à supprimer si [^\]]+\]/gi,
  /Supprimer la mention inutile/g,
  /rayer la mention inutile/g,
];

function highlightDeletionMarkers(xml) {
  let count = 0;
  // For each <w:p>, scan all runs, find matching text and replace that run
  // fragment with a red-highlighted version.
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  // Règle d'or: Section I "Instructions aux Soumissionnaires" is off-limits
  // to every red-highlight intervention. Compute its byte bounds once and
  // skip any paragraph whose start falls within them.
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    let para = parts[i];
    if (!/[Ss]upprimer|[Rr]ayer/.test(para)) continue;
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let combined = '';
    const ranges = runs.map(r => {
      const start = combined.length;
      combined += r.text;
      return { ...r, cStart: start, cEnd: combined.length };
    });
    const hits = [];
    for (const pat of DELETION_MARKER_PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(combined)) !== null) {
        hits.push({ start: m.index, end: m.index + m[0].length });
      }
    }
    if (hits.length === 0) continue;
    // Merge overlapping
    hits.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const h of hits) {
      const last = merged[merged.length - 1];
      if (last && h.start <= last.end) last.end = Math.max(last.end, h.end);
      else merged.push({ ...h });
    }

    // Rebuild paragraph, red-highlighting merged spans.
    let out = '';
    let lastEnd = 0;
    for (const r of ranges) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      const overlapping = merged.filter(h => h.start < r.cEnd && h.end > r.cStart);
      if (overlapping.length === 0) {
        out += r.xml;
        continue;
      }
      // Cut the run text into segments: plain / red / plain / red / plain …
      let cursor = r.cStart;
      const segments = [];
      for (const h of overlapping) {
        if (cursor < h.start) segments.push({ s: cursor, e: Math.min(h.start, r.cEnd), red: false });
        segments.push({ s: Math.max(h.start, r.cStart), e: Math.min(h.end, r.cEnd), red: true });
        cursor = Math.min(h.end, r.cEnd);
      }
      if (cursor < r.cEnd) segments.push({ s: cursor, e: r.cEnd, red: false });
      for (const seg of segments) {
        const sliceText = r.text.slice(seg.s - r.cStart, seg.e - r.cStart);
        if (!sliceText) continue;
        out += seg.red ? makeRedRun(r.rPr, sliceText) : makeRun(r.rPr, sliceText);
        if (seg.red) count++;
      }
    }
    out += para.slice(lastEnd);
    parts[i] = out;
  }
  return { xml: parts.join(''), count };
}

// ── OPTION A / OPTION B red-highlight block ──────────────────────────────
// The template delimits option blocks with literal markers like:
//   [OPTION A...]          ← start
//   Fin de l'OPTION A]     ← end
// Depending on `selected`, we highlight the OTHER block (the one to delete).
//
// There can be MULTIPLE OPTION A/B pairs in the document (e.g. Convention de
// Financement, Déclaration d'intégrité, …). We scan for all start/end pairs
// and highlight each complete block we find.
//
// Safety: if a start marker has no matching end, we skip that occurrence
// rather than letting `inBlock` bleed to the end of the document.
function highlightUnselectedOption(xml, selected) {
  if (!selected) return { xml, count: 0 };
  const notSelected = selected === 'A' ? 'B' : selected === 'B' ? 'A' : null;
  if (!notSelected) return { xml, count: 0 };

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  // Start:  "[OPTION A…" (with the square bracket, optionally followed by …)
  // End:    "Fin de l'OPTION A]"
  const startRe = new RegExp(`\\[\\s*OPTION\\s+${notSelected}\\b`, 'i');
  const endRe = new RegExp(`Fin de l[’']OPTION\\s+${notSelected}\\b`, 'i');

  // Collect paragraph indexes of starts & ends, then pair them greedily.
  const starts = [];
  const ends = [];
  for (let i = 1; i < parts.length; i += 2) {
    const text = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (startRe.test(text)) starts.push(i);
    if (endRe.test(text)) ends.push(i);
  }
  const ranges = [];
  for (const s of starts) {
    const e = ends.find(e => e >= s && !ranges.some(r => r.end === e));
    if (e !== undefined) ranges.push({ start: s, end: e });
  }
  if (ranges.length === 0) return { xml, count: 0 };

  let count = 0;
  for (const { start, end } of ranges) {
    for (let i = start; i <= end; i += 2) {
      const para = parts[i];
      const runs = extractRunNodes(para);
      if (runs.length === 0) continue;
      let out = '';
      let lastEnd = 0;
      for (const r of runs) {
        out += para.slice(lastEnd, r.start);
        lastEnd = r.end;
        if (r.text) {
          out += makeRedRun(r.rPr, r.text);
          count++;
        } else {
          out += r.xml;
        }
      }
      out += para.slice(lastEnd);
      parts[i] = out;
    }
  }
  return { xml: parts.join(''), count };
}

// ── Prequalification references (when IS 4.5 = "n'est pas") ─────────────
// When the call for tenders is NOT preceded by prequalification, every
// paragraph mentioning "pré-qualification" is surligné en rouge — except
// paragraphs that describe the "cas sans pré-qualification" branch, which
// remain in their normal formatting. The IS 4.5 config line itself ("Le
// présent Appel d'Offres [est / n'est pas] précédé d'une pré-qualification")
// is also left untouched — it carries the user's chosen value.
function highlightPrequalificationReferences(xml) {
  const preqRe = /pr[eé]-?qualif/i;
  // Paragraphs that should remain untouched (no-preq branch, config line,
  // and paragraphs flagged by the MOA as keep-always because they are
  // either dual-case clauses or the "sans pré-qualif" counterpart).
  const excludeRes = [
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

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  // Règle d'or: Section I is fully protected. The prior per-paragraph
  // excludeRes list covered many Section I clauses (IS 17.1, IS 17.3,
  // IS 34.3, IS 37.1, IS 37.2) — this bounds-based skip subsumes them
  // and also catches IS 4.5 ("Le présent Appel d'Offres est ouvert aux
  // seuls Soumissionnaires pré-qualifiés") which was previously missed.
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let paraCount = 0;
  let runCount = 0;

  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const para = parts[i];
    if (!/<w:r\b/.test(para)) continue;
    // Skip TOC entries — Word regenerates the table of contents on open.
    if (/<w:pStyle\s+w:val="TM\d"/i.test(para)) continue;
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    const combined = normApos(runs.map(r => r.text).join(''));
    if (!preqRe.test(combined)) continue;
    if (excludeRes.some(re => re.test(combined))) continue;

    let out = '';
    let lastEnd = 0;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) {
        out += makeRedRun(r.rPr, r.text);
        runCount++;
      } else {
        out += r.xml;
      }
    }
    out += para.slice(lastEnd);
    parts[i] = out;
    paraCount++;
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── "Quelle est l'utilité de la Préqualification ?" full section ────────
// Ce guide complet (titre + introduction + nécessité + avantages a→g +
// inconvénients a→c + §6 plan de passation) est à supprimer intégralement
// quand l'Appel d'Offres n'est pas précédé d'une pré-qualification. On
// surligne en rouge TOUS les paragraphes depuis l'en-tête TITLEINTRO
// "Quelle est l'utilité…" jusqu'au prochain TITLEINTRO (qui démarre un
// autre guide du préambule), peu importe s'ils contiennent ou non le mot
// "pré-qualification" — c'est le bloc dans son ensemble qui disparaît.
function highlightUtilitySection(xml) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const titleRe = /Quelle est l'utilit[eé] de la Pr[eé]qualification/i;
  const titleStyleRe = /<w:pStyle\s+w:val="TITLEINTRO"/i;

  let startIdx = -1;
  let endIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    const p = parts[i];
    if (!/<w:r\b/.test(p)) continue;
    const text = normApos(
      [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join('')
    );
    if (startIdx === -1) {
      if (titleStyleRe.test(p) && titleRe.test(text)) startIdx = i;
    } else {
      if (titleStyleRe.test(p)) { endIdx = i; break; }
    }
  }
  if (startIdx === -1) return { xml, paraCount: 0, runCount: 0 };
  if (endIdx === -1) endIdx = parts.length;

  let paraCount = 0;
  let runCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    const para = parts[i];
    if (!/<w:r\b/.test(para)) continue;
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    const joined = runs.map(r => r.text).join('');
    if (!joined.trim()) continue;

    let out = '';
    let lastEnd = 0;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) {
        out += makeRedRun(r.rPr, r.text);
        runCount++;
      } else {
        out += r.xml;
      }
    }
    out += para.slice(lastEnd);
    parts[i] = out;
    paraCount++;
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── Strip "Préambule" / "Notes à l'utilisateur" block ────────────────────
// The template opens with a self-referential block (paras 26..53 in the
// template) titled "Préambule" that explains how to use the template itself,
// lists the revision history, and points at AFD contact addresses. The DAO
// we hand to bidders must not contain this meta-information. We drop the
// entire paragraph range between the first standalone "Préambule" heading
// and the "Table des matières" heading that follows it.
//
// Notes on section properties: the Préambule block ends with a <w:sectPr>
// paragraph. Removing it along with the rest is intentional — the cover page
// section (which ends with its own <w:sectPr> before the block) flows
// directly into the TOC section afterwards, yielding a clean layout without
// a blank Preamble page.
function stripPreambleBlock(xml) {
  const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let startPos = -1;
  let endPos = -1;
  let m;
  // Reset regex state before use.
  paraRe.lastIndex = 0;
  while ((m = paraRe.exec(xml)) !== null) {
    const txt = stripTags(m[0]);
    if (startPos === -1 && /^Pr[eé]\s*ambule\s*$/i.test(txt)) {
      startPos = m.index;
    } else if (startPos !== -1 && /^Table des mati[eè]res\s*$/i.test(txt)) {
      endPos = m.index;
      break;
    }
  }
  if (startPos === -1 || endPos === -1 || endPos <= startPos) return { xml, removed: 0 };
  const removed = endPos - startPos;
  return { xml: xml.slice(0, startPos) + xml.slice(endPos), removed };
}

// ── Page de garde: inject project name in Arial 36pt ─────────────────────
// The template cover page shows fixed text only (DOCUMENT TYPE…, Documents
// d'Appel d'Offres, Marchés de Travaux, AFD logo, FEVRIER 2024) with no slot
// for the project name. We inject a new centered paragraph (Arial 36pt bold)
// holding `formData.nom_projet` immediately before the "FEVRIER 2024"
// paragraph so it sits directly above the date — the customary DTAO layout.
//
// Font size is encoded in half-points: 36pt → sz="72". We set rFonts on both
// the paragraph rPr (so an empty follow-up line inherits the style) and on
// the run itself (so the visible text carries the format).
function injectProjectNameOnCover(xml, projectName) {
  if (!projectName || !projectName.trim()) return { xml, injected: false };
  const safe = escapeXml(projectName.trim());
  const rPr =
    '<w:rPr>' +
      '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' +
      '<w:b/><w:noProof/>' +
      '<w:sz w:val="72"/><w:szCs w:val="72"/>' +
    '</w:rPr>';
  const newPara =
    '<w:p>' +
      '<w:pPr>' +
        '<w:jc w:val="center"/>' +
        rPr +
      '</w:pPr>' +
      '<w:r>' + rPr +
        `<w:t xml:space="preserve">${safe}</w:t>` +
      '</w:r>' +
    '</w:p>';

  const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  paraRe.lastIndex = 0;
  let m;
  while ((m = paraRe.exec(xml)) !== null) {
    const txt = stripTags(m[0]);
    if (/^F[EÉ]VRIER\s+2024$/i.test(txt)) {
      return {
        xml: xml.slice(0, m.index) + newPara + xml.slice(m.index),
        injected: true,
      };
    }
  }
  return { xml, injected: false };
}

// ── Conditional prequalification letter blocks ──────────────────────────
// The template carries BOTH an "Avis d'Appel d'Offres - Lettre aux
// Soumissionnaires pré-qualifiés" block AND an "Avis d'Appel d'Offres –
// Cas sans pré-qualification" block, back-to-back. Only one should remain
// in the final DAO depending on whether the MOA ran a pre-qualification.
//
// Boundaries (text-based, robust to hyphen vs en-dash in the TITLEINTRO):
//   A.start = "Avis d'Appel d'Offres - Lettre aux Soumissionnaires pré-qualifiés"
//   B.start = "Avis d'Appel d'Offres – Cas sans pré-qualification"   (= A.end)
//   B.end   = "Spécifications des Travaux"                            (next TITLEINTRO)
//
//   prequalification === "est"       → keep A, drop [B.start, B.end)
//   prequalification === "n'est pas" → drop [A.start, B.start), keep B
//
// If either boundary cannot be located, the function is a no-op and the
// existing highlightPrequalificationReferences surlignage still runs as a
// safety net.
function stripConditionalPrequalLetters(xml, prequalification) {
  const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let blockAStart = -1;
  let blockBStart = -1;
  let blockBEnd = -1;
  let m;
  paraRe.lastIndex = 0;
  while ((m = paraRe.exec(xml)) !== null) {
    const txt = normApos(stripTags(m[0]));
    if (blockAStart === -1 &&
        /^Avis d'Appel d'Offres\s*[-\u2013]\s*Lettre aux Soumissionnaires pr[eé][-\s]?qualifi[eé]s\s*$/i.test(txt)) {
      blockAStart = m.index;
    } else if (blockAStart !== -1 && blockBStart === -1 &&
        /^Avis d'Appel d'Offres\s*[-\u2013]\s*Cas sans pr[eé][-\s]?qualification\s*$/i.test(txt)) {
      blockBStart = m.index;
    } else if (blockBStart !== -1 &&
        /^Sp[eé]cifications des Travaux\s*$/i.test(txt)) {
      blockBEnd = m.index;
      break;
    }
  }
  if (blockAStart === -1 || blockBStart === -1 || blockBEnd === -1) {
    return { xml, removed: 0, mode: 'not-found' };
  }

  if (prequalification === 'est') {
    return {
      xml: xml.slice(0, blockBStart) + xml.slice(blockBEnd),
      removed: blockBEnd - blockBStart,
      mode: 'removed-cas-sans',
    };
  }
  return {
    xml: xml.slice(0, blockAStart) + xml.slice(blockBStart),
    removed: blockBStart - blockAStart,
    mode: 'removed-prequalifies',
  };
}

// ── Strip "Spécifications des Travaux" introductory guide ───────────────
// Between the two AAO letter blocks and the DAO's own cover page, the
// template interleaves a TITLEINTRO "Spécifications des Travaux" block
// that consists of internal notes to the template author ("Notes relatives
// à la préparation des spécifications techniques et des plans", examples
// of variantes, advice about plans/dossiers, lots multiples, and finally
// "Il est important que le Maître d'Ouvrage engage une discussion avec
// l'AFD au sujet de la stratégie de passation des marchés"). This content
// has no place in the DAO handed to bidders.
//
// We scope the strip to pStyle=TITLEINTRO so the actual DEUXIEME PARTIE /
// Section VII – Spécifications des Travaux (TITLEPART + TITLESECTION,
// later in the document) is never removed. We stop BEFORE the first
// paragraph containing a <w:sectPr> so the surrounding section terminator
// stays in place and the DAO cover page keeps its own page layout.
function stripSpecsGuideBlock(xml) {
  const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let startPos = -1;
  let endPos = -1;
  let m;
  paraRe.lastIndex = 0;
  while ((m = paraRe.exec(xml)) !== null) {
    const raw = m[0];
    const isTitleIntro = /<w:pStyle\s+w:val="TITLEINTRO"/.test(raw);
    if (startPos === -1 && isTitleIntro &&
        /^Sp[eé]cifications des Travaux\s*$/i.test(stripTags(raw))) {
      startPos = m.index;
    } else if (startPos !== -1 && /<w:sectPr\b/.test(raw)) {
      // Stop BEFORE this paragraph: its sectPr closes the surrounding
      // section and must be preserved so the next section (the DAO cover
      // page) keeps its page-break / headers / footers.
      endPos = m.index;
      break;
    }
  }
  if (startPos === -1 || endPos === -1 || endPos <= startPos) return { xml, removed: 0 };
  return {
    xml: xml.slice(0, startPos) + xml.slice(endPos),
    removed: endPos - startPos,
  };
}

// ── IS 7.4 reunion block when "n'est pas prévue" ─────────────────────────
// IS 7.4 sits inside Section I. Per règle d'or, Section I must not receive
// any red-highlight intervention, so this function is now a no-op whenever
// the "Une réunion préparatoire" anchor falls inside Section I bounds. If
// the user later wants the Lieu/Date/Heure lines removed in the
// "n'est pas prévue" case, they should be physically stripped rather than
// surligned.
function highlightReunionBlock(xml) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const combined = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (/Une réunion préparatoire/.test(combined)) { startIdx = i; break; }
  }
  if (startIdx === -1) return { xml, paraCount: 0, runCount: 0 };

  let paraCount = 0;
  let runCount = 0;
  for (let j = startIdx + 2; j < parts.length; j += 2) {
    const para = parts[j];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    const combined = normApos(runs.map(r => r.text).join(''));
    if (/Une visite du Site/.test(combined)) break;
    // Safety: don't walk past the reunion block indefinitely.
    if (paraCount >= 8) break;

    let out = '';
    let lastEnd = 0;
    let changed = false;
    for (const r of runs) {
      out += para.slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) {
        out += makeRedRun(r.rPr, r.text);
        runCount++;
        changed = true;
      } else {
        out += r.xml;
      }
    }
    out += para.slice(lastEnd);
    if (changed) {
      parts[j] = out;
      paraCount++;
    }
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── IS 11.1(b) — red-highlight unselected price-format alternatives ──────
// The Section II DPAO cell for IS 11.1(b) lists three price schedule
// formats separated by "[ou]" dividers. Once the MOA has picked one via
// `type_prix`, the other two rows + their "[ou]" separators become noise.
// The yellow "[pour les marchés …]" guide label next to the selected row is
// also red-highlighted so the MOA can delete it manually on final review.
//
// Layout in the template:
//   row 1: "Bordereau des Prix et Détail quantitatif et estimatif [pour les marchés à prix unitaires]"
//   "[ou]"
//   row 2: "Prix global et forfaitaire et sa décomposition [pour les marchés à prix global et forfaitaire]"
//   "[ou]"
//   row 3: "Bordereau des Prix et Détail … et Prix global et forfaitaire … [pour les marchés combinant …]"
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

  // Anchor: first paragraph in Section II+ matching row 1.
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (rowRes[0].test(t)) { startIdx = i; break; }
  }
  if (startIdx === -1) return { xml, count: 0 };

  // Walk forward expecting row1 / [ou] / row2 / [ou] / row3. Bail + warn on
  // mismatch so regressions surface when the AFD template is updated.
  const bail = (reason) => {
    console.warn(`[exportDocx] IS 11.1(b) structure mismatch: ${reason} — surlignage ignoré`);
    return { xml, count: 0 };
  };
  const block = []; // { idx, kind: 'row'|'or', optIdx? }
  let cur = startIdx;
  for (let k = 0; k < 3; k++) {
    block.push({ idx: cur, kind: 'row', optIdx: k });
    if (k === 2) break;
    cur += 2;
    if (cur >= parts.length) return bail(`fin du document atteinte avant [ou] après row${k}`);
    const tOr = normApos(extractRunNodes(parts[cur]).map(r => r.text).join(''));
    if (!orRe.test(tOr)) return bail(`[ou] attendu après row${k}, trouvé "${tOr.slice(0, 60)}"`);
    block.push({ idx: cur, kind: 'or' });
    cur += 2;
    if (cur >= parts.length) return bail(`fin du document atteinte avant row${k + 1}`);
    const tRow = normApos(extractRunNodes(parts[cur]).map(r => r.text).join(''));
    if (!rowRes[k + 1].test(tRow)) return bail(`row${k + 1} attendue, trouvée "${tRow.slice(0, 60)}"`);
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
      if (entry.kind === 'or') {
        shouldRed = true; // "[ou]" separator always red
      } else if (entry.optIdx !== selectedIdx) {
        shouldRed = true; // unselected row fully red
      } else {
        // Selected row: only flip the yellow "[pour les marchés …]" guide.
        shouldRed = hasYellowHighlight(r.rPr);
      }
      if (shouldRed) {
        out += makeRedRun(r.rPr, r.text);
        count++;
      } else {
        out += r.xml;
      }
    }
    out += para.slice(lastEnd);
    parts[entry.idx] = out;
  }
  return { xml: parts.join(''), count };
}

// ── Section IV "Tableaux de prix" guide — red-highlight unselected options ─
// The Section IV intro block at "Tableaux de prix" (page 60) is a 6-paragraph
// yellow guide:
//   0. "[Insérer un formulaire de Bordereau des prix et Détail quantitatif…"
//   1. "ou"
//   2. "un formulaire de Prix Global et Forfaitaire et de décomposition…"
//   3. "ou"
//   4. "les deux formulaires pour un marché combinant…"
//   5. "Et insérer le texte ci-dessous comme introduction]"
// Once `type_prix` is chosen, only the matching option stays yellow; the rest
// becomes red so the MOA can clean up. Mapping:
//   Bordereau   → keep 0           ; red on 1,2,3,4,5
//   Prix global → keep 2           ; red on 0,1,3,4,5
//   Combinaison → keep 3,4         ; red on 0,1,2,5  ("ou" 3 reads naturally
//                                    before "les deux formulaires")
function highlightUnselectedTableauxDePrixGuide(xml, typePrix) {
  if (!typePrix) return { xml, count: 0 };
  const KEEP_YELLOW = {
    'Bordereau des Prix et DQE (prix unitaires)': new Set([0]),
    'Prix global et forfaitaire': new Set([2]),
    'Combinaison prix unitaires + forfaitaire': new Set([3, 4]),
  };
  const keep = KEEP_YELLOW[typePrix];
  if (!keep) return { xml, count: 0 };

  const expected = [
    /Insérer.*formulaire de Bordereau des prix.*Détail quantitatif/i,
    /^ou$/i,
    /un formulaire de Prix Global et Forfaitaire et de décomposition/i,
    /^ou$/i,
    /les deux formulaires pour un march[ée] combinant/i,
    /Et insérer le texte ci-dessous comme introduction\]/i,
  ];

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();

  // Locate the anchor (first paragraph matching expected[0]).
  let anchor = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (expected[0].test(paraText(parts[i]))) { anchor = i; break; }
  }
  if (anchor === -1) return { xml, count: 0 };

  // Verify the 5 following paragraphs match the expected layout.
  const block = [anchor];
  let cursor = anchor;
  for (let k = 1; k < 6; k++) {
    cursor += 2;
    if (cursor >= parts.length) {
      console.warn('[exportDocx] Tableaux de prix: bloc tronqué (6 paragraphes attendus)');
      return { xml, count: 0 };
    }
    const t = paraText(parts[cursor]);
    if (!expected[k].test(t)) {
      console.warn(`[exportDocx] Tableaux de prix: paragraphe ${k} inattendu "${t.slice(0, 60)}"`);
      return { xml, count: 0 };
    }
    block.push(cursor);
  }

  // Convert yellow→red on every paragraph not in the keep set.
  const yellowRe = /<w:highlight\s+w:val\s*=\s*"yellow"\s*\/>/gi;
  let count = 0;
  block.forEach((idx, k) => {
    if (keep.has(k)) return;
    const before = parts[idx];
    const after = before.replace(yellowRe, '<w:highlight w:val="red"/>');
    if (after !== before) {
      const matches = before.match(yellowRe) || [];
      count += matches.length;
      parts[idx] = after;
    }
  });
  return { xml: parts.join(''), count };
}

// ── IS 15.1 — red-highlight unselected monnaie option block ──────────────
// The Section II DPAO cell for IS 15.1 presents two alternative language
// blocks (Option A = national currency only / Option B = national +
// foreign currencies). Once the MOA has picked one via `option_monnaie`,
// the other block + the two guide paragraphs ("[Le Maître d'Ouvrage doit
// choisir …]" and "[Option à privilégier]") become noise and are red.
function highlightUnselectedMonnaieOption(xml, optionMonnaie) {
  if (!optionMonnaie) return { xml, count: 0 };
  const isA = /Option\s*A/i.test(optionMonnaie);
  const isB = /Option\s*B/i.test(optionMonnaie);
  if (!isA && !isB) return { xml, count: 0 };

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);

  // Anchor: the unique "L'Option B reflète mieux les besoins" guide paragraph.
  let anchorIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (/L'Option B refl[eè]te mieux les besoins/i.test(t)) { anchorIdx = i; break; }
  }
  if (anchorIdx === -1) return { xml, count: 0 };

  // Forward scan for the A / B headers, the "[Option à privilégier]" label,
  // and the first "IS N.N" boundary that closes the cell.
  let optAHead = -1, priviLabel = -1, optBHead = -1, endIdx = parts.length;
  for (let i = anchorIdx + 2; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (optAHead === -1 && /^Option A \(/i.test(t)) { optAHead = i; continue; }
    if (priviLabel === -1 && /^\[Option [aà] privil[eé]gier\]\s*$/i.test(t)) { priviLabel = i; continue; }
    if (optBHead === -1 && /^Option B \(/i.test(t)) { optBHead = i; continue; }
    if (optBHead !== -1 && (/^IS\s+\d/.test(t) || /^Section\s+[IVX]/i.test(t))) { endIdx = i; break; }
    if (i - anchorIdx > 40) { endIdx = i; break; } // safety rail
  }
  if (optAHead === -1 || optBHead === -1) return { xml, count: 0 };

  // Which paragraph indexes get painted red?
  const redIndices = new Set();
  redIndices.add(anchorIdx);
  if (priviLabel !== -1) redIndices.add(priviLabel);
  const addRange = (from, to) => { for (let i = from; i < to; i += 2) redIndices.add(i); };
  if (isA) {
    addRange(optBHead, endIdx); // Option B block fully red
  } else {
    addRange(optAHead, priviLabel !== -1 ? priviLabel : optBHead); // Option A block fully red
  }

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
  return { xml: parts.join(''), count };
}

// ── IS 32.1 — red-highlight unselected conversion option block ──────────
// Section II DPAO cell for IS 32.1: same A / B shape as IS 15.1 but without
// the "[Option à privilégier]" label. Anchor on the unique sentence
// "La(es) monnaie(s) de l'Offre sera(ont) convertie(s) … conformément à la
// procédure correspondant à l'Option".
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
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (/conform[eé]ment [aà] la proc[eé]dure correspondant [aà] l'Option/i.test(t)) { anchorIdx = i; break; }
  }
  if (anchorIdx === -1) return { xml, count: 0 };

  let optAHead = -1, optBHead = -1, endIdx = parts.length;
  for (let i = anchorIdx + 2; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
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
  return { xml: parts.join(''), count };
}

// ── Static template guides that are always red-highlighted ──────────────
// Paragraphs the MOA should delete once the DPAO cell is finalized. We paint
// them red (not strip) so the MOA can read the instruction, confirm the
// underlying info is captured elsewhere, and then delete them manually.
//
// Matching uses normalized whitespace so Word's stray spaces (e.g. "mi
// période" with a space instead of the expected hyphen) still match.
function highlightStaticGuides(xml) {
  return highlightParagraphsByAnchors(xml, STATIC_GUIDE_ANCHORS);
}

// ── Generic helper — red-highlight every paragraph whose text matches any
//    of the supplied anchor regexes (scoped to Section II+). Used for blocks
//    that become inapplicable based on a user choice.
function highlightParagraphsByAnchors(xml, anchors) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);

  let paraCount = 0, runCount = 0;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (!anchors.some(re => re.test(t))) continue;
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '', lastEnd = 0, changed = false;
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

// ── IS 13.5 variantes délais — red-highlight ajustement block ──────────
// When time-schedule variants are NOT authorized (variantes_delais === "ne
// sont pas"), the two following paragraphs become inapplicable:
//   "Si les variantes sont autorisées, le montant d'ajustement … : [insérer montant et monnaie] par [insérer jour ou semaine]"
//   "[Le Marché devra mentionner une pénalité de retard (voir Sous-Clause 8.7 du CCAP) …]"
function highlightVariantesDelaisBlock(xml) {
  return highlightParagraphsByAnchors(xml, IS_13_5_VARIANTES_DELAIS_ANCHORS);
}

// ── IS 34.1 sous-traitants désignés — red-highlight listing guide ──────
// When sous_traitants_designes === "ne prévoit pas", the follow-up guide
// "[si la mention retenue ci-dessus est "prévoit", alors lister …]" is
// inapplicable. Red it so the MOA can delete it.
function highlightSousTraitantsBlock(xml) {
  return highlightParagraphsByAnchors(xml, IS_34_1_SOUS_TRAITANTS_ANCHORS);
}

// ── IS 33.1 marge de préférence — red-highlight the entire block ──────
// When marge_preference === "ne sera pas", the whole "2 Marge de préférence"
// section in Section III becomes inapplicable. We paint it red so the MO
// deletes it manually. The block starts at the Heading1 paragraph
// "Marge de préférence" and ends right before the next Heading1
// ("Qualification"). That span covers:
//   - the yellow guide "[à n'insérer que si autorisé …]"
//   - paragraph 2.1 with sub-bullets a/b/c/i/ii
//   - paragraph 2.2 ("Dans un premier temps … sera sélectionnée").
function highlightMargePreferenceBlock(xml, margePreference) {
  if (margePreference !== 'ne sera pas') return { xml, paraCount: 0, runCount: 0 };

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);

  // Locate the Heading1 "Marge de préférence" paragraph (skip Section I).
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (!/<w:pStyle\s+w:val="Heading1"/.test(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (MARGE_PREFERENCE_HEADER_ANCHOR.test(t)) { startIdx = i; break; }
  }
  if (startIdx === -1) {
    console.warn("[exportDocx] IS 33.1: Heading1 'Marge de préférence' introuvable — surlignage ignoré");
    return { xml, paraCount: 0, runCount: 0 };
  }

  // Find the next Heading1 — that's where the block ends.
  let endIdx = parts.length;
  for (let i = startIdx + 2; i < parts.length; i += 2) {
    if (/<w:pStyle\s+w:val="Heading1"/.test(parts[i])) { endIdx = i; break; }
  }

  // Paint every paragraph in [startIdx, endIdx) red.
  let paraCount = 0, runCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '', lastEnd = 0, changed = false;
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

// ── IS 4.5 pré-qualification — red-highlight the "supprimer" guide ────
// When prequalification === "n'est pas", the yellow guide
// "[sinon supprimer toute cette section]" that sits between the
// "3.3 Qualification si une Pré-qualification n'a pas été effectuée" heading
// and the detailed criteria is no longer actionable (the section applies),
// so we paint it red for the MO to clean up.
function highlightNoPrequalGuide(xml) {
  return highlightParagraphsByAnchors(xml, NO_PREQUAL_GUIDE_ANCHORS);
}

// ── Generic helper: paint every paragraph in [startRe .. endRe) red ────
// Finds the first paragraph matching `startRe`, then red-highlights every
// paragraph (including those nested inside tables) up to — but not including —
// the first paragraph matching `endRe` that follows. Section I paragraphs are
// excluded as a safety rail. Paragraphs that belong to a table-of-contents
// entry (PAGEREF field) are skipped so anchors target the real heading.
function isTocParagraph(paraXml) {
  return /PAGEREF\s+_Toc/i.test(paraXml) || /<w:pStyle\s+w:val="TOC\d/i.test(paraXml);
}
function highlightParagraphRange(xml, startRe, endRe) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);

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
  if (startIdx === -1 || endIdx === -1) return { xml, paraCount: 0, runCount: 0 };

  let paraCount = 0, runCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '', lastEnd = 0, changed = false;
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

// ── Annexe 1 (Révision des prix) — red if prix fermes ──────────────────
// If the user chose "fermes" for S02-019 (nature des prix), the entire
// "Annexe 1 à la Soumission — Données relatives à la révision des prix"
// becomes inapplicable and must be deleted by the MOA. Paint the whole
// block red from the Annexe 1 title to just before Annexe 2.
function highlightAnnexe1Revisions(xml, natureDesPrix) {
  if (natureDesPrix !== 'fermes') return { xml, paraCount: 0, runCount: 0 };
  return highlightParagraphRange(
    xml,
    /^Annexe 1 [aà] la Soumission\b.*r[eé]vision des prix/i,
    /^Annexe 2 [aà] la Soumission\b/i,
  );
}

// ── Annexe 2 (Libellé du prix) — red the non-retained Alternative ──────
// S02-020 picks either Option A (monnaie nationale) or Option B (monnaies
// nationale + étrangères). The template carries both Alternative A and
// Alternative B sub-tables; the non-retained one must be deleted.
//   Option A → red Alternative B
//   Option B → red Alternative A
function highlightAnnexe2Alternative(xml, optionMonnaie) {
  if (!optionMonnaie) return { xml, paraCount: 0, runCount: 0 };
  const isA = /Option\s*A/i.test(optionMonnaie);
  const isB = /Option\s*B/i.test(optionMonnaie);
  if (!isA && !isB) return { xml, paraCount: 0, runCount: 0 };
  if (isA) {
    return highlightParagraphRange(
      xml,
      /Tableau\s*:\s*Alternative\s*B/i,
      /^Annexe 3 [aà] la Soumission\b/i,
    );
  }
  return highlightParagraphRange(
    xml,
    /Tableau\s*:\s*Alternative\s*A/i,
    /Tableau\s*:\s*Alternative\s*B/i,
  );
}

// ── Variantes techniques form — red if variantes not authorized ────────
// S02-016 controls whether technical variants are authorized. When set to
// "ne sont pas", the dedicated "Variantes techniques" form page in Section IV
// (title + intro + 4-column table "Objet / Description du besoin / …") must
// be removed. Paint the whole form red, bounded by the next form heading
// "Méthodologie environnementale, sociale, santé et sécurité (ESSS)".
function highlightVariantesTechniquesForm(xml, variantesTechniques) {
  if (variantesTechniques !== 'ne sont pas') return { xml, paraCount: 0, runCount: 0 };
  // The label "Variantes techniques" also appears in Section II and in the
  // TOC of forms. We anchor on the intro sentence immediately underneath the
  // form header, which is unique and sits between the form title and the
  // table — this guarantees we target the right occurrence.
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);

  const introRe = /^Proposition pour les [eé]l[eé]ments d\s*es ouvrages pour lesquels des variantes technique\s*s sont autoris[eé]es/i;
  let introIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (isTocParagraph(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (introRe.test(t)) { introIdx = i; break; }
  }
  if (introIdx === -1) return { xml, paraCount: 0, runCount: 0 };

  // Walk backwards up to 4 paragraphs to reach the "Variantes techniques" title.
  let startIdx = introIdx;
  for (let j = 1; j <= 4; j++) {
    const k = introIdx - 2 * j;
    if (k < 1) break;
    const t = normApos(extractRunNodes(parts[k]).map(r => r.text).join(''));
    if (/^Variantes techniques\s*$/i.test(t)) { startIdx = k; break; }
  }
  // End: next form heading (Méthodologie ESSS).
  let endIdx = -1;
  for (let i = introIdx + 2; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (/M[eé]thodologie\s+environnementale/i.test(t)) { endIdx = i; break; }
  }
  if (endIdx === -1) return { xml, paraCount: 0, runCount: 0 };

  let paraCount = 0, runCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '', lastEnd = 0, changed = false;
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

// ── Yellow → red highlight conversion within a paragraph range ─────────
// Sections V and VI carry several yellow-highlighted guide/OPTION paragraphs
// that the MOA must decide on (template drafting notes). User requested these
// yellow runs be red-highlighted instead so they stand out as "to delete /
// resolve". Applied between two anchor paragraphs.
function convertYellowToRedInRange(xml, startRe, endRe) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  // Only accept anchors on real section titles: either TITLESECTION-styled
  // or Formulaire1/Formulaire2 headings. Avoids matching numbered list items
  // or body text that happens to start with the same words.
  const isHeading = (p) => /<w:pStyle\s+w:val="(TITLESECTION|Formulaire[12]|Titre\d|Heading\d)"/i.test(p);
  let startIdx = -1, endIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (isTocParagraph(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (startIdx === -1) {
      if (startRe.test(t) && isHeading(parts[i])) startIdx = i;
    } else {
      if (endRe.test(t) && isHeading(parts[i])) { endIdx = i; break; }
    }
  }
  if (startIdx === -1 || endIdx === -1) return { xml, paraCount: 0, runCount: 0 };

  let paraCount = 0, runCount = 0;
  const yellowRe = /<w:highlight\s+w:val\s*=\s*"yellow"\s*\/>/gi;
  for (let i = startIdx; i < endIdx; i += 2) {
    const before = parts[i];
    if (!yellowRe.test(before)) continue;
    yellowRe.lastIndex = 0;
    const localMatches = before.match(yellowRe) || [];
    const after = before.replace(yellowRe, '<w:highlight w:val="red"/>');
    if (after !== before) {
      parts[i] = after;
      paraCount++;
      runCount += localMatches.length;
    }
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── Yellow → red in a paragraph range (no heading constraint) ─────────
// Same idea as convertYellowToRedInRange, but does NOT require the anchor
// paragraphs to be heading-styled. Used when the start anchor is a guide
// paragraph (e.g. "[Dans le cas de travaux…") rather than a real heading.
function convertYellowToRedInParaRange(xml, startRe, endRe) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
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
  if (startIdx === -1 || endIdx === -1) return { xml, paraCount: 0, runCount: 0 };

  let paraCount = 0, runCount = 0;
  const yellowRe = /<w:highlight\s+w:val\s*=\s*"yellow"\s*\/>/gi;
  for (let i = startIdx; i < endIdx; i += 2) {
    const before = parts[i];
    const localMatches = before.match(yellowRe) || [];
    if (localMatches.length === 0) continue;
    const after = before.replace(yellowRe, '<w:highlight w:val="red"/>');
    if (after !== before) {
      parts[i] = after;
      paraCount++;
      runCount += localMatches.length;
    }
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── Paint every paragraph whose extracted text matches `matchRe` red ──
// Unlike highlightParagraphRange (which paints every paragraph in a byte
// range), this only paints paragraphs that individually match the marker.
// Useful for sets of scattered bullets that share the same yellow guide
// prefix (e.g. Sûreté "[à insérer en cas de contexte sécuritaire très
// dégradé ; sinon supprimer]" bullets in §4.3/§4.4/§4.2-sat/§5).
function highlightParagraphsMatching(xml, matchRe) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  let paraCount = 0, runCount = 0;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (isTocParagraph(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (!matchRe.test(t)) continue;
    const runs = extractRunNodes(parts[i]);
    if (runs.length === 0) continue;
    let out = '', lastEnd = 0, changed = false;
    for (const r of runs) {
      out += parts[i].slice(lastEnd, r.start);
      lastEnd = r.end;
      if (r.text) { out += makeRedRun(r.rPr, r.text); runCount++; changed = true; }
      else out += r.xml;
    }
    out += parts[i].slice(lastEnd);
    if (changed) { parts[i] = out; paraCount++; }
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── Convert yellow → red only in paragraphs matching `matchRe` ────────
// Companion to highlightParagraphsMatching for the "keep content applicable,
// just flag the draft marker" mode: only the yellow highlight bytes inside
// matched paragraphs flip to red, plain-text portions of the same paragraph
// stay unhighlighted.
function convertYellowToRedInMatchingParagraphs(xml, matchRe) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const sectI = findSectionIBounds(xml);
  const positions = buildPartPositions(parts);
  const yellowRe = /<w:highlight\s+w:val\s*=\s*"yellow"\s*\/>/gi;
  let paraCount = 0, runCount = 0;
  for (let i = 1; i < parts.length; i += 2) {
    if (sectI.startPos !== -1 && positions[i] >= sectI.startPos && positions[i] < sectI.endPos) continue;
    if (isTocParagraph(parts[i])) continue;
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (!matchRe.test(t)) continue;
    const before = parts[i];
    const localMatches = before.match(yellowRe) || [];
    if (localMatches.length === 0) continue;
    const after = before.replace(yellowRe, '<w:highlight w:val="red"/>');
    if (after !== before) {
      parts[i] = after;
      paraCount++;
      runCount += localMatches.length;
    }
  }
  return { xml: parts.join(''), paraCount, runCount };
}

// ── Convert yellow → red in specific footnotes by their w:id ─────────
// Operates on `word/footnotes.xml` (not `document.xml`). Each footnote is a
// `<w:footnote w:id="N">…</w:footnote>` container; this helper finds the ones
// whose id appears in `ids`, then flips every `<w:highlight w:val="yellow"/>`
// inside them to `<w:highlight w:val="red"/>`. Used to flag draft yellow
// footnotes that become inapplicable due to a user choice (e.g. Sûreté
// criteria footnotes 26/27/28 when surete_applicable === "Non").
function convertYellowToRedInFootnoteIds(footnotesXml, ids) {
  if (!footnotesXml) return { xml: footnotesXml, footnoteCount: 0, runCount: 0 };
  const idSet = new Set(ids.map(String));
  const fnRe = /<w:footnote\s[^>]*?w:id="(-?\d+)"[^>]*>[\s\S]*?<\/w:footnote>/g;
  const yellowRe = /<w:highlight\s+w:val\s*=\s*"yellow"\s*\/>/gi;
  let footnoteCount = 0, runCount = 0;
  const out = footnotesXml.replace(fnRe, (chunk, id) => {
    if (!idSet.has(id)) return chunk;
    const matches = chunk.match(yellowRe) || [];
    if (matches.length === 0) return chunk;
    footnoteCount++;
    runCount += matches.length;
    return chunk.replace(yellowRe, '<w:highlight w:val="red"/>');
  });
  return { xml: out, footnoteCount, runCount };
}

// ── Replace a yellow-guide paragraph entirely with user-supplied text ──
// Used for textarea fields whose UI "context" hint IS the yellow placeholder
// paragraph the user is meant to replace (e.g. Sûreté Préambule guides). If
// `newText` is empty/blank the paragraph is left untouched (the yellow guide
// remains visible so the MOA notices it). Otherwise we rewrite the paragraph
// body: keep <w:pPr>, drop every existing run (they carry the yellow highlight
// and template italic), inject a single green-highlighted run carrying the
// user's text. Newlines are rendered as <w:br/> so multi-paragraph textareas
// stay inside one <w:p> (sufficient for the small-block use case here).
function replaceYellowGuideParagraph(xml, matchRe, newText) {
  if (!newText || !String(newText).trim()) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    const t = normApos(extractRunNodes(para).map(r => r.text).join(''));
    if (!matchRe.test(t)) continue;
    const openTagMatch = para.match(/^<w:p\b[^>]*>/);
    const openTag = openTagMatch ? openTagMatch[0] : '<w:p>';
    const pPrMatch = para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    const lines = String(newText).split(/\r?\n/);
    const runs = lines
      .map((line, idx) => {
        const brBefore = idx > 0 ? '<w:r><w:br/></w:r>' : '';
        return brBefore + makeHighlightedRun('', line);
      })
      .join('');
    parts[i] = `${openTag}${pPr}${runs}</w:p>`;
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// ── ESSS: find the chapter-start byte position ─────────────────────────
// The ESSS chapter begins with the guide paragraph "[Dans le cas de travaux
// pour lesquels la gestion du Chantier…". This anchor is unique in the
// template and is used to scope subsequent table lookups to the chapter.
function findEsssChapterStartByte(xml) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  let pos = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
      if (/^\[Dans le cas de travaux pour lesquels la gestion du Chantier/i.test(t)) return pos;
    }
    pos += parts[i].length;
  }
  return -1;
}

// Finds the first <w:tbl>…</w:tbl> at or after `fromByte` whose raw XML
// satisfies the provided regex. Returns { start, end, xml } or null.
function findTableAfter(xml, fromByte, requiredRe) {
  const tblRe = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  tblRe.lastIndex = fromByte;
  let m;
  while ((m = tblRe.exec(xml)) !== null) {
    if (requiredRe.test(m[0])) return { start: m.index, end: m.index + m[0].length, xml: m[0] };
  }
  return null;
}

// ── ESSS: fill the 15-row Enjeux table from the user's Oui/Non choices ─
// When esss_applicable = "Oui", the Enjeux table inside the ESSS chapter
// must reflect the MOA's choice per row. The template's choice cell has:
//   <w:r>[faire un choix]</w:r><w:r><w:br/></w:r><w:r>OUI / NON</w:r>
// We split the single "OUI / NON" run into two so that the non-retained
// option is red-highlighted (kept for MOA deletion) while the chosen one
// stays plain. The "[faire un choix]" yellow marker is converted to red by
// the separate convertYellowToRedInParaRange step.
function fillEnjeuxTable(xml, enjeuxValue) {
  if (!enjeuxValue || typeof enjeuxValue !== 'object') return { xml, rowCount: 0 };
  const chapterStart = findEsssChapterStartByte(xml);
  if (chapterStart === -1) return { xml, rowCount: 0 };
  const tbl = findTableAfter(
    xml,
    chapterStart,
    /Ressources ESSS et organisation du suivi[\s\S]*Lutte contre les maladies transmissibles/,
  );
  if (!tbl) return { xml, rowCount: 0 };

  const KEYS = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o'];
  const RUN_RE = /<w:r\b[^>]*>\s*(<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<\/w:rPr>)?\s*<w:t(?:\s[^>]*)?>OUI \/ NON<\/w:t>\s*<\/w:r>/;
  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  let rebuilt = '', lastEnd = 0, rowIdx = 0, filled = 0;
  let m;
  while ((m = rowRe.exec(tbl.xml)) !== null) {
    rebuilt += tbl.xml.slice(lastEnd, m.index);
    lastEnd = m.index + m[0].length;
    const key = KEYS[rowIdx];
    const choice = key ? enjeuxValue[key] : undefined;
    rowIdx++;
    if ((choice === 'Oui' || choice === 'Non') && RUN_RE.test(m[0])) {
      const run = m[0].match(RUN_RE);
      const rPr = run && run[1] ? run[1] : '';
      const redRPr = rPr
        ? rPr.replace(/<\/w:rPr>/, '<w:highlight w:val="red"/></w:rPr>')
        : '<w:rPr><w:highlight w:val="red"/></w:rPr>';
      const replacement = (choice === 'Oui')
        ? `<w:r>${rPr}<w:t xml:space="preserve">OUI / </w:t></w:r><w:r>${redRPr}<w:t>NON</w:t></w:r>`
        : `<w:r>${redRPr}<w:t>OUI</w:t></w:r><w:r>${rPr}<w:t xml:space="preserve"> / NON</w:t></w:r>`;
      rebuilt += m[0].replace(RUN_RE, replacement);
      filled++;
    } else {
      rebuilt += m[0];
    }
  }
  rebuilt += tbl.xml.slice(lastEnd);
  const newXml = xml.slice(0, tbl.start) + rebuilt + xml.slice(tbl.end);
  return { xml: newXml, rowCount: filled };
}

// ── ESSS: fill the "Exigences ESSS non applicables" articles table ────
// Template table has 3 rows:
//   [0] header: "Numéro d'Article non applicable" | "Explications"
//   [1] "Article [insérer la référence de l'Article]" | "[insérer les explications]"
//   [2] "[Etc.]" | "[Etc.]"
// When the user provides rows in articlesEsssRows, we drop the two template
// placeholder rows and emit one clean row per user entry (no yellow).
function fillArticlesTable(xml, articlesRows) {
  if (!Array.isArray(articlesRows) || articlesRows.length === 0) return { xml, rowCount: 0 };
  const effective = articlesRows.filter(r => (r?.article || '').trim() !== '' || (r?.explication || '').trim() !== '');
  if (effective.length === 0) return { xml, rowCount: 0 };
  const chapterStart = findEsssChapterStartByte(xml);
  if (chapterStart === -1) return { xml, rowCount: 0 };
  const tbl = findTableAfter(
    xml,
    chapterStart,
    /Numéro d'Article non applicable[\s\S]*insérer les explications/,
  );
  if (!tbl) return { xml, rowCount: 0 };

  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const rows = tbl.xml.match(rowRe) || [];
  if (rows.length < 3) return { xml, rowCount: 0 };

  // Replace cell content: wipe all runs between <w:pPr></w:pPr> (or after <w:p ...>)
  // and </w:p>, leaving one fresh run bearing `newText` (no yellow highlight).
  const rewriteFirstPContent = (cellXml, newText) => {
    const injected = `<w:r><w:rPr><w:noProof/></w:rPr><w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r>`;
    const withPPr = cellXml.replace(
      /(<w:p\b[^>]*>[\s\S]*?<\/w:pPr>)[\s\S]*?(<\/w:p>)/,
      (_, open, close) => `${open}${injected}${close}`,
    );
    if (withPPr !== cellXml) return withPPr;
    return cellXml.replace(
      /(<w:p\b[^>]*>)[\s\S]*?(<\/w:p>)/,
      (_, open, close) => `${open}${injected}${close}`,
    );
  };

  const templateRow = rows[1];
  const cellRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  const templateCells = templateRow.match(cellRe) || [];
  if (templateCells.length < 2) return { xml, rowCount: 0 };

  const newRows = effective.map((row) => {
    const articleText = (row.article || '').trim();
    const explicationText = (row.explication || '').trim();
    const newCell0 = rewriteFirstPContent(templateCells[0], articleText);
    const newCell1 = rewriteFirstPContent(templateCells[1], explicationText);
    return templateRow
      .replace(templateCells[0], newCell0)
      .replace(templateCells[1], newCell1);
  });

  // Keep header row, replace rows[1] + rows[2] + inter-row whitespace with newRows.
  const afterHeaderIdx = tbl.xml.indexOf(rows[0]) + rows[0].length;
  const beforeTblEndIdx = tbl.xml.lastIndexOf('</w:tbl>');
  const newTblXml =
    tbl.xml.slice(0, afterHeaderIdx) +
    newRows.join('') +
    tbl.xml.slice(beforeTblEndIdx);

  const newXml = xml.slice(0, tbl.start) + newTblXml + xml.slice(tbl.end);
  return { xml: newXml, rowCount: newRows.length };
}

// ── CCAP: fill the "Résumé des Tranches" table from user-provided rows ─
// Template structure: 1 header row + 5 empty rows for the user. When the
// user provides rows in tranchesRows, we drop the empty placeholder rows
// and emit one clean row per user entry (3 cells: nom, delai, penalites).
function fillCcapTranchesTable(xml, tranchesRows) {
  if (!Array.isArray(tranchesRows) || tranchesRows.length === 0) return { xml, rowCount: 0 };
  const effective = tranchesRows.filter(r =>
    (r?.nom || '').trim() !== '' || (r?.delai || '').trim() !== '' || (r?.penalites || '').trim() !== ''
  );
  if (effective.length === 0) return { xml, rowCount: 0 };

  // Locate the LAST occurrence of "Résumé des Tranches" (earlier ones are
  // guide notes inside CCAP paragraphs); the table itself follows shortly.
  const captionRe = /Résumé des Tranches/g;
  let captionByte = -1;
  let cm;
  while ((cm = captionRe.exec(xml)) !== null) captionByte = cm.index;
  if (captionByte === -1) return { xml, rowCount: 0 };

  const tbl = findTableAfter(
    xml,
    captionByte,
    /Nom\/Description des Tranches[\s\S]*Article 1\.1\.3\.3[\s\S]*Pénalités de retard/,
  );
  if (!tbl) return { xml, rowCount: 0 };

  const rowRe = /<w:tr\b[\s\S]*?<\/w:tr>/g;
  const rows = tbl.xml.match(rowRe) || [];
  if (rows.length < 2) return { xml, rowCount: 0 };

  // Use the LAST empty template row as the cell template (smallest, no extra metadata).
  const templateRow = rows[rows.length - 1];
  const cellRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  const templateCells = templateRow.match(cellRe) || [];
  if (templateCells.length < 3) return { xml, rowCount: 0 };

  const rewriteFirstPContent = (cellXml, newText) => {
    const injected = `<w:r><w:rPr><w:noProof/></w:rPr><w:t xml:space="preserve">${escapeXml(newText)}</w:t></w:r>`;
    const withPPr = cellXml.replace(
      /(<w:p\b[^>]*>[\s\S]*?<\/w:pPr>)[\s\S]*?(<\/w:p>)/,
      (_, open, close) => `${open}${injected}${close}`,
    );
    if (withPPr !== cellXml) return withPPr;
    return cellXml.replace(
      /(<w:p\b[^>]*>)[\s\S]*?(<\/w:p>)/,
      (_, open, close) => `${open}${injected}${close}`,
    );
  };

  const newRows = effective.map((row) => {
    const nom = (row.nom || '').trim();
    const delai = (row.delai || '').trim();
    const penalites = (row.penalites || '').trim();
    const c0 = rewriteFirstPContent(templateCells[0], nom);
    const c1 = rewriteFirstPContent(templateCells[1], delai);
    const c2 = rewriteFirstPContent(templateCells[2], penalites);
    return templateRow
      .replace(templateCells[0], c0)
      .replace(templateCells[1], c1)
      .replace(templateCells[2], c2);
  });

  // Keep the header row, drop ALL placeholder empty rows, insert user rows.
  const afterHeaderIdx = tbl.xml.indexOf(rows[0]) + rows[0].length;
  const beforeTblEndIdx = tbl.xml.lastIndexOf('</w:tbl>');
  const newTblXml =
    tbl.xml.slice(0, afterHeaderIdx) +
    newRows.join('') +
    tbl.xml.slice(beforeTblEndIdx);

  const newXml = xml.slice(0, tbl.start) + newTblXml + xml.slice(tbl.end);
  return { xml: newXml, rowCount: newRows.length };
}

// ── CCAP: inject value into an empty paragraph after a heading sequence ─
// Used for fields whose template area has no bracketed placeholder, just an
// empty paragraph after the heading + ref. e.g. paragraph trio:
//   "Droit" / "1.4" / ""  → fill the empty paragraph with `value`.
// Returns { xml, replaced }.
function fillEmptyParaAfterHeading(xml, headingExact, refExact, value) {
  if (!value) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const headingNorm = normApos(headingExact).trim().toLowerCase();
  const refNorm = normApos(refExact).trim().toLowerCase();
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]).toLowerCase() !== headingNorm) continue;
    // Look for the ref paragraph nearby (within the next 4 paragraphs)
    let foundRefAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 10); j += 2) {
      const tj = paraText(parts[j]);
      if (tj.length === 0) continue;
      if (tj.toLowerCase() === refNorm) { foundRefAt = j; break; }
      // First non-empty para that isn't the expected ref → wrong heading occurrence
      break;
    }
    if (foundRefAt === -1) continue;
    // Find the next empty paragraph after the ref
    for (let k = foundRefAt + 2; k < Math.min(parts.length, foundRefAt + 8); k += 2) {
      const tk = paraText(parts[k]);
      if (tk.length === 0) {
        const para = parts[k];
        const endIdx = para.lastIndexOf('</w:p>');
        if (endIdx === -1) return { xml, replaced: false };
        const newPara = para.slice(0, endIdx) + makeHighlightedRun('', value) + para.slice(endIdx);
        parts[k] = newPara;
        return { xml: parts.join(''), replaced: true };
      }
      // Non-empty paragraph encountered before any empty one → abort safely.
      break;
    }
    return { xml, replaced: false };
  }
  return { xml, replaced: false };
}

// CCAP-008 — Spécifications ESSS applicables. Toggle the two Wingdings
// checkbox glyphs on the "Oui ☑   /   Non ☐" centered paragraph at CCAP
// 1.1.6.11. Default in the template = Oui checked, Non empty. We swap the
// two `w:char` codes (F0FE = ☑ checked, F06F = ☐ empty) so the chosen
// option is the only one ticked.
//
// The anchor "Les Spécifications ESSS sont applicables :" appears 3× in the
// template (two guide blocks + the real CCAP slot). We target the LAST
// occurrence to land on the actual CCAP §1.1.6.11.
function setCcapEsssCheckboxes(xml, choice) {
  if (choice !== 'Oui' && choice !== 'Non') return { xml, applied: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  const anchorNorm = normApos("Les Spécifications ESSS sont applicables :");
  // Find the last anchor paragraph
  let lastAnchor = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]).includes(anchorNorm)) lastAnchor = i;
  }
  if (lastAnchor === -1) return { xml, applied: false };
  // Walk forward up to 4 paragraphs looking for one with both syms.
  for (let j = lastAnchor + 2; j < Math.min(parts.length, lastAnchor + 10); j += 2) {
    const p = parts[j];
    if (!/<w:sym\s+w:font="Wingdings"\s+w:char="F0FE"/i.test(p)) continue;
    if (!/<w:sym\s+w:font="Wingdings"\s+w:char="F06F"/i.test(p)) continue;
    // The template ships with Oui=F0FE and Non=F06F (in that order). To pick
    // "Non" we swap the two characters; "Oui" leaves them as-is.
    let updated = p;
    if (choice === 'Non') {
      // Use a sentinel so the two replacements don't chase each other.
      updated = updated
        .replace(/<w:sym\s+w:font="Wingdings"\s+w:char="F0FE"\s*\/>/i,
                 '<w:sym w:font="Wingdings" w:char="__SWAP__"/>')
        .replace(/<w:sym\s+w:font="Wingdings"\s+w:char="F06F"\s*\/>/i,
                 '<w:sym w:font="Wingdings" w:char="F0FE"/>')
        .replace(/<w:sym\s+w:font="Wingdings"\s+w:char="__SWAP__"\s*\/>/i,
                 '<w:sym w:font="Wingdings" w:char="F06F"/>');
    }
    parts[j] = updated;
    return { xml: parts.join(''), applied: true };
  }
  return { xml, applied: false };
}

// CCAP-009 — Conditions Climatiques Exceptionnellement Défavorables. The
// template carries a 4-bullet draft of yellow placeholders ("La pluie : […]",
// "La vitesse du vent : […]", "La température : […]", "Etc. : […]"). When the
// user fills the textarea, we replace those 4 paragraphs with N green-
// highlighted paragraphs (one per non-empty line of the user's text), each
// keeping the original paragraph's pPr so the indentation/style is preserved.
//
// Anchor: paragraph whose text starts with «"Conditions Climatiques
// Exceptionnellement Défavorables" signifie». The 4 bullets are the next
// non-empty paragraphs (we cap at 4 to avoid eating downstream content).
function fillCcapConditionsClimatiques(xml, value) {
  const v = String(value ?? '').trim();
  if (!v) return { xml, applied: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  const anchorRe = /^"?Conditions Climatiques Exceptionnellement D[ée]favorables"?\s+signifie\s*:/i;
  for (let i = 1; i < parts.length; i += 2) {
    if (!anchorRe.test(paraText(parts[i]))) continue;
    // Collect up to 4 following yellow-highlighted bullet paragraphs.
    const bulletIdx = [];
    for (let j = i + 2; j < parts.length && bulletIdx.length < 4; j += 2) {
      const t = paraText(parts[j]);
      if (!t) continue;
      if (!/<w:highlight\s+w:val="yellow"/i.test(parts[j])) break;
      bulletIdx.push(j);
    }
    if (bulletIdx.length === 0) return { xml, applied: false };
    const lines = v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return { xml, applied: false };
    // Use the first bullet's pPr as the template for all output paragraphs.
    const tpl = parts[bulletIdx[0]];
    const pPrMatch = tpl.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    const buildPara = (text) =>
      `<w:p>${pPr}${makeHighlightedRun('', text)}</w:p>`;
    const newBullets = lines.map(buildPara).join('');
    // Replace the first matched bullet paragraph with all new paragraphs,
    // and blank out the remaining matched bullets (keep their <w:p></w:p>
    // shells so paragraph IDs / numbering stay coherent — actually simpler:
    // just remove them).
    parts[bulletIdx[0]] = newBullets;
    for (let k = 1; k < bulletIdx.length; k++) parts[bulletIdx[k]] = '';
    return { xml: parts.join(''), applied: true, lineCount: lines.length };
  }
  return { xml, applied: false };
}

// CCAP — Variant of fillEmptyParaAfterHeading that accepts an array of
// values and emits them as a single paragraph with <w:br/> separators.
// Used for the MOA/MOE blocks at top of CCAP, where the cell contains one
// empty paragraph that must hold "Nom\nAdresse" together. Empty values are
// skipped to avoid stray blank lines when only one of the two is filled.
function fillEmptyParaAfterHeadingLines(xml, headingExact, refExact, lines) {
  const cleanLines = (Array.isArray(lines) ? lines : [lines])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean);
  if (cleanLines.length === 0) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const headingNorm = normApos(headingExact).trim().toLowerCase();
  const refNorm = normApos(refExact).trim().toLowerCase();
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]).toLowerCase() !== headingNorm) continue;
    let foundRefAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 10); j += 2) {
      const tj = paraText(parts[j]);
      if (tj.length === 0) continue;
      if (tj.toLowerCase() === refNorm) { foundRefAt = j; break; }
      break;
    }
    if (foundRefAt === -1) continue;
    for (let k = foundRefAt + 2; k < Math.min(parts.length, foundRefAt + 8); k += 2) {
      const tk = paraText(parts[k]);
      if (tk.length === 0) {
        const para = parts[k];
        const endIdx = para.lastIndexOf('</w:p>');
        if (endIdx === -1) return { xml, replaced: false };
        // Build runs: line0, then (br + line) for each subsequent line.
        let runs = '';
        cleanLines.forEach((line, idx) => {
          if (idx > 0) runs += '<w:r><w:br/></w:r>';
          runs += makeHighlightedRun('', line);
        });
        const newPara = para.slice(0, endIdx) + runs + para.slice(endIdx);
        parts[k] = newPara;
        return { xml: parts.join(''), replaced: true };
      }
      break;
    }
    return { xml, replaced: false };
  }
  return { xml, replaced: false };
}

// CCAP §3.1 / §4.1 — multi_check_extensible export.
// The template ships with 4 (MOE) or 3 (Entrepreneur) bullet paragraphs whose
// text matches a known anchor regex per default option. For each item:
//   • checked default → leave the paragraph untouched
//   • unchecked default → repaint every run red (marker for MOA suppression)
//   • checked custom → append a new green-highlighted bullet after the last
//     default bullet, copying the pPr of the last default bullet so list/indent
//     formatting is preserved
//   • unchecked custom → ignored (never reached the document)
// Returns { xml, painted, appended } counts.
function applyMultiCheckExtensible(xml, items, defaultMatchers) {
  if (!Array.isArray(items) || items.length === 0) return { xml, painted: 0, appended: 0 };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  // Locate each default option's paragraph by anchor regex
  const idToParaIdx = new Map();
  for (const m of defaultMatchers) {
    for (let i = 1; i < parts.length; i += 2) {
      if (idToParaIdx.has(m.id)) break;
      const t = paraText(parts[i]);
      if (m.anchor.test(t)) {
        idToParaIdx.set(m.id, i);
        break;
      }
    }
  }
  if (idToParaIdx.size === 0) return { xml, painted: 0, appended: 0 };

  // Paint unchecked defaults red
  let painted = 0;
  for (const it of items) {
    if (it.custom) continue;
    if (it.checked) continue;
    const idx = idToParaIdx.get(it.id);
    if (idx === undefined) continue;
    const para = parts[idx];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let cursor = 0;
    for (const r of runs) {
      out += para.slice(cursor, r.start);
      out += r.text ? makeRedRun(r.rPr, r.text) : '';
      cursor = r.end;
    }
    out += para.slice(cursor);
    parts[idx] = out;
    painted++;
  }

  // Append checked customs after the last anchored bullet, using its pPr
  const anchorIndices = Array.from(idToParaIdx.values()).sort((a, b) => a - b);
  const lastAnchor = anchorIndices[anchorIndices.length - 1];
  const tpl = parts[lastAnchor];
  const pPrMatch = tpl.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const customs = items.filter(it => it.custom && it.checked && (it.label || '').trim());
  let appendedXml = '';
  for (const c of customs) {
    appendedXml += `<w:p>${pPr}${makeHighlightedRun('', c.label.trim())}</w:p>`;
  }
  if (appendedXml) {
    parts[lastAnchor] = tpl + appendedXml;
  }

  return { xml: parts.join(''), painted, appended: customs.length };
}

// CCAP — Generic helper to replace a specific yellow-highlighted paragraph
// matched by regex, with a green-highlighted single-line value. Wraps
// replaceYellowGuideParagraph so the caller doesn't have to preserve the
// regex import. Returns the new xml and a boolean.
function replaceYellowParaWithValue(xml, matchRe, value) {
  const v = String(value ?? '').trim();
  if (!v) return { xml, replaced: false };
  return replaceYellowGuideParagraph(xml, matchRe, v);
}

// CCAP §14.1 — Type de Marché. Three exclusive options in the template:
//   p[5600] [Y] "[Choisir l'option correspondant au Marché parmi les suivantes :]"
//   p[5601]     "Le marché est à Prix Global et Forfaitaire"
//   p[5602] [Y] "[ou]"
//   p[5603]     "Le Marché est à Prix Unitaires"
//   p[5604] [Y] "[ou]"
//   p[5605]     "Le Marché est une combinaison d'une Composante à Prix Global et Forfaitaire et d'une Composante à Prix Unitaires :"
//   p[5606] [Y] "La Composante à Prix Global et Forfaitaire consiste en : [insérer une courte description...]"
//   p[5607] [Y] "La Composante à Prix Unitaires consiste en : [insérer une courte description...]"
//
// Per the user's screenshots: every line that's NOT the chosen option (plus
// the [Choisir...] header and the [ou] separators) is painted red as a
// suppression marker for the MOA. For the "Combinaison" choice, the two
// composante description placeholders also need to be filled with user text.
//
// We anchor on the heading "Montant du Marché" + ref "14.1" then walk the
// next ~10 paragraphs to label each by content match. This is robust to
// paragraph index drift caused by upstream replacements.
function applyCcap14_1(xml, choice, descForf, descUnit) {
  if (!choice) return { xml, painted: 0, filled: 0 };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();

  // Find anchor: heading "Montant du Marché" followed by ref "14.1"
  let refAt = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]).toLowerCase() !== 'montant du marché') continue;
    for (let j = i + 2; j < Math.min(parts.length, i + 6); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj === '14.1') { refAt = j; break; }
      break;
    }
    if (refAt !== -1) break;
  }
  if (refAt === -1) return { xml, painted: 0, filled: 0 };

  // Walk the next ~12 paragraphs and label them
  const labels = {};
  for (let k = refAt + 2; k < Math.min(parts.length, refAt + 26); k += 2) {
    const t = paraText(parts[k]);
    if (!t) continue;
    if (/^\[Choisir l[''']option correspondant/i.test(t)) labels.header = k;
    else if (/^Le march[ée] est [àa] Prix Global et Forfaitaire$/i.test(t)) labels.optForf = k;
    else if (/^Le March[ée] est [àa] Prix Unitaires$/i.test(t)) labels.optUnit = k;
    else if (/^Le March[ée] est une combinaison/i.test(t)) labels.optComb = k;
    else if (/^\[ou\]$/i.test(t)) {
      if (labels.ou1 === undefined) labels.ou1 = k;
      else if (labels.ou2 === undefined) labels.ou2 = k;
    }
    else if (/^La Composante [àa] Prix Global et Forfaitaire consiste/i.test(t)) labels.descForf = k;
    else if (/^La Composante [àa] Prix Unitaires consiste/i.test(t)) labels.descUnit = k;
    // Stop if we've gone past — next sub-clause ref like "14.1(b)" etc.
    if (/^14\.1\(/i.test(t)) break;
  }

  // Decide which paragraph indices to paint red based on choice.
  let toRed = [];
  if (choice === 'Prix Global et Forfaitaire') {
    toRed = [labels.header, labels.ou1, labels.optUnit, labels.ou2, labels.optComb, labels.descForf, labels.descUnit];
  } else if (choice === 'Prix Unitaires') {
    toRed = [labels.header, labels.optForf, labels.ou1, labels.ou2, labels.optComb, labels.descForf, labels.descUnit];
  } else if (choice === 'Combinaison Forfaitaire + Unitaires') {
    toRed = [labels.header, labels.optForf, labels.ou1, labels.optUnit, labels.ou2];
  } else {
    return { xml, painted: 0, filled: 0 };
  }

  let painted = 0;
  for (const idx of toRed) {
    if (idx === undefined) continue;
    const para = parts[idx];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let cursor = 0;
    for (const r of runs) {
      out += para.slice(cursor, r.start);
      out += r.text ? makeRedRun(r.rPr, r.text) : '';
      cursor = r.end;
    }
    out += para.slice(cursor);
    parts[idx] = out;
    painted++;
  }

  // For Combinaison: replace the two composante yellow descriptors with user text.
  let filled = 0;
  const rewriteDesc = (idx, prefix, userText) => {
    if (idx === undefined) return;
    const v = String(userText ?? '').trim();
    if (!v) return;
    const tpl = parts[idx];
    const openMatch = tpl.match(/^<w:p\b[^>]*>/);
    const openTag = openMatch ? openMatch[0] : '<w:p>';
    const pPrMatch = tpl.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    parts[idx] = `${openTag}${pPr}${makeHighlightedRun('', `${prefix} : ${v}`)}</w:p>`;
    filled++;
  };
  if (choice === 'Combinaison Forfaitaire + Unitaires') {
    rewriteDesc(labels.descForf, 'La Composante à Prix Global et Forfaitaire consiste en', descForf);
    rewriteDesc(labels.descUnit, 'La Composante à Prix Unitaires consiste en', descUnit);
  }

  return { xml: parts.join(''), painted, filled };
}

// CCAP §13.5(b)(ii) — Pourcentage pour l'ajustement des Sommes provisionnelles.
// The template ships TWO yellow paragraphs in the cell:
//   p[5593]: "[S'il y a des Sommes provisionnelles, insérer un pourcentage…]"
//   p[5594]: "_______ [5] %"
// We anchor on the heading "Pourcentage pour l'ajustement des Sommes
// provisionnelles" + ref "13.5(b)(ii)", then collapse both yellow paragraphs
// into a single green-highlighted paragraph carrying either the user value
// (`X %`) or the literal "Non applicable" when the user clicked the N/A
// toggle. Returns { xml, replaced }.
function fillCcapPourcentageProvisions(xml, value, isNA) {
  const v = String(value ?? '').trim();
  if (!isNA && !v) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    const t = paraText(parts[i]).toLowerCase();
    if (!t.includes("pourcentage pour l'ajustement des sommes provisionnelles")) continue;
    let refAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 8); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj.toLowerCase().startsWith("13.5(b)(ii)")) { refAt = j; break; }
      break;
    }
    if (refAt === -1) continue;
    const targetParas = [];
    for (let k = refAt + 2; k < Math.min(parts.length, refAt + 8); k += 2) {
      const tk = paraText(parts[k]);
      if (!tk) continue;
      if (!/<w:highlight\s+w:val="yellow"/i.test(parts[k])) break;
      targetParas.push(k);
      if (targetParas.length >= 2) break;
    }
    if (targetParas.length === 0) return { xml, replaced: false };
    const replaceText = isNA ? "Non applicable" : `${v} %`;
    const tpl = parts[targetParas[0]];
    const openMatch = tpl.match(/^<w:p\b[^>]*>/);
    const openTag = openMatch ? openMatch[0] : '<w:p>';
    const pPrMatch = tpl.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    parts[targetParas[0]] = `${openTag}${pPr}${makeHighlightedRun('', replaceText)}</w:p>`;
    for (let k = 1; k < targetParas.length; k++) parts[targetParas[k]] = '';
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// ── CCAP SC 14.x helpers ──────────────────────────────────────────────
//
// All of these helpers anchor on a heading + ref pair (or a ref alone) then
// rewrite the next yellow paragraph(s) cleanly. We never replace just a
// bracketed substring on these paragraphs because the template prepends
// "______ %" or appends a long "[Insérer …]" prompt that must disappear
// along with the placeholder.

// Rewrite a paragraph's body (preserving <w:p…> open tag and <w:pPr>) to a
// fresh sequence of runs (green or red) carrying the supplied lines, joined
// by <w:br/>. Used by every CCAP 14.x rewrite.
function rewriteParaWithHighlightedLines(paraXml, lines, color = 'green') {
  const openMatch = paraXml.match(/^<w:p\b[^>]*>/);
  const openTag = openMatch ? openMatch[0] : '<w:p>';
  const pPrMatch = paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const make = (color === 'red') ? makeRedRun : makeHighlightedRun;
  let runs = '';
  lines.forEach((line, idx) => {
    if (idx > 0) runs += '<w:r><w:br/></w:r>';
    runs += make('', line);
  });
  return `${openTag}${pPr}${runs}</w:p>`;
}

// Find the first yellow-highlighted paragraph after `startIdx` (exclusive),
// looking only within the next `window` paragraph slots. Returns its index in
// `parts` or -1.
function findNextYellowParaIdx(parts, startIdx, window = 8) {
  for (let k = startIdx + 2; k < Math.min(parts.length, startIdx + window * 2 + 2); k += 2) {
    if (/<w:highlight\s+w:val="yellow"/i.test(parts[k])) return k;
  }
  return -1;
}

// CCAP §14.1(b) — Exemptions de droits, taxes et impôts.
// Anchor on para text "14.1(b)", then rewrite the next yellow paragraph
// "[Si applicable, insérer les exemptions…]" with the user's textarea
// content (one line per `\n`). Returns { xml, replaced }.
function fillCcap14_1_b_Exemptions(xml, value) {
  const v = String(value ?? '').trim();
  if (!v) return { xml, replaced: false };
  const lines = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]) !== '14.1(b)') continue;
    const yIdx = findNextYellowParaIdx(parts, i, 4);
    if (yIdx === -1) return { xml, replaced: false };
    parts[yIdx] = rewriteParaWithHighlightedLines(parts[yIdx], lines, 'green');
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// CCAP §14.1(e) — Toggle Oui/Non. Anchor on "14.1(e)", then rewrite the
// next yellow paragraph "Oui / Non [Supprimer la mention inutile]" so that
// the chosen value sits in green and the unselected value plus the bracket
// land in red (suppression cue for the MOA). Returns { xml, replaced }.
function applyCcap14_1_e(xml, choice) {
  const c = String(choice ?? '').trim();
  if (c !== 'Oui' && c !== 'Non') return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]) !== '14.1(e)') continue;
    const yIdx = findNextYellowParaIdx(parts, i, 4);
    if (yIdx === -1) return { xml, replaced: false };
    const tpl = parts[yIdx];
    const openMatch = tpl.match(/^<w:p\b[^>]*>/);
    const openTag = openMatch ? openMatch[0] : '<w:p>';
    const pPrMatch = tpl.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';
    const kept = c;                          // green
    const dropped = (c === 'Oui') ? 'Non' : 'Oui'; // red
    const body =
      makeHighlightedRun('', kept) +
      makeRun('', ' / ') +
      makeRedRun('', dropped) +
      makeRun('', ' ') +
      makeRedRun('', '[Supprimer la mention inutile]');
    parts[yIdx] = `${openTag}${pPr}${body}</w:p>`;
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// CCAP §14.2 — Avance de Démarrage. Anchor on heading "Paiement de l'Avance
// de Démarrage" + ref "14.2", then rewrite the next yellow paragraph
// (which starts with "______ %" and ends with a long "[Insérer un nombre
// entre 10 et 20 …]" prompt) to a single clean line. Returns { xml, replaced }.
function fillCcap14_2_AvanceDemarrage(xml, value) {
  const v = String(value ?? '').trim();
  if (!v) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    const t = paraText(parts[i]);
    if (t.toLowerCase() !== "paiement de l'avance de démarrage") continue;
    let refAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 6); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj === '14.2') { refAt = j; break; }
      break;
    }
    if (refAt === -1) continue;
    const yIdx = findNextYellowParaIdx(parts, refAt, 4);
    if (yIdx === -1) return { xml, replaced: false };
    const text = `${v} % du Montant Accepté du Marché payable dans les devises et proportions, dans lesquelles le Montant Accepté du Marché est payable.`;
    parts[yIdx] = rewriteParaWithHighlightedLines(parts[yIdx], [text], 'green');
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// CCAP §14.3 — Plafond de la Retenue de Garantie. Anchor on heading
// "Plafond de la Retenue de Garantie" + ref "14.3" (the second "14.3" in
// the table — the first ref labels the Pourcentage de la Retenue), then
// rewrite the next yellow paragraph (which starts with "______ %" and ends
// with "[insérer un pourcentage…]") to "<value> % du Montant Accepté du
// Marché.". Returns { xml, replaced }.
function fillCcap14_3_PlafondRetenue(xml, value) {
  const v = String(value ?? '').trim();
  if (!v) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();
  for (let i = 1; i < parts.length; i += 2) {
    const t = paraText(parts[i]);
    if (t.toLowerCase() !== 'plafond de la retenue de garantie') continue;
    let refAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 6); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj === '14.3') { refAt = j; break; }
      break;
    }
    if (refAt === -1) continue;
    const yIdx = findNextYellowParaIdx(parts, refAt, 4);
    if (yIdx === -1) return { xml, replaced: false };
    parts[yIdx] = rewriteParaWithHighlightedLines(
      parts[yIdx],
      [`${v} % du Montant Accepté du Marché.`],
      'green'
    );
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// CCAP §14.5 — Equipements et Matériaux destinés aux Ouvrages.
// Anchor on heading "Equipements et Matériaux" (the cell that immediately
// precedes the yellow guide "[Si la SousClause 14.5 s'applique :]"). Then:
//   • applique === 'Non' → red-paint the heading, the guide, both
//     14.5(b)(i)/14.5(c)(i) sub-headings, and both yellow content cells.
//   • applique === 'Oui' → rewrite the two yellow content cells (FOB list
//     and on-site list) with the user's textarea contents, line-broken.
// Returns { xml, painted, filled }.
function applyCcap14_5(xml, applique, fobText, onsiteText) {
  const a = String(applique ?? '').trim();
  if (a !== 'Oui' && a !== 'Non') return { xml, painted: 0, filled: 0 };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim();

  // Locate anchor: heading "Equipements et Matériaux" followed (within ~4
  // paragraphs) by yellow "[Si la SousClause 14.5 s'applique :]".
  let headIdx = -1, guideIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    if (paraText(parts[i]).toLowerCase() !== 'equipements et matériaux') continue;
    for (let j = i + 2; j < Math.min(parts.length, i + 10); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (/^\[Si la Sous[- ]?Clause\s*14\.5\s*s/i.test(tj)) {
        headIdx = i;
        guideIdx = j;
        break;
      }
      // We only accept the heading whose next non-empty paragraph IS the
      // guide; reject other "Equipements…" occurrences (e.g. body-text
      // mentions in clauses 14.x).
      break;
    }
    if (headIdx !== -1) break;
  }
  if (headIdx === -1 || guideIdx === -1) return { xml, painted: 0, filled: 0 };

  // From the guide forward, find sub-headings 14.5(b)(i) / 14.5(c)(i) and
  // their immediately following yellow content cell.
  let fobRefIdx = -1, fobYIdx = -1, onsiteRefIdx = -1, onsiteYIdx = -1;
  for (let k = guideIdx + 2; k < Math.min(parts.length, guideIdx + 24); k += 2) {
    const tk = paraText(parts[k]);
    if (!tk) continue;
    if (tk.toLowerCase().startsWith('14.5(b)(i)') && fobRefIdx === -1) {
      fobRefIdx = k;
      fobYIdx = findNextYellowParaIdx(parts, k, 4);
    } else if (tk.toLowerCase().startsWith('14.5(c)(i)') && onsiteRefIdx === -1) {
      onsiteRefIdx = k;
      onsiteYIdx = findNextYellowParaIdx(parts, k, 4);
    }
    // Stop once we've passed both, or when we hit the next unrelated cell.
    if (fobRefIdx !== -1 && onsiteRefIdx !== -1) break;
    if (/^14\.6(\b|$)/i.test(tk)) break;
  }

  let painted = 0, filled = 0;

  if (a === 'Non') {
    // Paint red every paragraph in the §14.5 cluster: heading, guide,
    // both refs, both yellow cells.
    const toRed = [headIdx, guideIdx, fobRefIdx, fobYIdx, onsiteRefIdx, onsiteYIdx]
      .filter((idx) => idx !== undefined && idx !== -1);
    for (const idx of toRed) {
      const para = parts[idx];
      const runs = extractRunNodes(para);
      if (runs.length === 0) continue;
      let out = '';
      let cursor = 0;
      for (const r of runs) {
        out += para.slice(cursor, r.start);
        out += r.text ? makeRedRun(r.rPr, r.text) : '';
        cursor = r.end;
      }
      out += para.slice(cursor);
      parts[idx] = out;
      painted++;
    }
    return { xml: parts.join(''), painted, filled };
  }

  // applique === 'Oui' → fill both yellow cells if the user provided text.
  const writeList = (idx, text) => {
    if (idx === undefined || idx === -1) return;
    const v = String(text ?? '').trim();
    if (!v) return;
    const lines = v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;
    parts[idx] = rewriteParaWithHighlightedLines(parts[idx], lines, 'green');
    filled++;
  };
  writeList(fobYIdx, fobText);
  writeList(onsiteYIdx, onsiteText);
  return { xml: parts.join(''), painted, filled };
}

// CCAP §18.1 — Délais de présentation des assurances.
// Anchor on heading "Délais de présentation des assurances" + ref "18.1".
// The cell layout below is:
//   • [Y] yellow guide "[Insérer les délais…]"
//   • "Attestation d'assurance"
//   • "__________ jours"           ← rewritten with valAttestation
//   • "Polices applicables"        ← typo: rewritten "Polices d'assurance applicables"
//   • "__________ jours"           ← rewritten with valPolice
// The yellow guide is also replaced (with green) when at least one value is
// provided, summarising what was filled. Always returns the typo fix.
// Returns { xml, replaced, fixedLabel }.
function fillCcap18_1_Delais(xml, valAttestation, valPolice) {
  const vA = String(valAttestation ?? '').trim();
  const vP = String(valPolice ?? '').trim();
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  // Normalize to NFC so accented letters (`é` etc.) match the source-code
  // constants regardless of how Word stored them.
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim().normalize('NFC');

  let replaced = 0;
  let fixedLabel = false;

  for (let i = 1; i < parts.length; i += 2) {
    const t = paraText(parts[i]);
    // Use regex (with optional accent decomposition) so we don't trip over
    // NFC vs NFD normalization of "é" between source code and Word XML.
    if (!/^d[ée]lais de pr[ée]sentation des assurances\s*:?\s*$/i.test(t)) continue;

    // Find ref "18.1" within next 4 paras
    let refAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 8); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj === '18.1') { refAt = j; break; }
      break;
    }
    if (refAt === -1) continue;

    // Walk the next ~12 paras and label them
    const labels = {};
    for (let k = refAt + 2; k < Math.min(parts.length, refAt + 26); k += 2) {
      const tk = paraText(parts[k]);
      if (!tk) continue;
      if (/<w:highlight\s+w:val="yellow"/i.test(parts[k]) && labels.guide === undefined) {
        labels.guide = k;
        continue;
      }
      if (/^Attestation\s+d'assurance/i.test(tk) && labels.labelA === undefined) {
        labels.labelA = k;
        continue;
      }
      if (/^Polices\b.*applicables?/i.test(tk) && labels.labelP === undefined) {
        labels.labelP = k;
        continue;
      }
      // Yellow heading "Montant minimum…" or any "18.x" ref means we've left the cell.
      if (/^18\.\d/.test(tk) && tk !== '18.1') break;
      if (/^Montant minimum de l'assurance/i.test(tk)) break;
    }

    // Helper: from a label paragraph, find the next non-empty para that
    // contains "_______ jours" (or just underscores) within ~6 paras.
    const findUnderscoreJoursAfter = (startIdx) => {
      for (let k = startIdx + 2; k < Math.min(parts.length, startIdx + 14); k += 2) {
        const tk = paraText(parts[k]);
        if (!tk) continue;
        if (/^_+\s*jours\.?$/i.test(tk) || /^_+$/i.test(tk)) return k;
        // Stop at the next label or anything non-trivial.
        return -1;
      }
      return -1;
    };

    // Always fix the "Polices applicables" typo (regardless of values).
    if (labels.labelP !== undefined) {
      const para = parts[labels.labelP];
      const runs = extractRunNodes(para);
      // Concatenated text "Polices applicables" → rewrite the whole paragraph
      // body to "Polices d'assurance applicables", inheriting the rPr of the
      // first run.
      if (runs.length > 0) {
        const newText = "Polices d'assurance applicables";
        const tCombined = normApos(runs.map(r => r.text).join('')).trim();
        if (tCombined.toLowerCase() === 'polices applicables') {
          const openMatch = para.match(/^<w:p\b[^>]*>/);
          const openTag = openMatch ? openMatch[0] : '<w:p>';
          const pPrMatch = para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
          const pPr = pPrMatch ? pPrMatch[0] : '';
          parts[labels.labelP] = `${openTag}${pPr}${makeRun(runs[0].rPr || '', newText)}</w:p>`;
          fixedLabel = true;
        }
      }
    }

    // Fill "______ jours" under "Attestation d'assurance"
    if (vA && labels.labelA !== undefined) {
      const tgt = findUnderscoreJoursAfter(labels.labelA);
      if (tgt !== -1) {
        parts[tgt] = rewriteParaWithHighlightedLines(parts[tgt], [`${vA} jours.`], 'green');
        replaced++;
      }
    }

    // Fill "______ jours" under "Polices d'assurance applicables"
    if (vP && labels.labelP !== undefined) {
      const tgt = findUnderscoreJoursAfter(labels.labelP);
      if (tgt !== -1) {
        parts[tgt] = rewriteParaWithHighlightedLines(parts[tgt], [`${vP} jours.`], 'green');
        replaced++;
      }
    }

    // If at least one value was provided, collapse the long yellow guide
    // into a short green confirmation pointing at the cells below.
    if ((vA || vP) && labels.guide !== undefined) {
      parts[labels.guide] = rewriteParaWithHighlightedLines(
        parts[labels.guide],
        ["Délais de présentation détaillés ci-dessous (Attestation d'assurance / Polices d'assurance applicables)."],
        'green'
      );
    }

    return { xml: parts.join(''), replaced, fixedLabel };
  }
  return { xml, replaced, fixedLabel };
}

// CCAP §20.2 — Composition du CRD. Anchor on heading "Le CRD doit
// comprendre" + ref "20.2", then walk the next ~6 paras and label them:
//   • [Soit :]                ← yellow guide
//   • Un membre unique
//   • [soit :]                ← yellow guide
//   • Trois membres
// Paint red every paragraph that does NOT match the user's choice. The
// retained option's "[Soit :]" / "[soit :]" guide is also painted red (it
// becomes pure boilerplate the MOA should suppress). Returns
// { xml, painted }.
function applyCcap20_2_Composition(xml, choice) {
  const c = String(choice ?? '').trim().toLowerCase();
  if (c !== 'un membre unique' && c !== 'trois membres') return { xml, painted: 0 };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim().normalize('NFC');

  // Find anchor: heading "Le CRD doit comprendre" + ref "20.2"
  let refAt = -1;
  for (let i = 1; i < parts.length; i += 2) {
    const t = paraText(parts[i]);
    if (!/^Le CRD doit comprendre$/i.test(t)) continue;
    for (let j = i + 2; j < Math.min(parts.length, i + 6); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj === '20.2') { refAt = j; break; }
      break;
    }
    if (refAt !== -1) break;
  }
  if (refAt === -1) return { xml, painted: 0 };

  // Walk the next ~10 paras to label the four branches.
  const labels = {};
  for (let k = refAt + 2; k < Math.min(parts.length, refAt + 22); k += 2) {
    const t = paraText(parts[k]);
    if (!t) continue;
    if (/^\[Soit\s*:?\s*\]$/i.test(t) && labels.guide1 === undefined) { labels.guide1 = k; continue; }
    if (/^Un membre unique$/i.test(t) && labels.unique === undefined) { labels.unique = k; continue; }
    if (/^\[soit\s*:?\s*\]$/i.test(t) && labels.guide2 === undefined) { labels.guide2 = k; continue; }
    if (/^Trois membres$/i.test(t) && labels.trois === undefined) { labels.trois = k; continue; }
    // Stop once we've hit the next ref or "Liste de membres potentiels".
    if (/^Liste de membres potentiels/i.test(t)) break;
    if (/^20\.\d/.test(t) && t !== '20.2') break;
  }

  // Decide which paragraphs to paint red.
  let toRed = [];
  if (c === 'un membre unique') {
    // Keep "Un membre unique" green/intact, red the rest (including both
    // "[Soit :]" / "[soit :]" guides since the choice is now explicit).
    toRed = [labels.guide1, labels.guide2, labels.trois];
  } else {
    // c === 'trois membres'
    toRed = [labels.guide1, labels.unique, labels.guide2];
  }

  let painted = 0;
  for (const idx of toRed) {
    if (idx === undefined) continue;
    const para = parts[idx];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let out = '';
    let cursor = 0;
    for (const r of runs) {
      out += para.slice(cursor, r.start);
      out += r.text ? makeRedRun(r.rPr, r.text) : '';
      cursor = r.end;
    }
    out += para.slice(cursor);
    parts[idx] = out;
    painted++;
  }

  return { xml: parts.join(''), painted };
}

// CCAP §18.3 — Montant minimum de l'assurance contre les atteintes aux biens
// et aux personnes. Anchor on the heading + ref "18.3", then rewrite the
// next yellow paragraph (which is "__________ [Insérer le montant]") with a
// single green run carrying the user value. Returns { xml, replaced }.
function fillCcap18_3_Montant(xml, value) {
  const v = String(value ?? '').trim();
  if (!v) return { xml, replaced: false };
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const paraText = (p) => normApos(extractRunNodes(p).map(r => r.text).join('')).trim().normalize('NFC');
  for (let i = 1; i < parts.length; i += 2) {
    const t = paraText(parts[i]);
    if (!/^Montant minimum de l'assurance contre les atteintes/i.test(t)) continue;
    let refAt = -1;
    for (let j = i + 2; j < Math.min(parts.length, i + 6); j += 2) {
      const tj = paraText(parts[j]);
      if (!tj) continue;
      if (tj === '18.3') { refAt = j; break; }
      break;
    }
    if (refAt === -1) continue;
    const yIdx = findNextYellowParaIdx(parts, refAt, 4);
    if (yIdx === -1) return { xml, replaced: false };
    parts[yIdx] = rewriteParaWithHighlightedLines(parts[yIdx], [v], 'green');
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// ── Inline text replacement spanning runs ──────────────────────────────
// Replaces one occurrence of `searchText` (literal, apostrophes normalized)
// with `replaceText` inside the first paragraph that contains it, even if
// the search text is split across runs. The replacement becomes a single
// run inheriting the rPr of the first impacted run, which drops any yellow
// placeholder highlighting on the way out. Returns the new xml + a boolean.
function replaceInlinePhrase(xml, searchText, replaceText) {
  const normSearch = normApos(searchText);
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;
    let combined = '';
    const ranges = runs.map(r => {
      const start = combined.length;
      combined += normApos(r.text);
      return { ...r, cStart: start, cEnd: combined.length };
    });
    const idx = combined.indexOf(normSearch);
    if (idx === -1) continue;
    const end = idx + normSearch.length;
    const first = ranges.find(r => r.cEnd > idx);
    const last = [...ranges].reverse().find(r => r.cStart < end);
    if (!first || !last) continue;
    // Build replacement: text before the match (in the first run) +
    // replacement run (inherit rPr, no yellow) + text after the match (in
    // the last run). Runs entirely covered by the match are dropped.
    const rPrClean = (first.rPr || '').replace(/<w:highlight\b[^/]*\/>|<w:highlight\b[^>]*>[\s\S]*?<\/w:highlight>/gi, '');
    const beforeText = first.text.slice(0, idx - first.cStart);
    const afterText  = last.text.slice(end - last.cStart);
    const newRuns = [];
    if (beforeText) newRuns.push(makeRun(first.rPr, beforeText));
    newRuns.push(makeRun(rPrClean, replaceText));
    if (afterText) newRuns.push(makeRun(last.rPr, afterText));
    parts[i] = para.slice(0, first.start) + newRuns.join('') + para.slice(last.end);
    return { xml: parts.join(''), replaced: true };
  }
  return { xml, replaced: false };
}

// ── IS 4.5 pré-qualification — remove the "3.3" block entirely ────────
// When prequalification === "est", the detailed qualification criteria that
// only apply when there was no pre-qualification (3.3 Qualification si une
// Pré-qualification n'a pas été effectuée) must be dropped from the export
// altogether. In the reference template the block spans paragraphs 924–1259
// (≈293 kB of XML) and includes six nested tables up to section "6. Sûreté".
//
// Simple byte-slice would also drop TWO <w:sectPr> elements embedded in the
// block's empty trailing paragraphs:
//   - a PORTRAIT sectPr (rId37 header = "Section III – Critères…") ending
//     the portrait sub-section of Section III,
//   - a LANDSCAPE sectPr (rId38) ending the landscape sub-section.
// Losing the portrait sectPr would make the remaining Section III paras
// inherit Section IV's header/footer — they'd be stamped "Section IV" on
// the page instead of "Section III". So we preserve the LAST portrait
// sectPr-holder paragraph encountered in the block and re-insert it at the
// deletion point. The landscape sectPr is discarded along with the content
// it used to govern.
function removeNoPrequalQualificationBlock(xml, prequalification) {
  if (prequalification !== 'est') return { xml, removed: 0 };

  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  const positions = buildPartPositions(parts);

  // Find "3.3 Qualification si une Pré-qualification n'a pas été effectuée"
  let startIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    const t = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (NO_PREQUAL_HEADER_ANCHOR.test(t)) { startIdx = i; break; }
  }
  if (startIdx === -1) {
    console.warn("[exportDocx] IS 4.5 'est': heading 3.3 introuvable — suppression ignorée");
    return { xml, removed: 0 };
  }

  // Find the next TITLESECTION (= "Section IV Formulaires de Soumission")
  let endIdx = -1;
  for (let i = startIdx + 2; i < parts.length; i += 2) {
    if (/<w:pStyle\s+w:val="TITLESECTION"/.test(parts[i])) { endIdx = i; break; }
  }
  if (endIdx === -1) {
    console.warn("[exportDocx] IS 4.5 'est': TITLESECTION de Section IV introuvable — suppression ignorée");
    return { xml, removed: 0 };
  }

  // Scan paragraphs in [startIdx, endIdx): keep the LAST portrait sectPr
  // holder so Section III's header/footer keeps applying to the surviving
  // paragraphs before the deletion point.
  let keptSectPrPara = '';
  let removedParaCount = 0;
  for (let i = startIdx; i < endIdx; i += 2) {
    removedParaCount++;
    const para = parts[i];
    if (!/<w:sectPr\b/.test(para)) continue;
    if (/w:orient="landscape"/.test(para)) continue; // landscape sectPr is dropped
    keptSectPrPara = para; // keep overwriting — last portrait wins
  }
  if (keptSectPrPara) removedParaCount--; // the preserved para doesn't count as removed

  // Everything between the end of paras[startIdx-1] and paras[endIdx].start
  // (i.e., positions[startIdx]..positions[endIdx]) is the deletion range.
  const before = xml.slice(0, positions[startIdx]);
  const after = xml.slice(positions[endIdx]);
  const newXml = before + keptSectPrPara + after;

  return { xml: newXml, removed: removedParaCount, preservedSectPr: !!keptSectPrPara };
}

// ── AAO letter placeholders (Modèle d'Avis d'Appel d'Offres) ─────────────
// The "Modèle d'AAO" section contains composite placeholders that combine
// several fields (e.g., "nom MOA ; responsable, courriel"). We replace them
// within the AAO block only, deriving values from formData so the user does
// not have to repeat information already captured in other sections.
//
// Ambiguous placeholders like "[insérer la date]" and "[insérer l'heure]"
// appear multiple times across the document — scoping by section boundaries
// lets us safely fill the AAO occurrences with ouverture_* values without
// touching other locations.

function replaceInParagraph(paraXml, search, value) {
  const normSearch = normApos(search);
  const runs = extractRunNodes(paraXml);
  if (runs.length === 0) return paraXml;

  let combined = '';
  const ranges = runs.map(r => {
    const start = combined.length;
    combined += normApos(r.text);
    return { ...r, cStart: start, cEnd: combined.length };
  });

  const idx = combined.indexOf(normSearch);
  if (idx === -1) return paraXml;

  const phEnd = idx + normSearch.length;
  const firstRun = ranges.find(r => r.cEnd > idx);
  const rPr = firstRun ? firstRun.rPr : '';

  let out = '';
  let lastEnd = 0;
  let injected = false;
  for (const r of ranges) {
    out += paraXml.slice(lastEnd, r.start);
    lastEnd = r.end;
    if (r.cEnd <= idx || r.cStart >= phEnd) {
      out += r.xml;
      continue;
    }
    const localBefore = r.text.slice(0, Math.max(0, idx - r.cStart));
    const localAfter = r.cEnd > phEnd ? r.text.slice(phEnd - r.cStart) : '';
    out += makeRun(r.rPr, localBefore);
    if (!injected) {
      out += makeHighlightedRun(rPr, value);
      injected = true;
    }
    out += makeRun(r.rPr, localAfter);
  }
  out += paraXml.slice(lastEnd);
  return out;
}

function fillAaoLetterPlaceholders(xml, formData) {
  const parts = xml.split(/(<w:p[ >][\s\S]*?<\/w:p>)/g);
  let startIdx = -1, endIdx = -1;
  for (let i = 1; i < parts.length; i += 2) {
    const combined = normApos(extractRunNodes(parts[i]).map(r => r.text).join(''));
    if (startIdx === -1 && /Modèle d'Avis d'Appel d'Offres/i.test(combined)) {
      startIdx = i;
    } else if (
      startIdx !== -1 && i > startIdx + 10 &&
      /Notes relatives à la préparation|^Spécifications des Travaux\s*$/i.test(combined)
    ) {
      endIdx = i;
      break;
    }
  }
  if (startIdx === -1) return { xml, count: 0 };
  if (endIdx === -1) endIdx = parts.length;

  // Derive composite values from formData
  const moa = formData.nom_maitrise_ouvrage || '';
  const att = formData.contact_attention || '';
  const email = formData.contact_email || '';
  const adr = formData.contact_adresse || '';
  const tel = formData.contact_tel || '';

  const repls = {};

  if (moa || att || email) {
    const resp = [att, email].filter(Boolean).join(', ');
    repls["[insérer le nom du Maître d'Ouvrage ; insérer les nom et courriel du responsable]"] =
      [moa, resp].filter(Boolean).join(' ; ');
  }
  if (adr || tel) {
    repls["[insérer l'adresse et le numéro]"] = [adr, tel].filter(Boolean).join(', ');
  }
  repls["[insérer la langue]"] = "français";

  if (formData.garantie_soumission === 'est') {
    repls['[insérer "une garantie de l\'Offre" ou "une Déclaration de garantie de l\'Offre", selon le cas]'] =
      "une garantie de l'Offre";
  } else if (formData.declaration_garantie === 'est') {
    repls['[insérer "une garantie de l\'Offre" ou "une Déclaration de garantie de l\'Offre", selon le cas]'] =
      "une Déclaration de garantie de l'Offre";
  }

  if (formData.montant_garantie) {
    repls["[insérer le montant en monnaie nationale ou le montant équivalent dans une monnaie librement convertible]"] =
      formData.montant_garantie;
  }

  if (formData.date_limite) {
    const dateStr = fmtDate(formData.date_limite);
    const heure = formData.heure_limite ? ` à ${formData.heure_limite}` : '';
    repls["[insérer la date et l'heure]"] = dateStr + heure;
  }

  if (formData.ouverture_adresse) {
    repls["[indiquer l'adresse et l'emplacement exacts]"] = formData.ouverture_adresse;
  }
  if (formData.ouverture_date) {
    repls["[insérer la date]"] = fmtDate(formData.ouverture_date);
  }
  if (formData.ouverture_heure) {
    repls["[insérer l'heure]"] = formData.ouverture_heure;
  }

  // New fields (not yet in UI — fill if provided)
  if (formData.heures_bureau) {
    repls["[insérer les heures d'ouverture et de fermeture]"] = formData.heures_bureau;
  }
  if (formData.frais_dao_monnaie_nationale) {
    repls["[insérer le montant en monnaie nationale]"] = formData.frais_dao_monnaie_nationale;
  }
  if (formData.frais_dao_monnaie_convertible) {
    repls["[insérer le montant dans une monnaie convertible]"] = formData.frais_dao_monnaie_convertible;
  }
  if (formData.conditions_qualification) {
    repls["[insérer la liste des conditions d'ordre technique, financier, légal et autre(s)]"] =
      formData.conditions_qualification;
  }

  let count = 0;
  for (let j = startIdx; j < endIdx && j < parts.length; j += 2) {
    let para = parts[j];
    for (const [ph, value] of Object.entries(repls)) {
      if (!value) continue;
      const newPara = replaceInParagraph(para, ph, value);
      if (newPara !== para) { para = newPara; count++; }
    }
    parts[j] = para;
  }
  return { xml: parts.join(''), count };
}

// ── Table row filling (personnel / matériel) ─────────────────────────────
// Find the INNERMOST <w:tbl> containing `headerKeyword`. Replace all non-header
// rows with rows generated by `cellFiller(templateRowXml, rowData, idx)`.
//
// OOXML tables can be nested (a sub-table lives inside a <w:tc> of a wider
// table). A naive `<w:tbl>…</w:tbl>` non-greedy regex ending at the FIRST
// `</w:tbl>` after an outer opener would capture both outer + inner content,
// which corrupts the document. We therefore:
//   1. Locate the keyword position.
//   2. Walk backward to find the nearest `<w:tbl`.
//   3. Walk forward, tracking balanced `<w:tbl>` / `</w:tbl>`, to the
//      matching closer.
//   4. If that table contains a nested `<w:tbl>` that also contains the
//      keyword, recurse into it (innermost wins).
function findEnclosingTable(xml, keywordPos) {
  // Find nearest <w:tbl> opener before keywordPos
  const openRe = /<w:tbl\b/g;
  const closeRe = /<\/w:tbl>/g;
  let openStart = -1;
  {
    const search = xml.slice(0, keywordPos);
    let last = -1;
    let m;
    const re = /<w:tbl\b/g;
    while ((m = re.exec(search)) !== null) last = m.index;
    openStart = last;
  }
  if (openStart === -1) return null;
  // Walk forward from openStart, tracking nesting depth
  let depth = 0;
  const tokenRe = /<w:tbl\b|<\/w:tbl>/g;
  tokenRe.lastIndex = openStart;
  let m;
  while ((m = tokenRe.exec(xml)) !== null) {
    if (m[0] === '</w:tbl>') {
      depth--;
      if (depth === 0) {
        const end = m.index + m[0].length;
        return { start: openStart, end, xml: xml.slice(openStart, end) };
      }
    } else {
      depth++;
    }
  }
  return null;
}

function replaceTableRows(xml, headerKeyword, rowsData, cellFiller) {
  // Find ALL positions of the keyword; pick the one whose enclosing table is
  // the innermost (smallest span).
  let best = null;
  let from = 0;
  while (true) {
    const pos = xml.indexOf(headerKeyword, from);
    if (pos === -1) break;
    const tbl = findEnclosingTable(xml, pos);
    if (tbl && (!best || (tbl.end - tbl.start) < (best.end - best.start))) best = tbl;
    from = pos + headerKeyword.length;
  }
  if (!best) return xml;

  // Parse direct-child rows only. <w:tr> itself cannot nest, but a nested
  // <w:tbl> inside a <w:tc> contains its own <w:tr>s that we must exclude.
  // We do that by walking tokens and only collecting <w:tr> that are at the
  // current table's depth.
  const tbl = best.xml;
  const rows = [];
  {
    const tokRe = /<w:tbl\b|<\/w:tbl>|<w:tr\b[^>]*>|<\/w:tr>/g;
    let depth = 0; // 0 = inside best's top-level (since we start past opener)
    let trStart = -1;
    let trDepth = -1;
    // Skip the initial opening <w:tbl …> so depth starts at 0 inside it
    const firstGt = tbl.indexOf('>');
    tokRe.lastIndex = firstGt + 1;
    let tm;
    while ((tm = tokRe.exec(tbl)) !== null) {
      const tok = tm[0];
      if (tok.startsWith('<w:tbl')) { depth++; }
      else if (tok === '</w:tbl>') { depth--; }
      else if (tok.startsWith('<w:tr')) {
        if (depth === 0 && trStart === -1) { trStart = tm.index; trDepth = depth; }
      } else if (tok === '</w:tr>') {
        if (trStart !== -1 && trDepth === depth) {
          const end = tm.index + tok.length;
          rows.push({ xml: tbl.slice(trStart, end), start: trStart, end });
          trStart = -1;
          trDepth = -1;
        }
      }
    }
  }
  if (rows.length < 2) return xml;

  const templateRow = rows[1];
  const newRows = rowsData.map((data, idx) => cellFiller(templateRow.xml, data, idx));
  const beforeFirstDataRow = tbl.slice(0, rows[1].start);
  const afterLastDataRow = tbl.slice(rows[rows.length - 1].end);
  const rebuilt = beforeFirstDataRow + newRows.join('') + afterLastDataRow;
  return xml.slice(0, best.start) + rebuilt + xml.slice(best.end);
}

// Replace the first <w:t>…</w:t> text content inside a given table cell
// (passed as a raw tc xml string). Preserves the enclosing run properties.
// Wraps the value in green highlight so it stands out in the output.
function fillCellText(tcXml, value) {
  // Find the first run with a <w:t>. Replace its text content, strip italic
  // and add green highlight.
  const runRe = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/;
  const runMatch = tcXml.match(runRe);
  if (!runMatch) {
    // No run at all: build fresh paragraph content inside the <w:tc>
    // Find the first <w:p> and append a run before its </w:p>.
    const pRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/;
    const pMatch = tcXml.match(pRe);
    if (!pMatch) return tcXml;
    const endP = pMatch.index + pMatch[0].lastIndexOf('</w:p>');
    return tcXml.slice(0, endP) + makeHighlightedRun('', String(value ?? '')) + tcXml.slice(endP);
  }
  const runXml = runMatch[0];
  const rPr = extractRPr(runXml);
  // If the cell has multiple runs with text, keep the first one's rPr and
  // replace ALL text nodes across runs: drop them all, then append a single
  // highlighted run at the end of the first paragraph.
  // Simpler approach: replace the matched run entirely with a highlighted
  // run carrying the value, and drop any other <w:r> that has a <w:t>.
  const newRun = makeHighlightedRun(rPr, String(value ?? ''));
  let out = tcXml.slice(0, runMatch.index) + newRun + tcXml.slice(runMatch.index + runXml.length);
  // Drop subsequent runs containing a <w:t>
  out = out.replace(/<w:r\b[^>]*>[\s\S]*?<w:t[^>]*>[\s\S]*?<\/w:t>[\s\S]*?<\/w:r>/g, (match, offset) => {
    // keep the first occurrence (the one we just inserted)
    if (offset <= runMatch.index + newRun.length) return match;
    return '';
  });
  return out;
}

// Build a personnel row from the template row: replace the 4 cell contents.
function personnelRowBuilder(templateRowXml, data, idx) {
  const cellRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  const cells = [];
  let cm;
  while ((cm = cellRe.exec(templateRowXml)) !== null) cells.push({ xml: cm[0], start: cm.index, end: cm.index + cm[0].length });
  if (cells.length < 4) return templateRowXml;
  const values = [
    String(idx + 1),
    data.poste || '',
    data.exp_generale || '',
    data.exp_comparable || '',
  ];
  // Rebuild row
  let out = templateRowXml.slice(0, cells[0].start);
  for (let i = 0; i < cells.length; i++) {
    out += i < values.length ? fillCellText(cells[i].xml, values[i]) : cells[i].xml;
    if (i < cells.length - 1) out += templateRowXml.slice(cells[i].end, cells[i + 1].start);
  }
  out += templateRowXml.slice(cells[cells.length - 1].end);
  return out;
}

function materielRowBuilder(templateRowXml, data, idx) {
  const cellRe = /<w:tc\b[\s\S]*?<\/w:tc>/g;
  const cells = [];
  let cm;
  while ((cm = cellRe.exec(templateRowXml)) !== null) cells.push({ xml: cm[0], start: cm.index, end: cm.index + cm[0].length });
  if (cells.length < 3) return templateRowXml;
  const values = [
    String(idx + 1),
    data.type || '',
    data.nombre_min || '',
  ];
  let out = templateRowXml.slice(0, cells[0].start);
  for (let i = 0; i < cells.length; i++) {
    out += i < values.length ? fillCellText(cells[i].xml, values[i]) : cells[i].xml;
    if (i < cells.length - 1) out += templateRowXml.slice(cells[i].end, cells[i + 1].start);
  }
  out += templateRowXml.slice(cells[cells.length - 1].end);
  return out;
}

// ── Proposition technique list ────────────────────────────────────────────
// The template has a "Formulaires de la Proposition Technique" section with a
// bullet list of the default 7 items (Paragraphedeliste style). We rebuild
// that list from `propositionItems`:
//   - enabled items appear as normal bullets
//   - disabled items are included but red-highlighted (to signal deletion)
//   - custom user-added items are appended to the list
//
// We locate the list by finding the first "Paragraphedeliste" paragraph that
// follows the "Formulaires de la Proposition Technique" heading, then
// collecting all consecutive Paragraphedeliste paragraphs as the block to
// replace. This is resilient to label edits (we use style, not text match).
function replacePropositionList(xml, items) {
  if (!items || items.length === 0) return xml;
  // Anchor on the continuous intro text that precedes the list. (The section
  // heading "Formulaires de la Proposition Technique" is split across runs
  // and only exists as a continuous string in the TOC — which would lead us
  // to the WRONG list, 300k chars earlier.)
  const headingIdx = xml.indexOf('pour chacun des éléments de la proposition');
  if (headingIdx === -1) return xml;

  // Walk paragraphs after the heading; find the first one with
  // pStyle=Paragraphedeliste, then collect consecutive ones.
  const paraRe = /<w:p\b[\s\S]*?<\/w:p>/g;
  paraRe.lastIndex = headingIdx;
  let firstParaStart = -1;
  let lastParaEnd = -1;
  let templateParaXml = null;
  let m;
  while ((m = paraRe.exec(xml)) !== null) {
    const para = m[0];
    const isListItem = /<w:pStyle[^/]*w:val="Paragraphedeliste"/.test(para);
    if (firstParaStart === -1) {
      if (isListItem) { firstParaStart = m.index; lastParaEnd = m.index + para.length; templateParaXml = para; }
      else continue;
    } else {
      if (isListItem) lastParaEnd = m.index + para.length;
      else break;
    }
  }
  if (firstParaStart === -1 || !templateParaXml) return xml;

  // Build new paragraphs by cloning the template paragraph and replacing its
  // text content. Preserve pPr and run properties from the first run.
  const pPrMatch = templateParaXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const firstRunMatch = templateParaXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/);
  const firstRun = firstRunMatch ? firstRunMatch[0] : '';
  const rPr = extractRPr(firstRun);

  const newParas = items.map((it) => {
    const label = String(it.label || '').trim();
    const text = label || String(it.description || '').slice(0, 120);
    if (!text) return '';
    const run = it.enabled === false ? makeRedRun(rPr, text) : makeRun(rPr, text);
    return `<w:p>${pPr}${run}</w:p>`;
  }).filter(Boolean).join('');

  return xml.slice(0, firstParaStart) + newParas + xml.slice(lastParaEnd);
}

// ── Generic Paragraphedeliste list rebuild ────────────────────────────────
// Same strategy as replacePropositionList but parameterized on an anchor
// substring that uniquely precedes the target list in the template. Used
// for Section IV "Organisation des travaux" (anchor: 'organisation sur site
// et la') and "Calendrier d'Exécution" (anchor: 'un programme détaillé et
// un calendrier').
function replaceBulletList(xml, items, anchorText) {
  if (!items || items.length === 0) return xml;
  const headingIdx = xml.indexOf(anchorText);
  if (headingIdx === -1) return xml;

  const paraRe = /<w:p\b[\s\S]*?<\/w:p>/g;
  paraRe.lastIndex = headingIdx;
  let firstParaStart = -1;
  let lastParaEnd = -1;
  let templateParaXml = null;
  let m;
  while ((m = paraRe.exec(xml)) !== null) {
    const para = m[0];
    const isListItem = /<w:pStyle[^/]*w:val="Paragraphedeliste"/.test(para);
    if (firstParaStart === -1) {
      if (isListItem) { firstParaStart = m.index; lastParaEnd = m.index + para.length; templateParaXml = para; }
      else continue;
    } else {
      if (isListItem) lastParaEnd = m.index + para.length;
      else break;
    }
  }
  if (firstParaStart === -1 || !templateParaXml) return xml;

  const pPrMatch = templateParaXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const firstRunMatch = templateParaXml.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/);
  const firstRun = firstRunMatch ? firstRunMatch[0] : '';
  const rPr = extractRPr(firstRun);

  const newParas = items.map((it) => {
    const label = String(it.label || '').trim();
    const desc = String(it.description || '').trim();
    const text = desc || label;
    if (!text) return '';
    const run = it.enabled === false ? makeRedRun(rPr, text) : makeRun(rPr, text);
    return `<w:p>${pPr}${run}</w:p>`;
  }).filter(Boolean).join('');

  return xml.slice(0, firstParaStart) + newParas + xml.slice(lastParaEnd);
}

// ── Word comments XML ─────────────────────────────────────────────────────

function buildCommentsXml(entries) {
  const items = entries.map(({ id, author, text }) =>
    `<w:comment w:id="${id}" w:author="${escapeXml(author)}" w:date="${new Date().toISOString()}" w:initials="${escapeXml(author.slice(0, 2).toUpperCase())}">` +
    `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>` +
    `</w:comment>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    items + `</w:comments>`;
}

// ── Clean mode: strip red-highlighted content ────────────────────────────
//
// Rule:
//  - Paragraphs where every text-bearing run is red-highlighted → paragraph
//    removed entirely.
//  - Paragraphs where only some runs are red → only those runs removed, rest
//    of the paragraph preserved.
//  - Table cells (`<w:tc>`) left without any `<w:p>` get an empty paragraph
//    inserted, since OOXML requires at least one paragraph per cell.

function stripRedContent(xml) {
  const isRedRPr = (rPr) => /<w:highlight\s+w:val="red"\s*\/>/i.test(rPr || '');
  let paragraphsRemoved = 0;
  let runsRemoved = 0;

  const parts = xml.split(/(<w:p\b[^>]*\/>|<w:p\b[\s\S]*?<\/w:p>)/g);
  for (let i = 1; i < parts.length; i += 2) {
    const para = parts[i];
    if (para.endsWith('/>')) continue;

    const runs = extractRunNodes(para);
    if (runs.length === 0) continue;

    const textRuns = runs.filter((r) => r.text && r.text.length > 0);
    if (textRuns.length === 0) continue;

    const redTextRuns = textRuns.filter((r) => isRedRPr(r.rPr));
    if (redTextRuns.length === 0) continue;

    if (redTextRuns.length === textRuns.length) {
      parts[i] = '';
      paragraphsRemoved++;
    } else {
      const sorted = [...redTextRuns].sort((a, b) => b.start - a.start);
      let newPara = para;
      for (const r of sorted) {
        newPara = newPara.slice(0, r.start) + newPara.slice(r.end);
        runsRemoved++;
      }
      parts[i] = newPara;
    }
  }

  let result = parts.join('');

  let emptyCellsFixed = 0;
  result = result.replace(/<w:tc\b([^>]*)>([\s\S]*?)<\/w:tc>/g, (match, attrs, inner) => {
    if (/<w:p\b/.test(inner)) return match;
    emptyCellsFixed++;
    return `<w:tc${attrs}>${inner}<w:p/></w:tc>`;
  });

  return { xml: result, paragraphsRemoved, runsRemoved, emptyCellsFixed };
}

// Remove tables that ended up without any text or visual content after the
// red-stripping pass. Tables containing at least one character, image, or
// drawing are preserved. Loops until stable so that nested empty tables
// cascade cleanly (innermost removed first, outer may then qualify).
function stripEmptyTables(xml) {
  let result = xml;
  let removed = 0;
  let prevLen;
  do {
    prevLen = result.length;
    result = result.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tbl) => {
      const texts = [...tbl.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
        .map((m) => m[1])
        .join('');
      if (texts.trim().length > 0) return tbl;
      if (/<w:drawing\b|<w:pict\b|<w:object\b/.test(tbl)) return tbl;
      removed++;
      return '';
    });
  } while (result.length !== prevLen);
  return { xml: result, removed };
}

// ── Main export ───────────────────────────────────────────────────────────

export async function exportDocx({
  formData,
  actorAssignments,
  fieldComments,
  actors,
  personnelRows = [],
  materielRows = [],
  propositionItems = [],
  bulletListItems = {},
  articlesEsssRows = [],
  tranchesRows = [],
  cleanMode = false,
}) {
  // 1. Load template — with one retry for transient failures.
  // Vite HMR briefly drops static asset serving while rebuilding, and the
  // template file lives on Google Drive which can momentarily de-materialise
  // it. A single 600 ms retry covers both cases without masking real outages.
  async function fetchTemplate() {
    let lastErr;
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch('/template-DTAO.docx', { cache: 'no-store' });
        if (r.ok) return r;
        lastErr = new Error(`Template introuvable : /template-DTAO.docx (HTTP ${r.status})`);
      } catch (e) {
        lastErr = e;
      }
      if (i === 0) await new Promise(r => setTimeout(r, 600));
    }
    throw lastErr;
  }
  const res = await fetchTemplate();
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('Template corrompu : word/document.xml introuvable dans le zip.');
  let docXml = await docXmlFile.async('string');
  // Footnotes are stored separately. Load if present so conditional helpers
  // can flip yellow draft markers (e.g. Sûreté footnotes 26/27/28) to red.
  let footnotesXml = await zip.file('word/footnotes.xml')?.async('string');

  // 1a. Strip the "Préambule" block at the top of the template. It explains
  // how to use the template itself ("Notes à l'utilisateur") and must not
  // appear in the final DAO handed to bidders. Run this first so all later
  // byte-offset-based operations see the cleaned XML.
  {
    const { xml: out, removed } = stripPreambleBlock(docXml);
    docXml = out;
    if (removed > 0) console.log(`[exportDocx] Bloc Préambule supprimé (${removed} octets)`);
  }

  // 1a-ter. Drop whichever of the two AAO letter blocks is irrelevant given
  // the pré-qualification choice. Keeps "pré-qualifiés" letter if
  // prequalification === "est", else keeps "Cas sans pré-qualification".
  {
    const { xml: out, removed, mode } = stripConditionalPrequalLetters(
      docXml,
      formData.prequalification,
    );
    docXml = out;
    if (removed > 0) console.log(`[exportDocx] Lettre AAO conditionnelle: ${mode} (${removed} octets)`);
  }

  // 1a-quater. Drop the TITLEINTRO "Spécifications des Travaux" guide block
  // (notes to the template author on how to prepare specs). The real
  // Section VII content later in the document is left alone.
  {
    const { xml: out, removed } = stripSpecsGuideBlock(docXml);
    docXml = out;
    if (removed > 0) console.log(`[exportDocx] Guide Spécifications supprimé (${removed} octets)`);
  }

  // 1b. Auto-defaults — IS 19.1: the `[insérer le montant entre 1% et 3% …]`
  // placeholder applies ONLY to the monetary "Garantie de Soumission" case.
  // When declaration_garantie === 'est' (simple declaration, no money) or
  // neither is required, the amount is meaningless — auto-fill "non-applicable"
  // so no yellow text lingers in the exported doc.
  {
    const needsMontant = formData.garantie_soumission === 'est';
    if (!needsMontant && !formData.montant_garantie) {
      formData = { ...formData, montant_garantie: 'non-applicable' };
    }
  }

  // 1c. Sanitize values whose template already supplies a trailing unit word:
  //  - IS 18.1 `validite_offre`: template reads "… [ph] jours." so if the user
  //    types "120 jours" we'd render "120 jours jours". Strip trailing "jour(s)".
  //  - IS 19.9 `exclusion_annees`: template reads "… [ph] ans." — strip
  //    trailing "an(s)/année(s)"; also normalize Excel time-format leakage
  //    like "0:00" back to a plain number.
  {
    const next = { ...formData };
    if (typeof next.validite_offre === 'string') {
      next.validite_offre = next.validite_offre.replace(/\s*jour(s)?\s*\.?$/i, '').trim();
    }
    if (typeof next.exclusion_annees === 'string') {
      let v = next.exclusion_annees.trim();
      // Excel "H:MM" leak → keep only the hour digits.
      const timeM = v.match(/^(\d+)\s*:\s*\d+$/);
      if (timeM) v = timeM[1];
      v = v.replace(/\s*(ans?|années?)\s*\.?$/i, '').trim();
      next.exclusion_annees = v;
    }
    formData = next;
  }

  // 2. Build per-field comment entries + a fieldId → [commentIds] map.
  const commentEntries = [];
  const fieldCommentIds = {}; // fieldId → array of comment numeric ids
  let cid = 0;

  for (const [fieldId, actorIds] of Object.entries(actorAssignments)) {
    if (!actorIds?.length) continue;
    for (const actorId of actorIds) {
      const actor = actors.find(a => a.id === actorId);
      if (!actor) continue;
      const text = actor.defaultComment || `À remplir par ${actor.label}`;
      commentEntries.push({ id: cid, author: actor.label, text });
      (fieldCommentIds[fieldId] ??= []).push(cid);
      cid++;
    }
  }
  for (const [fieldId, text] of Object.entries(fieldComments)) {
    if (!text) continue;
    commentEntries.push({ id: cid, author: 'Commentaire', text });
    (fieldCommentIds[fieldId] ??= []).push(cid);
    cid++;
  }

  // 2b. CCAG page de garde (Section VIII) — fill the two centered italic
  // placeholders in bold / centered / size 14 / green-highlight, with
  // `[Nom du Marché]` populated as "Travaux de " + PREA-003. Runs BEFORE
  // the generic FIELD_MAP pass so the literal placeholders still exist.
  {
    const { xml: out, filled } = fillCcagPageGarde(
      docXml,
      formData.nom_maitrise_ouvrage,
      formData.identification_travaux,
    );
    docXml = out;
    if (filled > 0) console.log(`[exportDocx] CCAG page de garde: ${filled} champ(s) rempli(s) bold/14pt`);
  }

  // 2c. CCAP — Résumé des Tranches (CCAP-004): fill the 3-column table from
  // user rows. Drops the 5 empty placeholder rows and emits one clean row
  // per user entry (nom, delai, penalites).
  {
    const { xml: out, rowCount } = fillCcapTranchesTable(docXml, tranchesRows);
    docXml = out;
    if (rowCount > 0) console.log(`[exportDocx] CCAP: tableau Résumé des Tranches rempli (${rowCount} ligne(s))`);
  }

  // 2d. CCAP — Droit applicable (CCAP-010) and Langue du Marché (CCAP-011).
  // Both are empty paragraphs in the template, sitting after the heading
  // pair (heading + "1.4"). Inject the user value as a green-highlighted run.
  {
    const v = fmtValue(formData.droit_applicable, false);
    const { xml: out, replaced } = fillEmptyParaAfterHeading(docXml, "Droit", "1.4", v);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP: Droit applicable injecté`);
  }
  {
    const v = fmtValue(formData.langue_marche, false);
    const { xml: out, replaced } = fillEmptyParaAfterHeading(docXml, "Langue", "1.4", v);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP: Langue du Marché injectée`);
  }

  // 2e. CCAP-008 — Spécifications ESSS applicables (toggle Wingdings checkboxes).
  // CCAP-008 is now a UI mirror of S-ESSS-01 (`esss_applicable`), so the
  // export reads from that single source of truth.
  {
    const choice = formData.esss_applicable;
    const { xml: out, applied } = setCcapEsssCheckboxes(docXml, choice);
    docXml = out;
    if (applied) console.log(`[exportDocx] CCAP: Spécifications ESSS = ${choice} (cases cochées)`);
  }

  // 2f. CCAP-009 — Conditions Climatiques Exceptionnellement Défavorables
  // (replace 4 yellow draft bullets with the user's textarea content).
  {
    const v = fmtValue(formData.conditions_climatiques_defavorables, false);
    const { xml: out, applied, lineCount } = fillCcapConditionsClimatiques(docXml, v);
    docXml = out;
    if (applied) console.log(`[exportDocx] CCAP: Conditions Climatiques injectées (${lineCount} ligne(s))`);
  }

  // 2g. CCAP — top mirrors: Nom et adresse du MOA / MOE.
  // The template ships an empty paragraph after the heading + ref pair.
  // We fill it with one green-highlighted run per non-empty value, joined
  // by <w:br/>. Source of truth = the PREA-004-* fields in §Informations
  // générales; CCAP-001 / CCAP-002 are UI mirrors only.
  {
    // The ref text in the template is "1.1.2.2 & 1.3" but the raw XML stores
    // it as "1.1.2.2 &amp; 1.3" and extractRunText doesn't decode entities,
    // so we pass the entity-encoded form to match.
    const { xml: out, replaced } = fillEmptyParaAfterHeadingLines(
      docXml, "Nom et adresse du Maître d'Ouvrage", "1.1.2.2 &amp; 1.3",
      [formData.nom_maitrise_ouvrage, formData.adresse_moa],
    );
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP: Nom et adresse du MOA injectés`);
  }
  {
    const { xml: out, replaced } = fillEmptyParaAfterHeadingLines(
      docXml, "Nom et adresse du Maître d'Œuvre", "1.1.2.4 &amp; 1.3",
      [formData.nom_moe, formData.adresse_moe],
    );
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP: Nom et adresse du MOE injectés`);
  }

  // 2h. CCAP §3.1 — Obligations et Pouvoirs du MOE (multi_check_extensible)
  // 4 default bullets in the template (paras ~5553-5556). Unchecked → red,
  // checked customs → appended after the last default bullet.
  {
    const items = formData.obligations_moe;
    const matchers = [
      { id: 'instr-changements', anchor: /D[ée]livrer toute instruction.*?changements significatifs/i },
      { id: 'sc-3-5',            anchor: /Sous[ -]?Clause\s*3\.5/i },
      { id: 'sc-14-6',           anchor: /Sous[ -]?Clause\s*14\.6/i },
      { id: 'sc-10-1-2',         anchor: /Sous[ -]?Clauses?\s*10\.1\s+et\s+10\.2/i },
    ];
    const { xml: out, painted, appended } = applyMultiCheckExtensible(docXml, items, matchers);
    docXml = out;
    if (painted || appended) console.log(`[exportDocx] CCAP §3.1 Obligations MOE: ${painted} décoché(s) rouge, ${appended} option(s) personnalisée(s) ajoutée(s)`);
  }

  // 2i. CCAP §4.1 — Obligations Générales de l'Entrepreneur (multi-check)
  // 3 default bullets in the template (paras ~5562-5564).
  {
    const items = formData.obligations_entrepreneur;
    const matchers = [
      { id: 'plans-execution',     anchor: /plans? d[''']ex[ée]cution/i },
      { id: 'dossier-recolement',  anchor: /dossier de r[ée]colement/i },
      { id: 'manuels-exploitation', anchor: /manuels? d[''']exploitation/i },
    ];
    const { xml: out, painted, appended } = applyMultiCheckExtensible(docXml, items, matchers);
    docXml = out;
    if (painted || appended) console.log(`[exportDocx] CCAP §4.1 Obligations Entrepreneur: ${painted} décoché(s) rouge, ${appended} option(s) personnalisée(s) ajoutée(s)`);
  }

  // 2j. CCAP §4.4 — Sous-Traitants paiement direct (Oui/Non).
  // Yellow guide para "Paiement direct des Sous-Traitants autorisé : oui/non
  // [rayer la mention inutile]" → rewritten with the user's choice.
  {
    const choice = formData.sous_traitants_paiement_direct;
    if (choice === 'Oui' || choice === 'Non') {
      const newText = `Paiement direct des Sous-Traitants autorisé : ${choice}`;
      const { xml: out, replaced } = replaceYellowGuideParagraph(
        docXml,
        /Paiement direct des Sous[- ]?Traitants autoris[ée]/i,
        newText,
      );
      docXml = out;
      if (replaced) console.log(`[exportDocx] CCAP §4.4: paiement direct = ${choice}`);
    }
  }

  // 2k. CCAP §4.21 — Fréquence des rapports d'avancement.
  // Yellow guide "Fréquence des rapports d'avancement : [Insérer la fréquence
  // seulement si elle n'est pas mensuelle ; sinon, supprimer.]"
  // If empty → leave the yellow guide so the MOA notices it. Otherwise rewrite.
  {
    const v = fmtValue(formData.frequence_rapports_avancement, false);
    if (v && v.trim()) {
      const newText = `Fréquence des rapports d'avancement : ${v.trim()}`;
      const { xml: out, replaced } = replaceYellowGuideParagraph(
        docXml,
        /Fr[ée]quence des rapports d[''']avancement/i,
        newText,
      );
      docXml = out;
      if (replaced) console.log(`[exportDocx] CCAP §4.21: fréquence rapports d'avancement injectée`);
    }
  }

  // 2l. CCAP §8.7 — Pénalités de retard pour les Ouvrages.
  // Two cases: tranches → write the locked "Se référer au tableau..." string
  // (and red-paint the "Si des Tranches..." follow-up para since it becomes
  // redundant); no tranches → write the user-typed value.
  // The yellow guide "[Généralement d'environ un pour mille 1‰] % du Montant
  // du Marché par jour." is the target paragraph in both cases.
  {
    let value = '';
    if (formData.tranches_marche_existe === 'Oui') {
      value = 'Se référer au tableau « Résumé des Tranches » ci-dessous.';
    } else if (formData.tranches_marche_existe === 'Non') {
      const v = fmtValue(formData.penalites_retard_ouvrages, false);
      if (v && v.trim()) value = `${v.trim()} ‰ du Montant du Marché par jour.`;
    }
    if (value) {
      const { xml: out, replaced } = replaceYellowGuideParagraph(
        docXml,
        /G[ée]n[ée]ralement d[''']environ un pour mille/i,
        value,
      );
      docXml = out;
      if (replaced) console.log(`[exportDocx] CCAP §8.7: pénalités de retard injectées`);
    }
  }

  // 2m. CCAP §13.5(b)(ii) — Pourcentage pour l'ajustement des Sommes
  // provisionnelles. The N/A toggle (`pourcentage_provisions_na`) replaces
  // the cell with literal "Non applicable"; otherwise the user value is
  // emitted as "X %". Both branches collapse the two yellow paragraphs into
  // a single green paragraph.
  {
    const isNA = formData.pourcentage_provisions_na === true;
    const v = fmtValue(formData.pourcentage_provisions, false);
    const { xml: out, replaced } = fillCcapPourcentageProvisions(docXml, v, isNA);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP §13.5(b)(ii): pourcentage provisions ${isNA ? '= Non applicable' : 'injecté'}`);
  }

  // 2n. CCAP §14.1 — Type de Marché. Paint red every option not retained
  // (plus header and [ou] separators). For the "Combinaison" choice, also
  // fill the two yellow composante descriptors with user text.
  {
    const choice = formData.montant_marche_type;
    const descForf = fmtValue(formData.description_composante_forfaitaire, false);
    const descUnit = fmtValue(formData.description_composante_unitaire, false);
    const { xml: out, painted, filled } = applyCcap14_1(docXml, choice, descForf, descUnit);
    docXml = out;
    if (painted || filled) console.log(`[exportDocx] CCAP §14.1: ${choice} → ${painted} paragraphe(s) rouge, ${filled} composante(s) remplie(s)`);
  }

  // 2o. CCAP §14.1(b) — Exemptions de droits, taxes et impôts.
  // Replace the yellow guide "[Si applicable, insérer les exemptions…]"
  // with the user's textarea (one line per `\n`).
  {
    const v = fmtValue(formData.droits_taxes_exemptions, false);
    const { xml: out, replaced } = fillCcap14_1_b_Exemptions(docXml, v);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP §14.1(b): exemptions injectées`);
  }

  // 2p. CCAP §14.1(e) — Toggle Oui/Non. Rewrite "Oui / Non [Supprimer la
  // mention inutile]" so the chosen value is green and the unselected
  // value + the bracket are red.
  {
    const choice = formData.droits_taxes_alinea_e;
    const { xml: out, replaced } = applyCcap14_1_e(docXml, choice);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP §14.1(e): toggle = ${choice}`);
  }

  // 2q. CCAP §14.2 — Avance de Démarrage. Rewrite the whole yellow line
  // (cleans the leading "______ %" and drops the trailing "[Insérer …]"
  // prompt). The user value goes in green as the leading number.
  {
    const v = fmtValue(formData.avance_demarrage, false);
    const { xml: out, replaced } = fillCcap14_2_AvanceDemarrage(docXml, v);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP §14.2: avance de démarrage = ${v} %`);
  }

  // 2r. CCAP §14.3 — Plafond de la Retenue de Garantie. Same shape as 14.2:
  // rewrites "______ % du Montant… [insérer un pourcentage…]" to a clean
  // "<value> % du Montant Accepté du Marché.".
  {
    const v = fmtValue(formData.plafond_retenue, false);
    const { xml: out, replaced } = fillCcap14_3_PlafondRetenue(docXml, v);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP §14.3: plafond retenue = ${v} %`);
  }

  // 2s. CCAP §14.5 — Equipements et Matériaux. If the SC does not apply,
  // paint red the whole sub-section (heading + guide + both refs + both
  // yellow content cells). If it does, fill the two yellow content cells
  // with the user's FOB list and on-site list.
  {
    const applique = formData.equipements_materiaux_applique;
    const fob = fmtValue(formData.equipements_materiaux_fob, false);
    const onsite = fmtValue(formData.equipements_materiaux_chantier, false);
    const { xml: out, painted, filled } = applyCcap14_5(docXml, applique, fob, onsite);
    docXml = out;
    if (painted || filled) console.log(`[exportDocx] CCAP §14.5 (${applique}): ${painted} rouge / ${filled} liste(s) remplie(s)`);
  }

  // 2t. CCAP §18.1 — Délais de présentation des assurances. Always fixes
  // the "Polices applicables" → "Polices d'assurance applicables" typo,
  // even when the user has not filled any value. Fills the two
  // "__________ jours" sub-cells with the user's values.
  {
    const vA = fmtValue(formData.delai_assurance_attestation, false);
    const vP = fmtValue(formData.delai_assurance_police, false);
    const { xml: out, replaced, fixedLabel } = fillCcap18_1_Delais(docXml, vA, vP);
    docXml = out;
    if (replaced || fixedLabel) console.log(`[exportDocx] CCAP §18.1: ${replaced} délai(s) injecté(s)${fixedLabel ? ' + libellé Polices corrigé' : ''}`);
  }

  // 2u. CCAP §18.3 — Montant minimum de l'assurance contre les atteintes
  // aux biens et aux personnes. Rewrites the yellow "__________ [Insérer
  // le montant]" paragraph to a single green run carrying the value.
  {
    const v = fmtValue(formData.assurance_montant_min, false);
    const { xml: out, replaced } = fillCcap18_3_Montant(docXml, v);
    docXml = out;
    if (replaced) console.log(`[exportDocx] CCAP §18.3: montant assurance = ${v}`);
  }

  // 2v. CCAP §20.2 — Composition du CRD. Paint red the unselected branch
  // ("Un membre unique" or "Trois membres") plus both "[Soit :]" / "[soit
  // :]" yellow guides. The kept option stays as-is.
  {
    const choice = formData.crd_composition;
    const { xml: out, painted } = applyCcap20_2_Composition(docXml, choice);
    docXml = out;
    if (painted) console.log(`[exportDocx] CCAP §20.2 (${choice}): ${painted} paragraphe(s) rouge`);
  }

  // 3. Apply field replacements (with anchors when the field has comments)
  // Track replacements per-placeholder so nth shifts correctly when multiple
  // fields share the same placeholder. Example: three fields use
  // `[sont / ne sont pas]` with nth=1,2,3. After replacing nth=1 the
  // occurrence is gone, so the 2nd field's effective nth becomes 2-1=1.
  const replacedCountByPh = new Map();
  for (const field of FIELD_MAP) {
    const { id, ph, nth = 1, isDate = false, isTime = false, global = false, captions, captionInline, stripUnderscores, valueSuffix, valueSuffixSkipIf, valueOverrideIf } = field;
    // `valueOverrideIf(formData)` returns a string to use INSTEAD of the
    // raw form value (or null to fall back to formData[id]). Used by
    // crd_liste, which must export "aucun" when crd_composition = "Trois
    // membres", regardless of what (if anything) the user typed.
    const overrideValue = valueOverrideIf ? valueOverrideIf(formData) : null;
    const rawValue = (overrideValue !== null && overrideValue !== undefined) ? overrideValue : formData[id];
    let value = fmtValue(rawValue, isDate);
    // Some placeholders include trailing units (e.g. " jours.") that the simple
    // substitution would lose. `valueSuffix` re-appends them after the value.
    // `valueSuffixSkipIf(formData)` lets a field opt out of the suffix when
    // some other formData flag overrides the unit (e.g. CCAP-005 free text
    // when there are no tranches → user types "540 jours" or "18 mois").
    const skipSuffix = valueSuffixSkipIf ? valueSuffixSkipIf(formData) : false;
    if (value && valueSuffix && !skipSuffix) value = value + valueSuffix;
    const commentIds = fieldCommentIds[id] || [];
    // If no value AND no comment, skip entirely.
    if (!value && commentIds.length === 0) continue;

    // captionInline — field has no bracketed placeholder, just a label caption
    if (captionInline) {
      docXml = fillInlineCaption(docXml, captionInline, value, nth, isDate, isTime);
      continue;
    }

    if (!ph) continue;
    const variants = Array.isArray(ph) ? ph : [ph];
    const phKey = variants[0];
    const prior = replacedCountByPh.get(phKey) || 0;
    const effectiveNth = Math.max(1, nth - prior);
    // Anchor the comment on the first variant that gets matched.
    // For GLOBAL fields, keep iterating all variants even after a match: the
    // template often uses several typographic variants of the same label
    // (e.g. "[insérer le nom du Maître d'Ouvrage]" AND "[nom du Maître
    // d'Ouvrage]" AND "[Nom du Maître d'Ouvrage]") and each must be filled
    // independently. For non-global nth-based fields, break on first match
    // — otherwise we'd double-consume the same logical slot across variants.
    let pendingAnchors = commentIds;
    let replaced = false;
    for (const p of variants) {
      const before = docXml;
      docXml = replaceField(docXml, p, effectiveNth, value, pendingAnchors, global);
      if (docXml !== before) {
        pendingAnchors = null;
        replaced = true;
        if (!global) break;
      }
    }
    if (replaced) replacedCountByPh.set(phKey, prior + 1);

    // Post-fill: strip stale underscore runs around the value we just inserted.
    if (replaced && stripUnderscores) {
      const opts = (typeof stripUnderscores === 'object') ? stripUnderscores : {};
      docXml = cleanupUnderscoresAroundValue(docXml, value, opts);
    }

    // Also fill signature lines identified by raw-label captions.
    if (global && value && Array.isArray(captions) && captions.length > 0) {
      const { xml: out, count, tally } = fillCaptionSignatureLines(docXml, captions, value);
      docXml = out;
      if (count > 0) {
        console.log(`[exportDocx] ${count} légende(s) remplie(s) pour "${id}" (${tally.underscores}und/${tally.empty}vide/${tally.tabSelf}tab/${tally.tabPrev}tabPrev)`);
      }
    }
  }

  // 3b. Fill personnel and matériel tables
  if (Array.isArray(personnelRows) && personnelRows.length > 0) {
    const before = docXml;
    docXml = replaceTableRows(docXml, "Nombre d'années d'expérience générale", personnelRows, personnelRowBuilder);
    if (docXml !== before) console.log(`[exportDocx] Tableau personnel rempli (${personnelRows.length} ligne(s))`);
  }
  if (Array.isArray(materielRows) && materielRows.length > 0) {
    const before = docXml;
    docXml = replaceTableRows(docXml, "Type de matériel", materielRows, materielRowBuilder);
    if (docXml !== before) console.log(`[exportDocx] Tableau matériel rempli (${materielRows.length} ligne(s))`);
  }
  if (Array.isArray(propositionItems) && propositionItems.length > 0) {
    // Filet de sécurité : exclure tout item dont le label correspond à un
    // enjeu ESSS (pollution venue d'un import xlsx mal balisé).
    const cleanItems = propositionItems.filter((it) => !isEnjeuEsssLabel(it?.label));
    const stripped = propositionItems.length - cleanItems.length;
    if (stripped > 0) {
      console.warn(`[exportDocx] Liste proposition: ${stripped} item(s) ESSS écarté(s) à l'export`);
    }
    const before = docXml;
    docXml = replacePropositionList(docXml, cleanItems);
    if (docXml !== before) console.log(`[exportDocx] Liste proposition rebâtie (${cleanItems.length} item(s))`);
  }

  // 3b-bis. Generic bullet lists (Section IV: Organisation des travaux,
  // Calendrier d'Exécution). Each entry maps a field id to a template anchor.
  const BULLET_LIST_ANCHORS = {
    organisation_travaux_items: 'organisation sur site et la',
    calendrier_execution_items: 'un programme détaillé et un calendrier',
  };
  for (const [fieldId, anchor] of Object.entries(BULLET_LIST_ANCHORS)) {
    const items = bulletListItems?.[fieldId];
    if (!Array.isArray(items) || items.length === 0) continue;
    const before = docXml;
    docXml = replaceBulletList(docXml, items, anchor);
    if (docXml !== before) console.log(`[exportDocx] Liste « ${fieldId} » rebâtie (${items.length} item(s))`);
  }

  // 3c. Red-highlight the non-selected OPTION block for date_convention
  const dateConv = formData.date_convention;
  if (dateConv) {
    const selected = /A/i.test(dateConv) && /avant|OPTION A/i.test(dateConv) ? 'A'
                    : /B/i.test(dateConv) && /après|apres|OPTION B/i.test(dateConv) ? 'B'
                    : /^A$/.test(dateConv) ? 'A'
                    : /^B$/.test(dateConv) ? 'B'
                    : null;
    if (selected) {
      const { xml: out, count } = highlightUnselectedOption(docXml, selected);
      docXml = out;
      if (count > 0) console.log(`[exportDocx] OPTION ${selected === 'A' ? 'B' : 'A'} surlignée rouge (${count} run(s))`);
    }
  }

  // 3b-ter. IS 11.1(b) — red-highlight the two price formats NOT picked.
  if (formData.type_prix) {
    const { xml: out, count } = highlightUnselectedPriceFormats(docXml, formData.type_prix);
    docXml = out;
    if (count > 0) console.log(`[exportDocx] IS 11.1(b) formats non retenus surlignés rouge (${count} run(s))`);
  }

  // 3b-ter-bis. Section IV "Tableaux de prix" — red on the 5 paragraphes non
  // retenus du guide jaune (page 60), selon le choix `type_prix`.
  if (formData.type_prix) {
    const { xml: out, count } = highlightUnselectedTableauxDePrixGuide(docXml, formData.type_prix);
    docXml = out;
    if (count > 0) console.log(`[exportDocx] Section IV "Tableaux de prix" : ${count} run(s) jaune→rouge selon type_prix`);
  }

  // 3b-quater. IS 15.1 — red-highlight the unselected monnaie option block.
  if (formData.option_monnaie) {
    const { xml: out, count } = highlightUnselectedMonnaieOption(docXml, formData.option_monnaie);
    docXml = out;
    if (count > 0) console.log(`[exportDocx] IS 15.1 option monnaie non retenue surlignée rouge (${count} run(s))`);
  }

  // 3b-quinquies. IS 32.1 — red-highlight the unselected conversion option block.
  if (formData.option_conversion) {
    const { xml: out, count } = highlightUnselectedConversionOption(docXml, formData.option_conversion);
    docXml = out;
    if (count > 0) console.log(`[exportDocx] IS 32.1 option de conversion non retenue surlignée rouge (${count} run(s))`);
  }

  // 3b-sexies. IS 13.5 — red-highlight the "si variantes autorisées" block
  // when variantes délais are NOT authorized.
  if (formData.variantes_delais === "ne sont pas") {
    const { xml: out, paraCount, runCount } = highlightVariantesDelaisBlock(docXml);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] IS 13.5 bloc ajustement variantes délais surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis. IS 34.1 — red-highlight the "lister les sous-traitants"
  // guide when the MOA does NOT plan designated subcontractors.
  if (formData.sous_traitants_designes === "ne prévoit pas") {
    const { xml: out, paraCount, runCount } = highlightSousTraitantsBlock(docXml);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] IS 34.1 guide sous-traitants désignés surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-II. Section IV Annexe 1 — red-highlight the whole
  // "Annexe 1 à la Soumission — Données relatives à la révision des prix"
  // block when the MOA chose prix fermes (S02-019 = "fermes").
  if (formData.prix_revisables === "fermes") {
    const { xml: out, paraCount, runCount } = highlightAnnexe1Revisions(docXml, formData.prix_revisables);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV Annexe 1 (révision des prix) surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-III. Section IV Annexe 2 — red-highlight the Alternative
  // (A or B) that was NOT retained, based on S02-020 option_monnaie.
  if (formData.option_monnaie) {
    const { xml: out, paraCount, runCount } = highlightAnnexe2Alternative(docXml, formData.option_monnaie);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV Annexe 2 alternative non retenue surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-IV. Section IV "Variantes techniques" form — red-highlight
  // the whole form page when S02-016 = "ne sont pas".
  if (formData.variantes_techniques === "ne sont pas") {
    const { xml: out, paraCount, runCount } = highlightVariantesTechniquesForm(docXml, formData.variantes_techniques);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV formulaire "Variantes techniques" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-V. Section IV "Modèle de Garantie de Soumission" block —
  // red-highlight the whole block (Garantie bancaire letter) when S02-024
  // garantie_soumission = "n'est pas", since no bid security is required.
  if (formData.garantie_soumission === "n'est pas") {
    const { xml: out, paraCount, runCount } = highlightParagraphRange(
      docXml,
      /^Modèle de Garantie de Soumission\s*$/i,
      /^Modèle de Déclaration de Garantie de Soumission\s*$/i,
    );
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Modèle de Garantie de Soumission surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-VI. Section IV "Modèle de Déclaration de Garantie" block —
  // red-highlight the whole block when S02-025 declaration_garantie = "n'est
  // pas", since no bid-security declaration is required.
  if (formData.declaration_garantie === "n'est pas") {
    const { xml: out, paraCount, runCount } = highlightParagraphRange(
      docXml,
      /^Modèle de Déclaration de Garantie de Soumission\s*$/i,
      /^Section V\b|Critères d[’']éligibilité/i,
    );
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Modèle de Déclaration de Garantie surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-VI-bis. ESSS — when S-ESSS-01 esss_applicable = "Non", the
  // entire ESSS block is inapplicable. Two regions must be red-highlighted:
  //   (1) The "Contenu" reference line listing the ESSS specs chapter.
  //       Note: template has a typo — singular "Environnementale" on this line.
  //   (2) The full ESSS chapter introduction down to and including the closing
  //       sentence "…énumérées ci-avant." (last paragraph of the hazardous-
  //       substances enumeration). The next paragraph (starting "[A insérer
  //       en cas de Travaux en zone classée orange…") is the start of the
  //       following block and must NOT be highlighted.
  if (formData.esss_applicable === "Non") {
    // (1) Contenu reference line — single paragraph; tolerate both the typo
    // singular form "Environnementale" and the correct plural.
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^Spécifications Environnementales?,\s+Sociales?,\s+Santé et Sécurité \(ESSS\) de gestion des travaux\s*$/i,
        /^Spécifications s[ûu]ret[ée]\s*$/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] ESSS: ligne Contenu surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // (2) Full ESSS chapter — from the guide intro "[Dans le cas de travaux…"
    // (which sits right above "Table des matières" of the ESSS sub-TOC) down
    // to and including the paragraph ending "…énumérées ci-avant." The range
    // is inclusive of that last paragraph, so we anchor the end on the NEXT
    // paragraph "[A insérer en cas de Travaux en zone classée orange…".
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^\[Dans le cas de travaux pour lesquels la gestion du Chantier/i,
        /^\[A\s+ins[ée]rer en cas de Travaux en zone class[ée]e orange/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] ESSS: chapitre complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
  }

  // 3b-sexies-bis-VI-ter. ESSS — when S-ESSS-01 esss_applicable = "Oui", the
  // ESSS chapter remains applicable but the template's yellow drafting notes
  // (guide paragraphs, "[faire un choix]" row markers, table placeholder
  // phrases, "[Un exemple est donné ci-dessous…]") must be flagged for the
  // MOA to resolve/remove. In addition, the example block "Exemple de
  // situation de travaux et suppression de certaines clauses…" (rendered in
  // a blue rectangle in the reference doc) is purely illustrative and must
  // be red-highlighted in its entirety so the MOA deletes it.
  if (formData.esss_applicable === "Oui") {
    // (0a) Fill the 15-row Enjeux table from S-ESSS-02 (formData.enjeux_esss):
    //      per row, keep the chosen OUI/NON and red-highlight the other.
    {
      const { xml: out, rowCount } = fillEnjeuxTable(docXml, formData.enjeux_esss);
      docXml = out;
      if (rowCount > 0) console.log(`[exportDocx] ESSS (Oui): tableau Enjeux rempli (${rowCount} ligne(s) marquées)`);
    }
    // (0b) Fill the "Exigences ESSS non applicables" articles table from the
    //      user's dynamic rows (articlesEsssRows → S-ESSS-04).
    {
      const { xml: out, rowCount } = fillArticlesTable(docXml, articlesEsssRows);
      docXml = out;
      if (rowCount > 0) console.log(`[exportDocx] ESSS (Oui): tableau Articles non applicables rempli (${rowCount} ligne(s))`);
    }
    // (1) Convert yellow → red inside the ESSS chapter range (paras 2868..3728).
    {
      const { xml: out, paraCount, runCount } = convertYellowToRedInParaRange(
        docXml,
        /^\[Dans le cas de travaux pour lesquels la gestion du Chantier/i,
        /^\[A\s+ins[ée]rer en cas de Travaux en zone class[ée]e orange/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] ESSS (Oui): ${paraCount} paragraphe(s) jaunes convertis en rouge (${runCount} run(s))`);
    }
    // (2) Red-highlight the full "Exemple de situation" example block
    //     (para 2919 → para 2945 "Dans les présentes Spécifications ESSS" exclusive).
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^Exemple de situation de travaux et suppression de certaines clauses/i,
        /^Dans les présentes Spécifications ESSS/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] ESSS (Oui): bloc "Exemple de situation" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
  }

  // 3b-sexies-bis-VI-quinquies. Section IV — "Prix Environnemental, Social,
  // Santé et Sécurité (ESSS)" form (page 61-62) selon S-ESSS-01 :
  //   • Oui → rougir les 2 notes draft jaunes du haut (le bordereau reste
  //     applicable mais ces paragraphes guides doivent être nettoyés).
  //   • Non → rougir TOUT le bloc Prix ESSS (titre + drafts + tableau + textes
  //     de clôture) pour suppression complète.
  if (formData.esss_applicable === 'Oui') {
    const matchRe = /^\[(?:Ce bordereau de prix unitaires est à insérer|Si des Spécifications ESSS ne sont pas incluses dans les Documents d'Appel d'Offres, ce prix ESSS doit être supprimé)/i;
    const { xml: out, paraCount, runCount } = convertYellowToRedInMatchingParagraphs(docXml, matchRe);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV Prix ESSS (Oui): ${paraCount} note(s) draft jaune→rouge (${runCount} run(s))`);
  } else if (formData.esss_applicable === 'Non') {
    // Le titre puis end anchor sur le titre suivant ("Bordereau de Prix
    // Unitaires Sûreté") qui sera exclusif — tout le bloc ESSS prix devient
    // rouge (titre, 2 drafts jaunes, table complète, textes de clôture).
    const startRe = /^Prix Environnemental,?\s*Social,?\s*Santé et Sécurité\s*\(ESSS\)\s*$/i;
    const endRe = /^Bordereau de Prix Unitaires S[ûu]ret[ée]\s*$/i;
    const { xml: out, paraCount, runCount } = highlightParagraphRange(docXml, startRe, endRe);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV Prix ESSS (Non): bloc complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-VI-sexies. Section IV — "Bordereau de Prix Unitaires Sûreté"
  // (page 63) selon S07-001 (`surete_applicable`) :
  //   • "Oui – inclure sûreté" → rougir les 2 notes draft jaunes du haut.
  //   • "Non" → rougir TOUT le bloc Bordereau Sûreté (titre + drafts + tableau
  //     + textes de clôture) pour suppression complète.
  if (formData.surete_applicable === 'Oui – inclure sûreté') {
    const matchRe = /^\[(?:Ce bordereau de prix unitaires est à insérer dans le Bordereau des Prix|Si des spécifications sûreté ne sont pas incluses dans les Documents d'Appel d'Offres, ce bordereau)/i;
    const { xml: out, paraCount, runCount } = convertYellowToRedInMatchingParagraphs(docXml, matchRe);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV Bordereau Sûreté (Oui): ${paraCount} note(s) draft jaune→rouge (${runCount} run(s))`);
  } else if (formData.surete_applicable === 'Non') {
    const startRe = /^Bordereau de Prix Unitaires S[ûu]ret[ée]\s*$/i;
    const endRe = /^Formulaires de la Proposition Technique\s*$/i;
    const { xml: out, paraCount, runCount } = highlightParagraphRange(docXml, startRe, endRe);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Section IV Bordereau Sûreté (Non): bloc complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-bis-VI-septies. Section IV — formulaires "Méthodologie ESSS" et
  // "Engagement ESSS du sous-traitant" (pages 66 à 68) selon S-ESSS-01.
  // Quand `esss_applicable === "Non"`, trois zones doivent être surlignées rouge :
  //   (1) Tout le formulaire "Méthodologie environnementale, sociale, santé et
  //       sécurité (ESSS)" (page 66) — du titre jusqu'à la "Liste des Sous-
  //       traitants" (exclusive).
  //   (2) Le paragraphe d'introduction au formulaire d'engagement ("Les
  //       Soumissionnaires devront fournir, pour chaque sous-traitant
  //       proposé…") situé sous le tableau Liste des Sous-traitants (page 67).
  //   (3) Tout le formulaire "Formulaire d'engagement ESSS du sous-traitant"
  //       (pages 67-68) — du titre jusqu'au formulaire suivant "Organisation
  //       des travaux sur site et Méthode de réalisation" (exclusive).
  // Note : le template peut rendre "Sous-traitants"/"sous-traitant" sans trait
  // d'union dans certains paragraphes (artéfact d'édition Word, similaire à
  // "mi-période" → "mipériode"). Les regex tolèrent les deux formes via
  // `Sous-?traitants` / `sous-?traitant`. De même, le titre Méthodologie peut
  // ne pas avoir d'espace avant "(ESSS)" — `\s*` couvre les deux cas.
  if (formData.esss_applicable === 'Non') {
    // (1) Méthodologie ESSS — formulaire complet (page 66).
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^Méthodologie environnementale,\s*sociale,\s*santé et sécurité\s*\(ESSS\)\s*$/i,
        /^Liste des Sous-?traitants\s*$/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Section IV Méthodologie ESSS (Non): bloc complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // (2) Paragraphe d'intro du formulaire d'engagement (page 67).
    {
      const { xml: out, paraCount, runCount } = highlightParagraphsMatching(
        docXml,
        /^Les Soumissionnaires devront fournir, pour chaque sous-?traitant proposé, l'engagement que ce dernier a lu, compris et se conformera aux exigences ESSS/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Section IV Engagement ESSS (Non): paragraphe d'intro surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // (3) Formulaire d'engagement ESSS du sous-traitant — bloc complet (pages 67-68).
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^Formulaire d'engagement ESSS du sous-?traitant\s*$/i,
        /^Organisation des travaux sur site et Méthode de réalisation\s*$/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Section IV Formulaire engagement ESSS (Non): bloc complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
  }

  // 3b-sexies-bis-VI-quater-pre. Spécifications Sûreté — when S07-001
  // (surete_applicable) is "Oui – inclure sûreté":
  //   (a) Red-highlight the two opening drafting-note paragraphs
  //       "[A insérer en cas de Travaux en zone classée orange…" and
  //       "Pour finaliser ces spécifications, le Maître d'Ouvrage…" (the
  //       blue-circled range in the reference doc). End anchor is the
  //       "Spécifications Sûreté" heading (exclusive), so only the two
  //       guide paragraphs above the title are painted.
  //   (b) Replace each of the three yellow guide paragraphs in the
  //       Préambule with the user's textarea value (S07-002 / S07-003 /
  //       S07-004). If the user left a field blank the yellow guide
  //       stays in place as an unfilled reminder.
  if (formData.surete_applicable === "Oui – inclure sûreté") {
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^\[A\s+ins[ée]rer en cas de Travaux en zone class[ée]e orange/i,
        /^Sp[ée]cifications\s+S[ûu]ret[ée]\s*$/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Sûreté (Oui): bloc d'ouverture surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // S07-002 → "[Insérer une description du contexte sécuritaire…]"
    {
      const r = replaceYellowGuideParagraph(
        docXml,
        /^\[Ins[ée]rer une description du contexte s[ée]curitaire\b/i,
        formData.contexte_securitaire,
      );
      docXml = r.xml;
      if (r.replaced) console.log('[exportDocx] Sûreté (Oui): S07-002 contexte sécuritaire inséré');
    }
    // S07-003 → "[Décrire les rôles et responsabilités, tâches et mise à disposition de moyens par le Maître d'Ouvrage…]"
    {
      const r = replaceYellowGuideParagraph(
        docXml,
        /^\[D[ée]crire les r[ôo]les et responsabilit[ée]s, t[âa]ches et mise [àa] disposition de moyens par le Ma[îi]tre d'Ouvrage\b/i,
        formData.roles_moa_surete,
      );
      docXml = r.xml;
      if (r.replaced) console.log('[exportDocx] Sûreté (Oui): S07-003 rôles MO inséré');
    }
    // S07-004 → "[Il conviendra le cas échéant de préciser les rôles… en cas de marchés par lots.]"
    {
      const r = replaceYellowGuideParagraph(
        docXml,
        /^\[Il conviendra le cas [ée]ch[ée]ant de pr[ée]ciser les r[ôo]les\b/i,
        formData.roles_pilotage_surete_entreprise,
      );
      docXml = r.xml;
      if (r.replaced) console.log('[exportDocx] Sûreté (Oui): S07-004 pilotage entreprise principale inséré');
    }
    // S07-005 Option N°1 vs N°2 (section 4.1 Organisation Sûreté).
    //   Always paint the yellow "[Cocher l'Option N°1 en cas de contexte
    //   sécuritaire très dégradé ; sinon cocher l'Option N°2]" guide red.
    //   Then red-highlight the non-retained option block:
    //     Oui (contexte très dégradé)  → Option N°1 is picked → paint Option N°2
    //     Non                          → Option N°2 is picked → paint Option N°1
    {
      const r = highlightParagraphRange(
        docXml,
        /^\[Cocher l'Option N°1 en cas de contexte s[ée]curitaire tr[èe]s d[ée]grad[ée]/i,
        /^Option N°1\s*:?\s*$/i,
      );
      docXml = r.xml;
      if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) 4.1: guide Option cochée surligné rouge (${r.paraCount} para)`);
    }
    if (formData.conditions_tres_degradees === 'Oui') {
      const r = highlightParagraphRange(
        docXml,
        /^Option N°2\s*:?\s*$/i,
        /^4\.2\s*D[ée]placement\b/i,
      );
      docXml = r.xml;
      if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) 4.1: Option N°2 surlignée rouge (${r.paraCount} para, ${r.runCount} run)`);
    } else if (formData.conditions_tres_degradees === 'Non') {
      const r = highlightParagraphRange(
        docXml,
        /^Option N°1\s*:?\s*$/i,
        /^Option N°2\s*:?\s*$/i,
      );
      docXml = r.xml;
      if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) 4.1: Option N°1 surlignée rouge (${r.paraCount} para, ${r.runCount} run)`);
    }
    // S07-005 also governs the four scattered bullets prefixed by the yellow
    // guide "[à insérer en cas de contexte sécuritaire très dégradé ; sinon
    // supprimer]" across §4.2-satellitaire, §4.3 Hébergement, §4.4 Sites de
    // chantier and §5 Information/Sensibilisation.
    //   Oui (contexte très dégradé) → these bullets apply → keep content,
    //       only the yellow marker flips red so the MOA notices it.
    //   Non (contexte normal)       → these bullets are inapplicable → paint
    //       the whole paragraph red so the MOA deletes it.
    {
      const markerRe = /^\[[àa]\s+ins[ée]rer en cas de contexte s[ée]curitaire tr[èe]s d[ée]grad[ée]\s*;\s*sinon supprimer\]/i;
      if (formData.conditions_tres_degradees === 'Oui') {
        const r = convertYellowToRedInMatchingParagraphs(docXml, markerRe);
        docXml = r.xml;
        if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) contexte très dégradé: ${r.paraCount} marqueur(s) jauni→rouge (${r.runCount} run)`);
      } else if (formData.conditions_tres_degradees === 'Non') {
        const r = highlightParagraphsMatching(docXml, markerRe);
        docXml = r.xml;
        if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) contexte très dégradé: ${r.paraCount} bullet(s) surlignés rouge (${r.runCount} run)`);
      }
    }
    // S07-006 Escortes (section 4.2 Déplacement). The bullet mixes a yellow
    // "[à insérer en cas d'escortes…]" marker with plain text "Identification
    // du prestataire chargé…" in a single paragraph.
    //   Oui → only the yellow marker becomes red (rest of the sentence stays
    //         applicable since escortes ARE needed and the prestataire ID is
    //         relevant).
    //   Non → the whole paragraph becomes red (escortes not needed → the
    //         whole requirement is inapplicable).
    if (formData.escortes_non_prises_en_charge === 'Oui') {
      const r = convertYellowToRedInParaRange(
        docXml,
        /^\[[àa]\s+ins[ée]rer en cas d'escortes jug[ée]es n[ée]cessaires/i,
        /^H[ée]bergement lors des missions\s*$/i,
      );
      docXml = r.xml;
      if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) 4.2: marqueur escortes jauni→rouge (${r.paraCount} para, ${r.runCount} run)`);
    } else if (formData.escortes_non_prises_en_charge === 'Non') {
      const r = highlightParagraphRange(
        docXml,
        /^\[[àa]\s+ins[ée]rer en cas d'escortes jug[ée]es n[ée]cessaires/i,
        /^H[ée]bergement lors des missions\s*$/i,
      );
      docXml = r.xml;
      if (r.paraCount > 0) console.log(`[exportDocx] Sûreté (Oui) 4.2: ligne escortes surlignée rouge (${r.paraCount} para, ${r.runCount} run)`);
    }
  }

  // 3b-sexies-bis-VI-quater. Spécifications Sûreté — when S07-001
  // (surete_applicable) is "Non", the whole Sûreté chapter of Section VII
  // is inapplicable. Red-highlight the range from the chapter's opening
  // guide "[A insérer en cas de Travaux en zone classée orange…" through
  // the very last bullet of section 6 "Gestion des alertes et gestion de
  // crise" ("…identification des éléments déclencheurs, des rôles et
  // responsabilités."). End anchor is the next non-empty paragraph
  // "TROISIEME PARTIE – Marché" (exclusive), so everything up to and
  // including the last Sûreté bullet is painted.
  if (formData.surete_applicable === "Non") {
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^\[A\s+ins[ée]rer en cas de Travaux en zone class[ée]e orange/i,
        /^TROISIEME\s+PARTIE\b/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Sûreté (Non): chapitre complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // Section VII — sommaire "Contenu" : ligne `Spécifications sûreté` (ligne
    // basse-casse, distincte du heading `Spécifications Sûreté` qui apparaît
    // plus loin). Match strict casse pour éviter de toucher le heading.
    {
      const { xml: out, paraCount, runCount } = highlightParagraphsMatching(
        docXml,
        /^Spécifications sûreté\s*$/,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Sûreté (Non): ligne "Spécifications sûreté" du sommaire Contenu surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // Section III — tableau "6. Sûreté" (critères 6.1 à 6.5). Le titre du
    // groupe est rendu comme un paragraphe contenant uniquement "Sûreté"
    // (l'auto-numérotation "6." est portée par le style de liste). Anchor de
    // fin = heading suivant "Section IV Formulaires de Soumission".
    {
      const { xml: out, paraCount, runCount } = highlightParagraphRange(
        docXml,
        /^Sûreté\s*$/,
        /^Section IV\s+Formulaires de Soumission\s*$/i,
      );
      docXml = out;
      if (paraCount > 0) console.log(`[exportDocx] Sûreté (Non): tableau Section III "6. Sûreté" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
    // Notes de bas de page jaunes (footnotes 26/27/28) attachées au tableau
    // 6. Sûreté : convertir leur surlignage jaune → rouge dans
    // `word/footnotes.xml`. Ces 3 ids sont stables dans le template AFD PAY.
    if (footnotesXml) {
      const { xml: outFn, footnoteCount, runCount } = convertYellowToRedInFootnoteIds(
        footnotesXml,
        ['26', '27', '28'],
      );
      footnotesXml = outFn;
      if (footnoteCount > 0) console.log(`[exportDocx] Sûreté (Non): notes de bas de page 26/27/28 jaune→rouge (${footnoteCount} note(s), ${runCount} run(s))`);
    }
  }

  // 3b-sexies-bis-VII-bis. Section V & VI — convert yellow-highlighted guide
  // paragraphs (e.g. "[Le contenu de la Section V dépend…]" and the two
  // OPTION-selection instructions) to red highlight so the MOA notices them
  // as decisions to resolve before signing.
  {
    const { xml: out, paraCount, runCount } = convertYellowToRedInRange(
      docXml,
      /^Section V\b.*Critères d[’']éligibilité/i,
      /^Section VII\b.*Spécifications des Travaux/i,
    );
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] Sections V & VI: ${paraCount} paragraphe(s) jaunes convertis en rouge (${runCount} run(s))`);
  }

  // 3b-sexies-bis-VII. Section III "2. Documents financiers" — the two
  // "[indiquer le nombre] années" phrases are yellow placeholder fragments
  // the MOA would have to manually fill with a count. Replace them with a
  // plain-text phrase that points the soumissionnaire to the Section III
  // criteria table instead, dropping the yellow highlight.
  {
    const r1 = replaceInlinePhrase(docXml, 'les [indiquer le nombre] années', "le nombre d'années requis");
    docXml = r1.xml;
    if (r1.replaced) console.log('[exportDocx] Documents financiers: "les [indiquer le nombre] années" remplacé');
    const r2 = replaceInlinePhrase(docXml, '[indiquer le nombre] années telles que requises', "le nombre d'années requis");
    docXml = r2.xml;
    if (r2.replaced) console.log('[exportDocx] Documents financiers: "[indiquer le nombre] années telles que requises" remplacé');
  }

  // 3b-sexies-ter. IS 33.1 — red-highlight the whole "Marge de préférence"
  // block (Section III) when no preference margin is granted.
  if (formData.marge_preference === "ne sera pas") {
    const { xml: out, paraCount, runCount } = highlightMargePreferenceBlock(docXml, formData.marge_preference);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] IS 33.1 bloc marge de préférence surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-quater. IS 4.5 "n'est pas" — red-highlight the yellow guide
  // "[sinon supprimer toute cette section]" above the 3.3 qualification
  // block (Section III) so the MO can clean it up.
  if (formData.prequalification === "n'est pas") {
    const { xml: out, paraCount, runCount } = highlightNoPrequalGuide(docXml);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] IS 4.5 guide "sinon supprimer toute cette section" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
  }

  // 3b-sexies-quinquies. IS 4.5 "est" — remove the entire 3.3 qualification
  // block (Section III) since pre-qualification already evaluated these
  // criteria. Preserves the portrait sectPr so the remaining Section III
  // paragraphs keep their header/footer.
  if (formData.prequalification === "est") {
    const { xml: out, removed, preservedSectPr } = removeNoPrequalQualificationBlock(docXml, formData.prequalification);
    docXml = out;
    if (removed > 0) console.log(`[exportDocx] IS 4.5 bloc 3.3 qualification sans préqualif supprimé (${removed} paragraphe(s) retirés${preservedSectPr ? ', sectPr portrait préservé' : ''})`);
  }

  // 3b-septies. Static template guides that are always red-highlighted
  // regardless of user data: IS 7.4 mi-période hint, IS 14.5 AFD price
  // revision recommendation, IS 22.1 & 25.1 electronic submission guides.
  {
    const { xml: out, paraCount, runCount } = highlightStaticGuides(docXml);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] ${paraCount} guide(s) statique(s) surligné(s) rouge (${runCount} run(s))`);
  }

  // 3b-septies-bis. Convention AFD OPTION A/B draft markers — ALWAYS red.
  // The template scatters yellow drafting notes around every "OPTION A vs
  // OPTION B (Convention AFD signed before / on or after 1st Feb 2024)"
  // block (Section V Critères, Section VI Pratiques prohibées, Section IV
  // Déclaration d'Intégrité, Annexe B, Annexe C). These notes are instructions
  // to the Maître d'Ouvrage on which OPTION to keep — they must NEVER appear
  // in the final DAO handed to bidders, regardless of whether `date_convention`
  // is set. Convert every matching yellow paragraph to red so clean mode
  // (`stripRedContent`) removes them too. Patterns cover:
  //   - `[Le contenu de l'Annexe X / la Section X … dépend … de signature]` guide
  //   - `Pour tout Marché financé par l'AFD via une Convention … (avant|à partir)` bullets
  //   - `[OPTION A|B – Version … à insérer …]` opening markers
  //   - `(Sinon supprimer cette partie …)` sub-lines
  //   - `Fin de l'OPTION A|B]` closing markers
  {
    const afdOptionMarkersRe = new RegExp([
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
    const { xml: out, paraCount, runCount } = convertYellowToRedInMatchingParagraphs(docXml, afdOptionMarkersRe);
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] ${paraCount} marqueur(s) OPTION A/B Convention AFD → rouge (${runCount} surlignage(s))`);
  }

  // 3b-bis. Fill AAO letter placeholders (Modèle d'Avis d'Appel d'Offres)
  {
    const { xml: out, count } = fillAaoLetterPlaceholders(docXml, formData);
    docXml = out;
    if (count > 0) console.log(`[exportDocx] ${count} placeholder(s) AAO remplis`);
  }

  // 3c-ter. Red-highlight IS 7.4 reunion block when no meeting is scheduled
  if (formData.reunion_prevue === "n'est pas prévue") {
    const { xml: out, paraCount, runCount } = highlightReunionBlock(docXml);
    docXml = out;
    if (paraCount > 0) {
      console.log(`[exportDocx] IS 7.4 bloc réunion surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))`);
    }
  }

  // 3c-bis. Red-highlight prequalification references when IS 4.5 = "n'est pas"
  if (formData.prequalification === "n'est pas") {
    const { xml: out, paraCount, runCount } = highlightPrequalificationReferences(docXml);
    docXml = out;
    if (paraCount > 0) {
      console.log(`[exportDocx] ${paraCount} paragraphe(s) pré-qualification surligné(s) rouge (${runCount} run(s))`);
    }
    // Full "Quelle est l'utilité de la Préqualification ?" guide section
    const u = highlightUtilitySection(docXml);
    docXml = u.xml;
    if (u.paraCount > 0) {
      console.log(`[exportDocx] Section "utilité de la préqualification" : ${u.paraCount} paragraphe(s) surligné(s) rouge (${u.runCount} run(s))`);
    }
  }

  // 3d. Red-highlight deletion markers ("[Rayer la mention inutile]" etc.)
  {
    const { xml: out, count } = highlightDeletionMarkers(docXml);
    docXml = out;
    if (count > 0) console.log(`[exportDocx] ${count} marqueur(s) de suppression surligné(s) rouge`);
  }

  // 3d-bis. Section III §3.2 — toujours convertir jaune→rouge la note draft
  // "[Le montant devrait se situer entre 1.5 et 2 fois l'estimation du montant
  // annuel facturé pour les Travaux objet du Marché]" qui jouxte le titre
  // "Chiffre d'affaires annuel minimum". Rendu inconditionnel : c'est une
  // note éditoriale au MOA, jamais conservée dans le DAO final.
  {
    const { xml: out, paraCount, runCount } = convertYellowToRedInMatchingParagraphs(
      docXml,
      /Le montant devrait se situer entre 1\.5 et 2 fois l['']estimation du montant annuel facturé/i,
    );
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] §3.2 note "Le montant devrait se situer…" jaune→rouge (${paraCount} para, ${runCount} run)`);
  }

  // 3d-ter. Section III §4.2(b)(ii) — Sous-traitant spécialisé.
  //   • Oui → la description (S03-009d / sst_specialise_description) remplace
  //     le placeholder jaune via FIELD_MAP (avec valueOverrideIf qui n'exporte
  //     la valeur que si le toggle est sur "Oui").
  //   • Non → la ligne (ii) est inapplicable : surligner rouge tout son
  //     contenu, du placeholder draft "[ajouter le critère suivant…]" jusqu'à
  //     la cellule "Formulaire EXP-4.2(b)" inclusive (anchor de fin = heading
  //     suivant "Qualification Environnementale…(ESSS)" exclusif).
  if (formData.sst_specialise_autorise === 'Non') {
    const { xml: out, paraCount, runCount } = highlightParagraphRange(
      docXml,
      /^\[ajouter le critère suivant si un sous-traitant spécialisé est autorisé/i,
      /^Qualification Environnementale,\s*Sociale,\s*Santé et Sécurité\s*\(ESSS\)\s*$/i,
    );
    docXml = out;
    if (paraCount > 0) console.log(`[exportDocx] §4.2(b)(ii) Sous-traitant spécialisé (Non): ligne complète surlignée rouge (${paraCount} para, ${runCount} run)`);
  }

  // 3d-bis. CCAP Partie A — règle "yellow draft → red si champ rempli".
  // Pour chaque entrée du registre, si la prédicat de remplissage est vrai,
  // convertir tous les paragraphes correspondants jaune→rouge.
  for (const entry of CCAP_YELLOW_DRAFTS) {
    if (!entry.isFilled(formData)) continue;
    const { xml: out, paraCount, runCount } = convertYellowToRedInMatchingParagraphs(docXml, entry.paraTextRe);
    docXml = out;
    if (paraCount > 0) {
      console.log(`[exportDocx] CCAP draft "${entry.name}" : ${paraCount} paragraphe(s) jaune→rouge (${runCount} run(s))`);
    }
  }

  // 3e. Clean mode — strip all red-highlighted content (paragraphs fully red
  // are removed; paragraphs with mixed content have only their red runs
  // stripped). Runs at this point carry the highlight="red" flag from all the
  // previous 3a…3d steps.
  if (cleanMode) {
    const { xml: out, paragraphsRemoved, runsRemoved, emptyCellsFixed } = stripRedContent(docXml);
    docXml = out;
    console.log(
      `[exportDocx] Clean mode: ${paragraphsRemoved} paragraphe(s) rouge(s) supprimé(s), ` +
      `${runsRemoved} run(s) rouge(s) retiré(s), ${emptyCellsFixed} cellule(s) vide(s) réparée(s)`
    );
    const { xml: out2, removed: tablesRemoved } = stripEmptyTables(docXml);
    docXml = out2;
    if (tablesRemoved > 0) {
      console.log(`[exportDocx] Clean mode: ${tablesRemoved} tableau(x) vide(s) supprimé(s)`);
    }
  }

  // 4. Write comments.xml + patch Content_Types and rels
  if (commentEntries.length > 0) {
    zip.file('word/comments.xml', buildCommentsXml(commentEntries));

    let ctXml = await zip.file('[Content_Types].xml').async('string');
    if (!ctXml.includes('comments+xml')) {
      ctXml = ctXml.replace('</Types>',
        '<Override PartName="/word/comments.xml" ' +
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>\n</Types>');
      zip.file('[Content_Types].xml', ctXml);
    }

    let relsXml = await zip.file('word/_rels/document.xml.rels').async('string');
    if (!relsXml.includes('comments')) {
      relsXml = relsXml.replace('</Relationships>',
        '<Relationship Id="rIdComments" ' +
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" ' +
        'Target="comments.xml"/>\n</Relationships>');
      zip.file('word/_rels/document.xml.rels', relsXml);
    }
  }

  // 5. Write modified document and generate blob
  zip.file('word/document.xml', docXml);
  if (footnotesXml) zip.file('word/footnotes.xml', footnotesXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const projectName = (formData.nom_projet || 'DTAO')
    .replace(/[^a-zA-Z0-9À-ÖØ-öø-ÿ\s-]/g, '') // exclut × (U+00D7) et ÷ (U+00F7), invalides dans les noms de fichiers Windows
    .trim()
    .replace(/\s+/g, '_');
  const suffix = cleanMode ? '_clean' : '';
  const filename = `DTAO_${projectName}_${new Date().toISOString().slice(0, 10)}${suffix}.docx`;

  saveAs(blob, filename);
  return filename;
}
