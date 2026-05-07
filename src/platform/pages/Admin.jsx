// ── Plateforme — page Admin (statistiques + reset) ───────────────────────
//
// Trois compteurs : pays, marchés, docs AFD. Bouton "Réinitialiser" qui
// vide localStorage et restaure les valeurs par défaut. La confirmation
// est obligatoire pour éviter les pertes accidentelles.
//
// Refactor de la branche `nav==="admin"` du single-file
// `_imports/plateforme-source.jsx` (ligne 1031).

import { useMemo } from "react";
import { REF_DOCS } from "../data/refDocs.js";
import { usePlatformData } from "../store/usePlatformData.js";
import { resetPlatform } from "../store/platformStore.js";
import "../styles.css";

export default function Admin() {
  const [data, setData] = usePlatformData();

  // Total des marchés à travers tous les projets et pays.
  const marketCount = useMemo(() => {
    let n = 0;
    Object.values(data.markets || {}).forEach((list) => {
      n += list.length;
    });
    return n;
  }, [data.markets]);

  function handleReset() {
    if (!window.confirm("Réinitialiser ?")) return;
    setData(() => resetPlatform());
  }

  const stats = [
    [(data.countries || []).length, "Pays"],
    [marketCount, "Marchés"],
    [REF_DOCS.length, "Docs AFD"],
  ];

  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 20 }}>
        Administration
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {stats.map(([n, label], i) => (
          <div
            key={i}
            style={{
              background: "#F2F2F2",
              borderRadius: 8,
              padding: 20,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#E30513" }}>{n}</div>
            <div style={{ fontSize: 13, color: "#4D4D4D" }}>{label}</div>
          </div>
        ))}
      </div>

      <button
        className="bo"
        style={{ color: "#E30513", borderColor: "#E30513" }}
        onClick={handleReset}
      >
        Réinitialiser
      </button>
    </div>
  );
}
