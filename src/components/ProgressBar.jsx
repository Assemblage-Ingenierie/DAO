import { SECTIONS } from "../data/sections.js";

const SPECIAL_TYPES = ["personnel_table", "materiel_table", "proposition_list"];

function isFieldTreated(field, formData, actorAssignments) {
  if (field.type === "readonly") return true;
  if (SPECIAL_TYPES.includes(field.type)) return true;
  const actors = actorAssignments[field.id];
  if (actors && actors.length > 0) return true;
  const val = formData[field.id];
  if (val === undefined || val === null || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  return String(val).trim().length > 0;
}

export default function ProgressBar({ formData, actorAssignments }) {
  let total = 0;
  let treated = 0;

  SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      total += 1;
      if (isFieldTreated(field, formData, actorAssignments)) treated += 1;
    });
  });

  const pct = total > 0 ? Math.round((treated / total) * 100) : 0;
  const isComplete = pct === 100;

  return (
    <div style={{ padding: "12px 16px", background: "#fff", borderBottom: "1px solid #DFE4E8" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#4D4D4D",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 600 }}>Progression globale</span>
        <span
          style={{
            fontWeight: 700,
            color: isComplete ? "#2e7d32" : "#E30513",
          }}
        >
          {treated}/{total} — {pct}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "#DFE4E8",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: isComplete ? "#2e7d32" : "#E30513",
            borderRadius: 3,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
