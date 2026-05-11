// ── App — shell HashRouter + AuthGate (Phase 4) ──────────────────────────
//
// Phase 4 : la persistance vit dans Supabase. Le shell est désormais wrappé
// dans <AuthGate> qui :
//   - bloque les routes tant que l'utilisateur n'est pas connecté avec un
//     compte Google `@assemblage.net`,
//   - affiche un écran "Chargement…" pendant le fetch initial de
//     `usePlatformData`,
//   - rend les enfants quand status === "ready".
//
// L'ancien bootstrap localStorage (`performLegacyMigration` + Phase 3.6
// `performLegacyDtaoMigration`) est supprimé du shell : la donnée
// localStorage est préservée mais non utilisée. L'import vers Supabase
// se fera côté Admin via un bouton manuel (Phase 4 étape 5, à venir).

import { HashRouter, Routes, Route, Navigate, useParams, Link } from "react-router-dom";
import { pkgV2024Fr } from "./editors/dtao-travaux/packages/v2024/fr/index.js";
import { PackageContext } from "./editors/dtao-travaux/engine/PackageContext.jsx";
import { Editor } from "./editors/dtao-travaux/Editor.jsx";
import { useMarketEditor } from "./platform/store/useMarketEditor.js";

import AuthGate from "./platform/components/AuthGate.jsx";
import ShellLayout from "./platform/components/ShellLayout.jsx";
import Home from "./platform/pages/Home.jsx";
import Country from "./platform/pages/Country.jsx";
import Project from "./platform/pages/Project.jsx";
import Market from "./platform/pages/Market.jsx";
import Search from "./platform/pages/Search.jsx";
import MemoRetex from "./platform/pages/MemoRetex.jsx";
import MemoCodes from "./platform/pages/MemoCodes.jsx";
import RefDocs from "./platform/pages/RefDocs.jsx";
import Admin from "./platform/pages/Admin.jsx";
import ChecklistConfig from "./platform/pages/ChecklistConfig.jsx";

import "./platform/styles.css";

// Adapter de route : pose l'Editor DTAO sur un marché Supabase. Le hook
// `useMarketEditor` expose la même forme `[project, setData, onRename,
// parentInfo]` qu'en Phase 3 — l'Editor n'a pas à savoir que la donnée
// vient désormais d'un slot JSONB `editor_data` patché via RPC.
function DtaoEditorRoute() {
  const { id: marketId } = useParams();
  const [project, setData, onRename, parentInfo] = useMarketEditor(marketId);

  if (!project) {
    return (
      <ShellLayout>
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "#999", marginBottom: 16 }}>Marché introuvable.</p>
          <Link to="/" className="bo" style={{ textDecoration: "none" }}>
            ← Accueil
          </Link>
        </div>
      </ShellLayout>
    );
  }

  const backTo = parentInfo.projectId ? `/projects/${parentInfo.projectId}` : "/";
  return (
    <Editor
      projectId={marketId}
      project={project}
      setData={setData}
      onRename={onRename}
      backTo={backTo}
      marketType={parentInfo.marketType}
    />
  );
}

export default function App() {
  return (
    <PackageContext.Provider value={pkgV2024Fr}>
      <HashRouter>
        <AuthGate>
          <Routes>
            {/* Pages Plateforme avec sidebar (ShellLayout commun) */}
            <Route element={<ShellLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/countries/:id" element={<Country />} />
              <Route path="/projects/:id" element={<Project />} />
              <Route path="/search" element={<Search />} />
              <Route path="/memo/retex" element={<MemoRetex />} />
              <Route path="/memo/codes" element={<MemoCodes />} />
              <Route path="/refdocs" element={<RefDocs />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/checklist-config" element={<ChecklistConfig />} />
            </Route>

            {/* Page Market plein-écran (header coloré + tabs propres) */}
            <Route path="/markets/:id/review" element={<Market />} />

            {/* Editeur DTAO sur le slot editor_data d'un marché Plateforme */}
            <Route path="/marches/:id/edit" element={<DtaoEditorRoute />} />

            {/* Tout le reste retombe sur la home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGate>
      </HashRouter>
    </PackageContext.Provider>
  );
}
