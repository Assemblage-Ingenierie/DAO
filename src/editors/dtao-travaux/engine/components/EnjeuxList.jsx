import { usePackage } from "../PackageContext.jsx";

const cellStyle = {
  padding: "8px 10px",
  border: "1px solid #DFE4E8",
  verticalAlign: "middle",
};

function Toggle({ value, onChange }) {
  const { labels } = usePackage();
  const isOui = value === "Oui";
  const isNon = value === "Non";
  const base = {
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid #DFE4E8",
    background: "#fff",
    color: "#4D4D4D",
    fontFamily: "Open Sans, sans-serif",
  };
  return (
    <div style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => onChange(isOui ? "" : "Oui")}
        style={{
          ...base,
          borderRight: "none",
          background: isOui ? "#2E7D32" : "#fff",
          color: isOui ? "#fff" : "#4D4D4D",
          borderColor: isOui ? "#2E7D32" : "#DFE4E8",
        }}
      >
        {labels.fieldInput.yes}
      </button>
      <button
        type="button"
        onClick={() => onChange(isNon ? "" : "Non")}
        style={{
          ...base,
          background: isNon ? "#C62828" : "#fff",
          color: isNon ? "#fff" : "#4D4D4D",
          borderColor: isNon ? "#C62828" : "#DFE4E8",
        }}
      >
        {labels.fieldInput.no}
      </button>
    </div>
  );
}

export default function EnjeuxList({ value = {}, onChange }) {
  const { enjeux: { list: ENJEUX }, labels } = usePackage();
  const setOne = (key, v) => onChange({ ...value, [key]: v });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#F2F2F2" }}>
            <th style={{ ...cellStyle, width: 36, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}></th>
            <th style={{ ...cellStyle, fontWeight: 600, color: "#4D4D4D", textAlign: "left" }}>{labels.enjeux.label}</th>
            <th style={{ ...cellStyle, width: 140, fontWeight: 600, color: "#4D4D4D", textAlign: "center" }}>{labels.enjeux.applicable}</th>
          </tr>
        </thead>
        <tbody>
          {ENJEUX.map((e, idx) => (
            <tr key={e.key} style={{ background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
              <td style={{ ...cellStyle, textAlign: "center", color: "#999", fontWeight: 600 }}>{e.key})</td>
              <td style={cellStyle}>{e.label}</td>
              <td style={{ ...cellStyle, textAlign: "center" }}>
                <Toggle value={value[e.key] || ""} onChange={(v) => setOne(e.key, v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
