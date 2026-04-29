import { SECTIONS } from "../packages/v2024/fr/sections.js";
import ActorTag from "./ActorTag.jsx";

const SPECIAL_TYPES = ["personnel_table", "materiel_table", "proposition_list"];

export default function ActorChecklist({ actors, actorAssignments, onNavigate }) {
  // Group delegated fields by actor
  const byActor = {};
  actors.forEach((a) => { byActor[a.id] = []; });

  SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      if (SPECIAL_TYPES.includes(field.type)) return;
      const assigned = actorAssignments[field.id] || [];
      assigned.forEach((actorId) => {
        if (byActor[actorId]) {
          byActor[actorId].push({ field, section });
        }
      });
    });
  });

  const totalDelegated = Object.values(byActor).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 800 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#30323E", marginBottom: 6 }}>
        📌 Suivi des champs délégués
      </h2>
      <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>
        {totalDelegated === 0
          ? "Aucun champ n'a encore été délégué à un acteur."
          : `${totalDelegated} champ${totalDelegated > 1 ? "s" : ""} délégué${totalDelegated > 1 ? "s" : ""} au total.`}
      </p>

      {actors.map((actor) => {
        const fields = byActor[actor.id] || [];
        return (
          <div key={actor.id} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: `2px solid ${actor.color}`,
              }}
            >
              <ActorTag actor={actor} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#30323E" }}>
                {actor.label}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  background: fields.length > 0 ? actor.bgColor : "#F2F2F2",
                  color: fields.length > 0 ? actor.color : "#999",
                  border: `1px solid ${fields.length > 0 ? actor.borderColor : "#DFE4E8"}`,
                  padding: "2px 10px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {fields.length} champ{fields.length !== 1 ? "s" : ""}
              </span>
            </div>

            {fields.length === 0 ? (
              <p style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", paddingLeft: 8 }}>
                Aucun champ délégué à {actor.label}.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {fields.map(({ field, section }) => (
                  <div
                    key={field.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: "#fff",
                      border: "1px solid #DFE4E8",
                      borderRadius: 5,
                      cursor: "pointer",
                    }}
                    onClick={() => onNavigate(section.id)}
                    title={`Aller à : ${section.title}`}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{section.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#4D4D4D" }}>
                        {field.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa" }}>
                        {section.title} · {field.ref}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#bbb" }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {totalDelegated === 0 && (
        <div
          style={{
            marginTop: 16,
            padding: "20px 24px",
            background: "#F9E1E3",
            border: "1px solid #E30513",
            borderRadius: 8,
            fontSize: 13,
            color: "#E30513",
          }}
        >
          <strong>Comment déléguer un champ ?</strong>
          <br />
          Dans chaque section, cliquez sur « Déléguer à... » sous un champ et cochez l'acteur
          responsable. Le champ apparaîtra ici pour le suivi.
        </div>
      )}
    </div>
  );
}
