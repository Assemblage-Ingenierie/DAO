import { LABELS } from "../../packages/v2024/fr/labels.js";

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

export default function MaterielTable({ rows, onChange }) {
  const data = rows || [];

  const updateRow = (id, field, value) => {
    onChange(data.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    onChange([
      ...data,
      { id: nextId++, type: "", nombre_min: "" },
    ]);
  };

  const removeRow = (id) => {
    onChange(data.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F2F2F2" }}>
              <th style={{ ...cellStyle, width: 36, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>No.</th>
              <th style={{ ...cellStyle, fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>
                {LABELS.materiel.type}
              </th>
              <th style={{ ...cellStyle, width: 160, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>
                {LABELS.materiel.minNumber}
              </th>
              <th style={{ ...cellStyle, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...cellStyle, textAlign: "center", color: "#aaa", fontStyle: "italic", padding: "16px 8px" }}>
                  {LABELS.materiel.emptyState}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ ...cellStyle, textAlign: "center", color: "#999", fontWeight: 600 }}>{idx + 1}</td>
                  <td style={cellStyle}>
                    <input
                      style={inputStyle}
                      value={row.type || ""}
                      onChange={(e) => updateRow(row.id, "type", e.target.value)}
                      placeholder={LABELS.materiel.typePlaceholder}
                    />
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <input
                      style={{ ...inputStyle, textAlign: "center" }}
                      value={row.nombre_min || ""}
                      onChange={(e) => updateRow(row.id, "nombre_min", e.target.value)}
                      placeholder="2"
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
                      title={LABELS.common.delete}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        style={{
          marginTop: 8,
          padding: "6px 14px",
          background: "#F9E1E3",
          border: "1px solid #E30513",
          borderRadius: 4,
          color: "#E30513",
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {LABELS.materiel.addButton}
      </button>
    </div>
  );
}
