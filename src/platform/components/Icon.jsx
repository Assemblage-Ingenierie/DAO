// ── Plateforme — composant Icon (icônes SVG inline) ───────────────────────
//
// Banque d'icônes SVG 18×18 utilisées dans la sidebar et l'app : folder,
// search, book, scale, file, settings, edit. La couleur dépend de l'état
// "actif" (rouge AFD) ou inactif (blanc semi-transparent).
//
// Adapté du composant `SI` du single-file `_imports/plateforme-source.jsx`
// (lignes 458-459) — props renommées (n → name, act → active) et le mapping
// des paths déplacé en JSX expressif.

const STROKE_WIDTH = "1.5";

const PATHS = {
  folder: (color) => (
    <path
      d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      fill="none"
    />
  ),
  search: (color) => (
    <>
      <circle cx="11" cy="11" r="8" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
      <path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  book: (color) => (
    <>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
    </>
  ),
  scale: (color) => (
    <path
      d="M16 3l-4 4-4-4M12 7v14M4 14l4-4 4 4M20 14l-4-4-4 4"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  file: (color) => (
    <>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
    </>
  ),
  settings: (color) => (
    <>
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={STROKE_WIDTH} fill="none" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
    </>
  ),
  edit: (color) => (
    <>
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
    </>
  ),
};

export default function Icon({ name, active }) {
  const color = active ? "#E30513" : "rgba(255,255,255,0.55)";
  const renderPath = PATHS[name];
  if (!renderPath) return null;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      {renderPath(color)}
    </svg>
  );
}
