// All UI strings for the FR v2024 package, grouped by component/concern.
// Engine code never contains FR text — it reads from this object via the
// PackageContext (added in phase 1.11). Until then, components import LABELS
// directly.

// Tiny template helper: tpl("Hello {name}", {name: "world"}) → "Hello world".
// Replaces every {key} occurrence with vars[key]. Missing keys leave the
// placeholder untouched so missing data is visible.
export function tpl(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
  );
}

export const LABELS = {
  common: {
    yes: "Oui",
    no: "Non",
    validate: "Valider",
    delete: "Supprimer",
    cancel: "Annuler",
  },

  app: {
    // Header / project meta
    projectHeader: "DTAO Travaux PAY — Projet en cours",
    projectNamePlaceholder: "Nom du projet non renseigné",
    identificationPlaceholder: "Identification des travaux non renseignée",

    // Buttons
    resetButton: "🔄 Réinitialiser",
    confirmButton: "Confirmer",
    cancelButton: "Annuler",

    // Reset modal
    resetConfirmMessage: "Effacer toutes les données ?",

    // Export buttons & tooltips
    exporting: "⏳ Export en cours…",
    exportSafeButton: "Export safe",
    exportCleanButton: "Export clean",
    exportXlsxButton: "📊 Exporter .xlsx",
    importXlsxButton: "📤 Importer .xlsx",
    exportSafeTooltip:
      "Export complet : tout le contenu est conservé, y compris les passages surlignés en rouge (marqueurs à supprimer manuellement)",
    exportCleanTooltip:
      "Export nettoyé : les textes surlignés en rouge sont automatiquement supprimés du document",

    // Export feedback (interpolations: {filename}, {message})
    exportSuccess: "✓ Fichier téléchargé : {filename}",
    exportError: "Erreur lors de l'export : {message}{suffix}",
    exportErrorDevServerSuffix:
      " — recharger la page (Ctrl+F5) puis réessayer ; si l'erreur persiste, vérifier que le serveur dev tourne.",

    xlsxExportSuccess: "✓ Fichier téléchargé : {filename}",
    xlsxExportError: "Erreur lors de l'export : {message}",

    // Import feedback
    importConfirmOverwrite:
      "Des données existent déjà. L'import va les écraser pour les champs présents dans le fichier. Continuer ?",
    importSuccessPrefix:
      "✓ Import réussi : {nbFields} champ(s), {nbComments} commentaire(s), {nbAssigns} destinataire(s)",
    importPersonnelSuffix: ", {n} personnel",
    importMaterielSuffix: ", {n} matériel",
    importPropositionSuffix: ", {n} item(s) prop.",
    importEnjeuxSuffix: ", {n} enjeux ESSS",
    importArticlesSuffix: ", {n} article(s) ESSS",
    importTranchesSuffix: ", {n} tranche(s)",
    importUnknownSuffix: " — {n} ID inconnu(s) ignoré(s)",
    importError: "Erreur lors de l'import : {message}",

    // Self-heal log (dev console)
    selfHealLog:
      "[App] propositionItems: {count} item(s) ESSS retirés (état corrompu)",

    // Section "all complete" badge
    allSectionsComplete: "✓ Toutes les sections complètes",

    // CCAG sub-clause section titles (header injected at section breaks)
    ccagTitles: {
      1: "Dispositions générales",
      2: "Le Maître d'Ouvrage",
      3: "Le Maître d'Œuvre",
      4: "L'Entrepreneur",
      6: "Personnel et main d'œuvre",
      8: "Commencements, retards, suspensions",
      13: "Changements et Ajustements",
      14: "Montant du marché et paiement",
      17: "Risque et Responsabilité",
      18: "Assurance",
      20: "Réclamations, différends et arbitrages",
    },
  },

  sidebar: {
    title: "DAO Travaux",
    version: "AFD · Format PAY · Fév. 2024",
    logoAlt: "Assemblage ingénierie",
    actorTracking: "Suivi acteurs",
    actors: "Acteurs",
    statusTooltip:
      "{unfilled} non rempli(s) · {delegated} délégué(s) · {filled} rempli(s)",
  },

  actorsConfig: {
    title: "⚙️ Configuration des acteurs",
    description:
      "Définissez les acteurs intervenant dans la complétion du DTAO. Pour chaque champ, vous pourrez indiquer quel acteur est responsable — un commentaire Word sera inséré lors de l'export.",
    newActor: "Nouvel acteur",
    defaultCommentValue: "À remplir",
    displayLabel: "Sigle affiché",
    defaultWordComment: "Commentaire Word par défaut",
    commentPlaceholder: "Texte du commentaire Word…",
    deleteConfirmation: "Confirmer ?",
    deleteTooltip: "Supprimer {label}",
    addButton: "+ Ajouter un acteur",
  },

  fieldInput: {
    showContext: "Afficher le contexte",
    freeComment: "Commentaire libre",
    delegateTo: "Déléguer à {label}",
    missingReference:
      "(non renseigné — à compléter dans sa section d'origine)",
    yes: "OUI",
    no: "NON",
    selectPlaceholder: "— Choisir —",
    autoFilledTooltip: "Champ rempli automatiquement — voir la note",
    naSetTooltip: "Marquer comme Non applicable",
    naClearTooltip: "Rétablir le champ (saisir une valeur)",
    naActiveLabel: "✓ N/A",
    naInactiveLabel: "N/A",
    commentPlaceholder: "Commentaire libre (sera inséré dans le .docx)…",
  },

  bulletList: {
    newItem: "Nouvel élément",
    descriptionPlaceholder: "Description…",
    clickToEdit: "Cliquer pour modifier",
    addButton: "+ Ajouter un élément",
  },

  proposition: {
    newItem: "Nouvel élément",
    descriptionPlaceholder: "Description…",
    clickToEdit: "Cliquer pour modifier",
    addButton: "+ Ajouter un élément",
  },

  personnel: {
    poste: "Poste",
    expGeneral: "Exp. générale (ans)",
    expComparable: "Exp. comparable (ans)",
    note: "Note",
    postePlaceholder: "Intitulé du poste",
    notePlaceholder: "Conditions d'application…",
    deleteTooltip: "Supprimer ce poste",
    addButton: "+ Ajouter un poste",
  },

  materiel: {
    type: "Type de matériel et caractéristiques",
    minNumber: "Nombre minimal requis",
    emptyState:
      "Aucun matériel ajouté — cliquez sur « + Ajouter un matériel »",
    typePlaceholder: "Ex : Pelle hydraulique ≥ 1 m³",
    addButton: "+ Ajouter un matériel",
  },

  articles: {
    articleNumber: "N° d'Article non applicable",
    explanations: "Explications",
    emptyState:
      "Aucun article exclu — cliquez sur « + Ajouter un article »",
    articlePlaceholder: "Ex : Article 9.2",
    explanationPlaceholder: "Explication de non-applicabilité",
    addButton: "+ Ajouter un article",
  },

  enjeux: {
    label: "Enjeu ESSS",
    applicable: "Applicable ?",
  },

  multiCheck: {
    optionPlaceholder: "Saisir le libellé de l'option…",
    showSubclause: "Afficher la sous-clause",
    hideSubclause: "Masquer la sous-clause",
    deleteCheckedTooltip: "Supprimer cette option",
    uncheckTooltip: "Décocher (sera surligné rouge à l'export)",
    noSubclauseText: "(texte de la sous-clause non fourni)",
    addButton: "+ Ajouter une option",
  },

  tranches: {
    disabledTooltip:
      "Le marché ne comporte pas de tranches (CCAP-003 = Non)",
    disabledLabel: "🔒 Tableau désactivé — CCAP-003 = Non",
    nomHeader: "Nom / Description des Tranches",
    nomHeaderRef: "Article 1.1.5.6",
    delaiHeader: "Délai d'Achèvement",
    delaiHeaderRef: "Article 1.1.3.3",
    penalitesHeader: "Pénalités de retard",
    penalitesHeaderRef: "Article 8.7",
    nomPlaceholder: "Ex : Tranche ferme — Bâtiment A",
    delaiPlaceholder: "Ex : 12 mois",
    penalitesPlaceholder: "Ex : 0,1 % du montant par jour",
    addButton: "+ Ajouter une tranche",
  },

  progressBar: {
    label: "Progression globale",
  },

  checklist: {
    title: "📌 Suivi des champs délégués",
    noFieldsDelegated: "Aucun champ n'a encore été délégué à un acteur.",
    fieldsDelegatedSummary:
      "{n} champ{s} délégué{s} sur {total} ({percent}%)",
    fieldCountSingular: "champ",
    fieldCountPlural: "champs",
    noFieldsForActor: "Aucun champ délégué à {label}.",
    goToSection: "Aller à : {title}",
    delegationGuideTitle: "Comment déléguer un champ ?",
    delegationGuideBody:
      "Dans n'importe quelle section, cliquez sur l'icône acteur à droite d'un champ et choisissez le ou les destinataires. Le champ délégué apparaîtra ici, regroupé par acteur.",
  },

  actorTag: {
    removeTooltip: "Retirer {label}",
  },
};
