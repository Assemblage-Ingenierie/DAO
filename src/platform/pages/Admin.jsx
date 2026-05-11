// ── Plateforme — page Admin (statistiques + reset) ───────────────────────
//
// Trois compteurs : pays, marchés, docs AFD. Le bouton "Réinitialiser" est
// désactivé en Phase 4 — la donnée vit désormais dans Supabase (workspace
// partagé) et un reset depuis une seule machine impacterait toute l'équipe.
// La remise à zéro doit passer par le dashboard Supabase + un script SQL.

import { useMemo } from "react";
import { REF_DOCS } from "../data/refDocs.js";
import { usePlatformData } from "../store/usePlatformData.js";
import "../styles.css";

export default function Admin() {
  const [data] = usePlatformData();

  // Total des marchés à travers tous les projets et pays.
  const marketCount = useMemo(() => {
    let n = 0;
    Object.values(data.markets || {}).forEach((list) => {
      n += list.length;
    });
    return n;
  }, [data.markets]);

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

      <div
        style={{
          padding: 14,
          background: "#FEF2F2",
          borderLeft: "3px solid #E30513",
          fontSize: 12,
          color: "#30323E",
          borderRadius: 4,
        }}
      >
        <strong style={{ color: "#E30513" }}>Reset désactivé en Phase 4.</strong>{" "}
        La base est désormais partagée par toute l'équipe (Supabase). Pour
        repartir d'un état vierge, contactez l'admin Supabase (TRUNCATE des
        tables <code>dao_*</code> via dashboard ou script SQL).
      </div>
    </div>
  );
}
