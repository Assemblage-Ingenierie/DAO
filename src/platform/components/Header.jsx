// ── Plateforme — Header (bandeau top + breadcrumb) ───────────────────────
//
// Bandeau supérieur 72 px : logo .A + branding "Assemblage ingénierie" +
// titre "Passation des Marchés AFD", puis à droite le fil d'Ariane
// dynamique (Accueil > Pays > Projet) selon l'URL courante.
//
// Adapté du <div header> du single-file
// `_imports/plateforme-source.jsx` (lignes 739-751).

import { Link, useLocation, useParams } from "react-router-dom";
import Flag from "./Flag.jsx";
import { usePlatformData } from "../store/usePlatformData.js";

// Reconstruit le breadcrumb à partir de l'URL courante. Cherche les params
// :id quand on est sur une page Country / Project pour afficher le bon
// nom + drapeau.
function useBreadcrumb() {
  const location = useLocation();
  const [data] = usePlatformData();
  const path = location.pathname;

  // Match /countries/:id
  let m = path.match(/^\/countries\/([^/]+)/);
  if (m) {
    const country = (data.countries || []).find((c) => c.id === m[1]);
    return { country, project: null };
  }

  // Match /projects/:id (Plateforme — page projet)
  m = path.match(/^\/projects\/([^/]+)/);
  if (m) {
    const projectId = m[1];
    let project = null;
    let countryId = null;
    for (const cId of Object.keys(data.projects || {})) {
      const list = data.projects[cId] || [];
      const found = list.find((p) => p.id === projectId);
      if (found) {
        project = found;
        countryId = cId;
        break;
      }
    }
    const country = countryId ? (data.countries || []).find((c) => c.id === countryId) : null;
    return { country, project };
  }

  return { country: null, project: null };
}

export default function Header() {
  const { country, project } = useBreadcrumb();

  return (
    <div
      style={{
        height: 72,
        background: "#F2F2F2",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
        <img
          src="https://hhkofvbptnrtwbazftlm.supabase.co/storage/v1/object/public/Branding/logo/sigle_Ai_rouge.svg"
          alt="Assemblage ingénierie"
          style={{ height: 40, width: "auto", display: "block" }}
        />
        <div style={{ width: 1, height: 36, background: "#DFE4E8" }} />
        <span style={{ fontWeight: 700, fontSize: 19, color: "#30323E" }}>
          Passation des Marchés AFD
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#4D4D4D",
        }}
      >
        <Link
          to="/"
          style={{
            cursor: "pointer",
            color: "#E30513",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Accueil
        </Link>
        {country && (
          <>
            <span style={{ color: "#ccc" }}> › </span>
            <Link
              to={`/countries/${country.id}`}
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#4D4D4D",
                textDecoration: "none",
              }}
            >
              <Flag name={country.name} size={18} />
              {country.name}
            </Link>
          </>
        )}
        {project && (
          <>
            <span style={{ color: "#ccc" }}> › </span>
            <span style={{ fontWeight: 600 }}>{project.name}</span>
          </>
        )}
      </div>
    </div>
  );
}
