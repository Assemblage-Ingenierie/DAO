// Liste canonique des 15 enjeux ESSS (a-o). Source unique partagée par
// EnjeuxList (UI), exportXlsx (round-trip Excel), importXlsx (détection ESSS).
export const ENJEUX_ESSS = [
  { key: "a", label: "Ressources ESSS et organisation du suivi" },
  { key: "b", label: "Gestion des Zones d'Activités (bases-vie, carrières, zones d'emprunt, de stockage)" },
  { key: "c", label: "Santé & Sécurité sur les chantiers" },
  { key: "d", label: "Recrutement local et formations ESSS de la main d'œuvre locale (renforcement des capacités), des sous-traitants et partenaires locaux (transfert de compétence)" },
  { key: "e", label: "Relations avec les parties prenantes, information et consultation des communautés locales et des autorités" },
  { key: "f", label: "Gestion de la circulation" },
  { key: "g", label: "Produits dangereux" },
  { key: "h", label: "Rejets liquides (effluents)" },
  { key: "i", label: "Protection des ressources en eau" },
  { key: "j", label: "Emissions dans l'air, bruit et vibrations" },
  { key: "k", label: "Gestion des déchets" },
  { key: "l", label: "Biodiversité : protection de la faune et de la flore" },
  { key: "m", label: "Remise en état et revégétalisation des sites" },
  { key: "n", label: "Erosion et sédimentation" },
  { key: "o", label: "Lutte contre les maladies transmissibles (HIV/SIDA, paludisme, etc.)" },
];

// Normalisation pour comparaison robuste (apostrophes, espaces, casse).
function normalizeLabel(s) {
  return String(s || "")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFC");
}

const ENJEUX_ESSS_LABEL_SET = new Set(ENJEUX_ESSS.map((e) => normalizeLabel(e.label)));

export function isEnjeuEsssLabel(label) {
  return ENJEUX_ESSS_LABEL_SET.has(normalizeLabel(label));
}

export function enjeuKeyByLabel(label) {
  const norm = normalizeLabel(label);
  return ENJEUX_ESSS.find((e) => normalizeLabel(e.label) === norm)?.key || null;
}
