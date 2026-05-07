// ── Plateforme — composant Flag (drapeau pays) ────────────────────────────
//
// Affiche un drapeau pays via flagcdn.com en se basant sur la table FL
// (data/types.js) qui mappe nom de pays français → code ISO 2 lettres.
// Si le pays n'est pas reconnu : rend un placeholder gris avec "?".
//
// Adapté du composant `Fg` du single-file `_imports/plateforme-source.jsx`
// (ligne 11) — props renommées pour lisibilité (n → name, s → size).

import { FL } from "../data/types.js";

export default function Flag({ name, size }) {
  const code = FL[(name || "").toLowerCase().trim()];
  const z = size || 32;

  if (!code) {
    return (
      <div
        style={{
          width: z,
          height: z * 0.67,
          background: "#DFE4E8",
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 9,
          color: "#999",
        }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={"https://flagcdn.com/w80/" + code + ".png"}
      alt=""
      style={{
        width: z,
        height: z * 0.67,
        objectFit: "cover",
        borderRadius: 3,
        border: "1px solid #DFE4E8",
      }}
    />
  );
}
