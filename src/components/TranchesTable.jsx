import { useEffect } from "react";

let nextId = 10;

const cellStyle = {
  padding: "6px 8px",
  border: "1px solid #DFE4E8",
  verticalAlign: "middle",
};

const inputStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  fontFamily: "Open Sans, sans-serif",
  fontSize: 13,
  color: "#4D4D4D",
  outline: "none",
  padding: 0,
};

export default function TranchesTable({ rows, onChange, disabled = false }) {
  const data = rows || [];

  // Always keep at least one (possibly empty) row visible. Matches the template's
  // default presentation: the table exists even when the user has nothing to
  // declare, so they can see the structure.
  useEffect(() => {
    if (!disabled && data.length === 0) {
      onChange([{ id: nextId++, nom: "", delai: "", penalites: "" }]);
    }
  }, [data.length, onChange, disabled]);

  const updateRow = (id, field, value) => {
    if (disabled) return;
    onChange(data.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    if (disabled) return;
    onChange([
      ...data,
      { id: nextId++, nom: "", delai: "", penalites: "" },
    ]);
  };

  const removeRow = (id) => {
    if (disabled) return;
    // Never drop the last row — clear it instead, so an empty placeholder row
    // always remains visible.
    if (data.length <= 1) {
      onChange([{ id: nextId++, nom: "", delai: "", penalites: "" }]);
      return;
    }
    onChange(data.filter((r) => r.id !== id));
  };

  return (
    <div style={{ opacity: disabled ? 0.5 : 1, position: "relative" }}>
      {disabled && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(245,245,245,0.4)",
            zIndex: 1,
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
          }}
          title="Le marché ne comporte pas de tranches (CCAP-003 = Non)"
        >
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#777",
            background: "#fff",
            border: "1px solid #DFE4E8",
            borderRadius: 3,
            padding: "4px 10px",
          }}>
            🔒 Tableau désactivé — CCAP-003 = Non
          </span>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F2F2F2" }}>
              <th style={{ ...cellStyle, width: 36, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>No.</th>
              <th style={{ ...cellStyle, width: "40%", fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>
                Nom / Description des Tranches
                <div style={{ fontWeight: 400, fontSize: 11, color: "#999", marginTop: 2 }}>
                  Article 1.1.5.6
                </div>
              </th>
              <th style={{ ...cellStyle, width: "25%", fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>
                Délai d'Achèvement
                <div style={{ fontWeight: 400, fontSize: 11, color: "#999", marginTop: 2 }}>
                  Article 1.1.3.3
                </div>
              </th>
              <th style={{ ...cellStyle, fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>
                Pénalités de retard
                <div style={{ fontWeight: 400, fontSize: 11, color: "#999", marginTop: 2 }}>
                  Article 8.7
                </div>
              </th>
              <th style={{ ...cellStyle, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id} style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                <td style={{ ...cellStyle, textAlign: "center", color: "#999", fontWeight: 600 }}>{idx + 1}</td>
                <td style={cellStyle}>
                  <input
                    style={inputStyle}
                    value={row.nom || ""}
                    onChange={(e) => updateRow(row.id, "nom", e.target.value)}
                    placeholder="Ex : Tranche ferme — Bâtiment A"
                    disabled={disabled}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    style={inputStyle}
                    value={row.delai || ""}
                    onChange={(e) => updateRow(row.id, "delai", e.target.value)}
                    placeholder="Ex : 12 mois"
                    disabled={disabled}
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    style={inputStyle}
                    value={row.penalites || ""}
                    onChange={(e) => updateRow(row.id, "penalites", e.target.value)}
                    placeholder="Ex : 0,1 % du montant par jour"
                    disabled={disabled}
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <button
                    onClick={() => removeRow(row.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#E30513",
                      fontSize: 16,
                      cursor: "pointer",
                      padding: "0 4px",
                      lineHeight: 1,
                    }}
                    title="Supprimer"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        disabled={disabled}
        style={{
          marginTop: 8,
          padding: "6px 14px",
          background: disabled ? "#F2F2F2" : "#F9E1E3",
          border: `1px solid ${disabled ? "#DFE4E8" : "#E30513"}`,
          borderRadius: 4,
          color: disabled ? "#999" : "#E30513",
          fontWeight: 600,
          fontSize: 12,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        + Ajouter une tranche
      </button>
    </div>
  );
}
