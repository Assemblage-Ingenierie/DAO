// ── Plateforme — page Country (liste des projets d'un pays) ──────────────
//
// Affiche le drapeau + nom du pays sélectionné, puis la liste de ses
// projets en cartes. Bouton "+ Projet" ouvre un input inline. Cliquer une
// carte navigue vers `/projects/:id`.
//
// Refactor de la branche `nav==="projets" && selC && !selP` du single-file
// `_imports/plateforme-source.jsx` (lignes 767-773).

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import { usePlatformData } from "../store/usePlatformData.js";
import "../styles.css";

// Petit composant badge réutilisé entre pages — extrait du source line 552.
function Badge({ bg, color, children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  );
}

export default function Country() {
  const { id: countryId } = useParams();
  const navigate = useNavigate();
  const [data, mutate] = usePlatformData();
  const [showInput, setShowInput] = useState(false);
  const [projectName, setProjectName] = useState("");

  const country = (data.countries || []).find((c) => c.id === countryId);
  const projects = (data.projects[countryId] || []);

  // Pays inconnu (URL périmée par ex.) → renvoie sur Home.
  if (!country) {
    return (
      <div className="fade" style={{ padding: "60px 0", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: 16 }}>Pays introuvable.</p>
        <Link to="/" className="bo" style={{ textDecoration: "none" }}>
          ← Retour
        </Link>
      </div>
    );
  }

  async function handleAdd() {
    if (!projectName.trim()) return;
    await mutate.addProject(countryId, projectName);
    setProjectName("");
    setShowInput(false);
  }

  async function handleRemove(projectId) {
    if (!window.confirm("Supprimer ?")) return;
    await mutate.removeProject(projectId);
  }

  return (
    <div className="fade">
      <button
        className="bo"
        onClick={() => navigate("/")}
        style={{ marginBottom: 20 }}
      >
        ← Retour
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Flag name={country.name} size={48} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E" }}>
            {country.name}
          </h1>
        </div>
        <button className="br" onClick={() => setShowInput(true)}>
          + Projet
        </button>
      </div>

      {showInput && (
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
          <input
            className="ip"
            style={{ maxWidth: 350 }}
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nom du projet"
            autoFocus
          />
          <button className="br" onClick={handleAdd}>
            OK
          </button>
          <button
            className="bo"
            onClick={() => {
              setShowInput(false);
              setProjectName("");
            }}
          >
            ×
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <p style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
          Aucun projet.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card"
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#30323E",
                  marginBottom: 4,
                }}
              >
                {project.name}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Badge bg="#F2F2F2" color="#30323E">
                  Dir. {project.dir}
                </Badge>
                {project.secu === "zone-risque" && (
                  <Badge bg="#F9E1E3" color="#E30513">
                    Zone risque
                  </Badge>
                )}
              </div>
              <button
                className="del"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(project.id);
                }}
              >
                ×
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
