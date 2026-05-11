// ── Plateforme — page Admin (statistiques + import legacy) ───────────────
//
// Phase 4 : ajout du bouton "Importer mes données legacy" qui pousse
// les données héritées Phase 3 (forme `afd_platform_v1`) vers Supabase.
//
// Deux sources possibles :
//   1. `localStorage["afd_platform_v1"]` sur ce navigateur (cas du user
//      qui éditait déjà la Phase 3 sur ce même domaine).
//   2. Un JSON collé manuellement (cas typique : tes vraies données
//      vivent sur `localhost:5174` et tu veux les transférer sur la
//      prod Vercel — localStorage est par-origin, donc on doit passer
//      par un copier-coller manuel).
//
// Pour récupérer ton JSON depuis l'ancien domaine :
//   F12 → Console → `copy(localStorage.getItem('afd_platform_v1'))`
//   → le JSON est dans ton presse-papiers, prêt à coller ci-dessous.
//
// Idempotent : flag `localStorage["dao_legacy_imported"]` posé après
// succès + `dao_profiles.legacy_platform_migrated = true` côté DB.
// Dédoublonnage par nom (case-insensitive) sur dao_countries et
// dao_equipe — pas de doublons si plusieurs membres importent.

import { useEffect, useMemo, useState } from "react";
import { REF_DOCS } from "../data/refDocs.js";
import { usePlatformData } from "../store/usePlatformData.js";
import {
  importLegacyToSupabase,
  parseLegacyJson,
  readLegacyData,
  summarizePayload,
} from "../store/importLegacy.js";
import "../styles.css";

export default function Admin() {
  const [data] = usePlatformData();

  // Total des marchés à travers tous les projets et pays.
  const marketCount = useMemo(() => {
    let n = 0;
    Object.values(data.markets || {}).forEach((list) => {
      n += list.length;
    });
    return n;
  }, [data.markets]);

  const stats = [
    [(data.countries || []).length, "Pays"],
    [marketCount, "Marchés"],
    [REF_DOCS.length, "Docs AFD"],
  ];

  // ── Import legacy state ─────────────────────────────────────────────
  // `pendingPayload` est le JSON parsé en attente de validation par le user.
  // Il peut provenir soit du localStorage local, soit d'un coller manuel.
  const [pendingPayload, setPendingPayload] = useState(null);
  const [pendingSource, setPendingSource] = useState(null); // 'local' | 'pasted'
  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState(null);
  const [showPaste, setShowPaste] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, msg: "" });
  const [importResult, setImportResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Auto-détection du localStorage local au montage.
  useEffect(() => {
    if (localStorage.getItem("dao_legacy_imported") === "true") return;
    const local = readLegacyData();
    if (local) {
      setPendingPayload(local);
      setPendingSource("local");
    }
  }, []);

  function handlePasteValidate() {
    setPasteError(null);
    const parsed = parseLegacyJson(pasteValue);
    if (!parsed) {
      setPasteError(
        "JSON invalide ou structure inattendue. Vérifie que tu as bien copié le contenu " +
          "de localStorage('afd_platform_v1') (forme attendue : { countries, projects, markets, ... }).",
      );
      return;
    }
    setPendingPayload(parsed);
    setPendingSource("pasted");
    setShowPaste(false);
    setPasteValue("");
  }

  function handleCancelPending() {
    setPendingPayload(null);
    setPendingSource(null);
    setImportResult(null);
  }

  async function handleImport() {
    setShowConfirm(false);
    setImporting(true);
    setImportResult(null);
    setImportProgress({ done: 0, total: 0, msg: "Démarrage…" });
    try {
      const result = await importLegacyToSupabase({
        payload: pendingPayload,
        onProgress: (msg, p) => setImportProgress({ ...p, msg }),
      });
      setImportResult({ stats: result });
      setPendingPayload(null);
      setPendingSource(null);
    } catch (err) {
      setImportResult({ error: err.message || String(err) });
    } finally {
      setImporting(false);
    }
  }

  const summary = pendingPayload ? summarizePayload(pendingPayload) : null;
  const alreadyImported = typeof localStorage !== "undefined" &&
    localStorage.getItem("dao_legacy_imported") === "true";

  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 20 }}>
        Administration
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {stats.map(([n, label], i) => (
          <div
            key={i}
            style={{
              background: "#F2F2F2",
              borderRadius: 8,
              padding: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#E30513" }}>{n}</div>
            <div style={{ fontSize: 13, color: "#4D4D4D" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Section import legacy ──────────────────────────────────── */}
      <div
        style={{
          background: "#F2F2F2",
          border: "1px solid #DFE4E8",
          borderLeft: "4px solid #30323E",
          borderRadius: 8,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#30323E", marginBottom: 8 }}>
          Importer vos données legacy dans Supabase
        </h3>
        <p style={{ fontSize: 12, color: "#4D4D4D", marginBottom: 14, lineHeight: 1.5 }}>
          One-shot : pousse les données héritées de la version localStorage (Phase 3)
          vers le workspace partagé Supabase. <strong>Action idempotente</strong> :
          dédoublonnage par nom pour les pays et l'équipe.
          {alreadyImported && (
            <span style={{ color: "#16a34a", display: "block", marginTop: 6 }}>
              ✓ Vous avez déjà importé une fois sur ce navigateur. Vous pouvez tout de même
              recoller un autre JSON si besoin (le dédoublonnage est actif).
            </span>
          )}
        </p>

        {/* Cas 1 : payload détecté ou collé en attente ─────────────── */}
        {pendingPayload && summary && (
          <div style={{ background: "#fff", borderRadius: 6, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#4D4D4D", marginBottom: 8 }}>
              Source :{" "}
              <strong>
                {pendingSource === "local"
                  ? "localStorage de ce navigateur"
                  : "JSON collé manuellement"}
              </strong>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[
                ["Pays", summary.countries],
                ["Projets", summary.projects],
                ["Marchés", summary.markets],
                ["Reviews", summary.reviews],
                ["Overrides", summary.textOverrides],
                ["REX", summary.rexItems],
                ["Retex perso", summary.customRetex],
                ["Équipe", summary.equipe],
                ["Doc versions", summary.refVersions],
              ]
                .filter(([, n]) => n > 0)
                .map(([label, n]) => (
                  <span
                    key={label}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      background: "#F2F2F2",
                      color: "#30323E",
                      border: "1px solid #DFE4E8",
                    }}
                  >
                    <strong>{n}</strong> {label}
                  </span>
                ))}
            </div>

            {!importing && !showConfirm && (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="br" onClick={() => setShowConfirm(true)}>
                  Importer ces données
                </button>
                <button className="bo" onClick={handleCancelPending}>
                  Annuler
                </button>
              </div>
            )}

            {showConfirm && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#E30513" }}>
                  Ces données seront visibles par toute l'équipe.
                </span>
                <button className="br" onClick={handleImport}>
                  Confirmer
                </button>
                <button className="bo" onClick={() => setShowConfirm(false)}>
                  Annuler
                </button>
              </div>
            )}

            {importing && (
              <div>
                <div style={{ fontSize: 12, color: "#4D4D4D", marginBottom: 6 }}>
                  {importProgress.msg}
                  {importProgress.total > 0 && (
                    <span style={{ opacity: 0.6 }}>
                      {" "}
                      ({importProgress.done}/{importProgress.total})
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#fff",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid #DFE4E8",
                  }}
                >
                  <div
                    style={{
                      width:
                        importProgress.total > 0
                          ? `${Math.min(100, (importProgress.done / importProgress.total) * 100)}%`
                          : "5%",
                      height: "100%",
                      background: "#E30513",
                      transition: "width 0.2s",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cas 2 : zone de paste JSON ──────────────────────────────── */}
        {!pendingPayload && !importing && (
          <>
            {!showPaste && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button className="br" onClick={() => setShowPaste(true)}>
                  Coller un JSON legacy
                </button>
                <span style={{ fontSize: 11, color: "#777", lineHeight: 1.4 }}>
                  Depuis l'ancien domaine (localhost), F12 → Console →{" "}
                  <code style={{ background: "#fff", padding: "1px 5px", borderRadius: 3 }}>
                    copy(localStorage.getItem('afd_platform_v1'))
                  </code>{" "}
                  → coller ici.
                </span>
              </div>
            )}

            {showPaste && (
              <div>
                <textarea
                  className="ip"
                  value={pasteValue}
                  onChange={(e) => setPasteValue(e.target.value)}
                  placeholder='{"countries":[...],"projects":{...},"markets":{...},"reviews":{...},...}'
                  style={{
                    width: "100%",
                    minHeight: 120,
                    fontFamily: "monospace",
                    fontSize: 11,
                    marginBottom: 8,
                  }}
                />
                {pasteError && (
                  <div style={{ fontSize: 11, color: "#E30513", marginBottom: 8 }}>
                    {pasteError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="br" onClick={handlePasteValidate}>
                    Valider et analyser
                  </button>
                  <button
                    className="bo"
                    onClick={() => {
                      setShowPaste(false);
                      setPasteValue("");
                      setPasteError(null);
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Résultat de l'import ─────────────────────────────────────── */}
      {importResult?.stats && (
        <div
          style={{
            background: "#dcfce7",
            borderLeft: "3px solid #16a34a",
            padding: 14,
            borderRadius: 4,
            fontSize: 12,
            marginBottom: 16,
            color: "#30323E",
          }}
        >
          <strong style={{ color: "#16a34a" }}>Import terminé.</strong>{" "}
          {importResult.stats.countries} pays créés
          {importResult.stats.countriesSkipped > 0 &&
            ` (${importResult.stats.countriesSkipped} déjà présents, réutilisés)`}
          , {importResult.stats.projects} projets, {importResult.stats.markets} marchés,{" "}
          {importResult.stats.reviews} reviews, {importResult.stats.textOverrides} overrides,{" "}
          {importResult.stats.rexItems} REX, {importResult.stats.customRetex} conseils perso,{" "}
          {importResult.stats.equipe} membres équipe, {importResult.stats.refVersions} versions doc.
          {importResult.stats.errors.length > 0 && (
            <div style={{ marginTop: 8, color: "#E30513" }}>
              <strong>{importResult.stats.errors.length} erreur(s)</strong> — voir console
              navigateur pour le détail.
              {importResult.stats.errors.slice(0, 5).map((e, i) => (
                <div key={i} style={{ fontSize: 11, opacity: 0.8, marginLeft: 12 }}>
                  • {e}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {importResult?.error && (
        <div
          style={{
            background: "#FEF2F2",
            borderLeft: "3px solid #E30513",
            padding: 14,
            borderRadius: 4,
            fontSize: 12,
            marginBottom: 16,
            color: "#E30513",
          }}
        >
          <strong>Échec de l'import.</strong> {importResult.error}
        </div>
      )}

      {/* ── Reset désactivé ─────────────────────────────────────────── */}
      <div
        style={{
          padding: 14,
          background: "#FEF2F2",
          borderLeft: "3px solid #E30513",
          fontSize: 12,
          color: "#30323E",
          borderRadius: 4,
        }}
      >
        <strong style={{ color: "#E30513" }}>Reset désactivé en Phase 4.</strong>{" "}
        La base est désormais partagée par toute l'équipe (Supabase). Pour
        repartir d'un état vierge, contactez l'admin Supabase (TRUNCATE des
        tables <code>dao_*</code> via dashboard ou script SQL).
      </div>
    </div>
  );
}
