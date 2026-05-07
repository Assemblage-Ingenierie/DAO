// ── Plateforme — page Home (grille de pays) ──────────────────────────────
//
// Page d'accueil : grille de cartes Pays, chacune affichant le drapeau, le
// nom et le nombre de projets. Bouton "+ Pays" ouvre un sélecteur (parmi
// PAYS_LIST, en excluant les pays déjà ajoutés). Cliquer une carte navigue
// vers `/countries/:id`.
//
// Refactor de la branche `nav==="projets" && !selC` du single-file
// `_imports/plateforme-source.jsx` (lignes 760-765).

import { useState } from "react";
import { Link } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import { PAYS_LIST } from "../data/types.js";
import { usePlatformData } from "../store/usePlatformData.js";
import { addCountry, removeCountry } from "../store/platformStore.js";
import "../styles.css";

export default function Home() {
  const [data, setData] = usePlatformData();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState("");

  function handleAdd() {
    if (!pickerValue) return;
    setData((prev) => addCountry(prev, pickerValue));
    setPickerValue("");
    setShowPicker(false);
  }

  function handleRemove(countryId) {
    if (!window.confirm("Supprimer ce pays ?")) return;
    setData((prev) => removeCountry(prev, countryId));
  }

  // Pays déjà choisis — on les exclut du sélecteur pour éviter les doublons.
  const existingNames = new Set(
    (data.countries || []).map((c) => c.name.toLowerCase()),
  );
  const availablePays = PAYS_LIST.filter((p) => !existingNames.has(p.toLowerCase()));

  return (
    <div className="fade">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E" }}>
          Projets par pays
        </h1>
        <button className="br" onClick={() => setShowPicker(true)}>
          + Pays
        </button>
      </div>

      {showPicker && (
        <div
          className="fade"
          style={{
            background: "#F9E1E3",
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <select
            className="ip"
            style={{ maxWidth: 300 }}
            value={pickerValue}
            onChange={(e) => setPickerValue(e.target.value)}
            autoFocus
          >
            <option value="">— Choisir un pays —</option>
            {availablePays.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button className="br" onClick={handleAdd}>
            OK
          </button>
          <button
            className="bo"
            onClick={() => {
              setShowPicker(false);
              setPickerValue("");
            }}
          >
            ×
          </button>
        </div>
      )}

      {(data.countries || []).length === 0 ? (
        <p style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
          Aucun pays.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {data.countries.map((country) => {
            const projectCount = (data.projects[country.id] || []).length;
            return (
              <Link
                key={country.id}
                to={`/countries/${country.id}`}
                className="card"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Flag name={country.name} size={48} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#30323E" }}>
                      {country.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#4D4D4D" }}>
                      {projectCount} projet{projectCount > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <button
                  className="del"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(country.id);
                  }}
                >
                  ×
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
