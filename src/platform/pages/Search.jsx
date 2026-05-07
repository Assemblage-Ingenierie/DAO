// ── Plateforme — page Search (recherche marchés) ─────────────────────────
//
// Recherche libre sur tous les marchés (texte) + filtres type / pays.
// Cliquer un résultat navigue vers la page Project du marché trouvé.
//
// Refactor de la branche `nav==="recherche"` du single-file
// `_imports/plateforme-source.jsx` (lignes 866-871).

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import { TYPES } from "../data/types.js";
import { usePlatformData } from "../store/usePlatformData.js";
import "../styles.css";

export default function Search() {
  const navigate = useNavigate();
  const [data] = usePlatformData();
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  // Aplatit data.markets (indexé par projet) → liste avec contexte projet+pays.
  const allMarkets = useMemo(() => {
    const result = [];
    (data.countries || []).forEach((country) => {
      const projects = data.projects[country.id] || [];
      projects.forEach((project) => {
        const markets = data.markets[project.id] || [];
        markets.forEach((market) => {
          result.push({
            ...market,
            projectName: project.name,
            countryName: country.name,
            countryId: country.id,
            projectId: project.id,
          });
        });
      });
    });
    return result;
  }, [data]);

  const filtered = useMemo(() => {
    let results = allMarkets;
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((m) =>
        (m.name + m.projectName + m.tl + m.countryName).toLowerCase().includes(q),
      );
    }
    if (filterType) results = results.filter((m) => m.type === filterType);
    if (filterCountry) results = results.filter((m) => m.countryId === filterCountry);
    return results;
  }, [allMarkets, query, filterType, filterCountry]);

  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 20 }}>
        Recherche
      </h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="ip"
          style={{ flex: 2, minWidth: 180 }}
          placeholder="Rechercher..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="ip"
          style={{ flex: 1, minWidth: 160 }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tous types</option>
          {TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
        <select
          className="ip"
          style={{ flex: 1, minWidth: 140 }}
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
        >
          <option value="">Tous pays</option>
          {(data.countries || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 12 }}>
        {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
      </p>

      {filtered.map((m) => (
        <div
          key={m.id + m.projectId}
          onClick={() => navigate(`/projects/${m.projectId}`)}
          style={{
            border: "1.5px solid #DFE4E8",
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <Flag name={m.countryName} size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#30323E" }}>{m.name}</div>
            <div style={{ fontSize: 11, color: "#4D4D4D" }}>
              {m.countryName} · {m.projectName}
            </div>
          </div>
          <span style={{ color: "#ccc" }}>›</span>
        </div>
      ))}
    </div>
  );
}
