// ── Plateforme — page MemoCodes (codes des marchés par pays) ─────────────
//
// Comparaison thématique entre Directives AFD et code local des marchés
// publics. L'utilisateur choisit un pays et/ou un sujet : la page affiche
// soit toutes les thématiques pour le pays choisi (vue split AFD vs pays),
// soit toutes les versions pays pour la thématique choisie.
//
// Refactor de la branche `nav==="codes"` du single-file
// `_imports/plateforme-source.jsx` (lignes 930-979).

import { useState } from "react";
import { MEMO_PAYS, MEMO_DATA } from "../data/memoData.js";
import "../styles.css";

function NotRenseigne() {
  return <span style={{ color: "#999", fontStyle: "italic" }}>Non renseigné</span>;
}

export default function MemoCodes() {
  const [selectedPays, setSelectedPays] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("");

  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 8 }}>
        Mémo Codes des marchés
      </h1>
      <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 20 }}>
        Comparaison par thématique entre Directives AFD et réglementation locale, par pays.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select
          className="ip"
          style={{ maxWidth: 250 }}
          value={selectedPays}
          onChange={(e) => setSelectedPays(e.target.value)}
        >
          <option value="">— Choisir un pays —</option>
          {MEMO_PAYS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="ip"
          style={{ maxWidth: 300 }}
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value)}
        >
          <option value="">— Tous les sujets —</option>
          {MEMO_DATA.map((t, i) => (
            <option key={i} value={t.n}>
              {t.n}
            </option>
          ))}
        </select>
      </div>

      {/* Cas A : un pays sélectionné — split AFD vs pays par thématique */}
      {selectedPays && (
        <div>
          {MEMO_DATA.filter((t) => {
            if (selectedTheme && t.n !== selectedTheme) return false;
            return t.c[selectedPays] || t.c[selectedPays.toUpperCase()] || t.d24 || t.d19;
          }).map((t, i) => {
            const local = t.c[selectedPays] || t.c[selectedPays.toUpperCase()] || "";
            const directives = t.d24 || t.d19 || "";
            if (!local && !directives) return null;
            return (
              <div
                key={i}
                style={{
                  marginBottom: 16,
                  border: "1.5px solid #DFE4E8",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#30323E",
                    color: "#fff",
                    padding: "8px 14px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {t.n}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    minHeight: 60,
                  }}
                >
                  <div
                    style={{
                      padding: 12,
                      borderRight: "1px solid #DFE4E8",
                      background: "#F9E1E3",
                    }}
                  >
                    <div
                      style={{ fontSize: 10, fontWeight: 700, color: "#E30513", marginBottom: 4 }}
                    >
                      DIRECTIVES AFD
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#30323E",
                        whiteSpace: "pre-line",
                        lineHeight: 1.4,
                      }}
                    >
                      {directives || <NotRenseigne />}
                    </div>
                  </div>
                  <div style={{ padding: 12, background: "#fff" }}>
                    <div
                      style={{ fontSize: 10, fontWeight: 700, color: "#30323E", marginBottom: 4 }}
                    >
                      {selectedPays.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#30323E",
                        whiteSpace: "pre-line",
                        lineHeight: 1.4,
                      }}
                    >
                      {local || <NotRenseigne />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cas B : ni pays ni thème → invitation */}
      {!selectedPays && !selectedTheme && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>
          Sélectionnez un pays et/ou un sujet pour afficher la comparaison.
        </div>
      )}

      {/* Cas C : thème seul, pas de pays — affiche AFD + tous les pays renseignés */}
      {!selectedPays && selectedTheme && (
        <div>
          {MEMO_DATA.filter((t) => t.n === selectedTheme).map((t, i) => (
            <div
              key={i}
              style={{
                marginBottom: 16,
                border: "1.5px solid #DFE4E8",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "#30323E",
                  color: "#fff",
                  padding: "8px 14px",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {t.n}
              </div>
              <div
                style={{
                  padding: 12,
                  background: "#F9E1E3",
                  borderBottom: "1px solid #DFE4E8",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#E30513", marginBottom: 4 }}>
                  DIRECTIVES AFD
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#30323E",
                    whiteSpace: "pre-line",
                    lineHeight: 1.4,
                  }}
                >
                  {t.d24 || t.d19 || <NotRenseigne />}
                </div>
              </div>
              {MEMO_PAYS.filter((p) => t.c[p] || t.c[p.toUpperCase()]).map((p) => (
                <div key={p} style={{ padding: 12, borderBottom: "1px solid #DFE4E8" }}>
                  <div
                    style={{ fontSize: 10, fontWeight: 700, color: "#30323E", marginBottom: 4 }}
                  >
                    {p.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#30323E",
                      whiteSpace: "pre-line",
                      lineHeight: 1.4,
                    }}
                  >
                    {t.c[p] || t.c[p.toUpperCase()]}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
