import { useState } from "react";
import { LABELS, tpl } from "../packages/v2024/fr/labels.js";

const PALETTE = [
  { color: "#6A1B9A", bgColor: "#F3E5F5", borderColor: "#CE93D8" },
  { color: "#00695C", bgColor: "#E0F2F1", borderColor: "#80CBC4" },
  { color: "#AD1457", bgColor: "#FCE4EC", borderColor: "#F48FB1" },
  { color: "#4527A0", bgColor: "#EDE7F6", borderColor: "#B39DDB" },
  { color: "#BF360C", bgColor: "#FBE9E7", borderColor: "#FFAB91" },
];

let paletteIdx = 0;

function getNextPalette() {
  const p = PALETTE[paletteIdx % PALETTE.length];
  paletteIdx++;
  return p;
}

export default function ActorsConfig({ actors, onChange }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const updateActor = (id, patch) => {
    onChange(actors.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const addActor = () => {
    const palette = getNextPalette();
    const newActor = {
      id: `custom_${Date.now()}`,
      label: LABELS.actorsConfig.newActor,
      defaultComment: LABELS.actorsConfig.defaultCommentValue,
      ...palette,
    };
    onChange([...actors, newActor]);
  };

  const removeActor = (id) => {
    onChange(actors.filter((a) => a.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 700 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#30323E", marginBottom: 6 }}>
        {LABELS.actorsConfig.title}
      </h2>
      <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>
        {LABELS.actorsConfig.description}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {actors.map((actor) => (
          <div
            key={actor.id}
            style={{
              border: `1px solid ${actor.borderColor}`,
              borderLeft: `4px solid ${actor.color}`,
              borderRadius: 6,
              padding: "12px 16px",
              background: actor.bgColor,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Badge aperçu */}
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  background: actor.bgColor,
                  color: actor.color,
                  border: `1px solid ${actor.borderColor}`,
                  minWidth: 50,
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {actor.label || "?"}
              </span>

              {/* Label */}
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={{ fontSize: 11, color: "#777", display: "block", marginBottom: 2 }}>
                  {LABELS.actorsConfig.displayLabel}
                </label>
                <input
                  value={actor.label}
                  onChange={(e) => updateActor(actor.id, { label: e.target.value })}
                  style={{
                    border: "1px solid #DFE4E8",
                    borderRadius: 4,
                    padding: "5px 8px",
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: actor.color,
                    background: "#fff",
                    width: "100%",
                  }}
                  maxLength={20}
                />
              </div>

              {/* Commentaire par défaut */}
              <div style={{ flex: 3, minWidth: 200 }}>
                <label style={{ fontSize: 11, color: "#777", display: "block", marginBottom: 2 }}>
                  {LABELS.actorsConfig.defaultWordComment}
                </label>
                <input
                  value={actor.defaultComment}
                  onChange={(e) => updateActor(actor.id, { defaultComment: e.target.value })}
                  style={{
                    border: "1px solid #DFE4E8",
                    borderRadius: 4,
                    padding: "5px 8px",
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: 13,
                    color: "#4D4D4D",
                    background: "#fff",
                    width: "100%",
                  }}
                  placeholder={LABELS.actorsConfig.commentPlaceholder}
                />
              </div>

              {/* Supprimer */}
              {confirmDelete === actor.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "#E30513" }}>{LABELS.actorsConfig.deleteConfirmation}</span>
                  <button
                    onClick={() => removeActor(actor.id)}
                    style={{
                      padding: "4px 10px",
                      background: "#E30513",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {LABELS.common.yes}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      padding: "4px 10px",
                      background: "none",
                      color: "#4D4D4D",
                      border: "1px solid #DFE4E8",
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {LABELS.common.no}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(actor.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#aaa",
                    fontSize: 18,
                    cursor: "pointer",
                    padding: "0 4px",
                    flexShrink: 0,
                  }}
                  title={tpl(LABELS.actorsConfig.deleteTooltip, { label: actor.label })}
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addActor}
        style={{
          marginTop: 16,
          padding: "8px 18px",
          background: "#F9E1E3",
          border: "1px solid #E30513",
          borderRadius: 6,
          color: "#E30513",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {LABELS.actorsConfig.addButton}
      </button>
    </div>
  );
}
