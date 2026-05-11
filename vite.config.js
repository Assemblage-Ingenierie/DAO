import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";

// Windows UWP/AppContainer (Claude Code runs in one) transparently redirects
// writes under C:/Users/<u>/AppData/Local/<pkg>/ to the per-app sandbox at
// C:/Users/<u>/AppData/Local/Packages/<app-id>/LocalCache/Local/<pkg>/.
// When Vite's alias uses the "virtual" path but react-dom's internal
// require('react') resolves through the real sandbox path, esbuild sees two
// different absolute paths for the same file and bundles TWO copies of
// React — which breaks hooks with "Invalid hook call. Hooks can only be
// called inside of the body of a function component."
//
// Workaround : si une des `LOCAL_MODULES_CANDIDATES` contient un node_modules
// utilisable (cas Maël avec node_modules externes sur Google Drive), on
// l'utilise pour les alias React. Sinon (Vercel, autre machine), on laisse
// Vite résoudre depuis le ./node_modules local — comportement standard.
const LOCAL_MODULES_CANDIDATES = [
  "C:/Users/maelb/AppData/Local/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Local/dtao-packages/node_modules",
  "C:/Users/maelb/AppData/Local/dtao-packages/node_modules",
];
const LOCAL_MODULES = (() => {
  for (const p of LOCAL_MODULES_CANDIDATES) {
    try {
      if (fs.statSync(path.join(p, "react", "package.json")).isFile()) return p;
    } catch {
      // candidate not present on this machine, try next
    }
  }
  return null; // fallback : Vite resolves from ./node_modules locally
})();

// Bootstrap require() depuis LOCAL_MODULES si disponible, sinon depuis
// l'import.meta.url courant (résolution standard ESM).
const require = LOCAL_MODULES
  ? createRequire(pathToFileURL(LOCAL_MODULES + "/"))
  : createRequire(import.meta.url);

const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

// Aliases — uniquement quand LOCAL_MODULES est dispo. Si absent, les imports
// React standards résolvent dans ./node_modules sans alias.
const alias = LOCAL_MODULES
  ? {
      react: path.join(LOCAL_MODULES, "react"),
      "react-dom": path.join(LOCAL_MODULES, "react-dom"),
      jszip: path.join(LOCAL_MODULES, "jszip"),
      "file-saver": path.join(LOCAL_MODULES, "file-saver"),
      docx: path.join(LOCAL_MODULES, "docx"),
      xlsx: path.join(LOCAL_MODULES, "xlsx"),
      "xlsx-js-style": path.join(LOCAL_MODULES, "xlsx-js-style"),
    }
  : {};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    entries: ["./src/**/*.{js,jsx}"],
    // Force these CJS packages through the interop path so named imports
    // like `import { useState } from "react"` are properly re-exported.
    // Without this, Vite has occasionally emitted a default-only bundle
    // after the alias resolves to a non-local path, causing runtime
    // "Cannot read properties of null (reading 'useState')" errors.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
});
