// Reverse of exportXlsx: read a round-tripped file back into app state.
// Matches rows by the technical `id` column (first column, hidden in Excel).
// Special tables (personnel, matériel, proposition) use ID prefixes like
// `__personnel_0`; those are parsed back into their structured rows.

import * as XLSX from 'xlsx-js-style';
import { SECTIONS } from '../../packages/v2024/fr/sections.js';
import { isEnjeuEsssLabel, enjeuKeyByLabel } from '../../packages/v2024/fr/enjeux.js';

// Build a lookup: field.id → field definition (including type).
function indexFieldsById() {
  const map = {};
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      map[field.id] = { ...field, sectionId: section.id };
    }
  }
  return map;
}

function parseDateString(s) {
  // Accept "DD/MM/YYYY" (French) or ISO. Returns "YYYY-MM-DD" for the <input type="date">.
  if (typeof s === 'number' && s > 1000) {
    // Excel numeric serial (days since 1900 with the historical leap-year bug)
    const d = new Date(Math.round((s - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const str = String(s).trim();
  const fr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const [, d, m, y] = fr;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  return str;
}

function parseTimeString(s) {
  // Returns "HH:MM" for <input type="time">.
  if (typeof s === 'number' && s >= 0 && s <= 1) {
    // Excel time fraction of a day
    const total = Math.round(s * 24 * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const str = String(s).trim();
  const m = str.match(/^(\d{1,2})[:h.](\d{1,2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  return str;
}

function coerceValue(raw, field) {
  if (raw === undefined || raw === null || raw === '') return '';
  if (field.type === 'date') return parseDateString(raw);
  if (field.type === 'time') return parseTimeString(raw);
  return String(raw).trim();
}

// Parse the "Destinataire" cell (comma-separated actor labels) back into
// actor IDs by looking up `actors` by label. Unknown labels are dropped.
function parseRecipients(cellValue, actors) {
  if (!cellValue) return [];
  const labels = String(cellValue).split(/,\s*/).map(s => s.trim()).filter(Boolean);
  const ids = [];
  for (const lbl of labels) {
    const a = actors.find(x => x.label === lbl);
    if (a) ids.push(a.id);
  }
  return ids;
}

// Entry point. Reads the ArrayBuffer, parses the first sheet, returns
// { formData, fieldComments, actorAssignments, personnelRows, materielRows,
//   propositionItems, seenFieldIds, hasPersonnelSection, hasMaterielSection,
//   hasPropositionSection, unknown } — the caller uses these to replace state.
//
// `seenFieldIds` lets the caller CLEAR previously-set values/comments/recipients
// for fields that appeared in the Excel but were left empty — otherwise the
// app's existing state would leak through the merge.
//
// Special tables (personnel / matériel / proposition) are detected by the
// "Réf." column prefix: PER-N, MAT-N, PT-N. This means the user can simply
// add a new row in Excel with an incremented ref (e.g. PER-3) and the poste
// name in the "Champ" cell — the app will import it as a new personnel entry.
export function parseXlsxImport(arrayBuffer, { actors }) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Aucune feuille trouvée dans le fichier.');

  // aoa parsing, keeping empty cells as '' so column positions stay stable
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (rows.length < 2) throw new Error('Le fichier est vide.');

  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const idCol  = header.indexOf('id');
  const refCol = header.findIndex(h => h.startsWith('réf') || h.startsWith('ref'));
  const labelCol = header.findIndex(h => h === 'champ');
  const contextCol = header.findIndex(h => h.startsWith('contexte'));
  const valueCol = header.findIndex(h => h.startsWith('valeur'));
  const commentCol = header.findIndex(h => h.startsWith('commentair'));
  const recipCol = header.findIndex(h => h.startsWith('destinataire'));
  if (idCol === -1 || valueCol === -1) {
    throw new Error('En-têtes manquants. Utilisez un fichier exporté depuis l\'application (colonnes "ID" et "Valeur remplie" requises).');
  }

  const fieldIndex = indexFieldsById();
  const formData = {};
  const fieldComments = {};
  const actorAssignments = {};
  const seenFieldIds = new Set(); // all regular field IDs that appeared in the sheet
  // Special tables are collected in document order (push) so manually added
  // rows integrate naturally at their position.
  const personnelRows = [];
  const materielRows = [];
  const propositionItems = [];
  // ESSS sub-rows
  const enjeuxEsssValue = {}; // { a: "Oui", b: "Non", ... }
  const articlesEsssRows = [];
  let hasEnjeuxEsssSection = false;
  let hasArticlesEsssSection = false;
  let inArticlesTable = false; // true after we pass the "N° d'Article non applicable" header until a non-article row is hit
  // CCAP — Résumé des Tranches sub-rows
  const tranchesRows = [];
  let hasTranchesSection = false;
  let inTranchesTable = false; // true after the tranches header until a non-tranche row breaks the context
  let hasPersonnelSection = false;
  let hasMaterielSection = false;
  let hasPropositionSection = false;
  const unknown = []; // ids that didn't match any known field

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[idCol] ?? '').trim();
    const refVal = refCol !== -1 ? String(row[refCol] ?? '').trim() : '';
    const label = String(row[labelCol] ?? '').trim();
    const value = row[valueCol];
    const comment = row[commentCol] ?? '';
    const recipients = row[recipCol] ?? '';

    // Special tables — matched by the "Réf." column prefix (PER- / MAT- / PT-).
    // This check runs BEFORE the empty-ID section-header check so that
    // user-added rows (which have a ref but no ID) are imported correctly.
    if (/^PER[-_]/i.test(refVal) || id.startsWith('__personnel_')) {
      const parsed = parsePersonnelLine({
        poste: label,
        expGen: contextCol !== -1 ? row[contextCol] : '',
        expComp: value,
        note: comment,
      });
      // Skip phantom empty rows (added but never filled).
      if (parsed.poste || parsed.exp_generale || parsed.exp_comparable || parsed.note) {
        personnelRows.push(parsed);
      }
      hasPersonnelSection = true;
      continue;
    }
    if (/^MAT[-_]/i.test(refVal) || id.startsWith('__materiel_')) {
      const parsed = parseMaterielLine({
        type: label,
        nombreMin: contextCol !== -1 ? row[contextCol] : '',
      });
      if (parsed.type || parsed.nombre_min) {
        materielRows.push(parsed);
      }
      hasMaterielSection = true;
      continue;
    }
    // Enjeux ESSS sub-rows (15 enjeux keyed a-o). Must be checked BEFORE the
    // proposition alpha-ref branch because enjeu rows share the "a)", "b)", …
    // ref pattern. Detected primarily via the __enjeu_X id prefix; fallback to
    // ref pattern only when id is empty AND the Contexte cell explicitly says
    // "Applicable (Oui / Non)" (set by the exporter).
    // ESSS detection — 3 voies (par ordre de fiabilité décroissante) :
    //  1. id `__enjeu_X` (export standard)
    //  2. label = un des 15 enjeux ESSS connus (resilient à perte d'id, à des
    //     xlsx édités à la main, ou à un export ancien)
    //  3. ref `a)..o)` + contexte "Applicable (Oui/Non)" (compat ascendante)
    {
      const isEnjeuById = id.startsWith('__enjeu_');
      const isEnjeuByLabel = isEnjeuEsssLabel(label);
      const isEnjeuByRefCtx =
        !id && /^[a-o]\)$/i.test(refVal) &&
        /Applicable\s*\(Oui\s*\/\s*Non\)/i.test(String(row[contextCol] ?? ''));
      if (isEnjeuById || isEnjeuByLabel || isEnjeuByRefCtx) {
        let key;
        if (isEnjeuById) key = id.slice('__enjeu_'.length);
        else if (isEnjeuByLabel) key = enjeuKeyByLabel(label);
        else key = refVal.replace(/\)$/, '').toLowerCase();
        const v = String(value ?? '').trim();
        if (v === 'Oui' || v === 'Non') enjeuxEsssValue[key] = v;
        hasEnjeuxEsssSection = true;
        inArticlesTable = false;
        continue;
      }
    }

    // Articles non applicables sub-rows. Detected via __articles_N id prefix
    // (standard export) OR contextually when we're "inside" the articles table
    // following its header row (so users can add new rows by just inserting a
    // new row under the last one — mirrors personnel/materiel UX).
    // Table header row has "N° d'Article non applicable" in the Champ column.
    const labelCell = String(row[labelCol] ?? '');
    const ctxCell = contextCol !== -1 ? String(row[contextCol] ?? '') : '';
    if (/N°\s*d['’]Article non applicable/i.test(labelCell)) {
      inArticlesTable = true;
      hasArticlesEsssSection = true;
      continue;
    }
    if (id.startsWith('__articles_')
        || (inArticlesTable && !id && (labelCell.trim() || ctxCell.trim()))) {
      // Articles use the compact table layout: Champ = article, Contexte = explication.
      const article = labelCell.trim();
      const explication = ctxCell.trim();
      if (article || explication) {
        articlesEsssRows.push({
          id: Date.now() + Math.random(),
          article,
          explication,
        });
      }
      hasArticlesEsssSection = true;
      continue;
    }
    // Any other row breaks the "in articles table" context.
    inArticlesTable = false;

    // CCAP — Résumé des Tranches sub-rows. Header has "Nom / Description des
    // Tranches" in the Champ column. Detected via __tranche_N id prefix
    // (standard export) OR contextually when "inside" the table — same UX as
    // articles/personnel/materiel: users can drop a new line under the last.
    const valStr = valueCol !== -1 ? String(row[valueCol] ?? '') : '';
    if (/Nom\s*\/\s*Description des Tranches/i.test(labelCell)) {
      inTranchesTable = true;
      hasTranchesSection = true;
      continue;
    }
    if (id.startsWith('__tranche_')
        || (inTranchesTable && !id && (labelCell.trim() || ctxCell.trim() || valStr.trim()))) {
      // Tranche layout in Excel: Champ = nom, Contexte = délai, Valeur = pénalités.
      const nom = labelCell.trim();
      const delai = ctxCell.trim();
      const penalites = valStr.trim();
      if (nom || delai || penalites) {
        tranchesRows.push({
          id: Date.now() + Math.random(),
          nom,
          delai,
          penalites,
        });
      }
      hasTranchesSection = true;
      continue;
    }
    inTranchesTable = false;

    // Proposition items: accept legacy PT-N refs AND the new "a)", "b)", …
    // alpha-label refs. The trailing ")" is required to avoid collisions with
    // field refs like "A" or "II". Filet de sécurité : refuser tout label qui
    // correspond à un enjeu ESSS (cas d'un xlsx mal balisé qui aurait échappé
    // à la détection ESSS ci-dessus).
    if (
      !isEnjeuEsssLabel(label)
      && (
        /^PT[-_]/i.test(refVal)
        || /^[a-z]{1,2}\)$/i.test(refVal)
        || id.startsWith('__proposition_')
      )
    ) {
      propositionItems.push(parsePropositionLine(label, value));
      hasPropositionSection = true;
      continue;
    }

    // Detect section headers (merged title rows, no ID). Used downstream so we
    // know whether to trust an empty table array as "user cleared it".
    if (!id) {
      const first = String(row[0] || '');
      if (/Personnel clé/i.test(first)) hasPersonnelSection = true;
      if (/Matériel clé/i.test(first)) hasMaterielSection = true;
      if (/Proposition technique/i.test(first)) hasPropositionSection = true;
      continue;
    }

    // Regular field
    if (fieldIndex[id]) {
      const field = fieldIndex[id];
      seenFieldIds.add(id);
      const coerced = coerceValue(value, field);
      if (coerced !== '') formData[id] = coerced;
      const commentStr = String(comment).trim();
      if (commentStr) fieldComments[id] = commentStr;
      const actorIds = parseRecipients(recipients, actors);
      if (actorIds.length) actorAssignments[id] = actorIds;
      continue;
    }

    unknown.push(id);
  }

  return {
    formData,
    fieldComments,
    actorAssignments,
    personnelRows,
    materielRows,
    propositionItems,
    enjeuxEsssValue,
    articlesEsssRows,
    tranchesRows,
    seenFieldIds: [...seenFieldIds],
    hasPersonnelSection,
    hasMaterielSection,
    hasPropositionSection,
    hasEnjeuxEsssSection,
    hasArticlesEsssSection,
    hasTranchesSection,
    unknown,
  };
}

// Personnel rows now use separate Excel columns (Champ/Contexte/Valeur/
// Commentaires → poste/exp_gen/exp_comp/note), matching the Word table layout.
// We still tolerate the legacy concatenated-value shape ("Expérience gén.: X
// ans | …") on the exp_comp input, so older exports can still be re-imported.
function digitsOrEmpty(cell) {
  if (cell === undefined || cell === null || cell === '') return '';
  const s = String(cell).trim();
  const m = s.match(/\d+/);
  return m ? m[0] : '';
}
function parsePersonnelLine({ poste, expGen, expComp, note }) {
  const posteStr = String(poste || '').trim();
  // Legacy fallback: if expComp carries the whole "| …" payload, parse it
  // the old way. Detect by the presence of the old prefixes.
  const expCompStr = String(expComp || '');
  if (/Expérience\s*(gén|comp)/i.test(expCompStr)) {
    const gen = (expCompStr.match(/Expérience gén\.\s*:\s*(\d+)/i) || [])[1] || '';
    const comp = (expCompStr.match(/Expérience comp\.\s*:\s*(\d+)/i) || [])[1] || '';
    const legacyNote = (expCompStr.match(/Note\s*:\s*(.+)$/) || [])[1]?.trim() || String(note || '').trim();
    return { id: Date.now() + Math.random(), poste: posteStr, exp_generale: gen, exp_comparable: comp, note: legacyNote };
  }
  return {
    id: Date.now() + Math.random(),
    poste: posteStr,
    exp_generale: digitsOrEmpty(expGen),
    exp_comparable: digitsOrEmpty(expComp),
    note: String(note || '').trim(),
  };
}

// Matériel rows: Champ → type, Contexte → nombre_min (as a plain number cell).
// Legacy fallback: accept "Nombre min.: N" coming through the Contexte column.
function parseMaterielLine({ type, nombreMin }) {
  const typeStr = String(type || '').trim();
  const raw = String(nombreMin || '');
  const legacy = raw.match(/Nombre min\.\s*:\s*(\d+)/i);
  const nb = legacy ? legacy[1] : digitsOrEmpty(raw);
  return { id: Date.now() + Math.random(), type: typeStr, nombre_min: nb };
}

// Value cell: "[✓] <description>" or "[ ] <description>"
function parsePropositionLine(labelCell, valueCell) {
  const label = String(labelCell || '').trim();
  const val = String(valueCell || '');
  const enabled = /^\s*\[✓\]/.test(val);
  const description = val.replace(/^\s*\[[✓\s]\]\s*/, '').trim();
  return { id: Date.now() + Math.random(), label, enabled, description };
}
