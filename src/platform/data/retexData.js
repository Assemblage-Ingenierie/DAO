// ── Plateforme — Retours d'expérience (REX / Retex AI) ────────────────────
//
// Données extraites verbatim du single-file `_imports/plateforme-source.jsx`
// (lignes 155-208). Chaque entrée RETEX_DATA est un retour d'expérience avec :
//   - th  : thème (typiquement "Rédaction de DP", "Rédaction de TdR", etc.)
//   - kw  : mot-clé (optionnel — STD, Critères, Notation, Validations…)
//   - pj  : projet source (ex. "225_22_PALESTINE_ISC")
//   - ed  : éditeur (Maël, Aliénor, Clément, Louis…)
//   - cm  : commentaire / texte du retour
//
// RETEX_THEMES et RETEX_KW alimentent les filtres de la page Retex.

export const RETEX_THEMES = [
  "Controle technique",
  "Modes opératoires",
  "Rédaction de DAO",
  "Rédaction de DP",
  "Rédaction de DP, Rédaction de TdR",
  "Rédaction de DP, Rédaction de TdR, Rédaction de Programme",
  "Rédaction de Programme",
  "Rédaction de TdR",
  "Rédaction de TdR, Rédaction de DP",
  "Rédaction de TdR, Rédaction de DP, Rédaction d'AMI",
];

export const RETEX_KW = [
  "Critères",
  "E&S",
  "Facturation",
  "GFA",
  "Gestion",
  "Gestion infra",
  "Livrables",
  "Multisite",
  "Notation",
  "Passation de marchés",
  "Personnels clés",
  "Phases",
  "Projet anglophone",
  "Préqualification",
  "Rendus MOE",
  "Répartition des points",
  "STD",
  "Urbanisme",
  "Validations",
];

export const RETEX_DATA = [
  { th: "Rédaction de DP, Rédaction de TdR", kw: "Projet anglophone / GFA", pj: "225_22_PALESTINE_ISC", ed: "Maël", cm: "Se renseigner sur tous les couts à prendre en charge par la MOE. Enregistrement du projet auprès de différentes autorités. Dans certains cas c'est à prendre en charge par la MOE et le cout dépend de la Gross Area finale" },
  { th: "Rédaction de Programme", kw: "Projet anglophone / GFA", pj: "225_22_PALESTINE_ISC", ed: "Maël", cm: "Attention sur les projets anglophones à l'importance de la Gross Floor Area. CPO met systématiquement la Surface de Plancher qui a une définition légérement différente mais qui n'est pas parlante pour les MOE non françaises." },
  { th: "Rédaction de TdR, Rédaction de DP", kw: "Rendus MOE", pj: "225_12_RCI_LSY", ed: "Maël", cm: "Bien cadrer, surtout sur les gros projets, certains rendus attendus. Par exemple, imposer le sommaire et le contenu (avec des commentaires indicatifs) de la notice architecturale.\nPeut être même donner le tableau de surfaces vide à remplir au format qu'on veut.   \nEgalement un tableau récapitulatif du type d'intervention de réhabilitation par lot technique par bâtiment/salle" },
  { th: "Rédaction de TdR, Rédaction de DP", kw: "Phases", pj: "225_12_RCI_LSY", ed: "Maël", cm: "Si c'est nécessaire à cause de la complexité du projet, insister pour faire 3 phase de conception APS APD PRO au lieu  de juste deux meme si c'est la norme localement." },
  { th: "Rédaction de DP, Rédaction de TdR", kw: "STD", pj: "225_12_RCI_LSY", ed: "Maël", cm: "STD: bien cadrer ce qui est demandé pour la STD, surtout dans les pays ou ce n'est pas courant. Eventuellement ne rien demander en APS." },
  { th: "Rédaction de DP, Rédaction de TdR, Rédaction de Programme", kw: "Validations", pj: "225_18_RCI_UFHB, 225_22_PALESTINE_ISC", ed: "Maël", cm: "Obtenir  une validation formelle du préprogramme avant de continuer.\nLes scénarios d'implantation sur le site, et d'accès, doivent être validés par les décideurs, pour ne pas qu'ils contestent en APD quand ils décrouvent le projet." },
  { th: "Rédaction de Programme", kw: "E&S", pj: "225_18_RCI_UFHB", ed: "Maël", cm: "Coordonner avec l'E&S pour avoir les principales contraintes environnementales et de site des le préprogramme. Attention de ne pas lancer les consultations de parties prenantes avant la validation du préprogramme et la validations des arbitrages sur le contenu du projet. L'enjeu est de ne pas parler aux gens de la construction d'un amphi si à la fin il ne sera pas fait." },
  { th: "Rédaction de Programme", kw: "Urbanisme", pj: "225_18_RCI_UFHB", ed: "Maël", cm: "Commencer à se renseigner sur les contraintes d'urbanisme / permis de construire. Le Guichet Unique du Permis de Construire peut délivrer un certificat d'urbanisme qui donnes les règles à resperter (hauteur de bâtiment, éloignement, etc). Mais il faut donner des précisions sur le projet." },
  { th: "Rédaction de Programme", kw: "Livrables", pj: "225_12_RCI_LSY, 225_22_PALESTINE_ISC", ed: "Maël", cm: "Prévoir une version résumée qui permettra d'être mieux partagée à la MOA si le PTD est trop lourd" },
  { th: "Modes opératoires", kw: "Multisite", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Avoir en tête que sur les projets infras multisites éparpillés sur le territoire, les processus liés au paiement des entreprises, avec mission de contrôleur financier, accompagnés par l'UCP, sont extrêmement chronophages et mobilisent du personnel." },
  { th: "Modes opératoires", kw: "Multisite", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Pour les projets multisites avec éparpillement sur le territoire, essayer de décentraliser au maximum la gestion opérationnelle quotidienne, en utilisant de préférence des outils collaboratifs." },
  { th: "Modes opératoires", kw: "Passation de marchés / Gestion", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "La fonction qui est sur le chemin critique de tous les projets est la passation des marchés. Il faut s'assurer qu'elle soit suffisament staffée et avec des personnels séniors." },
  { th: "Modes opératoires", kw: "Gestion infra", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Sur le CCBAD, comme il y a peu de travaux, ils ont recruté un consultant individuel pour s'occuper des tâches infras. Le consultant est local et travail sur d'autres projets en parallèle. Permet plus de flexibilité, et une présence seulement aux moments clés." },
  { th: "Rédaction de DAO", kw: "Préqualification", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "La préqualification est déconseillée s'il n'y a pas d'enjeu de complexité de travaux car elle multiplie sensiblement les délais et ne garantie pas la présélection des bonnes entreprises à cause des fraudes difficiles à détecter." },
  { th: "Rédaction de TdR, Rédaction de DP", kw: "Critères", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Faire des lots MOE cohérents avec les lots travaux pour faciliter la gestion des marchés (éviter de croiser les lots)." },
  { th: "Rédaction de TdR, Rédaction de DP, Rédaction d'AMI", kw: "Critères", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Attention aux critères: Afrique de l'Ouest pour les références. Exclut de fait toutes les expériences en Afrique centrale qui sont aussi pertinentes" },
  { th: "Rédaction de TdR, Rédaction de DP", kw: "Facturation", pj: "225_15_RCI_Collèges, 225_12_RCI_LSY", ed: "Maël", cm: "Simplifier au maximum la facturation\nEssayer de garder un paiement à la livraison puis à la validation." },
  { th: "Rédaction de TdR, Rédaction de DP", kw: "Personnels clés", pj: "225_12_RCI_LSY", ed: "Maël", cm: "Etre bien clair dans la demande d'avoir un architecte dans l'équipe\nEtre bien clair sur les demandes d'agrément de l'architecte" },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "§ dans les TdR + contrat sur le respect de l'enveloppe prévisionnelle travaux à respecter en AVP, tolérance de dépassement? Mise à jour AVP sans rémunération supplémentaire en cas de dépassement (mais quid quand ca a été tellement mal chiffré à la base que c'est impossible??)." },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Ajouter dans la liste des livrables une notice explicative sur l'estimation AVP : méthode, origine des coûts, expliciter les dépassements" },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Liste livrables : préciser la liste complète des corps d'état technique pour lesquels on veut une notice et des plans." },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Faire valider le tableau des estimations AVP avant le rendu AVP (s'assurer que les SP/SU sont indiqués ou équivalents, que les prix sont indiqués par bâtiments, etc.) ou carrément fournir un modèle.." },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Prévoir une réunion obligatoire avant rendu AVP pour présenter les principales orientations, les dépassements de budgets pressenties, etc. pour obtenir des pré-validations intermédiaires avant de rendre un AVP à côté de la plaque." },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "ARCHI : imposer en AVP de fournir des 3D extérieur/intérieur" },
  { th: "Rédaction de TdR, Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "ARCHI : imposer dans les livrables que les plans archis soient côtés et avec lignes de repères" },
  { th: "Rédaction de Programme", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "VRD : être très précis dans le programme sur le périmètre à traiter." },
  { th: "Rédaction de Programme", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "ELEC : être très précis dans le programme sur les hypothèses à prendre en compte (circuit général / prioritaire secouru / tolérance coupure, etc.) et sur le fait d'obtenir une notice claire existant/stratégie projet et hypothèse dimensionnement / fonctionnement/ entretien maintenance + Prévoir réunion spécifique sur le lot elec avec futur usager en cous d'AVP." },
  { th: "Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "DP :  Critère sur le CV préférer « Adéquation des CV avec les exigences des TdR en termes de qualification, compétences, experience » plutôt que « Adéquation des CV avec les services attendus »." },
  { th: "Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "DP : Être clair sur ce qui constitue un « sous-critère » et ce qui correspond à un atout + Faire attention à être clairs dans la formulation des sous-critères (une liste à la Prévert de sous-critère rend l'évaluation délicate) + Préciser la distribution de la note en fonction des sous-critères ?" },
  { th: "Rédaction de DP", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "DP : prévoir note minimle requise par critère? Prévoir critère excluant?" },
  { th: "Rédaction de DP", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Attention aux modalités de paiement, et au paiement de la MOE à l'avancement de l'entreprise. Si les chantiers s'arrêtent, la MOE reste mobilisée sans être payée." },
  { th: "Rédaction de DP", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Prévoir de demander à la MOE des rapports photographiques hebdomadaires pour apprécier l'avancement à distance." },
  { th: "Rédaction de DAO", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Garantie de soumission : préciser si la garantie est attendue par lot/pour par offre." },
  { th: "Rédaction de DAO", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Quand on sépare les lots en différents AO, les limites de capacité ne sont pas cumulables entres les différents AO. Par exemple, si une entreprise ne peut être attributaire de 2 lots sur un AO parce que sont CA n'est pas suffisant, elle peut quand même remporter deux lots s'ils sont séparés en 2 AO. Il faut prévoir ce cas de figure dans le DAO." },
  { th: "Rédaction de DAO", pj: "225_11_COMORES PDFC", ed: "Aliénor", cm: "Sur le rapport d'évaluation des offres : Quand une solution d'attribution paraît meilleure qu'une autre, il faut bien le faire apparaître de manière formelle dans le rapport (ou en note annexe), plutôt que dans des échanges par mail." },
  { th: "Rédaction de DAO", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Préférer les petits lots car plus faciles à résilier et plus accessibles aux entreprises typiques de Cote d'Ivoire. Les gros lots sont moins accessibles et augmentent le risque d'entreprises trop faibles qui trichent sur leur capacité financière." },
  { th: "Rédaction de DAO", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Prendre en compte la proximité géographique avec coefficient d'éloignement pour calcul des couts estimatifs" },
  { th: "Rédaction de DAO", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Mettre en place des jalons contractuels tôt dans les travaux pour être en mesure de résilier rapidement si entreprise sera clairement trop faible." },
  { th: "Rédaction de DAO", pj: "225_15_RCI_Collèges", ed: "Maël", cm: "Prévoir le paiement des entreprises à des moments prédéfinis (jalons physiques ou % pré-définis tous les 20 % par exemple) pour faciliter la gestion, ne pas multiplier les demandes d'attachements pour des sommes dérisoires, et motiver l'entreprise à atteindre le jalon suivant pour être payés." },
  { th: "Controle technique", pj: "225_20_GUINEE_PAIED, 225_21_GUINEE_MNG", ed: "Aliénor", cm: "Mission CT à prévoir en fonction de la complexité du projet : CT prévu pour projet MNG / Pas de CT pour projet PAIED" },
  { th: "Controle technique", pj: "225_20_GUINEE_PAIED, 225_21_GUINEE_MNG", ed: "Aliénor", cm: "Article 44 du Code de la Construction et de l'Urbanisme / Loi n° L/2015/020/ A.N \nContrôle technique obligatoire dans les cas de figure suivants : \n    \"a- Tout immeuble de trois (3) étages et plus, \n    b- Toute construction avec sous sol de (04) quatre mètres et plus ; \n    c- Toute construction nécessitant des reprises en sous œuvre ou des travaux de soutènement d'ouvrages voisins ;  \n    d- Toute unité industrielle, agricole ou autre dotée d'un pont roulant ; \n    e- Tout établissement destiné à recevoir du grand public (stade, université, théâtre, hôpital, centre commercial, lieux de culte). \n    f- Tout ouvrage comportant des éléments en porte à faux de portée égale ou supérieure à (03) trois mètres, ou des poutres ou arcs de portée supérieure à (08) huit mètres ; \n    g- Toute autre construction qui, en raison de sa nature ou de son importance, présente des risques particuliers pour la sécurité des personnes et des biens.\"" },
  { th: "Controle technique", pj: "225_28_TUNISIE_EFMT", ed: "Aliénor", cm: "Article 16 du Décret n°2017-967 du 31 Juillet 2017, portant réglementation de la construction des bâtiments civils \n\"Tout projet de bâtiment civil doit faire l'objet d'un contrôle technique des études et de l'exécution des travaux par des contrôleurs techniques agréés par le ministère chargé de l'équipement conformément à la législation et à la réglementation en vigueur.\"\n>> Contrôle technique obligatoire pour tous projets de bâtiments civils" },
  { th: "Controle technique", pj: "225_28_TUNISIE_EFMT", ed: "Aliénor", cm: "Mission CT à prévoir en cas de projets publics pour éviter blocages administration / Dérogation en cas de projets bailleurs peut-être possible si projet non complexe et dans ce cas, confier à l'AMO infra et/ou au responsable infrastructure une revue technique des études" },
  { th: "Controle technique", pj: "225_14_COMORES PROFI, 225_11_COMORES PDFC", ed: "Aliénor", cm: "Absence de cadre légal" },
  { th: "Controle technique", pj: "225_17_RWANDA_AFTER", ed: "Clément", cm: "Article 39 de la Loi n°10/2012 du 02/05/2012 portant Code de l'urbanisme et de la construction au Rwanda \nConstructions soumises au contrôle technique obligatoire :\n\"1. Tout immeuble complexe, à usage industriel et commercial;\n  2. Tout bâtiment à usage public;\n  3. Toute autre construction qui, en raison de sa nature ou de son importance, présente des risques particuliers pour la sécurité des personnes et des biens.\"" },
  { th: "Rédaction de TdR, Rédaction de DP, Rédaction d'AMI", pj: "225_33_BURUNDI_CANKUZO", ed: "Clément", cm: "Pour s'assurer de l'appropriation des documents par la MOA prévoir systématiquement une réunion pour expliquer la DP TDR. Notamment la grille de notation et les critères proposées dans les TDR" },
  { th: "Rédaction de TdR", kw: "STD", pj: "225_22_PALESTINE_ISC", ed: "Maël", cm: "Si on veut  spécifiquemennt certaines études environnementales comme une étude de lumière du jour, l'expliciter clairement, ne pas mettre juste STD. Ne pas hésiter à détailler tous les résultats attendus." },
  { th: "Rédaction de DP", kw: "Notation", pj: "225_33_BURUNDI_CANKUZO", ed: "Louis", cm: "Bien vérifier la cohérence entre les exigences des TdR sur le sprofils et le contenu de la DP. Notamment sur l'ancienneté des références, cela doit aussi apparaitre dans la DP. De même vérfier la cohérence sur l'ancienneté et le montant des références entre l'AMI et la DP." },
  { th: "Rédaction de DP", kw: "Répartition des points", pj: "225_33_BURUNDI_CANKUZO", ed: "Louis", cm: "Il n'est pas utile d'accorder trop de point au personnel clé lorsque les soumissionnaires sont des groupements internationaux. Le PC est alors systématiqueement conforme avec des références adéquate, l'attribution de ces points n'est plus discrimante." },
];
