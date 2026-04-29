// ── Conditional red-highlight rules (FR pack v2024) ───────────────────────
//
// Each rule binds a TRIGGER (a condition on formData) to one or more OPERATIONS
// applied to the document XML. The rules are executed in array order by the
// dispatcher `applyHighlightingRules` in src/export/exportDocx.js.
//
// Trigger forms:
//   { always: true }                           — fires unconditionally
//   { field: 'foo', equals: 'X' }              — fires if formData.foo === 'X'
//   { fieldIn: 'foo', values: ['A','B'] }      — fires if formData.foo ∈ values
//   { fieldExists: 'foo' }                     — fires if formData.foo is truthy
//   { fieldFilled: 'foo' }                     — fires if isFilled(formData.foo)
//
// Declarative ops in `ops: [{ type, ... }, …]`:
//   'highlight-range'         { startAnchor, endAnchor }
//   'highlight-matching'      { matchAnchor } | { matchAnchors: ['A','B', …] }
//   'yellow-to-red-range'     { startAnchor, endAnchor }
//   'yellow-to-red-matching'  { matchAnchor }
//   'yellow-to-red-footnotes' { footnoteIds: ['26', '27', '28'] }
//   'replace-yellow-guide'    { matchAnchor, fieldId }
//   'replace'                 { find, replace }
//   'highlight-inline-markers' { patternsAnchor }
//   'delete-block'            { headerAnchor, preserveSectPr? }
//
// `*Anchor` and `patternsAnchor` keys reference named exports of
// ./anchors.js — the dispatcher resolves them at runtime via ctx.anchors[name].
//
// For irreducible cases (multi-branch, dynamic regex, complex pStyle scans),
// use a custom shape: `apply: (docXml, formData, ctx) => ({ docXml?, footnotesXml?, message? })`.
//
// The rules registry is populated incrementally during phase 1.7 lots (1.7.1
// → 1.7.4). Rule ORDER MUST match the existing inline orchestration order in
// `exportDocx.js` to preserve behavior across migration.

export const HIGHLIGHTING_RULES = [
  // populated in 1.7.1 → 1.7.4
];
