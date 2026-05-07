// ── Plateforme — ShellLayout (wrapper Header + Sidebar + main) ──────────
//
// Layout commun aux pages Plateforme avec sidebar (toutes sauf Market et
// l'éditeur DTAO qui ont leur propre layout plein-écran). Branche Header
// + Sidebar + Outlet de React Router. Le main scrolle indépendamment ;
// largeur max 960 px centrée comme dans la source.
//
// Adapté du <div outer> du single-file
// `_imports/plateforme-source.jsx` (lignes 736-758, 1033-1037).

import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

export default function ShellLayout() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Open Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      <Header />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: 32 }}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* Watermark .A discret en bas à droite — source ligne 1036 */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: 48,
          height: 48,
          background: "#E30513",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 18,
          opacity: 0.15,
          pointerEvents: "none",
        }}
      >
        .A
      </div>
    </div>
  );
}
