import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { SECTIONS, SECTION_GROUPS } from "./packages/v2024/fr/sections.js";
import {
  DEFAULT_ACTORS,
  DEFAULT_PERSONNEL_ROWS,
  DEFAULT_MATERIEL_ROWS,
  DEFAULT_PROPOSITION_ITEMS,
} from "./packages/v2024/fr/defaults.js";
import { usePackage } from "./engine/PackageContext.jsx";
import { useProject } from "./engine/projects/useProject.js";
import { isEnjeuEsssLabel } from "./packages/v2024/fr/enjeux.js";
import { LABELS, tpl } from "./packages/v2024/fr/labels.js";
import Sidebar from "./engine/components/Sidebar.jsx";
import FieldInput from "./engine/components/FieldInput.jsx";
import ProgressBar from "./engine/components/ProgressBar.jsx";
import ActorsConfig from "./engine/components/ActorsConfig.jsx";
import ActorChecklist from "./engine/components/ActorChecklist.jsx";
import { exportDocx } from "./engine/export/exportDocx.js";
import { exportXlsx } from "./engine/export/exportXlsx.js";
import { parseXlsxImport } from "./engine/export/importXlsx.js";

const FIRST_SECTION = SECTIONS[0]?.id || "identification";

export function Editor({ projectId }) {
  const pkg = usePackage();
  const [project, setData] = useProject(projectId);

  // UI state (not persisted)
  const [activeSection, setActiveSection] = useState(FIRST_SECTION);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const fileInputRef = useRef(null);

  // Self-heal : un import xlsx mal balisé (avant le fix) a pu injecter les 15
  // enjeux ESSS dans propositionItems. On purge les labels ESSS au démarrage
  // pour nettoyer un état corrompu persisté en localStorage. Runs once per
  // project mount; bails early when the project hasn't loaded yet.
  useEffect(() => {
    if (!project) return;
    const items = project.data?.propositionItems ?? [];
    const polluted = items.some((it) => isEnjeuEsssLabel(it.label));
    if (polluted) {
      const cleaned = items.filter((it) => !isEnjeuEsssLabel(it.label));
      console.warn(
        tpl(LABELS.app.selfHealLog, { count: items.length - cleaned.length })
      );
      setData('propositionItems', cleaned);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Project not loaded (id missing or just deleted) — render a minimal
  // placeholder so navigation back to the list page still works.
  if (!project) {
    return (
      <div style={{ padding: 40, fontFamily: "Open Sans, sans-serif", color: "#777" }}>
        {LABELS.app?.projectNotFound || "Projet introuvable."}
      </div>
    );
  }

  // ── Derived sub-stores + setters ──────────────────────────────────────
  // Each setter delegates to setData(key, valueOrFn). Function-form updates
  // (prev => next) are handled inside useProject — same shape as the
  // legacy usePersistedState API so the rest of Editor doesn't change.
  const formData = project.data.formData ?? {};
  const setFormData = (v) => setData('formData', v);
  const actorAssignments = project.data.actorAssignments ?? {};
  const setActorAssignments = (v) => setData('actorAssignments', v);
  const fieldComments = project.data.fieldComments ?? {};
  const setFieldComments = (v) => setData('fieldComments', v);
  const actors = project.data.actors ?? DEFAULT_ACTORS;
  const setActors = (v) => setData('actors', v);
  const personnelRows = project.data.personnelRows ?? DEFAULT_PERSONNEL_ROWS;
  const setPersonnelRows = (v) => setData('personnelRows', v);
  const materielRows = project.data.materielRows ?? DEFAULT_MATERIEL_ROWS;
  const setMaterielRows = (v) => setData('materielRows', v);
  const propositionItems = project.data.propositionItems ?? DEFAULT_PROPOSITION_ITEMS;
  const setPropositionItems = (v) => setData('propositionItems', v);
  const bulletListItems = project.data.bulletListItems ?? {};
  const setBulletListItems = (v) => setData('bulletListItems', v);
  const articlesEsssRows = project.data.articlesEsssRows ?? [];
  const setArticlesEsssRows = (v) => setData('articlesEsssRows', v);
  const tranchesRows = project.data.tranchesRows ?? [];
  const setTranchesRows = (v) => setData('tranchesRows', v);

  // Field value change
  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Actor assignment change
  const handleActorAssignmentChange = (fieldId, actorIds) => {
    setActorAssignments((prev) => ({ ...prev, [fieldId]: actorIds }));
  };

  // Field comment change
  const handleFieldCommentChange = (fieldId, text) => {
    setFieldComments((prev) => ({ ...prev, [fieldId]: text }));
  };

  // Resolve effective bullet list items: merge per-field defaults (from the
  // section definitions) with the user's edits. Export always sees a full
  // list so disabled defaults get red-highlighted even when the user never
  // touched them.
  const resolveBulletListItems = () => {
    const resolved = {};
    for (const section of SECTIONS) {
      for (const field of section.fields || []) {
        if (field.type !== "bullet_list") continue;
        const stored = bulletListItems?.[field.id];
        if (Array.isArray(stored) && stored.length > 0) {
          resolved[field.id] = stored;
        } else if (Array.isArray(field.defaultItems) && field.defaultItems.length > 0) {
          resolved[field.id] = field.defaultItems.map((it, idx) => ({ id: idx + 1, ...it }));
        }
      }
    }
    return resolved;
  };

  // Export DOCX — safe (tout le contenu, surlignages rouges conservés) ou
  // clean (tous les éléments rouges retirés du document final)
  const handleExportDocx = async (cleanMode = false) => {
    setExporting(true);
    setExportMsg(null);
    try {
      const filename = await exportDocx({
        pkg,
        formData,
        actorAssignments,
        fieldComments,
        actors,
        personnelRows,
        materielRows,
        propositionItems,
        bulletListItems: resolveBulletListItems(),
        articlesEsssRows,
        tranchesRows,
        cleanMode,
      });
      setExportMsg({ type: "success", text: tpl(LABELS.app.exportSuccess, { filename }) });
    } catch (err) {
      console.error(err);
      // "Failed to fetch" = the dev server (or browser SW/proxy) refused
      // the template fetch. Suggest the recovery action so the user
      // doesn't have to interpret a TypeError name.
      const isFetchFail = err && err.name === 'TypeError' && /fetch/i.test(err.message);
      const suffix = isFetchFail ? LABELS.app.exportErrorDevServerSuffix : "";
      setExportMsg({ type: "error", text: tpl(LABELS.app.exportError, { message: err.message, suffix }) });
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 12000);
    }
  };

  // Export XLSX — récapitulatif tabulaire
  const handleExportXlsx = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const filename = await exportXlsx({
        pkg,
        formData,
        actorAssignments,
        fieldComments,
        actors,
        personnelRows,
        materielRows,
        propositionItems,
        articlesEsssRows,
        tranchesRows,
      });
      setExportMsg({ type: "success", text: tpl(LABELS.app.xlsxExportSuccess, { filename }) });
    } catch (err) {
      console.error(err);
      setExportMsg({ type: "error", text: tpl(LABELS.app.xlsxExportError, { message: err.message }) });
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 6000);
    }
  };

  // Import XLSX — réinjection d'un fichier pré-rempli hors ligne
  const handleImportClick = () => {
    // Prévenir avant d'écraser si le formulaire n'est pas vide
    const hasData =
      Object.values(formData).some((v) => v !== "" && v != null) ||
      Object.keys(actorAssignments).length > 0 ||
      Object.keys(fieldComments).length > 0;
    if (hasData) {
      const ok = window.confirm(LABELS.app.importConfirmOverwrite);
      if (!ok) return;
    }
    fileInputRef.current?.click();
  };

  const handleImportXlsx = async (event) => {
    const file = event.target.files?.[0];
    // Reset input immédiatement pour pouvoir ré-uploader le même fichier
    if (event.target) event.target.value = "";
    if (!file) return;

    setExporting(true);
    setExportMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseXlsxImport(buffer, { pkg, actors });
      const {
        formData: importedForm,
        fieldComments: importedComments,
        actorAssignments: importedAssigns,
        personnelRows: importedPers,
        materielRows: importedMat,
        propositionItems: importedProp,
        enjeuxEsssValue: importedEnjeux,
        articlesEsssRows: importedArticles,
        tranchesRows: importedTranches,
        seenFieldIds,
        hasPersonnelSection,
        hasMaterielSection,
        hasPropositionSection,
        hasEnjeuxEsssSection,
        hasArticlesEsssSection,
        hasTranchesSection,
        unknown,
      } = result;

      // Replace semantics: every field ID that appeared in the Excel is
      // authoritative — if the cell was empty, we CLEAR the app's old value,
      // comment, and actor assignment for that field. Fields absent from the
      // Excel keep their current state untouched.
      setFormData((prev) => {
        const next = { ...prev };
        for (const id of seenFieldIds) {
          if (importedForm[id] !== undefined) next[id] = importedForm[id];
          else delete next[id];
        }
        // ESSS enjeux: merge the Oui/Non map into formData.enjeux_esss when the
        // Excel contained the enjeux sub-rows (replace wholesale so unchecked
        // enjeux in Excel become unset in the UI).
        if (hasEnjeuxEsssSection) {
          next.enjeux_esss = { ...importedEnjeux };
        }
        return next;
      });
      setFieldComments((prev) => {
        const next = { ...prev };
        for (const id of seenFieldIds) {
          if (importedComments[id] !== undefined) next[id] = importedComments[id];
          else delete next[id];
        }
        return next;
      });
      setActorAssignments((prev) => {
        const next = { ...prev };
        for (const id of seenFieldIds) {
          if (importedAssigns[id] !== undefined) next[id] = importedAssigns[id];
          else delete next[id];
        }
        return next;
      });

      // Special tables: if the corresponding section existed in the Excel,
      // replace wholesale — this handles both additions and deletions made
      // manually in the spreadsheet.
      if (hasPersonnelSection) setPersonnelRows(importedPers);
      if (hasMaterielSection) setMaterielRows(importedMat);
      if (hasPropositionSection) setPropositionItems(importedProp);
      if (hasArticlesEsssSection) setArticlesEsssRows(importedArticles);
      if (hasTranchesSection) setTranchesRows(importedTranches);

      const nbFields = Object.keys(importedForm).length;
      const nbComments = Object.keys(importedComments).length;
      const nbAssigns = Object.keys(importedAssigns).length;
      let text = tpl(LABELS.app.importSuccessPrefix, { nbFields, nbComments, nbAssigns });
      if (hasPersonnelSection) text += tpl(LABELS.app.importPersonnelSuffix, { n: importedPers.length });
      if (hasMaterielSection) text += tpl(LABELS.app.importMaterielSuffix, { n: importedMat.length });
      if (hasPropositionSection) text += tpl(LABELS.app.importPropositionSuffix, { n: importedProp.length });
      if (hasEnjeuxEsssSection) {
        const filled = Object.values(importedEnjeux).filter(v => v === 'Oui' || v === 'Non').length;
        text += tpl(LABELS.app.importEnjeuxSuffix, { n: `${filled}/15` });
      }
      if (hasArticlesEsssSection) text += tpl(LABELS.app.importArticlesSuffix, { n: importedArticles.length });
      if (hasTranchesSection) text += tpl(LABELS.app.importTranchesSuffix, { n: importedTranches.length });
      if (unknown.length) text += tpl(LABELS.app.importUnknownSuffix, { n: unknown.length });

      setExportMsg({ type: "success", text });
    } catch (err) {
      console.error(err);
      setExportMsg({ type: "error", text: tpl(LABELS.app.importError, { message: err.message }) });
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 8000);
    }
  };

  // Reset
  const handleReset = () => {
    setFormData({});
    setActorAssignments({});
    setFieldComments({});
    setActors(DEFAULT_ACTORS);
    setPersonnelRows(DEFAULT_PERSONNEL_ROWS);
    setMaterielRows(DEFAULT_MATERIEL_ROWS);
    setPropositionItems(DEFAULT_PROPOSITION_ITEMS);
    setArticlesEsssRows([]);
    setTranchesRows([]);
    setShowReset(false);
    setActiveSection(FIRST_SECTION);
  };

  // Get current section
  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  // Render main content
  const renderContent = () => {
    if (activeSection === "__acteurs__") {
      return <ActorsConfig actors={actors} onChange={setActors} />;
    }
    if (activeSection === "__suivi__") {
      return (
        <ActorChecklist
          actors={actors}
          actorAssignments={actorAssignments}
          onNavigate={setActiveSection}
        />
      );
    }
    if (!currentSection) return null;

    return (
      <div style={{ padding: "24px 28px", maxWidth: 780 }}>
        {/* Section header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>{currentSection.icon}</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#30323E", margin: 0 }}>
              {currentSection.title}
            </h2>
          </div>
          {currentSection.description && (
            <p style={{ fontSize: 13, color: "#777", margin: 0, paddingLeft: 34 }}>
              {currentSection.description}
            </p>
          )}
        </div>

        {/* Fields */}
        {(() => {
          // For sections that group fields by sub-clause "SC X.i" (notably
          // the CCAP), emit a gray intermediate heading each time the major
          // X changes, mirroring the CCAG's own clause titles. The first
          // group also gets a heading. We extract the leading integer of
          // the `ref` (e.g. "SC 14.1(b)" → 14, "CCAP 1.1.5.6" → 1) and
          // watch for a transition between consecutive fields.
          const majorOf = (ref) => {
            if (!ref) return null;
            const m = String(ref).match(/(?:SC|CCAP)\s+(\d+)/i);
            return m ? Number(m[1]) : null;
          };
          // CCAG clause titles, keyed by major SC number (from the FR pack).
          const CCAG_TITLES = LABELS.app.ccagTitles;
          let prevMajor = null;
          return currentSection.fields.map((field) => {
            const major = majorOf(field.ref);
            const showHeading = major !== null && major !== prevMajor && CCAG_TITLES[major];
            const isFirst = prevMajor === null;
            prevMajor = major !== null ? major : prevMajor;
            return (
              <React.Fragment key={field.id}>
                {showHeading && (
                  <div
                    style={{
                      // First group: no top spacing; following groups get
                      // breathing room so the gray title doesn't crowd the
                      // last field of the previous group.
                      margin: isFirst ? "0 0 12px 0" : "26px 0 12px 0",
                      paddingBottom: 6,
                      borderBottom: "1px solid #DFE4E8",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#8A8F9A",
                    }}
                  >
                    SC {major}.x — {CCAG_TITLES[major]}
                  </div>
                )}
                <FieldInput
                  field={field}
                  value={formData[field.id]}
                  onChange={handleFieldChange}
                  actorAssignment={actorAssignments[field.id]}
                  onActorAssignmentChange={handleActorAssignmentChange}
                  fieldComment={fieldComments[field.id]}
                  onFieldCommentChange={handleFieldCommentChange}
                  actors={actors}
                  formData={formData}
                  personnelRows={personnelRows}
                  onPersonnelRowsChange={setPersonnelRows}
                  materielRows={materielRows}
                  onMaterielRowsChange={setMaterielRows}
                  propositionItems={propositionItems}
                  onPropositionItemsChange={setPropositionItems}
                  bulletListItems={bulletListItems}
                  onBulletListItemsChange={setBulletListItems}
                  articlesEsssRows={articlesEsssRows}
                  onArticlesEsssRowsChange={setArticlesEsssRows}
                  tranchesRows={tranchesRows}
                  onTranchesRowsChange={setTranchesRows}
                />
              </React.Fragment>
            );
          });
        })()}

        {/* Section navigation */}
        <SectionNav
          currentId={activeSection}
          onNavigate={setActiveSection}
        />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "Open Sans, sans-serif" }}>
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        formData={formData}
        actorAssignments={actorAssignments}
        fieldComments={fieldComments}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Project header */}
        <ProjectHeader
          projectName={project.name}
          nomProjet={formData.nom_projet}
          identificationTravaux={formData.identification_travaux}
        />

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 20px",
            height: 52,
            background: "#fff",
            borderBottom: "1px solid #DFE4E8",
            flexShrink: 0,
          }}
        >
          {/* Export safe — document complet, surlignages rouges conservés */}
          <button
            onClick={() => handleExportDocx(false)}
            disabled={exporting}
            title={LABELS.app.exportSafeTooltip}
            style={{
              padding: "7px 18px",
              background: exporting ? "#ccc" : "#1565C0",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 13,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "Open Sans, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {exporting ? LABELS.app.exporting : LABELS.app.exportSafeButton}
          </button>

          {/* Export clean — retire automatiquement tous les passages rouges */}
          <button
            onClick={() => handleExportDocx(true)}
            disabled={exporting}
            title={LABELS.app.exportCleanTooltip}
            style={{
              padding: "7px 18px",
              background: exporting ? "#ccc" : "#E30513",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 13,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "Open Sans, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {LABELS.app.exportCleanButton}
          </button>

          {/* Export .xlsx — récapitulatif tabulaire */}
          <button
            onClick={handleExportXlsx}
            disabled={exporting}
            style={{
              padding: "7px 18px",
              background: exporting ? "#ccc" : "#2e7d32",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 13,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "Open Sans, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {LABELS.app.exportXlsxButton}
          </button>

          {/* Import .xlsx — réinjection d'un fichier pré-rempli */}
          <button
            onClick={handleImportClick}
            disabled={exporting}
            style={{
              padding: "7px 18px",
              background: exporting ? "#ccc" : "#30323E",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 13,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "Open Sans, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {LABELS.app.importXlsxButton}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleImportXlsx}
            style={{ display: "none" }}
          />

          {/* Export message */}
          {exportMsg && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: exportMsg.type === "success" ? "#2e7d32" : "#E30513",
                background: exportMsg.type === "success" ? "#E8F5E9" : "#F9E1E3",
                padding: "4px 10px",
                borderRadius: 4,
              }}
            >
              {exportMsg.text}
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Reset button */}
          {showReset ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#E30513" }}>
                {LABELS.app.resetConfirmMessage}
              </span>
              <button
                onClick={handleReset}
                style={{
                  padding: "5px 12px",
                  background: "#E30513",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {LABELS.app.confirmButton}
              </button>
              <button
                onClick={() => setShowReset(false)}
                style={{
                  padding: "5px 12px",
                  background: "none",
                  color: "#4D4D4D",
                  border: "1px solid #DFE4E8",
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {LABELS.app.cancelButton}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReset(true)}
              style={{
                padding: "5px 12px",
                background: "none",
                color: "#aaa",
                border: "1px solid #DFE4E8",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {LABELS.app.resetButton}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <ProgressBar formData={formData} actorAssignments={actorAssignments} />

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ── Project header ────────────────────────────────────────────────────────

function ProjectHeader({ projectName, nomProjet, identificationTravaux }) {
  const hasNom = nomProjet && String(nomProjet).trim();
  const hasId = identificationTravaux && String(identificationTravaux).trim();
  // Only show the project metadata name as a hint when it differs from the
  // form-filled nom_projet — avoids visual duplication when the user named
  // the project after the form value.
  const showProjectMeta =
    projectName && (!hasNom || projectName.trim() !== String(nomProjet).trim());

  return (
    <div
      style={{
        padding: "10px 20px",
        background: "#F2F2F2",
        color: "#000",
        borderBottom: "1px solid #DFE4E8",
        flexShrink: 0,
      }}
    >
      {/* Top row: back link + section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 2,
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#1565C0",
            textDecoration: "none",
            padding: "2px 6px",
            borderRadius: 3,
            background: "rgba(21, 101, 192, 0.08)",
          }}
        >
          {LABELS.app.backToList}
        </Link>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: "#4D4D4D",
          }}
        >
          {LABELS.app.projectHeader}
        </div>
        {showProjectMeta && (
          <div
            style={{
              fontSize: 11,
              color: "#777",
              fontStyle: "italic",
              marginLeft: "auto",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 320,
            }}
            title={projectName}
          >
            « {projectName} »
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: hasNom ? "#000" : "#888",
          fontStyle: hasNom ? "normal" : "italic",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={hasNom ? nomProjet : ""}
      >
        {hasNom ? nomProjet : LABELS.app.projectNamePlaceholder}
      </div>
      <div
        style={{
          fontSize: 12,
          color: hasId ? "#4D4D4D" : "#888",
          fontStyle: hasId ? "normal" : "italic",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={hasId ? identificationTravaux : ""}
      >
        {hasId ? identificationTravaux : LABELS.app.identificationPlaceholder}
      </div>
    </div>
  );
}

// ── Section navigation prev/next ──────────────────────────────────────────

function SectionNav({ currentId, onNavigate }) {
  const allIds = SECTIONS.map((s) => s.id);
  const idx = allIds.indexOf(currentId);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx < allIds.length - 1 ? SECTIONS[idx + 1] : null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 32,
        paddingTop: 20,
        borderTop: "1px solid #DFE4E8",
      }}
    >
      {prev ? (
        <button
          onClick={() => onNavigate(prev.id)}
          style={{
            padding: "8px 16px",
            background: "#F2F2F2",
            border: "1px solid #DFE4E8",
            borderRadius: 5,
            fontSize: 13,
            cursor: "pointer",
            color: "#4D4D4D",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← {prev.icon} {prev.title}
        </button>
      ) : (
        <div />
      )}

      {next ? (
        <button
          onClick={() => onNavigate(next.id)}
          style={{
            padding: "8px 16px",
            background: "#E30513",
            border: "none",
            borderRadius: 5,
            fontSize: 13,
            cursor: "pointer",
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {next.icon} {next.title} →
        </button>
      ) : (
        <button
          style={{
            padding: "8px 16px",
            background: "#2e7d32",
            border: "none",
            borderRadius: 5,
            fontSize: 13,
            cursor: "default",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {LABELS.app.allSectionsComplete}
        </button>
      )}
    </div>
  );
}
