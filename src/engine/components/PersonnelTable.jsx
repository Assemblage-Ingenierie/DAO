import { LABELS } from "../../packages/v2024/fr/labels.js";
import { DEFAULT_PERSONNEL_ROWS as DEFAULT_ROWS } from "../../packages/v2024/fr/defaults.js";

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

export default function PersonnelTable({ rows, onChange }) {
  const data = rows && rows.length > 0 ? rows : DEFAULT_ROWS;

  const updateRow = (id, field, value) => {
    onChange(data.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    onChange([
      ...data,
      { id: nextId++, poste: "", exp_generale: "", exp_comparable: "", note: "" },
    ]);
  };

  const removeRow = (id) => {
    if (data.length <= 1) return;
    onChange(data.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F2F2F2" }}>
              <th style={{ ...cellStyle, width: 36, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>No.</th>
              <th style={{ ...cellStyle, fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>{LABELS.personnel.poste}</th>
              <th style={{ ...cellStyle, width: 130, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>{LABELS.personnel.expGeneral}</th>
              <th style={{ ...cellStyle, width: 140, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>{LABELS.personnel.expComparable}</th>
              <th style={{ ...cellStyle, fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>{LABELS.personnel.note}</th>
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
                    value={row.poste}
                    onChange={(e) => updateRow(row.id, "poste", e.target.value)}
                    placeholder={LABELS.personnel.postePlaceholder}
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <input
                    style={{ ...inputStyle, textAlign: "center" }}
                    value={row.exp_generale}
                    onChange={(e) => updateRow(row.id, "exp_generale", e.target.value)}
                    placeholder="5"
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <input
                    style={{ ...inputStyle, textAlign: "center" }}
                    value={row.exp_comparable}
                    onChange={(e) => updateRow(row.id, "exp_comparable", e.target.value)}
                    placeholder="2"
                  />
                </td>
                <td style={cellStyle}>
                  <input
                    style={inputStyle}
                    value={row.note}
                    onChange={(e) => updateRow(row.id, "note", e.target.value)}
                    placeholder={LABELS.personnel.notePlaceholder}
                  />
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  <button
                    onClick={() => removeRow(row.id)}
                    disabled={data.length <= 1}
                    style={{
                      background: "none",
                      border: "none",
                      color: data.length <= 1 ? "#ccc" : "#E30513",
                      fontSize: 16,
                      cursor: data.length <= 1 ? "default" : "pointer",
                      padding: "0 4px",
                      lineHeight: 1,
                    }}
                    title={LABELS.personnel.deleteTooltip}
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
        {LABELS.personnel.addButton}
      </button>
    </div>
  );
}
