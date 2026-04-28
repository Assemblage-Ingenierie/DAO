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
// Workaround: detect the sandboxed location and point the alias at it so
// every resolution lands on the same file.
const LOCAL_MODULES = (() => {
  const candidates = [
    "C:/Users/maelb/AppData/Local/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Local/dtao-packages/node_modules",
    "C:/Users/maelb/AppData/Local/dtao-packages/node_modules",
  ];
  for (const p of candidates) {
    try { if (fs.statSync(path.join(p, "react", "package.json")).isFile()) return p; }
    catch {}
  }
  return candidates[candidates.length - 1];
})();
const require = createRequire(pathToFileURL(LOCAL_MODULES + "/"));

const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.join(LOCAL_MODULES, "react"),
      "react-dom": path.join(LOCAL_MODULES, "react-dom"),
      jszip: path.join(LOCAL_MODULES, "jszip"),
      "file-saver": path.join(LOCAL_MODULES, "file-saver"),
      docx: path.join(LOCAL_MODULES, "docx"),
      xlsx: path.join(LOCAL_MODULES, "xlsx"),
      "xlsx-js-style": path.join(LOCAL_MODULES, "xlsx-js-style"),
    },
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
