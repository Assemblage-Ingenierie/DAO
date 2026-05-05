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
//                             (matchAnchor may resolve to an array of regexes
//                              → OR-of-patterns via highlightParagraphsByAnchors)
//   'yellow-to-red-range'     { startAnchor, endAnchor, requireHeading? }
//                             (requireHeading=true → use heading-aware variant)
//   'yellow-to-red-matching'  { matchAnchor }
//   'yellow-to-red-footnotes' { footnoteIds: ['26', '27', '28'] }
//   'replace-yellow-guide'    { matchAnchor, fieldId }
//   'replace'                 { find, replace }
//   'highlight-inline-markers' { patternsAnchor, prefilter? }
//   'delete-block'            { headerAnchor, preserveSectPr? }
//
// `*Anchor` and `patternsAnchor` keys reference named exports of
// ./anchors.js — the dispatcher resolves them at runtime via ctx.anchors[name].
//
// `log: (aggregate, formData) => string | null` (optional) — called after all
// ops fire. Aggregate contains summed { paraCount, runCount, count,
// footnoteCount, replaced, removed }. Return a string to print to the
// console (typically only when there was actual work, i.e. some count > 0)
// or return null/undefined to skip.
//
// For irreducible cases (multi-branch, dynamic regex, complex pStyle scans),
// use a custom shape: `apply: (docXml, formData, ctx) => ({ docXml?, footnotesXml?, message? })`.
//
// The rules registry is populated incrementally during phase 1.7 lots (1.7.1
// → 1.7.4). Rule ORDER MUST match the existing inline orchestration order in
// `exportDocx.js` to preserve behavior across migration.

export const HIGHLIGHTING_RULES = [
  // ── Rule #1 — Date convention OPTION A/B ────────────────────────────────
  // Surligner rouge le bloc OPTION non retenu (start = "[OPTION X…",
  // end = "Fin de l'OPTION X]"). Pour des paires multiples (Convention de
  // Financement, Déclaration d'intégrité, Annexes…) on traite chaque pair.
  // Apply custom car les regex dépendent de la valeur user (A vs B).
  {
    id: 'option-non-retenue',
    description: 'date_convention OPTION A/B — surligne rouge le bloc non retenu',
    trigger: { fieldExists: 'date_convention' },
    apply: (docXml, formData, ctx) => {
      const v = formData.date_convention;
      const selected = /A/i.test(v) && /avant|OPTION A/i.test(v) ? 'A'
                     : /B/i.test(v) && /après|apres|OPTION B/i.test(v) ? 'B'
                     : /^A$/.test(v) ? 'A'
                     : /^B$/.test(v) ? 'B'
                     : null;
      if (!selected) return {};
      const r = ctx.helpers.highlightUnselectedOption(docXml, selected);
      const notSelected = selected === 'A' ? 'B' : 'A';
      return {
        docXml: r.xml,
        message: r.count > 0 ? `[exportDocx] OPTION ${notSelected} surlignée rouge (${r.count} run(s))` : null,
      };
    },
  },

  // ────────────────────────────────────────────────────────────────────────
  // ORDER MATTERS — Rules #2-#5, #8a-#8c map directly to the inline blocks
  // formerly at exportDocx.js L4577-L4632 (call sites L4579/L4587/L4594/
  // L4601/L4613/L4621/L4629). Their order in this array reflects the
  // execution order in the original orchestration. Do not reorder.
  // ────────────────────────────────────────────────────────────────────────

  // ── Rule #2 — IS 11.1(b) formats de prix non retenus ────────────────────
  {
    id: 'is-11-1-b-formats-prix-non-retenus',
    description: 'IS 11.1(b) — surligne rouge les 2 formats de prix non choisis (selon type_prix)',
    trigger: { fieldExists: 'type_prix' },
    apply: (docXml, formData, ctx) => {
      const r = ctx.helpers.highlightUnselectedPriceFormats(docXml, formData.type_prix);
      return {
        docXml: r.xml,
        message: r.count > 0 ? `[exportDocx] IS 11.1(b) formats non retenus surlignés rouge (${r.count} run(s))` : null,
      };
    },
  },

  // ── Rule #3 — Section IV "Tableaux de prix" guide ───────────────────────
  {
    id: 'tableaux-de-prix-guide-yellow-to-red',
    description: 'Section IV "Tableaux de prix" — convertit jaune→rouge les paragraphes non retenus selon type_prix',
    trigger: { fieldExists: 'type_prix' },
    apply: (docXml, formData, ctx) => {
      const r = ctx.helpers.highlightUnselectedTableauxDePrixGuide(docXml, formData.type_prix);
      return {
        docXml: r.xml,
        message: r.count > 0 ? `[exportDocx] Section IV "Tableaux de prix" : ${r.count} run(s) jaune→rouge selon type_prix` : null,
      };
    },
  },

  // ── Rule #4 — IS 15.1 monnaie option non retenue ────────────────────────
  {
    id: 'is-15-1-monnaie-option-non-retenue',
    description: 'IS 15.1 — bloc monnaie non retenu rouge selon option_monnaie',
    trigger: { fieldExists: 'option_monnaie' },
    apply: (docXml, formData, ctx) => {
      const r = ctx.helpers.highlightUnselectedMonnaieOption(docXml, formData.option_monnaie);
      return {
        docXml: r.xml,
        message: r.count > 0 ? `[exportDocx] IS 15.1 option monnaie non retenue surlignée rouge (${r.count} run(s))` : null,
      };
    },
  },

  // ── Rule #5 — IS 32.1 conversion option non retenue ─────────────────────
  {
    id: 'is-32-1-conversion-option-non-retenue',
    description: 'IS 32.1 — bloc conversion non retenu rouge selon option_conversion',
    trigger: { fieldExists: 'option_conversion' },
    apply: (docXml, formData, ctx) => {
      const r = ctx.helpers.highlightUnselectedConversionOption(docXml, formData.option_conversion);
      return {
        docXml: r.xml,
        message: r.count > 0 ? `[exportDocx] IS 32.1 option de conversion non retenue surlignée rouge (${r.count} run(s))` : null,
      };
    },
  },

  // ── Rule #8a — Annexe 1 (révision des prix) prix fermes ─────────────────
  // Helper highlightAnnexe1Revisions résorbé : c'était un délégué pur à
  // highlightParagraphRange(start, end), donc op déclaratif suffit.
  {
    id: 'annexe-1-revisions-prix-fermes',
    description: "Section IV Annexe 1 — bloc complet rouge si prix_revisables === 'fermes'",
    trigger: { field: 'prix_revisables', equals: 'fermes' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'ANNEXE_1_REVISIONS_START_RE',
      endAnchor: 'ANNEXE_1_REVISIONS_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Section IV Annexe 1 (révision des prix) surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #8b — Annexe 2 alternative non retenue ─────────────────────────
  // Helper highlightAnnexe2Alternative résorbé : la branche A/B sélectionne
  // dynamiquement le range à passer à highlightParagraphRange. Pattern
  // identique à Rule #1 (option-non-retenue).
  // Mapping (cf. ancien helper) :
  //   isA → range(AltB_start, Annexe3_start)
  //   isB → range(AltA_start, AltB_start)
  {
    id: 'annexe-2-alternative-non-retenue',
    description: 'Section IV Annexe 2 — Alternative A ou B rouge selon option_monnaie',
    trigger: { fieldExists: 'option_monnaie' },
    apply: (docXml, formData, ctx) => {
      const v = formData.option_monnaie;
      const isA = /Option\s*A/i.test(v);
      const isB = /Option\s*B/i.test(v);
      if (!isA && !isB) return {};
      const { ANNEXE_2_ALT_A_RE, ANNEXE_2_ALT_B_RE, ANNEXE_3_HEADER_RE } = ctx.anchors;
      const [startRe, endRe] = isA
        ? [ANNEXE_2_ALT_B_RE, ANNEXE_3_HEADER_RE]
        : [ANNEXE_2_ALT_A_RE, ANNEXE_2_ALT_B_RE];
      const r = ctx.helpers.highlightParagraphRange(docXml, startRe, endRe);
      return {
        docXml: r.xml,
        message: r.paraCount > 0
          ? `[exportDocx] Section IV Annexe 2 alternative non retenue surlignée rouge (${r.paraCount} paragraphe(s), ${r.runCount} run(s))`
          : null,
      };
    },
  },

  // ── Rule #8c — Variantes techniques form (non autorisées) ───────────────
  {
    id: 'variantes-techniques-form-non-autorisees',
    description: "Section IV formulaire \"Variantes techniques\" — bloc complet rouge si variantes_techniques === 'ne sont pas'",
    trigger: { field: 'variantes_techniques', equals: 'ne sont pas' },
    apply: (docXml, formData, ctx) => {
      const r = ctx.helpers.highlightVariantesTechniquesForm(docXml, formData.variantes_techniques);
      return {
        docXml: r.xml,
        message: r.paraCount > 0
          ? `[exportDocx] Section IV formulaire "Variantes techniques" surligné rouge (${r.paraCount} paragraphe(s), ${r.runCount} run(s))`
          : null,
      };
    },
  },

  // ── Rule #6 — IS 13.5 « variantes ne sont pas autorisées » ──────────────
  {
    id: 'is-13-5-variantes-delais',
    description: "IS 13.5 — bloc « si variantes autorisées » surligné rouge si variantes_delais === 'ne sont pas'",
    trigger: { field: 'variantes_delais', equals: 'ne sont pas' },
    ops: [{ type: 'highlight-matching', matchAnchor: 'IS_13_5_VARIANTES_DELAIS_ANCHORS' }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] IS 13.5 bloc ajustement variantes délais surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #7 — IS 34.1 « pas de sous-traitants désignés » ────────────────
  {
    id: 'is-34-1-sous-traitants',
    description: "IS 34.1 — guide « lister les sous-traitants » rouge si sous_traitants_designes === 'ne prévoit pas'",
    trigger: { field: 'sous_traitants_designes', equals: 'ne prévoit pas' },
    ops: [{ type: 'highlight-matching', matchAnchor: 'IS_34_1_SOUS_TRAITANTS_ANCHORS' }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] IS 34.1 guide sous-traitants désignés surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #11 — S02-024 « pas de garantie de soumission » ────────────────
  {
    id: 'garantie-soumission-non',
    description: "Section IV — Modèle de Garantie de Soumission rouge si garantie_soumission === \"n'est pas\"",
    trigger: { field: 'garantie_soumission', equals: "n'est pas" },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'MODELE_GARANTIE_SOUMISSION_START_RE',
      endAnchor: 'MODELE_GARANTIE_SOUMISSION_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Modèle de Garantie de Soumission surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #12 — S02-025 « pas de déclaration de garantie » ───────────────
  {
    id: 'declaration-garantie-non',
    description: "Section IV — Modèle de Déclaration de Garantie rouge si declaration_garantie === \"n'est pas\"",
    trigger: { field: 'declaration_garantie', equals: "n'est pas" },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'MODELE_DECL_GARANTIE_START_RE',
      endAnchor: 'MODELE_DECL_GARANTIE_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Modèle de Déclaration de Garantie surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #20 — Sections V & VI — guides jaunes Convention AFD ───────────
  // Toujours convertir jaune→rouge dans le range Section V → Section VII
  // (helper heading-aware : ne matche que sur paragraphes Heading-styled).
  {
    id: 'sections-v-vi-yellow-to-red',
    description: 'Sections V & VI — paragraphes jaunes → rouge (always)',
    trigger: { always: true },
    ops: [{
      type: 'yellow-to-red-range',
      startAnchor: 'SECTIONS_V_VI_START_RE',
      endAnchor: 'SECTIONS_V_VI_END_RE',
      requireHeading: true,
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Sections V & VI: ${paraCount} paragraphe(s) jaunes convertis en rouge (${runCount} run(s))` : null,
  },

  // ── Rule #22 — IS 33.1 « pas de marge de préférence » ───────────────────
  // Helper highlightMargePreferenceBlock fait un Heading1→Heading1 scan
  // (logique trop spécifique pour un op déclaratif). Apply custom.
  {
    id: 'marge-preference-non-accordee',
    description: "IS 33.1 — bloc Marge de préférence rouge si marge_preference === 'ne sera pas'",
    trigger: { field: 'marge_preference', equals: 'ne sera pas' },
    apply: (docXml, formData, ctx) => {
      const r = ctx.helpers.highlightMargePreferenceBlock(docXml, formData.marge_preference);
      return {
        docXml: r.xml,
        message: r.paraCount > 0
          ? `[exportDocx] IS 33.1 bloc marge de préférence surligné rouge (${r.paraCount} paragraphe(s), ${r.runCount} run(s))`
          : null,
      };
    },
  },

  // ── Rule #23 — IS 4.5 « pas de pré-qualification » — guide ──────────────
  {
    id: 'prequalification-no-prequal-guide',
    description: 'IS 4.5 — guide "[sinon supprimer toute cette section]" rouge si prequalification === "n\'est pas"',
    trigger: { field: 'prequalification', equals: "n'est pas" },
    ops: [{ type: 'highlight-matching', matchAnchor: 'NO_PREQUAL_GUIDE_ANCHORS' }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] IS 4.5 guide "sinon supprimer toute cette section" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #25 — Static guide markers — toujours rouges ───────────────────
  {
    id: 'static-guides-always-red',
    description: 'IS 7.4/14.5/22.1/25.1/33.1 — guides AFD toujours surlignés rouge',
    trigger: { always: true },
    ops: [{ type: 'highlight-matching', matchAnchor: 'STATIC_GUIDE_ANCHORS' }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] ${paraCount} guide(s) statique(s) surligné(s) rouge (${runCount} run(s))` : null,
  },

  // ── Rule #26 — Convention AFD OPTION A/B markers — toujours rouges ──────
  {
    id: 'afd-convention-option-markers',
    description: 'Convention AFD — marqueurs OPTION A/B toujours convertis jaune→rouge',
    trigger: { always: true },
    ops: [{ type: 'yellow-to-red-matching', matchAnchor: 'AFD_CONVENTION_OPTION_MARKERS_RE' }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] ${paraCount} marqueur(s) OPTION A/B Convention AFD → rouge (${runCount} surlignage(s))` : null,
  },

  // ── Rule #27 — IS 7.4 « pas de réunion » — bloc Lieu/Date/Heure ─────────
  {
    id: 'is-7-4-reunion-block',
    description: "IS 7.4 — bloc Lieu/Date/Heure réunion rouge si reunion_prevue === \"n'est pas prévue\"",
    trigger: { field: 'reunion_prevue', equals: "n'est pas prévue" },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'REUNION_START_RE',
      endAnchor: 'REUNION_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] IS 7.4 bloc réunion surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #30 — Marqueurs littéraux de suppression — toujours rouges ─────
  {
    id: 'deletion-markers-always',
    description: '"[Rayer la mention inutile]" / "[Supprimer la mention inutile]" / "[à supprimer si …]" — toujours rouges',
    trigger: { always: true },
    ops: [{
      type: 'highlight-inline-markers',
      patternsAnchor: 'DELETION_MARKER_PATTERNS',
      prefilterAnchor: 'SUPPRIMER_RAYER_PREFILTER',
    }],
    log: ({ count }) =>
      count > 0 ? `[exportDocx] ${count} marqueur(s) de suppression surligné(s) rouge` : null,
  },

  // ── Rule #31 — §3.2 note "Le montant devrait se situer…" ────────────────
  {
    id: 'chiffre-affaires-note-yellow-to-red',
    description: '§3.2 — note "Le montant devrait se situer entre 1.5 et 2 fois…" toujours convertie jaune→rouge',
    trigger: { always: true },
    ops: [{ type: 'yellow-to-red-matching', matchAnchor: 'CHIFFRE_AFFAIRES_NOTE_RE' }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] §3.2 note "Le montant devrait se situer…" jaune→rouge (${paraCount} para, ${runCount} run)` : null,
  },

  // ── Rule #32 — §4.2(b)(ii) Sous-traitant spécialisé non autorisé ────────
  {
    id: 'sst-specialise-non',
    description: "§4.2(b)(ii) — ligne complète rouge si sst_specialise_autorise === 'Non'",
    trigger: { field: 'sst_specialise_autorise', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'SST_SPECIALISE_START_RE',
      endAnchor: 'SST_SPECIALISE_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] §4.2(b)(ii) Sous-traitant spécialisé (Non): ligne complète surlignée rouge (${paraCount} para, ${runCount} run)` : null,
  },
];
