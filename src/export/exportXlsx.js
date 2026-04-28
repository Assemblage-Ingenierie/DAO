// xlsx-js-style is a fork of SheetJS adding cell-level styling support.
// Same API as xlsx — we just go through it to attach `s: { font, fill, … }`
// objects to cells.
import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import { saveAs } from '../utils/saveBlob.js';
import { SECTIONS, SECTION_GROUPS } from '../data/sections.js';
import { ENJEUX_ESSS, isEnjeuEsssLabel } from '../data/enjeuxEsss.js';

// ── Value formatting ──────────────────────────────────────────────────────

function fmtDate(v) {
  try { return new Date(v).toLocaleDateString('fr-FR'); }
  catch { return String(v); }
}

function fmtValue(value, type) {
  if (value === undefined || value === null || value === '') return '';
  if (type === 'date') return fmtDate(value);
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// ── Special tables (personnel / matériel / proposition) ───────────────────
// Personnel and matériel are rendered as real multi-column tables, mirroring
// the Word template layout. Instead of a single "Valeur" string packing all
// fields, each attribute gets its own Excel column — so the user edits
// "Poste", "Exp. gén. (ans)" etc. in dedicated cells.
//
// Column mapping (reusing the 8 main columns):
//   Personnel rows  → [_, id, ref=PER-N, poste, expGen, expComp, note, _]
//   Matériel rows   → [_, id, ref=MAT-N, type,  nombreMin, _,      _,    _]
//
// A "tableHeader" sub-row is emitted just above the data rows to relabel the
// columns Contexte/Valeur/Commentaires as Exp. gén. / Exp. comp. / Note etc.,
// making the block read like a Word table despite the shared sheet columns.

// Skip a row that has no data in any meaningful cell — the UI allows the user
// to click "Ajouter une ligne" without filling it; those phantom rows should
// not leak into the export.
function isEmptyPersonnel(r) {
  return !r.poste && !r.exp_generale && !r.exp_comparable && !r.note;
}
function isEmptyMateriel(r) {
  return !r.type && !r.nombre_min;
}

function personnelRowsToTable(rows) {
  const out = [];
  // Sub-header row labels mirror the Word table column titles.
  out.push({
    kind: 'tableHeader',
    cells: ['', '', 'Réf.', 'Poste', 'Exp. gén. (ans)', 'Exp. comp. (ans)', 'Note', ''],
  });
  const filtered = (rows || []).filter((r) => !isEmptyPersonnel(r));
  filtered.forEach((r, idx) => {
    out.push({
      kind: 'tableRow',
      cells: [
        '',
        `__personnel_${idx}`,
        String(idx + 1),
        r.poste || '',
        r.exp_generale || '',
        r.exp_comparable || '',
        r.note || '',
        '',
      ],
    });
  });
  return out;
}

function materielRowsToTable(rows) {
  const out = [];
  out.push({
    kind: 'tableHeader',
    cells: ['', '', 'Réf.', 'Type de matériel', 'Nombre min.', '', '', ''],
  });
  const filtered = (rows || []).filter((r) => !isEmptyMateriel(r));
  filtered.forEach((r, idx) => {
    out.push({
      kind: 'tableRow',
      cells: [
        '',
        `__materiel_${idx}`,
        String(idx + 1),
        r.type || '',
        r.nombre_min || '',
        '',
        '',
        '',
      ],
    });
  });
  return out;
}

// Convert a 0-based index to a spreadsheet-style letter label: 0→a, 1→b, …
// After 25 (z) it continues as aa, ab, … which is rarely reached in practice.
function indexToAlphaLabel(idx) {
  let n = idx;
  let s = '';
  do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

// ── ESSS: Enjeux (15 fixed rows a-o) and Articles non applicables ─────────
// Enjeux list is kept in formData.enjeux_esss as `{ a: "Oui", b: "Non", ... }`.
// We emit 15 sub-rows below the parent S-ESSS-02 field row, one per enjeu,
// each with its own Oui/Non dropdown so the user can tweak choices directly
// in Excel (and the round-trip importer can pick them up again).

function enjeuxValueToEntries(value) {
  const v = value || {};
  return ENJEUX_ESSS.map((e) => ({
    id: `__enjeu_${e.key}`,
    ref: `${e.key})`,
    label: e.label,
    context: 'Applicable (Oui / Non)',
    value: v[e.key] || '',
  }));
}

// Articles non applicables are dynamic rows, kept in the separate
// `articlesEsssRows` state. Mirror the materiel table layout for a compact
// grid in Excel: No. | N° d'Article | Explication.
function isEmptyArticleRow(r) {
  return !(r && ((r.article || '').trim() || (r.explication || '').trim()));
}

function articlesRowsToTable(rows) {
  const out = [];
  out.push({
    kind: 'tableHeader',
    cells: ['', '', 'No.', "N° d'Article non applicable", 'Explications', '', '', ''],
  });
  const filtered = (rows || []).filter((r) => !isEmptyArticleRow(r));
  // Always emit at least one (possibly empty) row so the table structure is
  // visible in Excel and the user can fill it in directly. The importer will
  // simply skip blank rows on round-trip.
  const emitted = filtered.length > 0
    ? filtered
    : [{ article: '', explication: '' }];
  emitted.forEach((r, idx) => {
    out.push({
      kind: 'tableRow',
      cells: [
        '',
        `__articles_${idx}`,
        String(idx + 1),
        r.article || '',
        r.explication || '',
        '',
        '',
        '',
      ],
    });
  });
  return out;
}

// CCAP — Résumé des Tranches. Dynamic rows kept in the separate
// `tranchesRows` state. Mirror the materiel/articles layout for a compact
// grid in Excel: No. | Nom/Description | Délai d'Achèvement | Pénalités.
function isEmptyTrancheRow(r) {
  return !(r && (
    (r.nom || '').trim() ||
    (r.delai || '').trim() ||
    (r.penalites || '').trim()
  ));
}

function tranchesRowsToTable(rows) {
  const out = [];
  out.push({
    kind: 'tableHeader',
    cells: ['', '', 'No.', 'Nom / Description des Tranches', "Délai d'Achèvement", 'Pénalités de retard', '', ''],
  });
  const filtered = (rows || []).filter((r) => !isEmptyTrancheRow(r));
  // Keep at least one (possibly empty) row so the structure is always
  // visible in Excel and stays round-trippable. The importer skips blanks.
  const emitted = filtered.length > 0
    ? filtered
    : [{ nom: '', delai: '', penalites: '' }];
  emitted.forEach((r, idx) => {
    out.push({
      kind: 'tableRow',
      cells: [
        '',
        `__tranche_${idx}`,
        String(idx + 1),
        r.nom || '',
        r.delai || '',
        r.penalites || '',
        '',
        '',
      ],
    });
  });
  return out;
}

function propositionItemsToEntries(items) {
  // Filet de sécurité : retirer toute pollution ESSS d'un import xlsx mal
  // balisé avant de réécrire la liste à l'export.
  const clean = (items || []).filter((it) => !isEnjeuEsssLabel(it?.label));
  return clean.map((item, idx) => ({
    id: `__proposition_${idx}`,
    ref: `${indexToAlphaLabel(idx)})`,
    label: item.label || '',
    context: 'Item de la Proposition technique',
    value: `${item.enabled ? '[✓]' : '[ ]'} ${item.description || ''}`,
  }));
}

// ── Sheet construction ────────────────────────────────────────────────────

// Find the group label for a section id.
function groupOf(sectionId) {
  const g = SECTION_GROUPS.find(g => g.sectionIds.includes(sectionId));
  return g ? g.groupLabel : '';
}

// Build array-of-arrays AOA for SheetJS. Each row is
//   [UID, ID, Réf., Champ, Contexte, Valeur, Commentaires, Destinataire]
// UID (col 0) is the user-facing unique identifier (e.g. "S02-013"), shown
// in the app — visible, small gray bold. ID (col 1) is the technical key
// used for round-tripping; hidden by default.
function buildAoa({ formData, actorAssignments, fieldComments, actors, personnelRows, materielRows, propositionItems, articlesEsssRows, tranchesRows }) {
  const NCOL = 8;
  const VALUE_COL = 5; // shifted +1 because UID column was inserted at index 0
  const rows = [];
  const merges = [];
  const rowStyles = []; // parallel: 'group' | 'section' | 'field' | 'header'
  const dropdowns = []; // { rowIdx, options, multi } for fields with choices
  const dateCells = []; // { rowIdx, iso }
  const timeCells = []; // { rowIdx, hhmm }

  const empty = (first) => {
    const row = new Array(NCOL).fill('');
    row[0] = first;
    return row;
  };

  // Header row
  rows.push(['UID', 'ID', 'Réf.', 'Champ', 'Contexte', 'Valeur remplie', 'Commentaires', 'Destinataire']);
  rowStyles.push('header');

  let lastGroup = null;

  for (const section of SECTIONS) {
    const group = groupOf(section.id);

    // Group divider (once per group)
    if (group && group !== lastGroup) {
      const r = rows.length;
      rows.push(empty(group));
      merges.push({ s: { r, c: 0 }, e: { r, c: NCOL - 1 } });
      rowStyles.push('group');
      lastGroup = group;
    }

    // Section header
    {
      const r = rows.length;
      let title = `${section.icon || ''} ${section.title}`.trim();
      if (section.id === 'personnel_cle') {
        title += " — ajouter une ligne sous le tableau (incrémenter PER-N) et remplir les colonnes Poste / Exp. gén. / Exp. comp. / Note";
      } else if (section.id === 'materiel_cle') {
        title += " — ajouter une ligne sous le tableau (incrémenter MAT-N) et remplir les colonnes Type / Nombre min.";
      } else if (section.id === 'proposition_technique') {
        title += " — Supprimer les points (a, b, c) qui ne sont pas utiles et ajouter les nouveaux points voulus. Puis mettre à jour la numérotation a, b, c dans la première colonne. Ajouter des lignes si nécessaire";
      }
      rows.push(empty(title));
      merges.push({ s: { r, c: 0 }, e: { r, c: NCOL - 1 } });
      rowStyles.push('section');
    }

    // Field rows
    for (const field of section.fields) {
      // Skip auto-derived/notice rows: mirror (auto-remplis depuis d'autres
      // champs, ex: CCAP-001/002/008) et readonly (notes/renvois, ex: CCAP-007,
      // PREA-000). Ces lignes n'attendent pas de saisie utilisateur.
      if (field.type === 'mirror' || field.type === 'readonly') continue;
      const actorIds = actorAssignments?.[field.id] || [];
      const recipientLabels = actorIds
        .map(id => actors.find(a => a.id === id)?.label)
        .filter(Boolean)
        .join(', ');
      const commentText = fieldComments?.[field.id] || '';
      const ref = field.ref || '';
      // Special cases: the enjeux_list and articles_table store non-scalar
      // data (object / array of objects) that would otherwise stringify as
      // "[object Object]". We emit a short reference line on the parent row
      // and expand the real data as sub-rows after the section's fields.
      let value;
      if (field.type === 'enjeux_list') {
        const v = formData?.[field.id] || {};
        const filled = Object.values(v).filter((x) => x === 'Oui' || x === 'Non').length;
        value = filled > 0 ? `(${filled}/15 enjeux renseignés — voir lignes ci-dessous)` : '';
      } else if (field.type === 'articles_table') {
        const n = (articlesEsssRows || []).filter((r) => !isEmptyArticleRow(r)).length;
        value = n > 0 ? `(${n} article${n > 1 ? 's' : ''} — voir lignes ci-dessous)` : '';
      } else if (field.type === 'tranchesTable') {
        const n = (tranchesRows || []).filter((r) => !isEmptyTrancheRow(r)).length;
        value = n > 0 ? `(${n} tranche${n > 1 ? 's' : ''} — voir lignes ci-dessous)` : '';
      } else {
        value = fmtValue(formData?.[field.id], field.type);
      }
      const context = field.context || '';
      const uid = field.uid || '';
      rows.push([uid, field.id, ref, field.label, context, value, commentText, recipientLabels]);
      rowStyles.push('field');
      const rowIdx = rows.length - 1; // 0-indexed position in `rows`

      // Collect typed cells so we can:
      //  - rewrite them as real Excel date/time cells (proper format)
      //  - attach a dataValidation so invalid entries are rejected
      if (field.type === 'date') {
        dateCells.push({ rowIdx, iso: formData?.[field.id] || '' });
      } else if (field.type === 'time') {
        timeCells.push({ rowIdx, hhmm: formData?.[field.id] || '' });
      } else if (Array.isArray(field.options) && field.options.length > 0) {
        // Excel data validation "list" is single-selection only; for multi we
        // still publish the list but keep it as a soft warning so the user can
        // type comma-separated values manually — the importer re-parses those.
        dropdowns.push({
          rowIdx,
          options: field.options.map(String),
          multi: field.type === 'multi',
        });
      }
    }

    // Special tables embedded in specific sections
    if (section.id === 'personnel_cle') {
      for (const e of personnelRowsToTable(personnelRows)) {
        rows.push(e.cells);
        rowStyles.push(e.kind);
      }
    }
    if (section.id === 'materiel_cle') {
      for (const e of materielRowsToTable(materielRows)) {
        rows.push(e.cells);
        rowStyles.push(e.kind);
      }
    }
    if (section.id === 'proposition_technique') {
      for (const e of propositionItemsToEntries(propositionItems)) {
        rows.push(['', e.id, e.ref, e.label, e.context, e.value, '', '']);
        rowStyles.push('field');
      }
    }
    // ESSS transversal section — expand the 2 non-scalar fields
    // (enjeux_esss → 15 Oui/Non sub-rows; articles_non_applicables →
    // dynamic article/explication sub-rows) so the Excel user can
    // edit them cell-by-cell and the importer can round-trip.
    if (section.id === 'esss_transverse') {
      // Find the enjeux field to know which one the sub-rows belong to.
      const enjeuxField = section.fields.find((f) => f.type === 'enjeux_list');
      if (enjeuxField) {
        for (const e of enjeuxValueToEntries(formData?.[enjeuxField.id])) {
          rows.push(['', e.id, e.ref, e.label, e.context, e.value, '', '']);
          rowStyles.push('field');
          // Per-enjeu Oui/Non dropdown
          dropdowns.push({
            rowIdx: rows.length - 1,
            options: ['Oui', 'Non'],
            multi: false,
          });
        }
      }
      for (const e of articlesRowsToTable(articlesEsssRows)) {
        rows.push(e.cells);
        rowStyles.push(e.kind);
      }
    }
    // CCAP — expand the dynamic Résumé des Tranches sub-rows so the Excel
    // user can edit them cell-by-cell and the importer can round-trip.
    if (section.id === 'ccap') {
      for (const e of tranchesRowsToTable(tranchesRows)) {
        rows.push(e.cells);
        rowStyles.push(e.kind);
      }
    }
  }

  return { rows, merges, rowStyles, dropdowns, dateCells, timeCells };
}

// ── Styling ────────────────────────────────────────────────────────────────
// Colors follow the Assemblage Ingénierie / DTAO chart.

const BORDER_THIN = { style: 'thin', color: { rgb: 'DFE4E8' } };
const BORDER_CELL = {
  top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN,
};

const STYLE = {
  header: {
    font: { name: 'Open Sans', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: '30323E' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER_CELL,
  },
  group: {
    font: { name: 'Open Sans', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'E30513' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER_CELL,
  },
  section: {
    font: { name: 'Open Sans', sz: 11, bold: true, color: { rgb: '30323E' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'DFE4E8' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: BORDER_CELL,
  },
  field: {
    font: { name: 'Open Sans', sz: 10, color: { rgb: '30323E' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: BORDER_CELL,
  },
  id: {
    font: { name: 'Consolas', sz: 8, color: { rgb: '999999' } },
    alignment: { horizontal: 'left', vertical: 'top' },
    border: BORDER_CELL,
  },
  uid: {
    font: { name: 'Consolas', sz: 9, bold: true, color: { rgb: 'BDBDBD' } },
    alignment: { horizontal: 'left', vertical: 'top' },
    border: BORDER_CELL,
  },
  ref: {
    font: { name: 'Open Sans', sz: 10, bold: true, color: { rgb: '4D4D4D' } },
    alignment: { horizontal: 'left', vertical: 'top' },
    border: BORDER_CELL,
  },
  context: {
    font: { name: 'Open Sans', sz: 9, italic: true, color: { rgb: '888888' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: BORDER_CELL,
  },
  valueFilled: {
    font: { name: 'Open Sans', sz: 10, color: { rgb: '2E7D32' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'E8F5E9' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: BORDER_CELL,
  },
  // Sub-header row that relabels the columns for the personnel / matériel
  // tables — makes those blocks read like a Word table.
  tableHeader: {
    font: { name: 'Open Sans', sz: 10, bold: true, color: { rgb: '30323E' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'F2F2F2' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER_CELL,
  },
  // Data cell inside a personnel / matériel table — distinct from a regular
  // "Valeur remplie" green cell: every column is a data column so we want a
  // neutral, dense grid look.
  tableCell: {
    font: { name: 'Open Sans', sz: 10, color: { rgb: '30323E' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: BORDER_CELL,
  },
  tableCellNum: {
    font: { name: 'Open Sans', sz: 10, color: { rgb: '30323E' } },
    alignment: { horizontal: 'center', vertical: 'top' },
    border: BORDER_CELL,
  },
  tableCellRef: {
    font: { name: 'Open Sans', sz: 10, bold: true, color: { rgb: '4D4D4D' } },
    alignment: { horizontal: 'center', vertical: 'top' },
    border: BORDER_CELL,
  },
};

function applyLayout(ws, rows, merges, rowStyles) {
  const NCOL = 8;
  ws['!merges'] = merges;
  // Column widths — UID is visible (user-facing id). ID is technical (hidden
  // by default, kept for round-trip via the importer).
  ws['!cols'] = [
    { wch: 12, customWidth: 1 },                // 0 UID (visible)
    { wch: 22, hidden: true, customWidth: 1 },  // 1 ID technical (hidden)
    { wch: 14, customWidth: 1 },                // 2 Réf.
    { wch: 30, customWidth: 1 },                // 3 Champ
    { wch: 48, customWidth: 1 },                // 4 Contexte
    { wch: 40, customWidth: 1 },                // 5 Valeur remplie
    { wch: 32, customWidth: 1 },                // 6 Commentaires
    { wch: 22, customWidth: 1 },                // 7 Destinataire
  ];
  // Row heights: group & section slightly taller.
  ws['!rows'] = rowStyles.map((kind) => {
    if (kind === 'group') return { hpt: 22 };
    if (kind === 'section') return { hpt: 20 };
    if (kind === 'header') return { hpt: 20 };
    if (kind === 'tableHeader') return { hpt: 22 };
    if (kind === 'tableRow') return { hpt: 28 };
    return { hpt: 28 };
  });
  // Freeze the header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  // Per-cell styling
  for (let r = 0; r < rows.length; r++) {
    const kind = rowStyles[r];
    for (let c = 0; c < NCOL; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      if (kind === 'header') {
        ws[ref].s = STYLE.header;
      } else if (kind === 'group') {
        ws[ref].s = STYLE.group;
      } else if (kind === 'section') {
        ws[ref].s = STYLE.section;
      } else if (kind === 'tableHeader') {
        // Sub-header row above personnel / matériel data rows. Every cell
        // gets the grey-bold look; the ID column stays hidden.
        ws[ref].s = STYLE.tableHeader;
        if (!ws[ref].z) ws[ref].z = '@';
        ws[ref].t = 's';
      } else if (kind === 'tableRow') {
        // Personnel / matériel data row. Each column is a real data column
        // (no green "Valeur remplie" — the whole row is data). UID stays
        // empty; ID hidden; Réf. centered and bold.
        if (c === 0) ws[ref].s = STYLE.uid;
        else if (c === 1) ws[ref].s = STYLE.id;
        else if (c === 2) ws[ref].s = STYLE.tableCellRef;
        else if (c === 4 || c === 5) ws[ref].s = STYLE.tableCellNum;
        else ws[ref].s = STYLE.tableCell;
        if (!ws[ref].z) ws[ref].z = '@';
        if (ws[ref].t !== 'n') ws[ref].t = 's';
      } else {
        // field row: UID small-gray bold, ID technical small-gray,
        // context italic gray, value green if filled.
        if (c === 0) ws[ref].s = STYLE.uid;
        else if (c === 1) ws[ref].s = STYLE.id;
        else if (c === 2) ws[ref].s = STYLE.ref;
        else if (c === 4) ws[ref].s = STYLE.context;
        else if (c === 5 && String(ws[ref].v ?? '').length > 0) ws[ref].s = STYLE.valueFilled;
        else ws[ref].s = STYLE.field;
        // Default cells to text format so "01/02" etc. aren't auto-parsed as
        // dates by Excel. Date/time cells get their proper z-format reassigned
        // later in applyDateTimeCells, overriding this.
        if (!ws[ref].z) ws[ref].z = '@';
        if (ws[ref].t !== 'n') ws[ref].t = 's';
      }
    }
  }
}

// ── Typed cells: dates & times ────────────────────────────────────────────
// Excel stores dates/times as numeric serials (days since 1900-01-01 with the
// 1900 leap-year bug; times as a fraction of 24 h). We write proper numeric
// cells with a format code so Excel treats them as dates — not strings — and
// the user can't accidentally type them in a non-parseable way.

const DATE_FORMAT = 'dd/mm/yyyy';
const TIME_FORMAT = 'hh:mm';

function isoDateToSerial(iso) {
  if (!iso) return null;
  // ISO "YYYY-MM-DD" → Excel serial. Use UTC to avoid timezone drift.
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return d.getTime() / 86400000 + 25569;
}

function hhmmToFraction(hhmm) {
  if (!hhmm) return null;
  const m = String(hhmm).match(/^(\d{1,2})[:h.](\d{1,2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
  return (h + mm / 60) / 24;
}

// Overwrite date/time cells with proper numeric values and a format code.
// Applied AFTER applyLayout so the existing style is preserved.
function applyDateTimeCells(ws, dateCells, timeCells) {
  for (const { rowIdx, iso } of dateCells) {
    const ref = XLSX.utils.encode_cell({ r: rowIdx, c: 5 });
    const existing = ws[ref] || {};
    const serial = isoDateToSerial(iso);
    if (serial != null) {
      ws[ref] = { t: 'n', v: serial, z: DATE_FORMAT, s: existing.s || STYLE.valueFilled };
    } else {
      // Empty cell — still set the date format so user typing is parsed/displayed correctly.
      ws[ref] = { t: 's', v: '', z: DATE_FORMAT, s: existing.s || STYLE.field };
    }
  }
  for (const { rowIdx, hhmm } of timeCells) {
    const ref = XLSX.utils.encode_cell({ r: rowIdx, c: 5 });
    const existing = ws[ref] || {};
    const frac = hhmmToFraction(hhmm);
    if (frac != null) {
      ws[ref] = { t: 'n', v: frac, z: TIME_FORMAT, s: existing.s || STYLE.valueFilled };
    } else {
      ws[ref] = { t: 's', v: '', z: TIME_FORMAT, s: existing.s || STYLE.field };
    }
  }
}

// ── Dropdowns via a helper sheet "Listes" ─────────────────────────────────
// Inline list formulas (formula1="A,B,C") are fragile: they're capped at 255
// chars, break if any option contains a comma, and Excel's repair sometimes
// silently strips them. A helper sheet with range references is rock solid.

function buildListsSheet(dropdowns) {
  // Dedupe identical option lists (e.g. many Oui/Non fields share a column).
  const unique = new Map(); // key → { colIdx, options, range }
  for (const d of dropdowns) {
    const key = JSON.stringify(d.options);
    if (!unique.has(key)) {
      unique.set(key, { colIdx: unique.size, options: d.options });
    }
  }
  // Compute the A1 range for each unique list.
  for (const u of unique.values()) {
    const col = XLSX.utils.encode_col(u.colIdx);
    u.range = `Listes!$${col}$1:$${col}$${u.options.length}`;
  }
  // Decorate every dropdown with its range.
  for (const d of dropdowns) {
    d.range = unique.get(JSON.stringify(d.options)).range;
  }
  // Build the AOA: each list in its own column, padded with blanks.
  const maxLen = Math.max(0, ...[...unique.values()].map(u => u.options.length));
  const aoa = [];
  for (let r = 0; r < maxLen; r++) {
    const row = [];
    for (const u of unique.values()) row.push(u.options[r] ?? '');
    aoa.push(row);
  }
  if (!aoa.length) return null;
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  return ws;
}

// ── Post-processing: inject data validations & hide the Listes sheet ──────
// xlsx-js-style doesn't output <dataValidations>; we have to append the XML
// manually. Schema order matters — the block MUST go after </mergeCells>
// (or </sheetData> if no merges) and before <pageMargins/>.

function buildDataValidationsXml({ dropdowns, dateCells, timeCells }) {
  const items = [];
  for (const d of dropdowns) {
    const cell = XLSX.utils.encode_cell({ r: d.rowIdx, c: 5 });
    const errStyle = d.multi ? ' errorStyle="warning"' : '';
    items.push(
      `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"${errStyle} sqref="${cell}">` +
      `<formula1>${d.range}</formula1>` +
      `</dataValidation>`
    );
  }
  for (const c of dateCells) {
    const cell = XLSX.utils.encode_cell({ r: c.rowIdx, c: 5 });
    items.push(
      `<dataValidation type="date" operator="between" allowBlank="1" showInputMessage="1" showErrorMessage="1" ` +
      `promptTitle="Format date" prompt="Saisir une date (ex : 20/04/2026)" ` +
      `errorTitle="Date invalide" error="Saisissez une date valide." sqref="${cell}">` +
      `<formula1>DATE(1900,1,1)</formula1><formula2>DATE(9999,12,31)</formula2>` +
      `</dataValidation>`
    );
  }
  for (const c of timeCells) {
    const cell = XLSX.utils.encode_cell({ r: c.rowIdx, c: 5 });
    items.push(
      `<dataValidation type="time" operator="between" allowBlank="1" showInputMessage="1" showErrorMessage="1" ` +
      `promptTitle="Format heure" prompt="Saisir une heure (ex : 14:30)" ` +
      `errorTitle="Heure invalide" error="Saisissez une heure valide." sqref="${cell}">` +
      `<formula1>TIME(0,0,0)</formula1><formula2>TIME(23,59,59)</formula2>` +
      `</dataValidation>`
    );
  }
  if (!items.length) return '';
  return `<dataValidations count="${items.length}">${items.join('')}</dataValidations>`;
}

function injectValidationsInSheet(sheetXml, validationsXml) {
  if (!validationsXml) return sheetXml;
  if (sheetXml.includes('</mergeCells>')) {
    return sheetXml.replace('</mergeCells>', '</mergeCells>' + validationsXml);
  }
  return sheetXml.replace('</sheetData>', '</sheetData>' + validationsXml);
}

// Mark the "Listes" sheet hidden in xl/workbook.xml so the user doesn't see
// a tab full of scattered option values alongside their DTAO data.
function hideListsSheetInWorkbook(xml) {
  return xml.replace(
    /(<sheet\b[^>]*\sname="Listes"(?![^>]*state=)[^>]*?)(\/?>)/,
    '$1 state="hidden"$2'
  );
}

async function postProcessXlsx(wbout, { dropdowns, dateCells, timeCells, hasListsSheet }) {
  // Coerce whatever XLSX.write returns to a shape JSZip accepts without
  // ambiguity (some builds return plain number[] instead of Uint8Array).
  const input = wbout instanceof Uint8Array
    ? wbout
    : new Uint8Array(wbout);
  const zip = await JSZip.loadAsync(input);

  // 1) Inject validations into the DTAO sheet (always sheet1.xml since it's
  //    the first sheet appended to the workbook).
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const sheetFile = zip.file(sheetPath);
  if (sheetFile) {
    let sheetXml = await sheetFile.async('string');
    const validationsXml = buildDataValidationsXml({ dropdowns, dateCells, timeCells });
    sheetXml = injectValidationsInSheet(sheetXml, validationsXml);
    zip.file(sheetPath, sheetXml);
  }

  // 2) Hide the Listes sheet in the workbook manifest.
  if (hasListsSheet) {
    const wbPath = 'xl/workbook.xml';
    const wbFile = zip.file(wbPath);
    if (wbFile) {
      let wbXml = await wbFile.async('string');
      wbXml = hideListsSheetInWorkbook(wbXml);
      zip.file(wbPath, wbXml);
    }
  }

  return await zip.generateAsync({ type: 'arraybuffer' });
}

// ── Main export ───────────────────────────────────────────────────────────

export async function exportXlsx({
  formData,
  actorAssignments,
  fieldComments,
  actors,
  personnelRows,
  materielRows,
  propositionItems,
  articlesEsssRows = [],
  tranchesRows = [],
}) {
  const { rows, merges, rowStyles, dropdowns, dateCells, timeCells } = buildAoa({
    formData, actorAssignments, fieldComments, actors,
    personnelRows, materielRows, propositionItems,
    articlesEsssRows, tranchesRows,
  });

  // Build the main DTAO sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  applyLayout(ws, rows, merges, rowStyles);
  // Overwrite typed cells AFTER layout so cell.s survives
  applyDateTimeCells(ws, dateCells, timeCells);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DTAO');

  // Build the helper "Listes" sheet, if any dropdowns exist
  const wsLists = buildListsSheet(dropdowns);
  if (wsLists) {
    XLSX.utils.book_append_sheet(wb, wsLists, 'Listes');
  }

  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  // Post-process: inject <dataValidation>s (dropdowns + date/time) and hide Listes tab
  const finalBuffer = await postProcessXlsx(wbout, {
    dropdowns, dateCells, timeCells,
    hasListsSheet: !!wsLists,
  });
  const blob = new Blob([finalBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const projectName = (formData?.nom_projet || 'DTAO')
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const filename = `DTAO_${projectName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  saveAs(blob, filename);
  return filename;
}
