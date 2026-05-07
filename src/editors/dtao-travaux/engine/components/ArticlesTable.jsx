import { useEffect } from "react";
import { usePackage } from "../PackageContext.jsx";

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

export default function ArticlesTable({ rows, onChange }) {
  const { labels } = usePackage();
  const data = rows || [];

  // Always keep at least one (possibly empty) row visible. Matches the
  // template's default presentation: the table exists even when the user has
  // nothing to declare, so they can see the structure.
  useEffect(() => {
    if (data.length === 0) {
      onChange([{ id: nextId++, article: "", explication: "" }]);
    }
  }, [data.length, onChange]);

  const updateRow = (id, field, value) => {
    onChange(data.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    onChange([
      ...data,
      { id: nextId++, article: "", explication: "" },
    ]);
  };

  const removeRow = (id) => {
    // Never drop the last row — clear it instead, so an empty placeholder row
    // always remains visible.
    if (data.length <= 1) {
      onChange([{ id: nextId++, article: "", explication: "" }]);
      return;
    }
    onChange(data.filter((r) => r.id !== id));
  };

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F2F2F2" }}>
              <th style={{ ...cellStyle, width: 36, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>No.</th>
              <th style={{ ...cellStyle, width: "35%", fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>
                {labels.articles.articleNumber}
              </th>
              <th style={{ ...cellStyle, fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>
                {labels.articles.explanations}
              </th>
              <th style={{ ...cellStyle, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ ...cellStyle, textAlign: "center", color: "#aaa", fontStyle: "italic", padding: "16px 8px" }}>
                  {labels.articles.emptyState}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={row.id} style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                  <td style={{ ...cellStyle, textAlign: "center", color: "#999", fontWeight: 600 }}>{idx + 1}</td>
                  <td style={cellStyle}>
                    <input
                      style={inputStyle}
                      value={row.article || ""}
                      onChange={(e) => updateRow(row.id, "article", e.target.value)}
                      placeholder={labels.articles.articlePlaceholder}
                    />
                  </td>
                  <td style={cellStyle}>
                    <input
                      style={inputStyle}
                      value={row.explication || ""}
                      onChange={(e) => updateRow(row.id, "explication", e.target.value)}
                      placeholder={labels.articles.explanationPlaceholder}
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
                      title={labels.common.delete}
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
        {labels.articles.addButton}
      </button>
    </div>
  );
}
