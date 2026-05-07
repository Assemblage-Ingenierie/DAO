// ── Plateforme — composant ReviewItem (item de checklist) ────────────────
//
// Une ligne d'une checklist de revue. Affiche :
//   - 3 boutons C (conforme, vert) / NC (non conforme, rouge) / NA (gris)
//     pour le statut.
//   - Le texte de l'item + un éventuel "tip" en italique gris.
//   - Des badges de sources (DIR / APM / RETEX / REX) — couleurs résolues
//     via la table SRC de data/types.js.
//   - Un textarea de commentaire qui apparaît dès que le statut est NC ou
//     qu'un commentaire pré-existant est présent.
//
// Adapté du composant `RI` du single-file `_imports/plateforme-source.jsx`
// (lignes 461-477) — props renommées :
//   sr → sources, st → status, cm → comment.
//
// Le parent gère l'état (status + comment) et reçoit les changements via
// onChange(itemId, "status"|"comment", newValue).

import { SRC } from "../data/types.js";

const STATUS_BUTTONS = [
  ["ok", "C", "#22c55e"],
  ["nok", "NC", "#E30513"],
  ["na", "NA", "#999"],
];

export default function ReviewItem({
  id,
  text,
  tip,
  sources,
  status,
  comment,
  onChange,
}) {
  return (
    <div style={{ padding: "8px 12px", borderBottom: "1px solid #DFE4E8", fontSize: 13 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 3, flexShrink: 0, marginTop: 2 }}>
          {STATUS_BUTTONS.map(([value, label, color]) => (
            <button
              key={value}
              onClick={() => onChange(id, "status", value)}
              style={{
                width: 26,
                height: 20,
                borderRadius: 3,
                border: status === value ? "2px solid " + color : "1px solid #DFE4E8",
                background: status === value ? color : "#fff",
                color: status === value ? "#fff" : "#aaa",
                fontSize: 9,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#30323E", lineHeight: 1.4 }}>{text}</div>
          {tip && (
            <div style={{ fontSize: 11, color: "#4D4D4D", marginTop: 3, fontStyle: "italic" }}>
              {tip}
            </div>
          )}
          <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
            {(sources || []).map((s) => {
              const x = SRC.find((z) => z.id === s);
              return (
                <span
                  key={s}
                  style={{
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 8,
                    fontWeight: 700,
                    background: (x && x.co) || "#999",
                    color: "#fff",
                  }}
                >
                  {(x && x.lb) || s}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      {(status === "nok" || comment) && (
        <textarea
          placeholder="Commentaire..."
          value={comment || ""}
          onChange={(e) => onChange(id, "comment", e.target.value)}
          style={{
            width: "100%",
            marginTop: 6,
            padding: "5px 8px",
            border: "1.5px solid #DFE4E8",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "'Open Sans',sans-serif",
            resize: "vertical",
            minHeight: 36,
            outline: "none",
          }}
        />
      )}
    </div>
  );
}
