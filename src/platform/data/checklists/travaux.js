// ── Plateforme — Checklists Travaux ───────────────────────────────────────
//
// Checklists de revue pour les marchés de Travaux : DAO, Rapport d'évaluation,
// Contrat. Extraites verbatim du single-file `_imports/plateforme-source.jsx`
// (lignes 235-329). Source : Directives AFD 2024 §4.1-4.10 + Annexe 5 +
// Checklist APM Travaux.
//
// Format de chaque item : [id, section, texte, conseil, [sources]]
// Les `sources` sont les ids déclarés dans `data/types.js` (DIR, APM, RETEX,
// REX) — la couleur du badge est résolue à l'affichage par <ReviewItem/>.

export const CL_DAO = [
  // Avis d'AO
  ["d01", "Avis d'AO", "Une large publicité est prévue : (i) journal à tirage national, (ii) journal officiel, (iii) portail d'accès gratuit, (iv) portail dgmarket pour les AOI. Un AOI est obligatoire si le marché est estimé supérieur à 5 M€.", "Réf. Dir. §4.2 — Checklist APM DAO", ["DIR", "APM"]],
  ["d02", "Avis d'AO", "Si un paiement est demandé pour retirer le dossier, il doit être raisonnable et avoir pour seul objectif de couvrir les coûts d'édition, non les coûts d'élaboration.", "Checklist APM DAO", ["APM"]],
  ["d03", "Avis d'AO", "Les critères de qualification doivent être indiqués dans l'avis s'il n'y a pas eu de phase de pré-qualification, pour éviter que le dossier ne soit retiré par des candidats non qualifiés.", "Checklist APM DAO", ["APM"]],
  // DPAO
  ["d10", "Données particulières AO", "Informations sur les demandes d'éclaircissement, la réunion préparatoire et/ou visite de site. La pratique d'une réunion préparatoire est à encourager, sauf si la compétition risque d'être limitée (risque de collusion).", "Checklist APM DAO §II", ["APM"]],
  ["d11", "Données particulières AO", "Le délai pour le dépôt des offres doit être de 8 semaines minimum pour les AOI.", "Réf. Dir. §4.2 — Checklist APM DAO", ["DIR", "APM"]],
  ["d12", "Données particulières AO", "L'ouverture des offres doit se faire en séance publique. L'AFD préconise 1 seule enveloppe avec énoncé des prix à l'ouverture (évite une pression sur l'enveloppe financière). L'ouverture doit avoir lieu très peu de temps après la date limite de remise.", "Réf. Dir. §4.3 — Checklist APM DAO", ["DIR", "APM"]],
  ["d13", "Données particulières AO", "Traitement des variantes techniques et/ou de délais. Autoriser des variantes est recommandé. Prévoir des spécifications techniques minimales pour chaque variante et indiquer la méthode d'évaluation. Les variantes spontanées ne sont prises en compte que pour l'offre conforme la moins-disante sur la solution de base.", "Réf. Dir. §4.5 — Checklist APM DAO", ["DIR", "APM"]],
  ["d14", "Données particulières AO", "Type de prix (révisables ou fermes). La révision est recommandée si (1) le marché dure ≥ 18 mois et (2) on anticipe volatilité des matières premières et/ou inflation significative. Le coefficient X de la formule de révision doit être fixé par la MOA dans le DAO.", "Checklist APM DAO", ["APM"]],
  ["d15", "Données particulières AO", "Période de validité de l'offre entre 90 et 120 jours. Au-delà de 120 jours : prévoir un processus d'actualisation du montant de l'offre en cas de prolongation. Le modèle AFD le prévoit.", "Checklist APM DAO", ["APM"]],
  ["d16", "Données particulières AO", "Garantie de soumission : normale pour les travaux. Le montant doit être spécifié par la MOA et ne doit pas excéder 3% du montant estimé du marché.", "Checklist APM DAO", ["APM"]],
  ["d17", "Données particulières AO", "Marge de préférence nationale : l'AFD ne l'accepte que si elle est imposée (pas seulement recommandée) par la loi, est explicitement prévue dans les documents, et ne conduit pas à l'exclusion de fait d'une concurrence étrangère. Max 7,5% travaux, 15% prix importation HT équipements. Une exigence de main-d'œuvre locale n'est acceptable que si imposée par la réglementation.", "Réf. Dir. §2.1.4 — Checklist APM DAO", ["DIR", "APM"]],
  // Critères
  ["d20", "Critères d'évaluation", "Les critères de qualification doivent être proportionnés aux enjeux du marché. Ils portent sur la capacité des candidats à exécuter le marché (références récentes similaires, situation financière). L'évaluation ne doit pas se baser sur une notation pondérée. Tous les candidats éligibles répondant aux critères doivent être admis, sans limite de nombre.", "Réf. Dir. §4.1 — Checklist APM DAO §III", ["DIR", "APM"]],
  ["d21", "Critères d'évaluation", "Critères d'éligibilité : prêter attention à la possible existence de critères locaux discriminants. En cas de financements délégués UE (IMDA) : vérifier liste d'exclusion UE. Les critères administratifs doivent être limités aux exigences de la réglementation locale. Refuser les critères d'élimination purement formels sauf si la loi l'impose.", "Réf. Dir. §1.4, §4.4 — Checklist APM DAO", ["DIR", "APM"]],
  ["d22", "Critères d'évaluation", "Capacité financière : les exigences en matière de CA et d'expérience spécifique doivent être correctement dimensionnées, au risque soit d'éliminer tout le monde, soit d'autoriser des candidats de taille trop petite. Pour un groupement : exigences par membre (chacun et/ou en cumulé) à spécifier.", "Checklist APM DAO §III", ["APM"]],
  ["d23", "Critères d'évaluation", "Expérience : les critères doivent être cohérents avec les caractéristiques du marché (technicité, taille, localisation) et correctement dimensionnés.", "Checklist APM DAO §III", ["APM"]],
  ["d24", "Critères d'évaluation", "Qualification ESSS : sauf si aucun risque majeur ESSS n'a été identifié, s'assurer de la présence de critères de qualification ESSS et de leur cohérence avec la nature du marché et les enjeux identifiés.", "Checklist APM DAO §III", ["APM"]],
  ["d25", "Critères d'évaluation", "L'évaluation est prévue en termes monétaires et ne fait pas appel à un système à points. Tous les critères servant à l'évaluation doivent être chiffrables. Exception : contrats DB ou DBO où une notation peut être utilisée pour la partie conception, avec prise en compte du coût sur la durée de vie.", "Réf. Dir. §4.4 — Checklist APM DAO §III", ["DIR", "APM"]],
  // Formulaires
  ["d30", "Formulaires", "Tableau des prix : préciser la nature du marché et des prix (forfait ou PU), identifier les taxes dans une colonne séparée. Pour DB/DBO : prix forfaitaire avec tableaux séparés pour pièces détachées, consommables, entretien, énergie. Un bordereau ESSS spécifique si aspects ESSS identifiés dans le PGES.", "Checklist APM DAO §IV", ["APM"]],
  ["d31", "Formulaires", "Méthodologie ESSS demandée sur les sujets sensibles, de manière détaillée uniquement pour les aspects les plus importants identifiés dans le PGES du projet.", "Checklist APM DAO §IV", ["APM"]],
  ["d32", "Formulaires", "La Déclaration d'Intégrité est présente dans le dossier. Peut être remplacée par d'autres dispositions en cas de cofinancement joint (déclaration MRI, BM, etc.).", "Réf. Dir. §4.2f — Checklist APM DAO", ["DIR", "APM"]],
  // Spécifications
  ["d40", "Spécifications techniques", "Prise en compte des questions de santé, sécurité, impact environnemental et social du chantier. Demander l'insertion des spécifications ESSS en annulant les clauses non applicables.", "Checklist APM DAO §VII", ["APM"]],
  ["d41", "Spécifications techniques", "Les normes et spécifications techniques permettent une large concurrence. S'assurer que les technologies et normes permettent aux entreprises de répondre. Précision suffisante pour assurer la qualité. Aucune marque spécifique de matériaux ou matériels ne doit être exigée.", "Réf. Dir. §4.2e — Checklist APM DAO §VII", ["DIR", "APM"]],
  // CCAG/CCAP
  ["d50", "CCAG / CCAP", "Le CCAG est présent et non modifié. S'il s'agit du modèle AFD, aucune modification ne doit avoir été apportée. Sinon, privilégier les conditions générales FIDIC si montant > 1 M€. Les dispositions peuvent être précisées et/ou modifiées uniquement par les Conditions particulières.", "Réf. Dir. §4.2g — Checklist APM DAO §VIII-IX", ["DIR", "APM"]],
  ["d51", "CCAG / CCAP", "Le CCAP est obligatoirement renseigné avant le lancement de l'AO. Ses clauses ont un impact sur le prix de l'offre.", "Checklist APM DAO §IX", ["APM"]],
  ["d52", "CCAG / CCAP", "Type de rémunération adapté : forfaitaire, prix unitaires, ou mixte. Une rémunération forfaitaire est à exclure en cas d'incertitudes et de risques élevés dans le chiffrage.", "Checklist APM DAO §IX", ["APM"]],
  ["d53", "CCAG / CCAP", "Garanties et assurances : la GBE est standard. Si une retenue est aussi appliquée, le total GBE + retenue ne doit pas excéder 15% du montant du marché. Plafonds d'assurances fixés par la MOA.", "Checklist APM DAO §IX", ["APM"]],
  ["d54", "CCAG / CCAP", "Prolongation du délai d'achèvement : les possibilités sont prévues (force majeure, conditions climatiques exceptionnelles).", "Checklist APM DAO §IX", ["APM"]],
  ["d55", "CCAG / CCAP", "Impôts et taxes identifiés et exemptions précisées. L'AFD finançant hors taxes, cette identification est essentielle.", "Réf. Dir. §4.9 — Checklist APM DAO §IX", ["DIR", "APM"]],
  ["d56", "CCAG / CCAP", "Révision du prix : spécifier si le prix est révisable ou non. La révision est fortement recommandée si la durée des travaux est > 18 mois. Le coefficient X de la formule doit être fixé par la MOA dans le DAO.", "Checklist APM DAO §IX", ["APM"]],
  ["d57", "CCAG / CCAP", "Pénalités de retard : montant standard (environ 1/1000e du montant du marché par jour de retard).", "Checklist APM DAO §IX", ["APM"]],
  ["d58", "CCAG / CCAP", "Sanctions ESSS : les clauses applicables sont incluses dans le CCAP (par défaut dans le DAO Travaux AFD).", "Checklist APM DAO §IX", ["APM"]],
  ["d59", "CCAG / CCAP", "Modalités de règlement : l'avance de démarrage doit être décorrélée du paiement du contrat (avance de X%, suivie de paiements pour 100%, desquels se déduit un pourcentage pour remboursement). Garantie bancaire exigée avant versement. Le pourcentage de déduction doit être supérieur au pourcentage de l'avance.", "Checklist APM DAO §IX", ["APM"]],
  ["d60", "CCAG / CCAP", "Réception provisoire et définitive : les modalités sont clairement décrites (éventuellement par section) ainsi que les tests complets à effectuer.", "Checklist APM DAO §IX", ["APM"]],
  ["d61", "CCAG / CCAP", "Clauses de responsabilité : veiller à ce que la responsabilité soit limitée, en général, au montant du marché.", "Checklist APM DAO §IX", ["APM"]],
  ["d62", "CCAG / CCAP", "Suspension / résiliation : la possibilité pour le MOA de suspendre les travaux et les conséquences associées sont décrites. Le MOA peut résilier pour faute de l'entreprise et pour convenance.", "Checklist APM DAO §IX", ["APM"]],
  ["d63", "CCAG / CCAP", "Droit applicable et arbitrage : dans le cas d'un AOI, le recours à un arbitrage international doit être explicitement prévu et décrit (règles d'arbitrage international et lieu neutre).", "Réf. Dir. §4.9 — Checklist APM DAO §IX", ["DIR", "APM"]],
];

export const CL_RAP = [
  // Introduction (Annexe 5)
  ["r01", "Introduction", "Brèves informations sur le projet et le contenu du marché.", "Réf. Dir. Annexe 5 §1a", ["DIR"]],
  ["r02", "Introduction", "Budget estimé pour le marché.", "Réf. Dir. Annexe 5 §1b", ["DIR"]],
  ["r03", "Introduction", "Rappel du processus de passation retenu : type de publication (national/international), type de consultation (AO avec/sans pré-qualification, DC, gré à gré), méthode de sélection (moins-disant, mieux-disant…), modalités particulières (2 étapes, lots, tranches, bons de commande).", "Réf. Dir. Annexe 5 §1c", ["DIR"]],
  ["r04", "Introduction", "Étape/enveloppe évaluée dans le rapport (qualification, technique, financière, combinée) et étapes déjà évaluées le cas échéant.", "Réf. Dir. Annexe 5 §1d", ["DIR"]],
  ["r05", "Introduction", "Calendrier complet du processus : début et fin de chaque période (pré-qualification, soumission), détail des prolongations avec motivation et preuve des publications. Date prévue de démarrage des prestations.", "Réf. Dir. Annexe 5 §1e", ["DIR"]],
  ["r06", "Introduction", "Réunion préalable et/ou visite de site : date, heure, lieu, liste des participants. Le PV doit être inclus en annexe.", "Réf. Dir. Annexe 5 §1f", ["DIR"]],
  ["r07", "Introduction", "Principaux éclaircissements/avenants apportés aux documents pendant la période de soumission. Le détail des demandes et réponses en annexe.", "Réf. Dir. Annexe 5 §1g", ["DIR"]],
  // Évaluation
  ["r10", "Évaluation", "Noms et fonctions des membres du comité d'évaluation.", "Réf. Dir. Annexe 5 §2a", ["DIR"]],
  ["r11", "Évaluation", "PV d'ouverture des offres : date, heure, lieu, participants. Contenant les informations requises conformément aux Documents de Passation de Marchés.", "Réf. Dir. Annexe 5 §2b", ["DIR"]],
  ["r12", "Évaluation", "Base de l'évaluation : documents type AFD ou nationaux, liste des éléments évalués (administratifs, techniques…).", "Réf. Dir. Annexe 5 §2c", ["DIR"]],
  ["r13", "Évaluation", "Résultats de l'évaluation technique : conformité selon chaque critère, analyse des non-conformités mineures et des divergences/réserves/omissions importantes de chaque offre (en vue de faciliter les débriefings). Justification des offres jugées non conformes.", "Réf. Dir. Annexe 5 §2d", ["DIR"]],
  ["r15", "Évaluation", "Résultats de l'évaluation financière : montants des offres HT, en précisant les corrections ou ajustements apportés. Si utile, présentation sous forme de tableau par grandes masses.", "Réf. Dir. Annexe 5 §2d", ["DIR"]],
  ["r16", "Évaluation", "Résultats de l'évaluation globale : application des modalités d'évaluation combinée technico-financière prévues dans les documents de passation (si évaluation en 2 étapes).", "Réf. Dir. Annexe 5 §2e", ["DIR"]],
  // Vérifications APM
  ["r20", "Vérifications APM", "La publicité a effectivement été faite (large publicité vérifiée).", "Checklist APM Rapport TVX", ["DIR", "APM"]],
  ["r21", "Vérifications APM", "Si le DAO a été modifié sans avoir sollicité l'ANO de l'AFD : vérifier la pertinence de la modification et le report de la date limite de remise des offres.", "Checklist APM Rapport TVX", ["APM"]],
  ["r22", "Vérifications APM", "Le dossier transmis par la MOA doit être complet : (i) PV de la commission d'ouverture, (ii) rapport complet d'évaluation, (iii) copie de l'offre lauréate. Le responsable EP ne doit pas se substituer à la MOA ni refaire les évaluations, mais peut demander communication des offres si le rapport ne lui paraît pas satisfaisant.", "Checklist APM Rapport TVX", ["APM"]],
  ["r23", "Vérifications APM", "Éligibilité : ANO conditionné au contrôle dans WORLDCHECK ONE (Case Report + Profile). Pour les groupements, chaque entité doit être vérifiée. DI incluse non modifiée et signée. Si exclusion BM : transmettre à JUR et DCO-Conformité. Entreprise publique : vérifier autonomie juridique et financière.", "Checklist APM Rapport TVX", ["APM"]],
  ["r24", "Vérifications APM", "Groupement modifié entre la pré-qualification et l'offre : sauf interdiction réglementaire, réévaluer la qualification du nouveau groupement. S'il ne remplit pas les exigences : offre éliminée.", "Réf. Dir. §4.4 — Checklist APM Rapport TVX", ["DIR", "APM"]],
  ["r25", "Vérifications APM", "Le dossier d'évaluation est complet et étayé : pour chaque offre, détail des omissions/réserves/divergences et leurs conséquences (acceptables ou non, préjudice chiffré). Les évaluations individuelles de chaque évaluateur doivent être incluses.", "Checklist APM Rapport TVX", ["APM"]],
  ["r26", "Vérifications APM", "L'évaluation a été faite en conformité avec les dispositions et critères du DAO. Attention : aux variantes, aux marchés avec allotissement, aux DB/DBO. Valider les éliminations, la conformité des offres retenues, les corrections apportées. Si une offre compétitive a été rejetée, demander des explications claires.", "Checklist APM Rapport TVX", ["APM"]],
  ["r27", "Vérifications APM", "Offre anormalement basse : si inférieure de 20% ou plus à l'estimation de la MOA, le comité doit demander clarifications et décomposition/sous-détail des prix. En l'absence de réponse satisfaisante ou si incohérence entre offre technique et prix : rejet. Le MOA ne doit pas fixer de seuil automatique de rejet.", "Réf. Dir. §4.4 — Checklist APM Rapport TVX", ["DIR", "APM"]],
  ["r28", "Vérifications APM", "Écart entre offre attributaire et estimation de la MOA : s'il y a un écart important, en rechercher les causes.", "Checklist APM Rapport TVX", ["APM"]],
  ["r29", "Vérifications APM", "Vérification de la qualification : même si une pré-qualification a eu lieu, la MOA doit revérifier la qualification avant de statuer sur l'attributaire. Le CA et les références pourraient avoir changé.", "Réf. Dir. §4.4 — Checklist APM Rapport TVX", ["DIR", "APM"]],
  ["r30", "Vérifications APM", "AO infructueux ou annulé : motifs et argumentation solides requis. L'annulation pour convenance de la MOA n'est pas autorisée. Un ANO est nécessaire. Il n'est pas permis de rejeter toutes les offres pour relancer sur les mêmes bases afin d'obtenir des prix inférieurs.", "Réf. Dir. §4.10 — Checklist APM Rapport TVX", ["DIR", "APM"]],
  ["r31", "Vérifications APM", "Une seule offre conforme ou reçue : investiguer la réalité de la concurrence. Faire demander aux candidats ayant retiré le DAO pourquoi ils n'ont pas soumis. Scruter les éliminations. Le DAO type AFD autorise l'ouverture même en cas d'offre unique.", "Checklist APM Rapport TVX", ["APM"]],
  // Conclusions
  ["r40", "Conclusions", "Liste des offres conformes pour l'essentiel, et liste des offres rejetées avec motifs (référence à l'article du DAO prévoyant le rejet).", "Réf. Dir. Annexe 5 §3a-b", ["DIR"]],
  ["r42", "Conclusions", "Classement final et proposition d'attributaire. Comparaison avec le budget estimé et commentaires.", "Réf. Dir. Annexe 5 §3c-d", ["DIR"]],
  ["r44", "Conclusions", "Signatures de tous les membres du comité d'évaluation.", "Réf. Dir. Annexe 5 §3f", ["DIR"]],
  // Annexes
  ["r50", "Annexes", "Preuves de publication + PV d'ouverture joint + Grille d'analyse détaillée des offres (conformité critère par critère).", "Réf. Dir. Annexe 5 §4", ["DIR"]],
];

export const CL_CTR = [
  ["c01", "Identité", "L'attributaire est identique au candidat retenu. Pas de substitution par une filiale. Groupement intact. PV de négociation joint si ajustements (calendrier, lieu d'arbitrage, impôts). Les négociations financières sont interdites sauf accord exprès de l'AFD.", "Réf. Dir. §4.9 — Checklist APM Marché TVX", ["DIR", "APM"]],
  ["c03", "Intégrité", "Déclaration d'Intégrité contractuelle signée et non modifiée incluse dans le marché.", "Réf. Dir. §4.2f — Checklist APM Marché TVX", ["DIR", "APM"]],
  ["c04", "Finances", "Montant HT apparent et taxes identifiées. L'AFD finance hors taxes, cette identification est essentielle.", "Checklist APM Marché TVX", ["APM"]],
  ["c05", "Garanties", "Garantie de bonne exécution prévue. Montant et forme de la garantie précisés.", "Checklist APM Marché TVX", ["APM"]],
  ["c06", "Délais", "Prolongation du délai d'achèvement prévue (force majeure, conditions climatiques exceptionnelles).", "Checklist APM Marché TVX", ["APM"]],
  ["c07", "Finances", "Impôts et taxes identifiés avec exemptions.", "Checklist APM Marché TVX", ["APM"]],
  ["c08", "Finances", "Révision du prix : il est spécifié si le prix est révisable. Révision fortement recommandée si durée > 18 mois.", "Checklist APM Marché TVX", ["APM"]],
  ["c09", "Finances", "Pénalités de retard : montant standard (~1/1000e du montant du marché par jour).", "Checklist APM Marché TVX", ["APM"]],
  ["c10", "Finances", "Modalités de règlement : avance décorrélée du paiement, garantie bancaire exigée avant versement.", "Checklist APM Marché TVX", ["APM"]],
  ["c11", "Réception", "Réception provisoire et définitive clairement décrites avec tests complets à effectuer.", "Checklist APM Marché TVX", ["APM"]],
  ["c12", "Responsabilité", "Responsabilité limitée au montant du marché.", "Checklist APM Marché TVX", ["APM"]],
  ["c13", "Litiges", "Suspension/résiliation prévue. Le MOA peut suspendre et résilier pour faute ou convenance.", "Checklist APM Marché TVX", ["APM"]],
  ["c14", "Litiges", "Droit applicable et arbitrage : pour un AOI, arbitrage international explicitement prévu et décrit (règles internationales, lieu neutre).", "Réf. Dir. §4.9 — Checklist APM Marché TVX", ["DIR", "APM"]],
];
