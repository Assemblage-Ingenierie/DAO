import { pkgV2024Fr } from "./packages/v2024/fr/index.js";
import { PackageContext } from "./engine/PackageContext.jsx";
import { Editor } from "./Editor.jsx";

// Thin loader: pick the active pack and supply it to <Editor /> via context.
// The day a second pack arrives (EN, ES, v2027…), pick it here based on URL,
// user preference, or feature flag — Editor and the engine read everything
// they need from `usePackage()`.
export default function App() {
  return (
    <PackageContext.Provider value={pkgV2024Fr}>
      <Editor />
    </PackageContext.Provider>
  );
}
