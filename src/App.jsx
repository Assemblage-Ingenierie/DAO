// ── App — shell HashRouter + Sidebar Plateforme ──────────────────────────
//
// Le shell de l'app après la fusion (phase 3). Sert :
//   - les pages Plateforme (Home, Country, Project, Search, Memo*, RefDocs,
//     Admin, ChecklistConfig) à l'intérieur d'un ShellLayout commun ;
//   - la page Market en plein écran (header coloré + tabs intégrés) ;
//   - (à venir 3.5) la route /marches/:id/edit qui rebranche le DTAO Editor
//     sur le slot editor_data d'un marché Plateforme AO Travaux production.
//
// Le PackageContext.Provider est conservé en racine pour que l'éditeur
// DTAO trouve son pack quand il sera remonté en 3.5, sans avoir à réécrire
// les composants `usePackage()`.
//
// La migration des projets DTAO legacy (anciennes clés `dtao_*` 10-keys
// pré-phase-2) reste exécutée au chargement — elle est idempotente. La
// migration `dtao_projects_v2` → `afd_platform_v1` (fold sous "Non classé"
// / projet "DTAO existants") arrive en 3.6.

import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { pkgV2024Fr } from "./editors/dtao-travaux/packages/v2024/fr/index.js";
import { PackageContext } from "./editors/dtao-travaux/engine/PackageContext.jsx";
import {
  needsLegacyMigration,
  performLegacyMigration,
} from "./editors/dtao-travaux/engine/projects/migrateLegacyKeys.js";
import { performLegacyDtaoMigration } from "./platform/store/migrateLegacyDtao.js";

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

// Bootstrap one-shot, deux étapes idempotentes exécutées dans l'ordre :
//   1) phase 2 : 10 clés legacy `dtao_*` → store unique dtao_projects_v2
//   2) phase 3.6 : entrées dtao_projects_v2 → marchés Plateforme sous
//      "Non classé / DTAO existants", avec editor_data rempli (lu en 3.5
//      par le DTAO Editor).
// Les deux migrations conservent leur source en backup et posent un flag
// pour ne pas se ré-exécuter.
(function bootstrap() {
  if (typeof localStorage === "undefined") return;
  if (needsLegacyMigration()) {
    performLegacyMigration({
      schemaVersion: pkgV2024Fr.schemaVersion,
      language: pkgV2024Fr.language,
    });
  }
  performLegacyDtaoMigration();
})();

export default function App() {
  return (
    <PackageContext.Provider value={pkgV2024Fr}>
      <HashRouter>
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

          {/* TODO 3.5 : <Route path="/marches/:id/edit" element={<DtaoEditorRoute/>} /> */}

          {/* Tout le reste retombe sur la home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </PackageContext.Provider>
  );
}
