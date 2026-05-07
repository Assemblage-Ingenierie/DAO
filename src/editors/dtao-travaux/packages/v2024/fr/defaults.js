// Default values for the FR v2024 package.
// All strings are FR — they belong to the package, not the engine.

export const DEFAULT_ACTORS = [
  { id: "ugp", label: "UGP", color: "#E65100", bgColor: "#FFF3E0", borderColor: "#FFE0B2", defaultComment: "À remplir par l'UGP" },
  { id: "moe", label: "MOE", color: "#1565C0", bgColor: "#E3F2FD", borderColor: "#BBDEFB", defaultComment: "À remplir par la MOE" },
  { id: "afd", label: "AFD", color: "#2E7D32", bgColor: "#E8F5E9", borderColor: "#C8E6C9", defaultComment: "À confirmer avec l'AFD" },
];

export const DEFAULT_PERSONNEL_ROWS = [
  { id: 1, poste: "Expert Environnemental et Social", exp_generale: "5", exp_comparable: "2", note: "Si risques E&S élevés" },
  { id: 2, poste: "Expert Santé et Sécurité", exp_generale: "5", exp_comparable: "2", note: "Si risques S&S élevés" },
];

export const DEFAULT_MATERIEL_ROWS = [];

export const DEFAULT_PROPOSITION_ITEMS = [
  { id: 1, label: "Variantes techniques", enabled: true, description: "Proposition pour les éléments des ouvrages pour lesquels des variantes techniques sont autorisées" },
  { id: 2, label: "Méthodologie ESSS", enabled: true, description: "Version préliminaire du PGES-Travaux conforme aux Spécifications ESSS" },
  { id: 3, label: "Liste des sous-traitants", enabled: true, description: "Sous-traitants proposés avec formulaire d'engagement ESSS" },
  { id: 4, label: "Organisation des travaux sur site et Méthode de réalisation", enabled: true, description: "Dispositions et méthodes, gestion coordination accès Site, aspects géotechniques" },
  { id: 5, label: "Programme / Calendrier de Construction", enabled: true, description: "Programme détaillé, calendrier mobilisation, étapes clés, chemin critique" },
  { id: 6, label: "Personnel proposé et CV (formulaires PER-1 et PER-2)", enabled: true, description: "Noms et CV du personnel qualifié pour les postes clés" },
  { id: 7, label: "Matériel (formulaire MAT)", enabled: true, description: "Détails matériel proposé pour les équipements clés" },
];
