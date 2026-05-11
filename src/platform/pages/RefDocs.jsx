// ── Plateforme — page RefDocs (Référentiel AFD) ──────────────────────────
//
// Catalogue des 14 documents-types AFD avec leur version courante. Chips
// par catégorie pour filtrer (Travaux/PI/Transversal/Cadre). Bouton
// "Modifier" sur chaque doc déplie un panneau d'édition : version
// override, statut (en vigueur / archivé), et journal des modifications
// (entrées datées). Les overrides sont stockés dans data.refVersions[id].
//
// Refactor de la branche `nav==="ref"` du single-file
// `_imports/plateforme-source.jsx` (lignes 980-1029).

import { useState } from "react";
import { REF_DOCS } from "../data/refDocs.js";
import { usePlatformData } from "../store/usePlatformData.js";
import "../styles.css";

const FILTER_CATEGORIES = ["", "Travaux", "PI", "Transversal", "Cadre"];

function filterChipStyle(filter, isActive) {
  const inactiveBg = "#fff";
  const activeBgByCat = {
    Travaux: "#30323E",
    PI: "#E30513",
    Cadre: "#DFE4E8",
    Transversal: "#F2F2F2",
  };
  const activeBg = activeBgByCat[filter] || "#F2F2F2";
  const activeColor = filter === "Cadre" || filter === "Transversal" ? "#30323E" : "#fff";
  const inactiveColor = "#30323E";
  return {
    padding: "4px 14px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: isActive ? activeBg : inactiveBg,
    color: isActive ? activeColor : inactiveColor,
    border: isActive
      ? "2px solid " +
        (filter === "Travaux" ? "#30323E" : filter === "PI" ? "#E30513" : "#DFE4E8")
      : "1.5px solid #DFE4E8",
  };
}

function tagBg(cat) {
  if (cat === "Travaux") return "#30323E";
  if (cat === "PI") return "#E30513";
  if (cat === "Cadre") return "#DFE4E8";
  return "#F2F2F2";
}

function tagLabel(cat) {
  if (cat === "Travaux") return "TVX";
  if (cat === "PI") return "PI";
  if (cat === "Cadre") return "DIR";
  return "PPM";
}

export default function RefDocs() {
  const [data, mutate] = usePlatformData();
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [logEntry, setLogEntry] = useState("");

  async function patchVersion(docId, patch) {
    await mutate.upsertRefVersion(docId, patch);
  }

  async function appendLog(docId, currentLog) {
    if (!logEntry.trim()) return;
    const entry = { date: new Date().toISOString().slice(0, 10), text: logEntry.trim() };
    await patchVersion(docId, { log: [...(currentLog || []), entry] });
    setLogEntry("");
  }

  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 8 }}>
        Référentiel AFD
      </h1>
      <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 20 }}>
        Documents-types en vigueur et gestion des versions. Mettez à jour les versions quand
        l'AFD publie de nouvelles éditions.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {FILTER_CATEGORIES.map((f) => (
          <span
            key={f || "all"}
            onClick={() => setFilter(f)}
            style={filterChipStyle(f, filter === f)}
          >
            {f || "Tous"}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {REF_DOCS.filter((d) => !filter || d.cat === filter).map((d) => {
          const overrides = (data.refVersions || {})[d.id] || {};
          const currentVer = overrides.ver || d.ver;
          const currentDir = overrides.dir || d.dir;
          const isArchived = !!overrides.archived;
          const status = isArchived ? "Archivé" : "En vigueur";
          const isEditing = editingId === d.id;

          return (
            <div
              key={d.id}
              style={{
                border: "1.5px solid #DFE4E8",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: tagBg(d.cat),
                    color: d.cat === "Cadre" || d.cat === "Transversal" ? "#30323E" : "#fff",
                    fontWeight: 700,
                    fontSize: 9,
                    textAlign: "center",
                  }}
                >
                  {tagLabel(d.cat)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#30323E" }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "#4D4D4D" }}>{d.desc}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 600,
                        background: "#F2F2F2",
                        color: "#30323E",
                      }}
                    >
                      {d.ref}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 600,
                        background: "#F2F2F2",
                        color: "#30323E",
                      }}
                    >
                      Version : {currentVer}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 600,
                        background: currentDir === "2024" ? "#E30513" : "#30323E",
                        color: "#fff",
                      }}
                    >
                      Dir. {currentDir}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 10,
                        fontWeight: 600,
                        background: isArchived ? "#999" : "#22c55e",
                        color: "#fff",
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>
                <button
                  className="bo"
                  style={{ padding: "4px 12px", fontSize: 11 }}
                  onClick={() => {
                    setEditingId(isEditing ? null : d.id);
                    setLogEntry("");
                  }}
                >
                  {isEditing ? "Fermer" : "Modifier"}
                </button>
              </div>

              {isEditing && (
                <div
                  style={{
                    padding: "0 14px 14px",
                    background: "#F2F2F2",
                    borderTop: "1px solid #DFE4E8",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                      padding: "12px 0",
                    }}
                  >
                    <div>
                      <label className="lb">Version actuelle</label>
                      <input
                        className="ip"
                        value={currentVer}
                        onChange={(e) => patchVersion(d.id, { ver: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="lb">Directives</label>
                      <select
                        className="ip"
                        value={currentDir}
                        onChange={(e) => patchVersion(d.id, { dir: e.target.value })}
                      >
                        <option value="2024">2024</option>
                        <option value="2019">2019</option>
                      </select>
                    </div>
                    <div>
                      <label className="lb">Statut</label>
                      <select
                        className="ip"
                        value={isArchived ? "archived" : "active"}
                        onChange={(e) =>
                          patchVersion(d.id, { archived: e.target.value === "archived" })
                        }
                      >
                        <option value="active">En vigueur</option>
                        <option value="archived">Archivé</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <label className="lb">Ajouter une entrée au journal des modifications</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="ip"
                        value={logEntry}
                        onChange={(e) => setLogEntry(e.target.value)}
                        placeholder="Ex: Mise à jour section ESSS, ajout clause sûreté…"
                      />
                      <button
                        className="br"
                        style={{ flexShrink: 0, padding: "6px 14px", fontSize: 11 }}
                        onClick={() => appendLog(d.id, overrides.log)}
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {(overrides.log || []).length > 0 && (
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 6,
                        padding: 10,
                        border: "1px solid #DFE4E8",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#4D4D4D",
                          marginBottom: 6,
                        }}
                      >
                        Journal des modifications
                      </div>
                      {(overrides.log || []).slice().reverse().map((entry, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: "#30323E",
                            padding: "3px 0",
                            borderBottom: "1px solid #F2F2F2",
                          }}
                        >
                          <span style={{ color: "#999", marginRight: 8 }}>{entry.date}</span>
                          {entry.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
