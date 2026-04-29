import { SECTIONS, SECTION_GROUPS } from "../packages/v2024/fr/sections.js";
import { getFieldStatus } from "../utils/fieldStatus.js";

function aggregateStatus(section, formData, actorAssignments, fieldComments) {
  let unfilled = 0;
  let delegated = 0;
  let filled = 0;
  section.fields.forEach((field) => {
    const s = getFieldStatus(
      field,
      formData[field.id],
      actorAssignments[field.id],
      fieldComments?.[field.id],
      formData
    );
    if (s === "readonly") return;
    if (s === "unfilled") unfilled += 1;
    else if (s === "delegated") delegated += 1;
    else filled += 1;
  });
  let status;
  if (unfilled > 0) status = "unfilled";
  else if (delegated > 0) status = "delegated";
  else status = "filled";
  return { unfilled, delegated, filled, status };
}

export default function Sidebar({ activeSection, onNavigate, formData, actorAssignments, fieldComments }) {
  const sectionMap = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

  return (
    <div
      style={{
        width: 280,
        minWidth: 280,
        background: "#30323E",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Logo / Header */}
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <img
            src="/assemblage-logo.png"
            alt="Assemblage ingénierie"
            style={{ height: 36, width: "auto", display: "block" }}
          />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, opacity: 0.9 }}>
            DAO Travaux
          </span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2, letterSpacing: 0.5 }}>
          AFD · Format PAY · Fév. 2024
        </div>
      </div>

      {/* Special tabs */}
      <div style={{ padding: "8px 10px 4px", flexShrink: 0 }}>
        {[
          { id: "__suivi__", label: "Suivi acteurs", icon: "📌" },
          { id: "__acteurs__", label: "Acteurs", icon: "⚙️" },
        ].map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "9px 12px",
                background: active ? "rgba(227,5,19,0.15)" : "transparent",
                border: "none",
                borderLeft: active ? "3px solid #E30513" : "3px solid transparent",
                borderRadius: 5,
                color: active ? "#fff" : "rgba(255,255,255,0.7)",
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
                marginBottom: 2,
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 10px 6px" }} />

      {/* Section groups */}
      <div style={{ flex: 1, padding: "0 10px 16px", overflowY: "auto" }}>
        {SECTION_GROUPS.map((group) => (
          <div key={group.groupLabel} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.35)",
                padding: "8px 8px 4px",
              }}
            >
              {group.groupLabel}
            </div>

            {group.sectionIds.map((sectionId) => {
              const section = sectionMap[sectionId];
              if (!section) return null;
              const { unfilled, delegated, filled, status } = aggregateStatus(
                section,
                formData,
                actorAssignments,
                fieldComments
              );
              const active = activeSection === sectionId;

              return (
                <button
                  key={sectionId}
                  onClick={() => onNavigate(sectionId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "8px 12px",
                    background: active ? "rgba(227,5,19,0.15)" : "transparent",
                    border: "none",
                    borderLeft: active ? "3px solid #E30513" : "3px solid transparent",
                    borderRadius: 5,
                    color: active ? "#fff" : "rgba(255,255,255,0.75)",
                    fontSize: 12,
                    fontWeight: active ? 700 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s",
                    marginBottom: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Progress indicator on the left, replaces section icon */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: {
                        filled: "#4CAF50",
                        delegated: "#FF9800",
                        unfilled: "#E30513",
                      }[status],
                    }}
                    title={`${unfilled} non rempli(s) · ${delegated} délégué(s) · ${filled} rempli(s)`}
                  />
                  <span style={{ flex: 1, lineHeight: 1.3 }}>{section.title}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
