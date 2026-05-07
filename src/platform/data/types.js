// ── Plateforme — catalogues de base ───────────────────────────────────────
//
// Constantes statiques utilisées par les pages Plateforme. Extraites verbatim
// du single-file `_imports/plateforme-source.jsx` (lignes 3-12). Les noms
// originaux courts (TYPES, SECT, LANG, SPI, DEQ, FL, SRC) sont préservés
// pour réduire le risque d'erreurs lors de l'extraction.
//
// - TYPES      : 12 types de procédures de marché (AO_TVX_PQ, DC_TVX, AMI_DP…)
// - SECT       : 10 secteurs (Eau, Transport, Éducation…)
// - LANG       : 4 langues (Français, Anglais, Espagnol, Portugais)
// - SPI        : 3 rôles SPI (MOE, Assistance technique, Autre)
// - DEQ        : équipe par défaut (Aliénor, Clément, Maël, Lou, Louis, Chaïma)
// - FL         : table pays-français → code ISO drapeau (utilisée par <Flag/>)
// - PAYS_LIST  : liste alphabétique des pays acceptés (mêmes clés que FL,
//                avec capitales)
// - SRC        : 4 sources de checklist (DIR, APM, RETEX, REX) avec couleur

export const TYPES = [
  { v: "AO_TVX_PQ", l: "AO Travaux (pré-qual.)", c: "Travaux" },
  { v: "AO_TVX_SP", l: "AO Travaux (sans pré-qual.)", c: "Travaux" },
  { v: "DC_TVX", l: "DC – Travaux", c: "Travaux" },
  { v: "GAG_TVX", l: "Gré à gré – Tvx", c: "Travaux" },
  { v: "AMI_DP", l: "AMI + DP (>200k€)", c: "PI" },
  { v: "DP_DIR", l: "DP directe (<200k€)", c: "PI" },
  { v: "D3PI", l: "D3PI", c: "PI" },
  { v: "DP_EI", l: "DP Expert indiv.", c: "PI" },
  { v: "DC_PI", l: "DC – PI", c: "PI" },
  { v: "GAG_PI", l: "Gré à gré – PI", c: "PI" },
  { v: "CONC", l: "Concours", c: "PI" },
  { v: "AUTRE", l: "Autre", c: "Autre" },
];

export const SECT = [
  "Eau",
  "Transport",
  "Éducation",
  "Santé",
  "Énergie",
  "Agriculture",
  "Bâtiment",
  "Environnement",
  "Dév. urbain",
  "Autre",
];

export const LANG = ["Français", "Anglais", "Espagnol", "Portugais"];

export const SPI = ["MOE", "Assistance technique", "Autre"];

export const DEQ = ["Aliénor", "Clément", "Maël", "Lou", "Louis", "Chaïma"];

// pays (lower-case, accents) → code ISO 2 lettres pour flagcdn.com
export const FL = {
  "afghanistan": "af",
  "angola": "ao",
  "bénin": "bj",
  "burkina faso": "bf",
  "burundi": "bi",
  "cameroun": "cm",
  "comores": "km",
  "congo": "cg",
  "côte d'ivoire": "ci",
  "djibouti": "dj",
  "égypte": "eg",
  "éthiopie": "et",
  "france": "fr",
  "gabon": "ga",
  "ghana": "gh",
  "guinée": "gn",
  "haïti": "ht",
  "kenya": "ke",
  "kosovo": "xk",
  "liban": "lb",
  "madagascar": "mg",
  "mali": "ml",
  "maroc": "ma",
  "mauritanie": "mr",
  "moldavie": "md",
  "mozambique": "mz",
  "niger": "ne",
  "nigéria": "ng",
  "ouganda": "ug",
  "pakistan": "pk",
  "palestine": "ps",
  "pérou": "pe",
  "rwanda": "rw",
  "sénégal": "sn",
  "tanzanie": "tz",
  "tchad": "td",
  "togo": "tg",
  "tunisie": "tn",
  "vietnam": "vn",
  "zambie": "zm",
};

export const PAYS_LIST = [
  "Afghanistan",
  "Angola",
  "Bénin",
  "Burkina Faso",
  "Burundi",
  "Cameroun",
  "Comores",
  "Congo",
  "Côte d'ivoire",
  "Djibouti",
  "Égypte",
  "Éthiopie",
  "France",
  "Gabon",
  "Ghana",
  "Guinée",
  "Haïti",
  "Kenya",
  "Kosovo",
  "Liban",
  "Madagascar",
  "Mali",
  "Maroc",
  "Mauritanie",
  "Moldavie",
  "Mozambique",
  "Niger",
  "Nigéria",
  "Ouganda",
  "Pakistan",
  "Palestine",
  "Pérou",
  "Rwanda",
  "Sénégal",
  "Tanzanie",
  "Tchad",
  "Togo",
  "Tunisie",
  "Vietnam",
  "Zambie",
].sort();

// Sources des items de checklist + couleur du badge
export const SRC = [
  { id: "DIR", lb: "Directives", co: "#30323E" },
  { id: "APM", lb: "APM", co: "#E30513" },
  { id: "RETEX", lb: "Retex AI", co: "#2563eb" },
  { id: "REX", lb: "REX", co: "#f59e0b" },
];
