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

  // ────────────────────────────────────────────────────────────────────────
  // ESSS rules (phase 1.7.2). Mappent les blocs inline anciennement à
  // exportDocx.js sections 3b-sexies-bis-VI-bis (call site L4568, Non),
  // VI-ter (L4604, Oui — minus the fillEnjeuxTable / fillArticlesTable
  // calls which stay inline car ce ne sont PAS du highlighting), VI-quinquies
  // (L4648, Prix ESSS, branched Oui/Non), VI-septies (L4699, formulaires
  // Méthodologie + Engagement, Non). Rule 16 (Bordereau Sûreté) reste à
  // 1.7.3. Order matters — insert in source-call-site order.
  // ────────────────────────────────────────────────────────────────────────

  // ── Rule #13a — ESSS Non : ligne "Contenu" du sommaire Section VII ──────
  {
    id: 'esss-non-contenu-line',
    description: "Sommaire Section VII — ligne 'Contenu ESSS' rouge si esss_applicable === 'Non'",
    trigger: { field: 'esss_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'ESSS_CONTENU_LINE_START_RE',
      endAnchor: 'SPECIFICATIONS_SURETE_TOC_LINE_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] ESSS: ligne Contenu surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #13b — ESSS Non : chapitre complet ─────────────────────────────
  {
    id: 'esss-non-chapter-block',
    description: "Section VII — chapitre ESSS complet rouge si esss_applicable === 'Non'",
    trigger: { field: 'esss_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'ESSS_CHAPTER_START_RE',
      endAnchor: 'ESSS_CHAPTER_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] ESSS: chapitre complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #14a — ESSS Oui : conversion jaune→rouge dans le chapitre ──────
  // Les fills Enjeux / Articles restent inline (pas du highlighting) ; ils
  // tournent APRÈS le dispatcher. Vérifié : ils n'écrivent rien en jaune,
  // donc l'ordre yellow→red puis fills ne change pas le résultat final.
  {
    id: 'esss-oui-chapter-yellow-to-red',
    description: "Chapitre ESSS — paragraphes jaunes → rouge si esss_applicable === 'Oui'",
    trigger: { field: 'esss_applicable', equals: 'Oui' },
    ops: [{
      type: 'yellow-to-red-range',
      startAnchor: 'ESSS_CHAPTER_START_RE',
      endAnchor: 'ESSS_CHAPTER_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] ESSS (Oui): ${paraCount} paragraphe(s) jaunes convertis en rouge (${runCount} run(s))` : null,
  },

  // ── Rule #14b — ESSS Oui : bloc "Exemple de situation" (illustratif) ────
  {
    id: 'esss-oui-exemple-situation',
    description: "Chapitre ESSS — bloc 'Exemple de situation' rouge si esss_applicable === 'Oui'",
    trigger: { field: 'esss_applicable', equals: 'Oui' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'ESSS_EXEMPLE_SITUATION_START_RE',
      endAnchor: 'ESSS_EXEMPLE_SITUATION_END_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] ESSS (Oui): bloc "Exemple de situation" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #15 — Section IV Prix ESSS (branché Oui/Non) ───────────────────
  // Apply custom car 2 branches mutuellement exclusives :
  //   'Oui' → yellow-to-red sur 2 notes draft (matching).
  //   'Non' → highlight-range tout le bloc (titre → titre Bordereau Sûreté).
  {
    id: 'esss-prix-form-conditional',
    description: 'Section IV Prix ESSS — Oui : 2 notes draft jaune→rouge ; Non : bloc complet rouge',
    trigger: { fieldExists: 'esss_applicable' },
    apply: (docXml, formData, ctx) => {
      if (formData.esss_applicable === 'Oui') {
        const r = ctx.helpers.convertYellowToRedInMatchingParagraphs(docXml, ctx.anchors.ESSS_PRIX_DRAFT_NOTES_RE);
        return {
          docXml: r.xml,
          message: r.paraCount > 0
            ? `[exportDocx] Section IV Prix ESSS (Oui): ${r.paraCount} note(s) draft jaune→rouge (${r.runCount} run(s))`
            : null,
        };
      }
      if (formData.esss_applicable === 'Non') {
        const r = ctx.helpers.highlightParagraphRange(docXml, ctx.anchors.ESSS_PRIX_TITLE_RE, ctx.anchors.BORDEREAU_SURETE_TITLE_RE);
        return {
          docXml: r.xml,
          message: r.paraCount > 0
            ? `[exportDocx] Section IV Prix ESSS (Non): bloc complet surligné rouge (${r.paraCount} paragraphe(s), ${r.runCount} run(s))`
            : null,
        };
      }
      return {};
    },
  },

  // ── Rule #17a — ESSS Non : formulaire Méthodologie ESSS (page 66) ───────
  {
    id: 'esss-non-methodologie-form',
    description: "Section IV — formulaire Méthodologie ESSS rouge si esss_applicable === 'Non'",
    trigger: { field: 'esss_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'ESSS_METHODOLOGIE_TITLE_RE',
      endAnchor: 'LISTE_SOUS_TRAITANTS_TITLE_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Section IV Méthodologie ESSS (Non): bloc complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #17b — ESSS Non : paragraphe d'intro Engagement ESSS (page 67) ─
  {
    id: 'esss-non-engagement-intro',
    description: "Section IV — paragraphe d'intro Engagement ESSS rouge si esss_applicable === 'Non'",
    trigger: { field: 'esss_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-matching',
      matchAnchor: 'ESSS_ENGAGEMENT_INTRO_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Section IV Engagement ESSS (Non): paragraphe d'intro surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #17c — ESSS Non : Formulaire d'engagement ESSS (pages 67-68) ───
  {
    id: 'esss-non-formulaire-engagement',
    description: "Section IV — Formulaire d'engagement ESSS rouge si esss_applicable === 'Non'",
    trigger: { field: 'esss_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'ESSS_FORMULAIRE_ENGAGEMENT_TITLE_RE',
      endAnchor: 'ORGANISATION_TRAVAUX_HEADER_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Section IV Formulaire engagement ESSS (Non): bloc complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ────────────────────────────────────────────────────────────────────────
  // Sûreté rules (phase 1.7.3). Cover 3 logical rules from inventory:
  //   #16 Bordereau Sûreté Section IV (1 sub-rule, branched apply).
  //   #18 Sûreté Oui compound (8 sub-rules: opening + 3 replace-yellow-guide
  //       + Cocher Option guide + Options N°1/N°2 branched + 4 bullets
  //       branched + escortes branched).
  //   #19 Sûreté Non (4 sub-rules: chapter + sommaire ligne + Section III
  //       tableau + footnotes 26/27/28 yellow-to-red).
  // Insert after rule #17c and before rule #20, preserving source-call-site
  // order (L4585-L4790 in the pre-1.7.3 exportDocx.js).
  // ────────────────────────────────────────────────────────────────────────

  // ── Rule #16 — Section IV Bordereau Sûreté (branché Oui/Non) ────────────
  {
    id: 'bordereau-surete-form-conditional',
    description: "Section IV Bordereau Sûreté — 'Oui' : 2 notes draft jaune→rouge ; 'Non' : bloc complet rouge",
    trigger: { fieldExists: 'surete_applicable' },
    apply: (docXml, formData, ctx) => {
      if (formData.surete_applicable === 'Oui – inclure sûreté') {
        const r = ctx.helpers.convertYellowToRedInMatchingParagraphs(docXml, ctx.anchors.BORDEREAU_SURETE_DRAFT_NOTES_RE);
        return {
          docXml: r.xml,
          message: r.paraCount > 0
            ? `[exportDocx] Section IV Bordereau Sûreté (Oui): ${r.paraCount} note(s) draft jaune→rouge (${r.runCount} run(s))`
            : null,
        };
      }
      if (formData.surete_applicable === 'Non') {
        const r = ctx.helpers.highlightParagraphRange(docXml, ctx.anchors.BORDEREAU_SURETE_TITLE_RE, ctx.anchors.FORMULAIRES_PROPOSITION_TECHNIQUE_TITLE_RE);
        return {
          docXml: r.xml,
          message: r.paraCount > 0
            ? `[exportDocx] Section IV Bordereau Sûreté (Non): bloc complet surligné rouge (${r.paraCount} paragraphe(s), ${r.runCount} run(s))`
            : null,
        };
      }
      return {};
    },
  },

  // ── Rule #18a — Sûreté Oui : bloc d'ouverture (2 paragraphes) ───────────
  {
    id: 'surete-oui-bloc-ouverture',
    description: "Sûreté — bloc d'ouverture (2 paragraphes au-dessus du heading 'Spécifications Sûreté') rouge si surete_applicable === 'Oui – inclure sûreté'",
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'SURETE_OPENING_GUIDE_RE',
      endAnchor: 'SPECIFICATIONS_SURETE_HEADING_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Sûreté (Oui): bloc d'ouverture surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #18b1 — Sûreté Oui : remplacement guide S07-002 ────────────────
  {
    id: 'surete-oui-s07-002-contexte-securitaire',
    description: 'Sûreté Oui — remplace le guide jaune S07-002 par le contexte sécuritaire utilisateur',
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    ops: [{
      type: 'replace-yellow-guide',
      matchAnchor: 'SURETE_S07_002_GUIDE_RE',
      fieldId: 'contexte_securitaire',
    }],
    log: ({ replaced }) => replaced ? '[exportDocx] Sûreté (Oui): S07-002 contexte sécuritaire inséré' : null,
  },

  // ── Rule #18b2 — Sûreté Oui : remplacement guide S07-003 ────────────────
  {
    id: 'surete-oui-s07-003-roles-mo',
    description: 'Sûreté Oui — remplace le guide jaune S07-003 par les rôles MOA utilisateur',
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    ops: [{
      type: 'replace-yellow-guide',
      matchAnchor: 'SURETE_S07_003_GUIDE_RE',
      fieldId: 'roles_moa_surete',
    }],
    log: ({ replaced }) => replaced ? '[exportDocx] Sûreté (Oui): S07-003 rôles MO inséré' : null,
  },

  // ── Rule #18b3 — Sûreté Oui : remplacement guide S07-004 ────────────────
  {
    id: 'surete-oui-s07-004-pilotage-entreprise',
    description: 'Sûreté Oui — remplace le guide jaune S07-004 par le pilotage entreprise principale utilisateur',
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    ops: [{
      type: 'replace-yellow-guide',
      matchAnchor: 'SURETE_S07_004_GUIDE_RE',
      fieldId: 'roles_pilotage_surete_entreprise',
    }],
    log: ({ replaced }) => replaced ? '[exportDocx] Sûreté (Oui): S07-004 pilotage entreprise principale inséré' : null,
  },

  // ── Rule #18c — Sûreté Oui : guide "[Cocher l'Option N°1...]" ───────────
  // Toujours rougit quand Sûreté Oui, indépendamment de conditions_tres_degradees.
  {
    id: 'surete-oui-cocher-option-guide',
    description: "Sûreté Oui — guide '[Cocher l'Option N°1...]' toujours rouge",
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'SURETE_COCHER_OPTION_GUIDE_RE',
      endAnchor: 'SURETE_OPTION_N1_HEADING_RE',
    }],
    log: ({ paraCount }) =>
      paraCount > 0 ? `[exportDocx] Sûreté (Oui) 4.1: guide Option cochée surligné rouge (${paraCount} para)` : null,
  },

  // ── Rule #18d — Sûreté Oui : Options N°1/N°2 mutuellement exclusives ────
  // Apply : trigger primaire = surete_applicable Oui ; secondaire = conditions_tres_degradees.
  //   'Oui' (contexte très dégradé) → N°1 retenue, N°2 rouge (range : Option N°2 → §4.2)
  //   'Non' → N°2 retenue, N°1 rouge (range : Option N°1 → Option N°2)
  {
    id: 'surete-oui-options-n1-n2-non-retenue',
    description: 'Sûreté Oui — Option N°1 ou N°2 (4.1) rouge selon conditions_tres_degradees',
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    apply: (docXml, formData, ctx) => {
      const v = formData.conditions_tres_degradees;
      if (v !== 'Oui' && v !== 'Non') return {};
      const { SURETE_OPTION_N1_HEADING_RE, SURETE_OPTION_N2_HEADING_RE, SURETE_4_2_DEPLACEMENT_HEADING_RE } = ctx.anchors;
      const isOui = v === 'Oui';
      const [startRe, endRe] = isOui
        ? [SURETE_OPTION_N2_HEADING_RE, SURETE_4_2_DEPLACEMENT_HEADING_RE]
        : [SURETE_OPTION_N1_HEADING_RE, SURETE_OPTION_N2_HEADING_RE];
      const r = ctx.helpers.highlightParagraphRange(docXml, startRe, endRe);
      const optName = isOui ? 'Option N°2' : 'Option N°1';
      return {
        docXml: r.xml,
        message: r.paraCount > 0
          ? `[exportDocx] Sûreté (Oui) 4.1: ${optName} surlignée rouge (${r.paraCount} para, ${r.runCount} run)`
          : null,
      };
    },
  },

  // ── Rule #18e — Sûreté Oui : 4 bullets S07-005 (§4.2/§4.3/§4.4/§5) ──────
  // Apply : trigger primaire = surete_applicable Oui ; secondaire = conditions_tres_degradees.
  //   'Oui' → seul le marqueur jauni→rouge (contenu pertinent reste).
  //   'Non' → tout le paragraphe rougit (bullet inapplicable).
  {
    id: 'surete-oui-4-bullets-s07-005',
    description: "Sûreté Oui — 4 bullets §4.2/§4.3/§4.4/§5 selon conditions_tres_degradees",
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    apply: (docXml, formData, ctx) => {
      const v = formData.conditions_tres_degradees;
      if (v !== 'Oui' && v !== 'Non') return {};
      const markerRe = ctx.anchors.SURETE_DEGRADE_BULLETS_MARKER_RE;
      if (v === 'Oui') {
        const r = ctx.helpers.convertYellowToRedInMatchingParagraphs(docXml, markerRe);
        return {
          docXml: r.xml,
          message: r.paraCount > 0
            ? `[exportDocx] Sûreté (Oui) contexte très dégradé: ${r.paraCount} marqueur(s) jauni→rouge (${r.runCount} run)`
            : null,
        };
      }
      const r = ctx.helpers.highlightParagraphsMatching(docXml, markerRe);
      return {
        docXml: r.xml,
        message: r.paraCount > 0
          ? `[exportDocx] Sûreté (Oui) contexte très dégradé: ${r.paraCount} bullet(s) surlignés rouge (${r.runCount} run)`
          : null,
      };
    },
  },

  // ── Rule #18f — Sûreté Oui : bullet escortes S07-006 (§4.2) ─────────────
  // Apply : trigger primaire = surete_applicable Oui ; secondaire = escortes_non_prises_en_charge.
  //   'Oui' → marqueur jauni→rouge dans range (texte reste applicable).
  //   'Non' → tout le paragraphe range rougit (escortes inutiles).
  {
    id: 'surete-oui-bullet-escortes-s07-006',
    description: 'Sûreté Oui — bullet escortes §4.2 selon escortes_non_prises_en_charge',
    trigger: { field: 'surete_applicable', equals: 'Oui – inclure sûreté' },
    apply: (docXml, formData, ctx) => {
      const v = formData.escortes_non_prises_en_charge;
      if (v !== 'Oui' && v !== 'Non') return {};
      const { SURETE_ESCORTES_MARKER_RE, SURETE_HEBERGEMENT_HEADING_RE } = ctx.anchors;
      if (v === 'Oui') {
        const r = ctx.helpers.convertYellowToRedInParaRange(docXml, SURETE_ESCORTES_MARKER_RE, SURETE_HEBERGEMENT_HEADING_RE);
        return {
          docXml: r.xml,
          message: r.paraCount > 0
            ? `[exportDocx] Sûreté (Oui) 4.2: marqueur escortes jauni→rouge (${r.paraCount} para, ${r.runCount} run)`
            : null,
        };
      }
      const r = ctx.helpers.highlightParagraphRange(docXml, SURETE_ESCORTES_MARKER_RE, SURETE_HEBERGEMENT_HEADING_RE);
      return {
        docXml: r.xml,
        message: r.paraCount > 0
          ? `[exportDocx] Sûreté (Oui) 4.2: ligne escortes surlignée rouge (${r.paraCount} para, ${r.runCount} run)`
          : null,
      };
    },
  },

  // ── Rule #19a — Sûreté Non : chapitre complet Section VII ───────────────
  {
    id: 'surete-non-chapitre-complet',
    description: "Section VII — chapitre Sûreté complet rouge si surete_applicable === 'Non'",
    trigger: { field: 'surete_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'SURETE_OPENING_GUIDE_RE',
      endAnchor: 'TROISIEME_PARTIE_HEADING_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Sûreté (Non): chapitre complet surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #19b — Sûreté Non : ligne sommaire "Spécifications sûreté" ─────
  {
    id: 'surete-non-sommaire-ligne',
    description: "Sommaire Section VII — ligne basse-casse 'Spécifications sûreté' rouge si surete_applicable === 'Non'",
    trigger: { field: 'surete_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-matching',
      matchAnchor: 'SURETE_SOMMAIRE_LIGNE_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Sûreté (Non): ligne "Spécifications sûreté" du sommaire Contenu surlignée rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #19c — Sûreté Non : tableau Section III "6. Sûreté" ────────────
  {
    id: 'surete-non-tableau-section-iii',
    description: "Section III — tableau '6. Sûreté' (critères 6.1 à 6.5) rouge si surete_applicable === 'Non'",
    trigger: { field: 'surete_applicable', equals: 'Non' },
    ops: [{
      type: 'highlight-range',
      startAnchor: 'SURETE_SECTION_III_TITLE_RE',
      endAnchor: 'SECTION_IV_FORMULAIRES_HEADING_RE',
    }],
    log: ({ paraCount, runCount }) =>
      paraCount > 0 ? `[exportDocx] Sûreté (Non): tableau Section III "6. Sûreté" surligné rouge (${paraCount} paragraphe(s), ${runCount} run(s))` : null,
  },

  // ── Rule #19d — Sûreté Non : footnotes 26/27/28 jaune→rouge ─────────────
  // IDs de footnote stables dans le template AFD PAY (attachées au tableau
  // 6. Sûreté). Le dispatcher applique la conversion sur footnotesXml (chargé
  // une fois au début de l'export et réécrit à la fin si modifié).
  {
    id: 'surete-non-footnotes-26-27-28',
    description: "Sûreté Non — footnotes 26/27/28 (notes de bas de page tableau '6. Sûreté') jaune→rouge",
    trigger: { field: 'surete_applicable', equals: 'Non' },
    ops: [{
      type: 'yellow-to-red-footnotes',
      footnoteIds: ['26', '27', '28'],
    }],
    log: ({ footnoteCount, runCount }) =>
      footnoteCount > 0 ? `[exportDocx] Sûreté (Non): notes de bas de page 26/27/28 jaune→rouge (${footnoteCount} note(s), ${runCount} run(s))` : null,
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
