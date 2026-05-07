import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { pkgV2024Fr } from "./editors/dtao-travaux/packages/v2024/fr/index.js";
import { PackageContext } from "./editors/dtao-travaux/engine/PackageContext.jsx";
import { Editor } from "./editors/dtao-travaux/Editor.jsx";
import ProjectList from "./editors/dtao-travaux/engine/components/ProjectList.jsx";
import {
  needsLegacyMigration,
  performLegacyMigration,
} from "./editors/dtao-travaux/engine/projects/migrateLegacyKeys.js";

// One-shot bootstrap at module init: migrate legacy single-project state
// into the new dtao_projects_v2 store if it's still in the 10-keys layout
// from before phase 2. Runs synchronously since localStorage is available
// at import time in the browser.
(function bootstrap() {
  if (typeof localStorage === "undefined") return;
  if (needsLegacyMigration()) {
    performLegacyMigration({
      schemaVersion: pkgV2024Fr.schemaVersion,
      language: pkgV2024Fr.language,
    });
  }
})();

// Default data shape for a brand-new project. Pulls initial actor/table
// values from the active pack so a freshly-created project lands on the
// same baseline the legacy app gave a first-time user.
function defaultsFromPack(pkg) {
  return {
    formData: {},
    actorAssignments: {},
    fieldComments: {},
    actors: pkg.defaults.actors,
    personnelRows: pkg.defaults.personnelRows,
    materielRows: pkg.defaults.materielRows,
    propositionItems: pkg.defaults.propositionItems,
    bulletListItems: {},
    articlesEsssRows: [],
    tranchesRows: [],
  };
}

// Pulls the project id out of the URL and feeds it to <Editor/>. Keeping
// this thin wrapper here means Editor.jsx itself stays router-agnostic.
function EditorRoute() {
  const { id } = useParams();
  return <Editor projectId={id} />;
}

export default function App() {
  return (
    <PackageContext.Provider value={pkgV2024Fr}>
      <HashRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProjectList defaultsFromPack={() => defaultsFromPack(pkgV2024Fr)} />
            }
          />
          <Route path="/projects/:id" element={<EditorRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </PackageContext.Provider>
  );
}
