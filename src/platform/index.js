// ── Plateforme — barrel d'exports ─────────────────────────────────────────
//
// Point d'entrée unique pour les modules `src/platform/`. Re-exporte les
// données catalogues, les checklists et les composants primitifs. Les pages
// peuvent importer soit via ce barrel, soit en deep-import vers les
// sous-modules.

// Données catalogues
export {
  TYPES,
  SECT,
  LANG,
  SPI,
  DEQ,
  FL,
  PAYS_LIST,
  SRC,
} from "./data/types.js";
export { MEMO_PAYS, MEMO_DATA } from "./data/memoData.js";
export { RETEX_THEMES, RETEX_KW, RETEX_DATA } from "./data/retexData.js";
export { REF_DOCS } from "./data/refDocs.js";
export {
  CL_DAO,
  CL_RAP,
  CL_CTR,
  CL_AMI,
  CL_LR,
  CL_DP,
  CL_EVTECH,
  CL_EVFIN,
  CL_NEGO,
  CL_CTRPI,
  CL_PROG,
  CL_TDR,
  CLS_TVX,
  CLS_PI,
  TABS_TVX,
  TABS_PI,
} from "./data/checklists/index.js";

// Composants primitifs
export { default as Flag } from "./components/Flag.jsx";
export { default as Icon } from "./components/Icon.jsx";
export { default as ReviewItem } from "./components/ReviewItem.jsx";

// Composants de layout
export { default as Sidebar } from "./components/Sidebar.jsx";
export { default as Header } from "./components/Header.jsx";
export { default as ShellLayout } from "./components/ShellLayout.jsx";
export { default as AuthGate } from "./components/AuthGate.jsx";

// Store Supabase (Phase 4)
export { usePlatformData } from "./store/usePlatformData.js";
export { useMarketEditor } from "./store/useMarketEditor.js";
export { supabase } from "./supabase/client.js";

// Pure helpers de l'ancien store localStorage — gardés pour la future
// étape 5 (import legacy → Supabase). Ne pas utiliser dans le nouveau
// code applicatif : passer par `usePlatformData().mutate.*`.
export {
  PLATFORM_KEY,
  defaultPlatformData,
  loadPlatform,
  savePlatform,
  resetPlatform,
} from "./store/platformStore.js";
export {
  needsLegacyDtaoMigration,
  performLegacyDtaoMigration,
} from "./store/migrateLegacyDtao.js";

// Pages
export { default as Home } from "./pages/Home.jsx";
export { default as Country } from "./pages/Country.jsx";
export { default as Project } from "./pages/Project.jsx";
export { default as Market } from "./pages/Market.jsx";
export { default as Search } from "./pages/Search.jsx";
export { default as MemoRetex } from "./pages/MemoRetex.jsx";
export { default as MemoCodes } from "./pages/MemoCodes.jsx";
export { default as RefDocs } from "./pages/RefDocs.jsx";
export { default as Admin } from "./pages/Admin.jsx";
export { default as ChecklistConfig } from "./pages/ChecklistConfig.jsx";

// Utils (note de relecture HTML)
export {
  buildReviewNoteHTML,
  openReviewNoteWindow,
} from "./utils/exportReviewNote.js";
