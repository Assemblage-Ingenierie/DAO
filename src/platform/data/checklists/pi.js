// ── Plateforme — Checklists Prestations Intellectuelles (PI) ──────────────
//
// Checklists de revue pour les marchés de PI (consultants, MOE, AT…) :
// AMI, Liste restreinte, Programme, TdR, Demande de Propositions, Évaluation
// technique, Évaluation financière/combinée, Négociations, Contrat PI.
// Extraites verbatim du single-file `_imports/plateforme-source.jsx`
// (lignes 332-449). Source : Directives AFD 2024 §5 + Checklist APM PI +
// retours d'expérience (REX, Retex AI).
//
// Format de chaque item : [id, section, texte, conseil, [sources]]

export const CL_AMI = [
  ["a01", "Publicité", "Large publicité prévue", "Journal national + officiel + portail gratuit + dgmarket AOI. AOI obligatoire si >200k€", ["DIR", "APM"]],
  ["a02", "Publicité", "AOI obligatoire si montant > 200 000 €", "En dessous: liste ad hoc possible (Demande de Cotations)", ["DIR"]],
  ["a03", "Contenu", "Pas de CV ni méthodologie exigés dans l'AMI", "Il ne s'agit pas de solliciter une proposition", ["APM"]],
  ["a04", "Contenu", "Expériences passées pertinentes demandées", "Préciser: même nature, même secteur, contextes géographiques similaires", ["APM"]],
  ["a05", "Contenu", "Délai candidatures ≥ 3 semaines", "", ["APM"]],
  ["a06", "Contenu", "Nombre max short-listés spécifié", "Limiter à 6 (4 à 6 sauf accord AFD)", ["DIR", "APM"]],
  ["a07", "Contenu", "Déclaration d'Intégrité incluse", "", ["DIR", "APM"]],
  ["a08", "Évaluation", "Pas de notation recommandée par l'AFD", "Si notation: critères et poids explicités dans l'AMI", ["DIR", "APM"]],
];

export const CL_LR = [
  ["l01", "Constitution", "AMI utilisé pour > 200k€ (obligatoire)", "Possible en dessous de ce seuil", ["DIR", "APM"]],
  ["l02", "Constitution", "Large publicité effective vérifiée", "", ["APM"]],
  ["l03", "Constitution", "Liste ad hoc possible < 200k€", "Consultants qualifiés, intéressés et capables", ["DIR"]],
  ["l04", "Composition", "4 à 6 consultants", "Sauf accord exprès de l'AFD", ["DIR", "APM"]],
  ["l05", "Composition", "Liste homogène (même nature)", "Ne pas mélanger sociétés + EI + ONG", ["DIR", "APM"]],
  ["l06", "Composition", "Pas de critère de nationalité restrictif", "Principe d'ouverture", ["DIR"]],
  ["l07", "Communication", "Candidats retenus informés par écrit", "", ["DIR"]],
  ["l08", "Évaluation", "Rapport évaluation candidatures (Annexe 5)", "", ["DIR"]],
  ["l09", "Éligibilité", "WorldCheck One sur chaque candidat", "", ["APM"]],
  ["l10", "Éligibilité", "DI signée par chaque candidat", "", ["DIR", "APM"]],
];

export const CL_DP = [
  ["p01", "Instructions Consultants", "Section I non modifiée", "Toutes modifications dans Données particulières", ["DIR", "APM"]],
  ["p02", "Instructions Consultants", "Validité proposition ≤ 90 jours", "", ["APM"]],
  ["p03", "Instructions Consultants", "Avantage compétitif inéquitable traité", "Infos études amont fournies à tous les candidats", ["APM"]],
  ["p04", "Instructions Consultants", "Association/sous-traitance autorisée", "Sous-traitant peut participer à plusieurs propositions. 2 BE de la LR non souhaitable", ["APM"]],
  ["p05", "Instructions Consultants", "Pas de garantie de soumission", "Sauf si exigée par réglementation locale", ["APM"]],
  ["p10", "Données particulières", "Méthode sélection spécifiée (SFQC/SQS/SBD/SMC)", "AFD recommande SFQC. Budget max → SBD", ["DIR", "APM"]],
  ["p11", "Données particulières", "Estimation temps ou budget communiquée", "Éviter propositions disproportionnées", ["APM"]],
  ["p12", "Données particulières", "Ouverture propositions en séance publique", "2 enveloppes remises simultanément (tech + fin)", ["DIR", "APM"]],
  ["p13", "Données particulières", "Notes techniques annoncées à ouverture financière", "Modèle AFD le prévoit", ["APM"]],
  ["p14", "Données particulières", "Exigences expérience experts ≤ 5 ans", "Ne pas surestimer", ["APM"]],
  ["p20", "Grille d'évaluation", "Critères: méthodologie (20-50%) + experts clés (40-70%)", "", ["DIR", "APM"]],
  ["p22", "Grille d'évaluation", "Note technique minimum 70-80", "", ["APM"]],
  ["p23", "Grille d'évaluation", "Grille pas trop détaillée / mécanique", "", ["APM"]],
  ["p24", "Grille d'évaluation", "Note financière au prorata des montants", "Modalité de calcul spécifiée dans la DP", ["APM"]],
  ["p25", "Grille d'évaluation", "Pondération tech 70-80% / fin 20-30%", "", ["APM"]],
  ["p30", "Formulaires", "DI incluse + tableau prix conforme au type contrat", "Temps passé ou forfaitaire. Taxes isolées", ["DIR", "APM"]],
  ["p32", "Formulaires", "Décomposition prix forfaitaires demandée", "Pour faciliter avenants éventuels", ["APM"]],
  ["p40", "Termes de Référence", "TdR: livrables, délais, expertises précisés", "Experts internationaux clairement indiqués", ["APM"]],
  ["p41", "Termes de Référence", "Cohérence TdR / grille évaluation / paiements", "", ["APM"]],
  ["p42", "Termes de Référence", "Pas de critères d'évaluation dans les TdR", "Réservés Section II – Données particulières", ["APM"]],
  ["p43", "Termes de Référence", "Pas de modalités de paiement dans les TdR", "Réservées conditions du contrat", ["APM"]],
  ["p44", "Termes de Référence", "Compléments ESSS pour MOE travaux", "Disponibles auprès GPS/AES", ["APM"]],
  ["p50", "Conditions Contrat", "Conditions générales non modifiées", "Modifs dans conditions particulières", ["DIR", "APM"]],
  ["p51", "Conditions Contrat", "Type contrat adapté (forfait / temps passé)", "", ["APM"]],
  ["p53", "Conditions Contrat", "Arbitrage prévu (AOI: international)", "", ["DIR", "APM"]],
];

export const CL_EVTECH = [
  ["t01", "Comité", "Comité évaluation identifié (noms, fonctions)", "", ["DIR"]],
  ["t02", "Ouverture", "PV ouverture propositions techniques", "Date, heure, lieu, participants", ["DIR"]],
  ["t03", "Évaluation", "Évaluation conforme à la grille DP", "Critères et sous-critères respectés", ["DIR", "APM"]],
  ["t04", "Évaluation", "Notation individuelle détaillée et argumentée", "Chaque évaluateur, chaque critère", ["DIR"]],
  ["t05", "Évaluation", "Note consensus du comité + forces/lacunes", "Pour faciliter débriefings", ["DIR"]],
  ["t06", "Évaluation", "Entretien chef de mission: Q&R consignées", "Si prévu", ["DIR"]],
  ["t07", "Résultats", "Consultants sous seuil technique éliminés", "Note minimum 70-80", ["DIR", "APM"]],
  ["t08", "Éligibilité", "WorldCheck + DI signée non modifiée", "Chaque entité vérifiée", ["DIR", "APM"]],
];

export const CL_EVFIN = [
  ["f01", "Ouverture financière", "Ouverture publique, notes techniques annoncées", "", ["DIR", "APM"]],
  ["f02", "Ouverture financière", "Seuls consultants ≥ seuil technique ouverts", "", ["DIR"]],
  ["f03", "Évaluation financière", "Montants HT, taxes distinguées, corrections", "", ["DIR"]],
  ["f04", "Évaluation financière", "Note financière selon formule DP", "Au prorata des montants", ["DIR", "APM"]],
  ["f05", "Évaluation combinée", "Note globale = tech (70-80%) + fin (20-30%)", "", ["DIR", "APM"]],
  ["f06", "Évaluation combinée", "Classement final établi", "", ["DIR"]],
  ["f07", "Vérifications", "Écart budget estimé analysé", "", ["APM"]],
  ["f08", "Vérifications", "Proposition unique ≠ absence concurrence", "Si délai suffisant + note > seuil + prix raisonnables: poursuivre", ["DIR"]],
  ["f09", "Conclusions", "Points à négocier listés + signatures comité", "Spécifique PI", ["DIR"]],
  ["f11", "Annexes", "Preuves publication + PV + grille notation détaillée", "", ["DIR"]],
];

export const CL_NEGO = [
  ["n01", "Cadre", "Négociations techniques avant financières", "Méthodologie, programme, personnel", ["DIR", "APM"]],
  ["n02", "Technique", "TdR finalisés, programme travail confirmé", "", ["DIR"]],
  ["n03", "Technique", "Personnel clé confirmé", "Remplacement selon conditions DP", ["DIR", "APM"]],
  ["n04", "Technique", "Méthodologie validée", "", ["DIR"]],
  ["n05", "Financière", "Pas de négo sur taux rémunération (temps passé)", "", ["DIR", "APM"]],
  ["n06", "Financière", "Clarifications prix unitaires si très élevés", "", ["APM"]],
  ["n07", "Financière", "Impôts/taxes identifiés", "", ["DIR"]],
  ["n08", "Processus", "Échec → consultant suivant (pas de reprise)", "", ["DIR"]],
  ["n09", "Processus", "PV négociations établi", "", ["APM"]],
];

export const CL_CTRPI = [
  ["cp01", "Identité", "Attributaire = classé premier, groupement intact", "Accord groupement signé avant signature contrat", ["APM"]],
  ["cp02", "Identité", "Contrat conforme à DP négociée", "", ["DIR", "APM"]],
  ["cp03", "Intégrité", "DI contractuelle signée", "", ["DIR", "APM"]],
  ["cp04", "Contrat", "Type rémunération adapté (forfait/temps passé)", "", ["APM"]],
  ["cp05", "Contrat", "Montant HT, taxes isolées (AFD finance HT)", "", ["DIR", "APM"]],
  ["cp06", "Contrat", "Conditions générales non modifiées", "", ["DIR", "APM"]],
  ["cp07", "Contrat", "Conditions particulières renseignées", "", ["APM"]],
  ["cp08", "Contrat", "Arbitrage prévu (AOI: international)", "", ["DIR", "APM"]],
  ["cp09", "Contrat", "Responsabilité limitée", "", ["APM"]],
  ["cp10", "Contrat", "Modalités paiement cohérentes + résiliation prévue", "", ["APM"]],
  ["cp11", "Contrat", "Publication résultats + notification consultants", "", ["DIR"]],
];

export const CL_PROG = [
  ["pg01", "Contenu", "Le programme définit précisément les besoins fonctionnels, les surfaces, les contraintes techniques et réglementaires du projet.", "Retex AI — Rédaction de Programme", ["RETEX"]],
  ["pg02", "Contenu", "Les hypothèses sur le périmètre VRD et les réseaux sont précisées. Être très précis sur le périmètre à traiter pour éviter les litiges.", "Retex AI — Rédaction de Programme", ["RETEX"]],
  ["pg03", "Contenu", "Les hypothèses électriques (puissance, raccordement, secours) sont précisées dans le programme.", "Retex AI — Rédaction de Programme", ["RETEX"]],
  ["pg04", "Validations", "Le préprogramme est formellement validé par la MOA avant de passer à la phase suivante. Les scénarios d'implantation et d'accès sont validés par les décideurs pour éviter une contestation tardive.", "Retex AI — Rédaction de Programme", ["RETEX"]],
  ["pg05", "E&S", "Coordination avec l'E&S pour avoir les principales contraintes environnementales et de site dès le préprogramme. Attention à ne pas lancer les consultations de parties prenantes avant la validation des arbitrages.", "Retex AI — Rédaction de Programme", ["RETEX"]],
  ["pg06", "Urbanisme", "Se renseigner sur les contraintes d'urbanisme / permis de construire dès le programme. Le Guichet Unique peut délivrer un certificat d'urbanisme.", "Retex AI — Rédaction de Programme", ["RETEX"]],
  ["pg07", "Livrables", "Prévoir une version résumée du programme (PTD) pour faciliter le partage avec la MOA si le document complet est trop volumineux.", "Retex AI — Rédaction de Programme", ["RETEX"]],
];

export const CL_TDR = [
  ["td01", "Contenu", "Les TdR précisent les livrables, les délais et les expertises à fournir. Les exigences en experts internationaux et/ou expertises internationales doivent être clairement indiquées. Contrôler la cohérence TdR / grille d'évaluation / articulation avec les paiements.", "Réf. Dir. §5.2 — Checklist APM DP §VII", ["DIR", "APM"]],
  ["td02", "Contenu", "Les TdR ne contiennent aucune disposition sur les critères d'évaluation des Propositions (réservés aux Données Particulières §II) ni sur les modalités de paiement du contrat (réservées aux Conditions du Contrat §VIII).", "Checklist APM DP §VII", ["APM"]],
  ["td03", "ESSS", "Pour les TdR des missions de MOE travaux (études, appui passation, supervision), des compléments spécifiques sur les missions relatives aux aspects ESSS ont été développés. Disponibles auprès de GPS/AES.", "Checklist APM DP §VII", ["APM"]],
  ["td04", "Rendus MOE", "Bien cadrer les rendus attendus sur les gros projets. Par exemple, imposer le sommaire et le contenu indicatif de la notice architecturale. Donner le tableau de surfaces vide au format souhaité. Prévoir un tableau récapitulatif par lot technique.", "Retex AI — Rédaction de TdR", ["RETEX"]],
  ["td05", "Phases", "Si nécessaire pour la complexité du projet, insister pour faire 3 phases de conception (APS-APD-PRO) au lieu de 2, même si la norme locale ne le prévoit pas.", "Retex AI — Rédaction de TdR", ["RETEX"]],
  ["td06", "STD", "Bien cadrer ce qui est demandé pour la STD, surtout dans les pays où ce n'est pas courant. Éventuellement ne rien demander en APS.", "Retex AI — Rédaction de TdR", ["RETEX"]],
  ["td07", "Personnels clés", "Être clair dans la demande d'avoir un architecte dans l'équipe. Être clair sur les profils requis et les exigences de présence sur site.", "Retex AI — Rédaction de TdR", ["RETEX"]],
  ["td08", "Facturation", "Simplifier au maximum la facturation. Essayer de garder un paiement à la livraison plutôt qu'à l'avancement, qui est complexe à gérer.", "Retex AI — Rédaction de TdR", ["RETEX"]],
  ["td09", "Enveloppe", "Prévoir un § dans les TdR + contrat sur le respect de l'enveloppe prévisionnelle travaux.", "Retex AI — Rédaction de TdR", ["RETEX"]],
  ["td10", "Livrables", "Ajouter dans la liste des livrables une notice explicative sur l'estimation AVP et faire valider le tableau des estimations avant le rendu AVP.", "Retex AI — Rédaction de TdR", ["RETEX"]],
];
