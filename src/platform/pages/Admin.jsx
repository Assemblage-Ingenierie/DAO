// ── Plateforme — page Admin (statistiques + import legacy) ───────────────
//
// Phase 4 : ajout du bouton "Importer mes données locales (legacy)" qui
// pousse `localStorage.afd_platform_v1` (état hérité Phase 3) vers
// Supabase. Visible uniquement si :
//   - flag `localStorage["dao_legacy_imported"] !== "true"`
//   - ET la clé legacy contient au moins 1 row à pousser
// Idempotent : flag posé après succès + on dédoublonne par nom côté pays
// et équipe pour ne pas créer de doublons si plusieurs users importent.
//
// Le reset est désactivé en Phase 4 (workspace partagé — un reset
// individuel impacterait toute l'équipe). Cf. dashboard Supabase pour
// vider les tables.

import { useEffect, useMemo, useState } from "react";
import { REF_DOCS } from "../data/refDocs.js";
import { usePlatformData } from "../store/usePlatformData.js";
import {
  importLegacyToSupabase,
  shouldOfferImport,
  summarizeLegacyData,
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
  const [offerImport, setOfferImport] = useState(false);
  const [legacySummary, setLegacySummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, msg: "" });
  const [importResult, setImportResult] = useState(null); // { stats } ou { error }
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setOfferImport(shouldOfferImport());
    setLegacySummary(summarizeLegacyData());
  }, []);

  async function handleImport() {
    setShowConfirm(false);
    setImporting(true);
    setImportResult(null);
    setImportProgress({ done: 0, total: 0, msg: "Démarrage…" });
    try {
      const stats = await importLegacyToSupabase({
        onProgress: (msg, p) => setImportProgress({ ...p, msg }),
      });
      setImportResult({ stats });
      setOfferImport(false);
    } catch (err) {
      setImportResult({ error: err.message || String(err) });
    } finally {
      setImporting(false);
    }
  }

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
      {offerImport && legacySummary && (
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
            Importer vos données locales dans le workspace partagé
          </h3>
          <p style={{ fontSize: 12, color: "#4D4D4D", marginBottom: 14, lineHeight: 1.5 }}>
            Votre navigateur contient des données héritées de la version localStorage
            (avant Phase 4). Vous pouvez les pousser une fois pour toutes dans
            Supabase pour qu'elles soient visibles par toute l'équipe. Action
            idempotente : si vous cliquez deux fois, le 2ᵉ clic est inoffensif (le
            bouton disparaît après succès et les pays existants en nom sont
            réutilisés).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            {[
              ["Pays", legacySummary.countries],
              ["Projets", legacySummary.projects],
              ["Marchés", legacySummary.markets],
              ["Reviews", legacySummary.reviews],
              ["Overrides", legacySummary.textOverrides],
              ["REX", legacySummary.rexItems],
              ["Retex perso", legacySummary.customRetex],
              ["Équipe", legacySummary.equipe],
              ["Doc versions", legacySummary.refVersions],
            ]
              .filter(([, n]) => n > 0)
              .map(([label, n]) => (
                <span
                  key={label}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontSize: 11,
                    background: "#fff",
                    color: "#30323E",
                    border: "1px solid #DFE4E8",
                  }}
                >
                  <strong>{n}</strong> {label}
                </span>
              ))}
          </div>

          {!importing && !showConfirm && (
            <button className="br" onClick={() => setShowConfirm(true)}>
              Importer ces données
            </button>
          )}

          {showConfirm && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#E30513" }}>
                Ces données seront visibles par toute l'équipe.
              </span>
              <button className="br" onClick={handleImport}>
                Confirmer l'import
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

      {/* ── Résultat de l'import (succès ou erreur) ─────────────────── */}
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
              {importResult.stats.errors.slice(0, 3).map((e, i) => (
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

      {/* ── Reset désactivé en Phase 4 ───────────────────────────────── */}
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
