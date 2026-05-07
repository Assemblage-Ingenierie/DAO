// ── Plateforme — Sidebar (navigation latérale) ───────────────────────────
//
// Sidebar fixée à gauche, fond #30323E, 220 px. Liste les 7 sections
// principales de la Plateforme. L'item actif se détecte sur le préfixe de
// l'URL courante (ex: /, /countries/*, /projects/* → "projets" actif).
//
// Adapté du <div sidebar> du single-file
// `_imports/plateforme-source.jsx` (lignes 752-756) — pas de surface
// d'iframe ni de contexte étranger : pure React Router.

import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";

// 7 entrées en miroir du `NI` de la source (ligne 735), avec en plus la
// route React Router associée à chacune.
const NAV_ITEMS = [
  { id: "projets", icon: "folder", label: "Projets", path: "/" },
  { id: "recherche", icon: "search", label: "Recherche marchés", path: "/search" },
  { id: "memo", icon: "book", label: "Mémo Passation", path: "/memo/retex" },
  { id: "codes", icon: "scale", label: "Mémo Codes", path: "/memo/codes" },
  { id: "ref", icon: "file", label: "Référentiel AFD", path: "/refdocs" },
  { id: "parametrage", icon: "edit", label: "Paramétrage checklists", path: "/checklist-config" },
  { id: "admin", icon: "settings", label: "Administration", path: "/admin" },
];

// Renvoie l'id du nav item actif selon le pathname.
function activeNavId(pathname) {
  // "Projets" couvre la home, les pays, les projets, et les marchés.
  if (
    pathname === "/" ||
    pathname.startsWith("/countries") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/markets") ||
    pathname.startsWith("/marches")
  )
    return "projets";
  if (pathname.startsWith("/search")) return "recherche";
  if (pathname.startsWith("/memo/retex")) return "memo";
  if (pathname.startsWith("/memo/codes")) return "codes";
  if (pathname.startsWith("/refdocs")) return "ref";
  if (pathname.startsWith("/checklist-config")) return "parametrage";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = activeNavId(location.pathname);

  return (
    <div
      style={{
        width: 220,
        background: "#30323E",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "24px 0", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <div
              key={item.id}
              className="ni"
              onClick={() => navigate(item.path)}
              style={{
                borderLeft: isActive ? "3px solid #E30513" : "3px solid transparent",
                background: isActive ? "rgba(227,5,19,.08)" : "transparent",
              }}
            >
              <Icon name={item.icon} active={isActive} />
              <span
                style={{
                  color: isActive ? "#fff" : "rgba(255,255,255,.55)",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,.08)",
          fontSize: 11,
          color: "rgba(255,255,255,.25)",
        }}
      >
        Phase 3 — fusion
      </div>
    </div>
  );
}
