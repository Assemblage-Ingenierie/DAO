// ── Plateforme — Référentiel AFD ──────────────────────────────────────────
//
// Liste des documents-types AFD utilisés en consultation. Extraits verbatim
// du single-file `_imports/plateforme-source.jsx` (lignes 209-225). Cette
// liste alimente la page RefDocs et les filtres par direction (2024 vs 2019).
//
// Champs : id, name, ref (référence AFD-Mxxxx ou — si non), ver (version),
// dir (édition Directives 2024 ou 2019), cat (Travaux / PI / Transversal /
// Cadre), desc (description courte).

export const REF_DOCS = [
  { id: "dtao", name: "DTAO Travaux", ref: "AFD-M0030", ver: "Août 2025", dir: "2024", cat: "Travaux", desc: "Dossier Type d'Appel d'Offres pour les marchés de travaux" },
  { id: "prequal", name: "Pré-qualification Travaux", ref: "—", ver: "Février 2024", dir: "2024", cat: "Travaux", desc: "Document type de pré-qualification pour les marchés de travaux importants" },
  { id: "dp", name: "Demande de Propositions (consultants)", ref: "AFD-M0031", ver: "Août 2025", dir: "2024", cat: "PI", desc: "DTDP complète pour la sélection de consultants (> 200 000 €)" },
  { id: "d3pi", name: "D3PI (petites PI)", ref: "AFD-M0330", ver: "Août 2025", dir: "2024", cat: "PI", desc: "Demande de Propositions pour les petites prestations intellectuelles (< 200 000 €)" },
  { id: "dpei", name: "DP Expert individuel", ref: "AFD-M0039", ver: "Mai 2025", dir: "2024", cat: "PI", desc: "Demande de Propositions pour consultants individuels (< 50 000 €)" },
  { id: "ami", name: "AMI (consultants)", ref: "AFD-M0038", ver: "Août 2025", dir: "2024", cat: "PI", desc: "Appel à Manifestations d'Intérêt pour l'établissement de listes restreintes" },
  { id: "ami_conc", name: "AMI Concours", ref: "—", ver: "Décembre 2025", dir: "2024", cat: "PI", desc: "AMI spécifique aux concours d'architecture" },
  { id: "dp_conc", name: "DP Concours d'architecture", ref: "—", ver: "Décembre 2025", dir: "2024", cat: "PI", desc: "Demande de Propositions dans le cadre d'un concours d'architecture" },
  { id: "db", name: "Design-Build", ref: "—", ver: "—", dir: "2024", cat: "Travaux", desc: "Document type pour les marchés de conception-réalisation" },
  { id: "ppm", name: "Plan de Passation des Marchés", ref: "AFD-M0041", ver: "Août 2025", dir: "2024", cat: "Transversal", desc: "Modèle de PPM obligatoire (Dir. §1.6.1)" },
  { id: "apm", name: "Checklist APM", ref: "—", ver: "—", dir: "2024", cat: "Transversal", desc: "Points de vigilance et contrôles avant ANO" },
  { id: "dir2024", name: "Directives 2024 (v9)", ref: "AFD-R0097", ver: "Février 2024", dir: "2024", cat: "Cadre", desc: "Directives pour la Passation des Marchés dans les États étrangers — Version 9" },
  { id: "dir2019", name: "Directives 2019", ref: "AFD-R0097", ver: "2019", dir: "2019", cat: "Cadre", desc: "Directives version antérieure — Option A, encore applicable sur certains projets" },
  { id: "exclusion", name: "Liste d'exclusion du Groupe AFD", ref: "—", ver: "Révision 2022", dir: "2024", cat: "Cadre", desc: "Liste des activités non alignées avec les engagements du Groupe AFD" },
];
