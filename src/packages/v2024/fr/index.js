// ── FR pack v2024 — package barrel ────────────────────────────────────────
//
// Single entry point for the FR v2024 package. Re-exports every public
// member of the pack's submodules AND aggregates them under a single
// `pkgV2024Fr` object, matching the future package contract used by the
// engine in phase 1.11+.
//
// Two import styles are supported:
//
//   1. Named re-exports (current consumers — no rewrite needed):
//        import { SECTIONS, LABELS, ENJEUX_ESSS } from '../packages/v2024/fr';
//
//   2. Aggregate object (new consumers, prepares phase 1.11 swappable packs):
//        import { pkgV2024Fr } from '../packages/v2024/fr';
//        pkgV2024Fr.sections, pkgV2024Fr.anchors, pkgV2024Fr.labels, …
//
// The engine modules (export/exportDocx.js, components/) currently use
// style 1 (deep imports of named exports). Phase 1.11 will switch them to
// style 2 (one PackageContext import) so the active pack can be chosen at
// runtime.

import { SECTION_GROUPS, SECTIONS } from './sections.js';
import * as anchors from './anchors.js';
import { ENJEUX_ESSS, isEnjeuEsssLabel, enjeuKeyByLabel } from './enjeux.js';
import {
  DEFAULT_ACTORS,
  DEFAULT_PERSONNEL_ROWS,
  DEFAULT_MATERIEL_ROWS,
  DEFAULT_PROPOSITION_ITEMS,
} from './defaults.js';
import { LABELS, tpl } from './labels.js';
import { HIGHLIGHTING_RULES } from './highlightingRules.js';

// ── Named re-exports (style 1) ────────────────────────────────────────────
// Mirrors the existing per-file imports so callers can switch to the barrel
// without changing their import names.
export { SECTION_GROUPS, SECTIONS };
export { ENJEUX_ESSS, isEnjeuEsssLabel, enjeuKeyByLabel };
export {
  DEFAULT_ACTORS,
  DEFAULT_PERSONNEL_ROWS,
  DEFAULT_MATERIEL_ROWS,
  DEFAULT_PROPOSITION_ITEMS,
};
export { LABELS, tpl };
export { HIGHLIGHTING_RULES };
// anchors.js has ~60 named exports — re-export them all as a single
// namespace `anchors` rather than enumerating each.
export { anchors };

// ── Aggregate object (style 2) ────────────────────────────────────────────
// Single object representing the whole pack. The shape matches the future
// PackageContext contract; engine code can read `pkg.sections`,
// `pkg.anchors.OPTION_A_HEADER_RE`, `pkg.labels.someKey`, etc.
export const pkgV2024Fr = {
  id: 'v2024-fr',
  schemaVersion: 'v2024',
  language: 'fr',
  templatePath: '/template-DTAO.docx',
  sections: SECTIONS,
  sectionGroups: SECTION_GROUPS,
  anchors,
  enjeux: {
    list: ENJEUX_ESSS,
    isLabel: isEnjeuEsssLabel,
    keyByLabel: enjeuKeyByLabel,
  },
  defaults: {
    actors: DEFAULT_ACTORS,
    personnelRows: DEFAULT_PERSONNEL_ROWS,
    materielRows: DEFAULT_MATERIEL_ROWS,
    propositionItems: DEFAULT_PROPOSITION_ITEMS,
  },
  labels: LABELS,
  tpl,
  highlightingRules: HIGHLIGHTING_RULES,
};
