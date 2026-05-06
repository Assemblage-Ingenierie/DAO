import { useState, useEffect, useCallback, useMemo } from "react";

const TYPES=[{v:"AO_TVX_PQ",l:"AO Travaux (pré-qual.)",c:"Travaux"},{v:"AO_TVX_SP",l:"AO Travaux (sans pré-qual.)",c:"Travaux"},{v:"DC_TVX",l:"DC – Travaux",c:"Travaux"},{v:"GAG_TVX",l:"Gré à gré – Tvx",c:"Travaux"},{v:"AMI_DP",l:"AMI + DP (>200k€)",c:"PI"},{v:"DP_DIR",l:"DP directe (<200k€)",c:"PI"},{v:"D3PI",l:"D3PI",c:"PI"},{v:"DP_EI",l:"DP Expert indiv.",c:"PI"},{v:"DC_PI",l:"DC – PI",c:"PI"},{v:"GAG_PI",l:"Gré à gré – PI",c:"PI"},{v:"CONC",l:"Concours",c:"PI"},{v:"AUTRE",l:"Autre",c:"Autre"}];
const SECT=["Eau","Transport","Éducation","Santé","Énergie","Agriculture","Bâtiment","Environnement","Dév. urbain","Autre"];
const LANG=["Français","Anglais","Espagnol","Portugais"];
const SPI=["MOE","Assistance technique","Autre"];
const DEQ=["Aliénor","Clément","Maël","Lou","Louis","Chaïma"];
const FL={"afghanistan":"af","angola":"ao","bénin":"bj","burkina faso":"bf","burundi":"bi","cameroun":"cm","comores":"km","congo":"cg","côte d'ivoire":"ci","djibouti":"dj","égypte":"eg","éthiopie":"et","france":"fr","gabon":"ga","ghana":"gh","guinée":"gn","haïti":"ht","kenya":"ke","kosovo":"xk","liban":"lb","madagascar":"mg","mali":"ml","maroc":"ma","mauritanie":"mr","moldavie":"md","mozambique":"mz","niger":"ne","nigéria":"ng","ouganda":"ug","pakistan":"pk","palestine":"ps","pérou":"pe","rwanda":"rw","sénégal":"sn","tanzanie":"tz","tchad":"td","togo":"tg","tunisie":"tn","vietnam":"vn","zambie":"zm"};
const PAYS_LIST=["Afghanistan","Angola","Bénin","Burkina Faso","Burundi","Cameroun","Comores","Congo","Côte d'ivoire","Djibouti","Égypte","Éthiopie","France","Gabon","Ghana","Guinée","Haïti","Kenya","Kosovo","Liban","Madagascar","Mali","Maroc","Mauritanie","Moldavie","Mozambique","Niger","Nigéria","Ouganda","Pakistan","Palestine","Pérou","Rwanda","Sénégal","Tanzanie","Tchad","Togo","Tunisie","Vietnam","Zambie"].sort();

function Fg({n,s}){const c=FL[(n||"").toLowerCase().trim()];const z=s||32;if(!c)return<div style={{width:z,height:z*.67,background:"#DFE4E8",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#999"}}>?</div>;return<img src={"https://flagcdn.com/w80/"+c+".png"} alt="" style={{width:z,height:z*.67,objectFit:"cover",borderRadius:3,border:"1px solid #DFE4E8"}}/>;}
const SRC=[{id:"DIR",lb:"Directives",co:"#30323E"},{id:"APM",lb:"APM",co:"#E30513"},{id:"RETEX",lb:"Retex AI",co:"#2563eb"},{id:"REX",lb:"REX",co:"#f59e0b"}];
// ════════ MEMO CODES DES MARCHÉS (Phase 6) ════════
const MEMO_PAYS=["Côte d'Ivoire","Comores","Rwanda","Guinée","Palestine","Tunisie","Kosovo"];
const MEMO_DATA=[
{n:"Dispositions générales",
d19:"Directives prévalent si plus restrictives\nLe Bénéficiaire a l'entière responsabilité de la mise en œuvre des projets financés par l'AFD en conformité avec le droit qui lui est applicable, notamment en ce qui concerne tous les aspects du processus de passation des marchés (rédaction des Documents de Passation de Marchés, attribution des marchés, gestion et exécution des marchés). L'AFD s'assurera uniquement que les conditions de mise à disposition du financement qu’elle octroie sont bien remplies.",
c:{
}},
{n:"Seuils",
d19:"AO International si\nTravaux > 5.000.000€\nPI ou Fournitures > 200.000€\n\nAMI obligatoire pour marchés de PI >200.000€ (En dessous, demande de cotation possible)\nRecours à des experts individuels si montant < 50.000€\n\nDemande de cotation possible si\nTravaux < 300.000€\nPI ou Fournitures < 200.000€",
c:{
"Comores":"CMP applicapble si Montant :\nTravaux > 30 MKMF\nFourniture > 10MKMF\nPI > 10MKMF\nSinon demande de cotation, ou demande de proposition sur liste restreinte\nATTENTION, seuils extraits du manuel de procédures mais sans que le document officiel source ne soit identifiée.",
"Rwanda":"AO International si\nTravaux > 2 milliard RWF\nfourniture et non consultancy service > 600 millions RWF\nPI > 100 millions\n\nSeuil sans AMI : < 50 million RWF\n\nRecours à des experts individuels supérieur à 6mois, AMI obligatoire. Demande de cotation à 3 consultants individuels si consultance inférieur à 6mois\n\nDemande de cotation possible si\nTravaux < 3 millions RWF\n\nSeuil GaG : 500kRWF",
"Guinée":"Arrêté A 2020/2032\n\nArticle 4: Seuil d'obligation d'application des conditions prévues au CMP.\nTravaux: 500Millions FRGuinéens/53 300€ (200Millions FR/21 300€  pour les services déconcentrés)\nFournitures et services courants: 150Millions FRGuinéens/16 000€ (100Millions/10 700€ pour les services déconcentrés)\nPrestations Intellectuelles: 150Millions FRGuinéens/16 000€ (100Millions/10 700€ pour les services déconcentrés)\nArticle 5: En dessous de ces seuils on peut passer par des demandes de cotation.\n\nArticle 10: Seuils de compétences des Ministres Sectoriels pour l'approbation des marchés. \nTravaux: 500Millions FRGuinéens/53 300€ \nFournitures et services courants: 150Millions FRGuinéens/16 000€ \nPrestations Intellectuelles: 150Millions FRGuinéens/16 000€ \nSeuils de compétence des Gouverneurs et Préfets pour l'approbation des marchés: \nTravaux: 400Millions/42 600€  pour les services déconcentrés\nFournitures et services courants: 100Millions/10 700€ pour les services déconcentrés\nPrestations Intellectuelles: 100Millions/10 700€ pour les services déconcentrés\n\nArticle 11: Seuils de publication internationale\nTravaux: 10 Milliards FRGuinéens/1 million €\nFournitures et services courants: 5 Milliards FRGuinéens/530 000€\nPrestations Intellectuelles: 5 Milliards  FRGuinéens/530 000€",
"TUNISIE":"1. MISE EN CONCURRENCE - Décret MP n°2014-41 du 07/03/14, Art. 4-5 :\n\"Les commandes dont les valeurs sont inférieures aux montants ci-dessus indiqués doivent faire l’objet de mise en concurrence par voie de consultation sans suivre les procédures spécifiques aux marchés publics et à travers des procédures écrites fondées sur la transparence et garantissant l’efficacité et la bonne gestion des deniers publics et obéissant aux principes mentionnés à l'article 6 du présent décret. \"\n- 200 000 DT pour les travaux / 59 127€\n- 100 000 DT pour les études et la fourniture de biens ou de services dans le secteur de l'informatique et des technologies de la communication (TIC)  /  29 563€\n- 100 000 DT pour la fourniture de biens ou de services dans les autres secteurs / 29 563€\n- 50 000 dinars pour les études hors TIC / 14 781€\nCertains cas exceptionnels sont eux aussi placés hors marché : \n- Les contrats d'association, de groupement, de sous-traitance, les contrats de maîtrise d’ouvrages délégués conclus entre l’acheteur public et d’autres parties et les conventions d’exécution de travaux publics entre services de l’État régis par la législation et la réglementation en vigueur  \n- les contrats de concession \n- les contrats de parrainage \n2. SEUIL CONTROLE MP - Décret MP n°2014-41 du 07/03/14, Art. 164 :\nCommission locale de CMP\nTravaux : jusqu'à 2M DT / 589 742 €\nBien d'équipement et de services : jusqu'à 400 000 DT / 117 948€\nCommission régionale de CMP\nTravaux : jusqu'à 5M DT / 1 475 327€\nBien d'équipement et de services : jusqu'à 1M DT / 295 065€\nCommission départementale de CMP\nTravaux : jusqu'à 10M DT / 2 950 654€\nBien d'équipement et de services : jusqu'à 4M DT / 1 179 939€\nCommission supérieure et d'audit des marchés\nTravaux : supérieur à 10M DT / 2 950 654€\nBien d'équipement et de services : supérieur à 4M DT / 1 179 939€",
"KOSOVO":"Art. 19 \"Classifying a Public Contract by Estimated Value\" of law n°04-L-042  :\n\n\"The following shall be considered as a \"large value contract\": \n1.1. a supply contract or a service contract the estimated value of which is equal to or greater than, or can reasonably be expected to be equal to or greater than one hundred twenty five thousand (125.000) euro; or \n1.2. works contracts the estimated value of which is equal to or greater than, or can be reasonably expected to be equal to or greater than, five hundred thousand (500.000) euro.\n\n\nThe following shall be considered as a “medium value contract\":\n 2.1. a supply contract or a service contract the estimated value of which is equal to or greater than, or can reasonably be expected to be equal to or greater than, ten thousand (10,000) euro but less than one hundred twenty five thousand (125.000) euro; or \n2.2. works contracts the estimated value of which is equal to or greater than, or can be reasonably be expected to be equal to or greater than, ten thousand (10,000) euro, but less than five hundred thousand (500.000) euro.\n\n\nThe following shall be considered as a “low value contract:” Any public contract the estimated value of which is equal to or greater than, or can reasonably be expected to be equal to or greater than, one thousand (1000) euro, but less than ten thousand (10,000)euro.",
}},
{n:"Délais publication",
d19:"Prestations intellectuelles\nAMI / Pré-qualification : 3 semaines\nProposition: Entre 6 et 12 semaines\n\nTravaux\nOffres de travaux: 8 semaines",
c:{
"Cote d'Ivoire":"Art 64 - Publicité Obligatoire\nAO National: le délai minimum de réception des candidatures ou des offres à compter de la publication pour les procédures nationales est de 30 jours. \nAO International: Le délai minimum de réception des candidatures ou des offres à compter de la publication est de 45 jours.",
"Comores":"Art 68 :\n> Seuils ci-dessous: le délai minimum de réception des candidatures ou des offres à compter de la publication est de 30 jours. \n> Seuil communautaire ou international : Le délai minimum de réception des candidatures ou des offres à compter de la publication est de 45 jours (NB : le CMP ne définit pas ce seuil communautaire ou international...)",
"Guinée":"Art. 55 du CMP :\nAO national : 30 jours calendaires à compter de la publication de l'AO\nAO international : 45 jours",
"TUNISIE":"Décret MP n°2014-41 du 07/03/14 - Art. 53 :\n\"L'acheteur public doit déterminer le délai de mise en concurrence le plus approprié en tenant compte notamment de l'importance et de la complexité de la commande.\"",
"KOSOVO":"Article 45 - Special Rules for Setting a Time Limit for the Receipt of Tenders for a Public Contract \nCovered by an Indicative Notice :\n\n> in the case of open or restricted procdures for large value contracts, the contracting authority may set a tender submission deadline of at least 24 days from the contract notice publication (open procedures) or from the date invitations to tender are set (restricted procedures).",
}},
{n:"Nombre d'offres minimales",
c:{
"Comores":"Art 84\nEn cas de consultation PI ou AO restreinte, lorsqu'un minimum de 03 plis n'a pas été remis à la date/heure limites, un nouveau délai qui ne peut être inférieure à quinze (15) jours calendaires doit être ouvert.",
"Guinée":"CMP - Art. 74 du CMP :\nMinimum trois (3) plis ou minimum deux (2) offres ou propositions recevables",
}},
{n:"Validations / ANO",
d19:"Avant diffusion ou notification à des tiers, et sauf obligation légale pour le Bénéficiaire avant toute communication pour approbation par une entité nationale de régulation ou de contrôle des marchés publics, le Bénéficiaire est tenu de soumettre à l'AFD pour contrôle ex-ante (émission d'un Avis de Non-Objection) :\na) Le Plan de Passation des Marchés ;\nb) L'AMI\nc) L'avis de Pré-qualification et le dossier de Pré-qualification\nd) Le rapport d'évaluation des Candidatures (suite à Pré-qualification ou AMI) et la liste des Soumissionnaires ou Consultants proposés pour participer à l’appel d'offres ou à la Demande de Propositions ou de Cotations ;\ne) Le DAO, DP ou Demande de cotation\nf) Le rapport détaillé sur l'évaluation et la comparaison des Offres, Propositions ou Cotations reçues, incluant les recommandations concernant l'attribution du march\ng) La décision, le cas échéant, d'annuler l'appel d'offres ou de le déclarer infructueux ;\nh) Avant leur signature, le projet de contrat et les lettres de commande (comprenant la Déclaration d'Intégrité signée) ;\ni) Le cas échéant, les avenants ultérieurs auxdits marchés ; et\nj) Le cas échéant, toute modification ou avenant à l'un quelconque des documents cités aux points a) à i) ci-dessus.",
c:{
"Cote d'Ivoire":"Art 16 - DGMP\nla structure administrative chargée du contrôle des marchés publics émet, conformément aux dispositions du présent Code, un avis conforme ou une autorisation, notamment sur : \n- le plan prévisionnel de la passation des marchés publics, \n- le dossier d'appel d'offres; \n- la proposition d'attribution du marché; \n- le dossier d'approbation; \n- les avenants aux marchés ; \n- le recours aux procédures dérogatoires.",
"Comores":"Art 17 : DNCM - Direction Nationale de contrôle des marchés en charge de :  \n- Validation du PPM\n- ANO sur DAO + Publicité\n- Dérogation\n- Validation du rapport d'analyse comparative des propositions et du PV d'attribution provisoire élaborés par la Commission de passation des marchés\n- Examen juridique et technique du d'offres\n- ANO sur projets d'avenant",
"Guinée":"CMP - Art. 15 :\n\"La structure en charge du contôle placée sous l’autorité du Ministre en charge des Finances, est chargée du contrôle a priori et a posteriori des procédures de passation des marchés publics et des partenariats public-privé. \nA ce titre, la structure en charge du contrôle, à travers les attributions suivantes a pour mission :\n- la non-objection sur les plans annuels de passation des marchés et partenariats public-privé, préparés par les Autorités contractantes ;\n- la non-objection sur les requêtes en dérogation de procédures soumises par les autorités contractantes au Ministre en charge des Finances (appel d'offres en deux étapes, appel d'offres restreint, gré à gré, urgence simple, offre spontanée)\n- la non-objection sur les dossiers de préqualification ainsi que sur les rapports d'évaluation y afférant ;\n- la non-objection sur les dossiers d'appel d'offres, sur les termes de références et les demandes de propositions avec le lancement de l'appel à la concurrence pour vérifier leur conformité par rapport à la réglementation applicable ;\n- la non-objection sur les rapports d'évaluation des offres ou des propositions techniques et les recommandations d'attribution provisoire des marchés ou partenariats public-privé ;\n- la non-objection à la demande de l’autorité contractante sur l'annulation de la procédure d'appel d'offres ;\n[...]",
}},
{n:"Plan de passation des marchés",
c:{
"Cote d'Ivoire":"Art 20 - PPM\n20.1 : Toutes les personnes morales mentionnées à l'article 2 du présent Code sont tenues, dans un délai maximal de quinze jours à compter de la notification ou de l'approbation du budget, de préparer, avant la passation de tout nouveau marché, un plan prévisionnel et révisable de passation des marchés en conformité avec les crédits qui leur sont alloués et leur programme d'activités annuel.\n20.3 : Les marchés passés par les autorités contractantes doivent avoir été préalablement inscrits dans ces plans prévisionnels ou révisés, sous peine de nullité, sous réserve d'une décision motivée de la structure administrative chargée du contrôle des marchés publics.",
"Comores":"Art 23 : Pan prévisionnel annuel de passation des marchés publics à fournir en temps utiles pour être intégré dans le processus de préparation et d'adoptio du budget de l'Etat.\nIls sont révisables.\nA fournir à la DCMP.\nL'autorité contractante doit en assurer la publicité.\nLes marchés passés par les autorités contractantes doivent avoir été préalablement inscris dans ces plans prévisionnels ou révisés, sous peine de nullité.",
"Guinée":"CMP - Art. 19 :\n\"[...] Le plan de Passation des Marchés et ses mises à jour comprennent notamment les éléments suivants : (i) une description succincte des activités, (ii) les méthodes de sélection à appliquer, (iii) la dotation, (iv) les calendriers et toute autre information pertinente en rapport avec la passation des marchés. \nCe plan est publié, dès l'avis de non-objection de la structure en charge du contrôle puis lors de chaque révision dans le Journal des Marchés Publics de la République de Guinée ainsi que sur le site internet de l'autorité de régulation.\"",
}},
{n:"COJO",
c:{
"Cote d'Ivoire":"14.1.1 : Si le marché est passé par une administration centrale de l'Etat, un service à compétence nationale de l'Etat, un Etablissement public national ou un Projet, la commission est composée comme suit: \n- le responsable de la cellule de passation des marchés ou son représentant, président ; \n- un représentant de l'unité de gestion administrative, du maître d'ouvrage, ou du maître d'ouvrage délégué s'il existe; \n- le spécialiste en passation des marchés ou son représentant, pour les Projets ; \n- un représentant du maître d'œuvre, s'il existe; \n- un représentant de chacun des services utilisateurs, le cas échéant; \n- un représentant du ministère exerçant la tutelle sur l'objet de la dépense, le cas échéant ; \n- le contrôleur financier ou le contrôleur budgétaire placé auprès de l'autorité contractante, ou son représentant. \n\n14.2.3 : Le représentant du maître d'œuvre s'il existe, participe aux travaux de la commission avec voix consultative.\n\n14.2.4 : A la demande des membres de la commission, toute personne, désignée par le président en raison de ses compétences technique, juridique ou financière, peut participer aux travaux de la commission, avec voix consultative.",
"Comores":"Art 15 : Cellule de gestion des marchés \nAu sein de la Cellule, mise en place d'une COEO : Commission d'ouverture et d'évaluation des offres.\nComposition des COEO déterminée par décret.\nLa personne responsable du marché (Le Ministre) désigne les membres de la commission et son président.\nLes membres de la commission ne peuvent avoir participé en tant que membres de la Cellule de gestion des marchés aux opérations préalables au lancement de la procédure, à l'exception des opérations relatives à leur plannification.\nL'ARMP peut désigner des personnes qualifiées en qualité d'observateurs indépendants, sans voix délibérative ni consultative.\nEn cas de besoin, la personne responsable du marché peut ajdoindre à la COEO la compétence de personnes spécialisées au niveau de la sous-commission. Ces spécialistes n'ont qu'une voix consultative.\nNB : La personne responsable du marché est tenue d'établir un rapport relatif à la passation de chaque marché relevant de sa compétence et d'en fournir une copie à la DCMP et l'ARMP\n\nArt 86 : Mission de la sous-commission d'analyse\nDésignée par le Président de la commission.\nEtablit un rapport d'analyse dans un délai fixé lors de la séance d'ouverture des plis par la Comission.\nLe délais ne peut pas exéder quinze (15) jours.\nRapport établit de manière confidentielle, document unique paraphé et signé de tous les membres de la sous-commission qui peuvent y mentionner leurs réserves.",
"Guinée":"CMP - Art. 12 : Missions de la Commission de passation des marchés\n\"Au sein de chaque autorité contractante, il est créé sous l'autorité de la PRMP, une Commission de passation des marchés. \nLa Commission de passation des marchés est chargée de l'ouverture des plis, d'effectuer l'examen des candidatures, d'évaluer les offres ou propositions des candidats ou soumissionnaires, y compris en matière de demande de cotations et de proposer l'attributaire provisoire du marché.\nEn cas de complexité particulière dans l'évaluation des offres, le Président de la Commission peut recourir à la constitution d'une sous-commission d'analyse.\"\nArt. 13 : Mission des Commissions de réception",
}},
{n:"Prestations intellectuelles",
d19:"AMI obligatoire pour marchés de PI >200.000€ \nEn dessous de ce montant, le Bénéficiaire pourra recourir à une Demande de Cotations, si sa réglementation l'y autorise \nL'AFD ne recommande pas de notation des candidatures / Modèle ne le prévoit pas\nListe restreinte entre 4 et 6 candidats\n\nNégociation possible mais pas sur le prix\n\nRecours à des experts individuels si montant < 50.000€\nMinimum 3 experts individuels qualifiés",
c:{
"Cote d'Ivoire":"Art 62 - Marchés de Prestations Intellectuelles\nIl est attribué après mise en concurrence, sur la base d'une liste restreinte des candidats pré-qualifiés à la suite d'un avis à manifestation d'intérêt ou, le cas échéant, contactés directement par l'autorité contractante en fonction de leur aptitude à exécuter les prestations.\n\"L'avis à manifestation d'intérêt aboutit à l'établissement d'une liste restreinte de 5 à 8 candidats présélectionnés, en raison de leur aptitude à exécuter les prestations.\nSi moins de cinq candidats sont présélectionnés, l'autorité contractante peut, soit contacter directement d'autres cabinets ou consultants individuels en fonction de leurs aptitudes à exécuter les prestations, soit relancer la procédure en vue de compléter la liste restreinte.\"\nLa Commission d'ouverture des plis et d'évaluation des offres doit intégrer dans la liste restreinte au moins deux consultants nationaux, dès lors qu'ils répondent aux critères de sélection requis.",
"Comores":"Art 49 : AMI obligatoire",
"Guinée":"CMP - Art. 24 : Appel d'offres précédé d'une préqualification\n\"L'appel d'offres peut être précédé d'une préqualification dans le cas des travaux ou d'équipements importants ou complexes ou d'une technicité particulière ou de serivice spécialisés. [...]\"",
}},
{n:"Concours",
c:{
"Cote d'Ivoire":"Art. 59. - Appel d'offres avec concours\n59.1 : Il peut être fait un appel d'offres avec concours lorsque des motifs d'ordre technique, esthétique ou financier justifient des études ou des recherches particulières. Le recours à cette procédure est soumis à l'avis conforme de la structure administrative chargée du contrôle des marchés publics.\nLe concours a lieu sur la base d'un programme établi par l'autorité contractante qui indique les besoins [...] et fixe le maximum de la dépense prévue.\n59.2 : [...] Le concours peut être ouvert ou restreint. Le réglement du concours peut prévoir que les ocnourrents bénéficient du versement de primes. [...]\n59.3 : Le jury est désigné par l'autorité contractante dont le représentant est le président. [...] Le jury doit comporter au minimum trois membres en plus du président et du maître d'ouvrage délégué, s'il existe. [...]\n59.4 : Lors de la phase d'analyse des offres, le jury examine les plans et projets présentés par les participants au concours de manière anonyme et en se fondant exclusivement sur les critères d'évaluation des projets définis dans l'avis du concours. [...]\n59.5 : Le règlement du concours fixe, le cas échéant, les primes, récompenses ou avantages alloués aux auteurs des projets les mieux classés. [...]",
"Comores":"Art.44 : Définition de l'Appel d'offre avec Concours lorsque des motifs d'ordre technique, esthétique, ou financier justifient des recherches particulières. Le concours prote sur la conception d'une oeuvre ou d'un projet en matière architecturale. Ce mode d'appel d'offres est recommandé 1) lorsque l'admnistration n'est pas en mesure de définir les grandes lignes de la conception de l'ouvrage ; 2) lorsque les ouvrages comportent des dispositions qui sotn focntion de procédés techniques sépciaux.\nArt. 45 : Modalités de la procédure d'appel d'offres avec concours. Le concours a lieu sur la base d'un programme établi par l'autorité contractante qui fournit les données nécessaires notamment les besoins à satisfaire les contraintes fonctionnelles et techniques ainsi que les exigences à respecter et fixe le cas échéant le maximum de la dépense prévue pour l'éxécution du budget.\nL'appel d'offres avec concours s'effectue selon la procédure d'appel d'offres ouvert ou restreint.\nArt. 46 : Règlement de la procédure d'appel d'offres avec concours. Le règlement particulier de l'appel d'offres avec concours doit prévoir : 1) des primes, récompenses ou avnatages à allouer aux soumissionnaires les mieux classés et 2) si les projets sont primés deviennent en tout ou partie propriété de l'autorité contractante. \nLe règlement particulier de l'appel d'offres avec concours doit, en outre, indiquer si et dans quelles conditions, les hommes de l'art, auteurs des projets, sont appelés à coopérer à l'exécution de leur projet primé.\nLes primes, récompenses ou avantages prévus au 1) du présent article peuvent ne pas être accordés en tout ou en partie si les projets reçus ne sont pas jugés satisfaisants.\nLes prestations sont examinées par un jury dont les membres sont désignés par l'autorité qui lance le concours et qui doivent être indépendants des participants au concours. Au moins, la moitié des membres du jury est composé de personnalités ayant des compétences dans la matière qui fait l'objet du concours.\n[...]",
"Rwanda":"Pas de mention de concours dans le code des marchés publics",
"Guinée":"CMP - Art. 30 : Modalités de la procédure d'appel d'offres avec concours \nLe concours a lieu sur la base d’un programme établi par l'autorité contractante qui fournit les données nécessaires notamment les besoins à satisfaire, les contraintes fonctionnelles et techniques ainsi que les exigences à respecter et fixe le cas échéant le maximum de la dépense prévue pour l'exécution du budget. \nL'appel d'offres avec concours s'effectue selon la procédure d'appel d'offres ouvert ou restreint.  \nCMP - Art. 31 : Réglement de la procédure d'appel d'offres avec concours \n\"Le règlement particulier de l'appel d'offres avec concours doit prévoir des primes, récompenses ou avantages à allouer aux soumissionnaires les mieux classés lorsque :\na) les projets primés deviennent en tout ou en partie propriété de l'autorité contractante ;\nb) l'autorité contractante se réserve le droit de faire réaliser par l'entrepreneur, le fournisseur ou le prestataire de services choisi conformément au règlement du concours, tout ou partie des projets primés, moyennant le versement à l'auteur ou aux auteurs du ou des projets d'une redevance fixée par le programme lui-même. \n[...]\nLa Commission de passation des marchés est chargée de la préselection, de l'ouverture des plis et de la sélection du ou des lauréats pour la suite des opérations. Elle est assistée dans toutes ces opérations par un jury. \n[...]\nLe jury doit comporter au minimum, trois membres en plus du président et du maître d'ouvrage délégué s'il existe. Le jury peut comporter en outre, des représentants des administrations et organismes concernés par le projet et peut consulter tout expert. \n[...]",
"Palestine":"Pas de mention des concours dans le code des marchés publics",
}},
{n:"Travaux",
d19:"Appels d'Offres infructueux \nPossibilité de négocier avec le moint-disant conforme pour l'essentiel si offre trop élevée et si la négociation ne remet pas en cause le classement initial des offres",
c:{
"Cote d'Ivoire":"Art 40 - Justification des capacités requises\nToutefois, le chiffre d'affaires annuel minimal que les opérateurs économiques sont tenus de réaliser ne doit pas dépasser le double de la valeur estimée du marché,",
"Comores":"Art 39 : Examen de qualification des candidats en fonction des critères suivants :\n- Ref de marchés analogues\n- Effectifs techniques\n- Installation et matériels dont dispose le candidat pour exécuter le marché\n- Situation financière",
"Guinée":"CMP \nArt. 32 : Allotissement\nArt. 25 : Contenu et évaluation du dossier de préqualification",
}},
{n:"Gré à gré",
d24:"(i) le recours au Gré à Gré est autorisé et conforme aux Lois et Réglementations ;\n(ii) l'absence de mise en concurrence est solidement justifiée par l'une des raisons suivantes :\na) une situation d'urgence impérieuse, résultant d'événements imprévisibles, irrésistibles, et totalement externes au Maître d’Ouvrage, impose la mise en œuvre du Marché dans des délais qui ne sont pas compatibles avec les délais requis par les processus de passation de Marchés prévus dans les présentes Directives ; ou\nb) l'exécution des travaux, équipements, fournitures, prestations intellectuelles et autres prestations de services ne peut être confiée qu'à un Prestataire unique pour des raisons techniques, d'unicité avérée de l'expertise ou tenant à la protection de droits d'exclusivité ;\n(iii) l'attributaire pressenti est qualifié et expérimenté pour réaliser les prestations ;\n(iv) le montant du Marché est conforme aux estimations initiales et aux prix communément pratiqués,\net ses conditions contractuelles sont équitables et raisonnables.\nPour les Marchés d’un montant unitaire hors taxe inférieur à 40 000€, le Maitre d’Ouvrage peut également recourir au Gré à Gré sous réserve de remplir les conditions (i), (iii) et (iv) ci-dessus. Il est cependant toujours préférable de procéder à une mise en concurrence lorsque c’est possible.",
d19:"(i) le recours au Gré à Gré est conforme aux lois et règlements applicables au Bénéficiaire\n(ii) l’absence de mise en concurrence est solidement justifiée dans le cadre de l’une des raisons a), b) et c) décrites ci-après\n(iii) l’attributaire pressenti est qualifié et expérimenté pour réaliser les prestations\n(iv) le montant du marché est conforme aux estimations initiales et aux prix communément pratiqués, et ses conditions contractuelles sont équitables et raisonnables.\n          a) une situation d'urgence impérieuse, résultant d'évènements imprévisibles, irrésistibles, et totalement externes au Bénéficiaire, impose la mise en œuvre du marché dans des délais qui ne sont pas compatibles avec les délais requis par les processus de passation de marchés décrits ci-après ; ou \n          b)  l'exécution des travaux, équipements, fournitures, prestations intellectuelles et autres prestations de services, qui, pour des raisons techniques, d'unicité avérée de l'expertise ou tenant à la protection de droits d'exclusivité, ne peut être confiée qu'à un fournisseur ou prestataire unique ; ou \n          c) le montant du marché n'excède pas 15 000€",
c:{
"Cote d'Ivoire":"Art 61 - Gré à gré ou entente directe\n\"Il est recouru à la procédure de gré à gré ou d'entente directe, lorsque l'unité de gestion administrative, le maître d'ouvrage délégué ou le maître d'œuvre s'il existe, dans l'un des cas prévus au présent article, engage les négociations ou consultations appropriées, et attribue ensuite le marché au candidat qu'il a retenu. Il ne peut être passé de marché de gré à gré ou d'entente directe que dans les cas suivants : \n- lorsque les besoins ne peuvent être satisfaits que par une prestation nécessitant l'emploi d'un brevet d'invention, d'une licence ou de droits exclusifs détenus par un seul entrepreneur, un seul fournisseur ou un seul prestataire de services; \n- lorsque les marchés ne peuvent être confiés qu'à un prestatairedéterminé pour des raisons artistiques ou techniques ;\n- dans le cas d'urgence impérieuse motivée par des circons-tances imprévisibles ou de force majeure ne permettant pas derespecter les délais prévus dans les procédures d'appel d'offres,nécessitant une intervention immédiate, et lorsque l'autoritécontractante n'a pas pu prévoir les circonstances qui sont àl'origine de l'urgence.\"\n\" Le recours à la procédure de gré à gré ou d'entente directe doit être motivé et soumis à l'autorisation préalable du ministre chargé des Marchés publics, après avis de la structureadministrative chargée du contrôle des marchés publics.\nLe ministre chargé des Marchés publics peut déléguer sa compétence d'autorisation par arrêté.\"",
"Comores":"Art 55 : \nIl ne peut être passé de marché en gré à gré ou par entente directe que \n1) lorsque les besoins n'e peuvent être satisfaits que par une prestation nécessitant l'emploi d'un brevet d'invention, d'une licence ou de droits exclusifs détenus par un seul entrepreneur, un seul fournisseur ou un seulprestataire.\n2) lorsque les marchés , ne peuvent être confïés qu'un prestataire déterminé pour des raisons techniques et artistiques.\nPour les 5 autres raisons ci-dessous, il est demandé de procéder tout de même à une mise e concurence de 3 candidats :\n3) Recherche/Essais/Perfectionnement\n4) Prestations complémentaires à un marché déjà exécuté\n5)Urgence suite à prestataire initiale défaillant.\n6) Urgence impérieuse\n7) Caractère secret",
"Guinée":"CMP\nChapitre 5 : Marchés par entente directe ou marché de gré à gré\nArticle 39 : \"A l'exception des marchés visés à l'article 40 ci-dessous, les marchés par entente directe doivent être préalablement autorisés par le Ministre en charge des Finances, après justification par l'autorité contractante et avis motivé de la structure en charge du contrôle.  \n[...]\nLa procédure de gré à gré ne saurait cependant avoir pour effet de faire échapper l'autorité contractante à une obligation de mise en concurrence d'au moins trois candidats susceptibles d'exécuter le marché, à l'exclusion de l'hypothèse visée au premier paragraphe de l'article 11, alinéa 4 de la loi L/2012/N°020/CNT du 11 octobre 2012 fixant les règles régissant la passation, le contrôle et la régulation des marchés publics.\nLa structure en charge du contrôle veille à ce que, sur chaque année budgétaire, le montant additionné des marchés de gré à gré passés par chaque autorité contractante ne dépasse pas dix (10) pour cent du montant total des marchés publics passés par ladite autorité. \nDans l’hypothése où one autorité contractantce solliciterait auprés du Ministre en charge des Finances une autorisation de passer un marché de gré à gré, alors que le seuil des dix (10) pour cent ci-dessus\nvisé serait ﬁanchi, la PRMP, sauf dans l'hypothése où l'autorisation est refusée, à l'obligation de saisir l’autorité de regulation qui doit se prononcer sur les éléments justiﬁants la poursuite de la\nprocédure.\"",
"TUNISIE":"Décret MP n°2014-41 du 07/03/14 - Art. 49",
}},
{n:"Autres procédures dérogatoires",
c:{
"Cote d'Ivoire":"Art 60 - AO restreint\n\"60.l : Il ne peut être recouru à la procédure de l'appel d'offres restreint que lorsque les fournitures, travaux ou services, de par leur nature spécialisée, ne sont disponibles qu'auprès d'un nombre limité de fournisseurs, d'entrepreneurs ou de prestataires de services. \nL'appel d'offres est dès lors restreint aux seuls candidats que l'autorité contractante a décidé de consulter. Le nombre de candidats admis à soumissionner doit assurer une concurrence réelle. \nToutefois, rien n'interdit à un candidat, sur la base des informations recueillies dans!' avis publié en début d'année, relatives au lancement de procédures d'appels d'offres restreints pour des  marchés déterminés, de manifester son intérêt à participer auprès  de l'autorité contractante. \"\n\"60.2 : Le recours à la procédure d'appel d'offres restreint doit être motivé et subordonné à l'autorisation du ministre chargé des Marchés publics, après avis de la structure administrative chargée du contrôle des marchés publics. Celle-ci doit, outre le bien-fondé du recours à l'appel d'offres restreint, s'assurer que la liste des candidats pressentis comprend au moins cinq candidats ayant donné leur accord pour présenter une offre et dont les qualifications et capacités techniques et financières, sont précisées dans la demande adressée à la structure administrative chargée du contrôle des marchés publics. \nToutefois, en fonction des circonstances, le ministre chargé des Marchés publics peut autoriser un nombre de candidats qui peut être inférieur à cinq sans être en deçà de trois. \nLe ministre chargé des Marchés publics peut déléguer sa compétence d'autorisation par arrêté. \"",
"Comores":"Art 41 : AO en 2 étapes pour les marché d'une grande complexité\nArt 43 : AO restreint",
}},
{n:"Préférence Nationale",
d19:"depuis le 1er janvier 2002. L'AFD finance tous marchés de travaux, équipements, fournitures, prestations intellectuelles et autres prestations de services, sans considération de la nationalité de l’attributaire",
c:{
"Comores":"Article 90 : Un arrêté du Ministre chargé des finances et du budget détermine les conditions d'application de la préférence communautaire.\nArticle 91 : Il sera accordé une préférence à l'offre conforme au dossier d'appel d'offres présentée par un soumissionnaire national (domicilié aux Comores) en considérant un % du montant de l'offre de max 20%",
"Guinée":"CMP - Art. 18 : Détermination des besoins à satisfaire\n\"[...] Chaque autorité contractante réserve annuellement aux petites et moyennes entreprises nationales une part dans la limite de vingt pour cent (20%) de la valeur prévisionnelle des marchés de travaux, de fourniture de biens ou de services, sous réserve de l'existence sur le marché national des compétences, qualifications et moyens techniques, humains et financiers nécessaires à l'exécution des prestations requises.\"",
"TUNISIE":"Décret MP n°2014-41 du 07/03/14 - Art. 23 :\n\"Les cahiers des charges incitent les bureaux d'études étrangers à associer un ou plusieurs bureaux d'études ou des experts tunisiens. \nLe contrat de marché doit faire apparaitre clairement les missions confiées au bureau d'études tunisien experts ou associé et les montants y afférents.\"\nDécret MP n°2014-41 du 07/03/14 - Art. 26 :\n\"Les offres des entreprises tunisiennes dans les marchés de travauxx ainsi que les produits d'origine tunisienne dans tous les marchés de fourniture de biens sont, à qualité égale, préférés aux offres financières des entreprises tunisiennes et le prix des produits tunisiens ne dépassent pas de plus de dix pour cent (10%) les montants des offres des entreprises étrangères et les prix des produits étrangers.\"",
"KOSOVO":"LAW NO. 04/L-237 ON AMENDING AND SUPPLEMENTING THE LAW No. 04/L-042 ON PUBLIC PROCUREMENT IN\nTHE REPUBLIC OF KOSOVO :\n\nArticle 60.A : Priority for Domestic Bidders",
}},
{n:"Infructuosité",
c:{
"Cote d'Ivoire":"Si, dans le cadre d'un appel d'offres, un ou plusieurs lots ne sont pas attribués, l'autorité contractante a la faculté d'entamer de nouvelles procédures d'appel à la concurrence pour les lots non attribués en modifiant, s'il y a lieu, la consistance de ces lot\n\nArt 77 - AO Infructueux\n77.3 : Si l'attribution du marché est impossible par le seul fait que l'enveloppe financière prévue pour la dépense est insuffisante, la commission d'ouverture des plis et de jugement des offres doit, avant d'envisager de déclarer l'appel d'offres infructueux, analyser les possibilités d'une réduction de la masse des travaux, fournitures ou services telle que prévue dans les données particulières de l'appel à la concurrence et dans les cahiers des charges, notamment si le futur marché doit être réglé par des prix unitaires ou en rémunération de dépenses contrôlées, conformément aux articles 30 à 33 et 48 du présent Code. Cette réduction ne peut en aucun cas concerner les marchés à prix global et forfaitaire.",
"Comores":"Art 85 : Appel d'offres infructueux\nAprès avis de la commission en l'absence d'offre ou si pas d'offres conformes aux DAO.\nDans ce cas, il est alors procédé, soit par nouvel appel d'offres, soit par consultation d'au moins trois (03) entrepreneurs, fournisseurs ou prestataires, et dans ce dernier cas, après autorisation de la DNCM\nLe lancement d'un nouvel AO doit être précédée d'une évaluation du DAOou des TDR pour s'assurer qu'il n'y a pas de modifications ou clarifications à apporter, ou dans le but de redéfinir les besoins de l'autorité contractante.",
"Guinée":"Art. 74 du CMP :\n\"Un appel d'offres est déclaré infructueux par l'autorité contractante après avis de la structure en charge du contrôle en l'absence d'un minimum de trois (3) plis ou lorsqu'il n'a pas été obtenu au minimum deux (2) offres ou propositions recevables :\nDans ce cas l'autorité contractante peut procéder : \n- Soit à l'ouverture d'un nouveau délai qui ne peut être inférieur à quince (15) jours calendaires et qu'elle porte à la connaissance du public. A l'issue de ce nouveau délai, elle peut procéder aux opérations d'ouverture, quel que soit le nombre d'offres reçues. \n- Soit, par consultation d'au moins trois entrepreneurs, fournisseurs ou prestataires et dans ce dernier cas l'autorisation du Ministre des Finances est requise après avis motivé de la structure en charge du contrôle. \n- Soit par un nouvel appel d'offres. \nLa décision déclarant l'appel d'offres infructueux est publiée par l'autorité contractante par insertion dans le Journal des Marchés Publics ou dans toute autre publication habilitée et notifiée aux soumissionnaires identifiés dont les garanties de soumission sont libérées. \n[...]\"\"\"",
}},
{n:"Révision ou actualisation des prix",
d24:"L'inclusion d'une clause de révision des prix n'est pas requise dans le cadre de Marchés simples prévoyant la livraison des fournitures, équipements, ou l'exécution de travaux dans un délai inférieur à 12 mois. En revanche, elle devra être prévue dans le cadre de Marchés de tous types d'une durée supérieure à 12 mois, ainsi que de Marchés comportant une part substantielle d'intrants (matériaux, combustibles, main-d'œuvre, etc.) caractérisés par une forte volatilité des prix.",
d19:"L'inclusion d'une clause de révision des prix n'est pas requise dans le cadre de marchés simples prévoyant la livraison des fournitures, équipements, ou l'exécution de travaux dans un délai inférieur à 18 mois. Elle devra être prévue dans le cadre de marchés d'une durée supérieure à 18 mois et si le marché comporte une part substantielle d'intrants (matériaux, combustibles, main-d'œuvre, etc.) caractérisés par une forte volatilité des prix.",
c:{
"Cote d'Ivoire":"TITRE IV - CANDIDATS, SOUMISSIONNAIRES ET TITULAIRES\nArt 33 - Prix fermes et prix révisables\n33.2 - Dans tous les cas, les marchés publics sont à prix fermes pendant la première année de leur exécution.\nToutefois, lorsque l'application de la formule de révision des prix conduit à une variation supérieure à 20 % du montant initial du marché ou du montant de la partie du marché restant à exécuter, l'autorité contractante ou le titulaire peut demander la résiliation du marché.",
"Comores":"Article 138 : Que le prix soit forfaitaire ou unitaire, ou sur dépenses contrôlées, les marchés sont conclus à prix ferme ou à prix révisable.\nLes prix des marchés sont réputés fermes sauf si le cahier des c/auses administratives particulières prévoit qu'ils sont révisables.\nLe prix ferme est actualisable entre la date d'expiration du délai de validité des offres et la date de notification du marché.\nLes formules de révision doivent comporter obligatoirement une partie fixe au moins égale à 0.15% du marché, et la révision ne peut excéder 10% du montant du marché.\nTout marché dont la durée d'exécution n'excède pas 12 mois ne peut faire l'objet de révision de prix, sous réserve d'une situation exeptionnelle.",
"Guinée":"Art. 84 : Négociations :\n\"Sauf dans le cadre des procédures par entente directe, et en matière de marchés de prestations intellectuelles, aucune négociation n'a lieu entre l'autorité contractante et le soumissionnaire ou l'attributaire sur l'offre soumise. L'autorité contractante peut cependant vérifier que l'attributaire provisoire détient toujours les qualifications requises.\"\nCMP - Art. 35 : Négociation des marchés de prestations intellectuelles\n\"[...] Ces négociations, qui ne doivent pas porter sur les prix unitaires lorsque le prix a été un critère de sélection, sont sanctionnées par un procés-verbal signé par les deux parties.\"",
}},
{n:"Avenants",
d19:"Le montant total cumulé des avenants à un marché, sauf accord exprès de l'AFD, n'excèdera pas la plus contraignante des limites suivantes : le montant maximum des avenants tel que spécifié dans la règlementation applicable, s'il en existe un, ou 20% du montant initial du marché.",
c:{
"Cote d'Ivoire":"Art - 92 - Avenants\nUn avenant ou le cumul de plusieurs avenants ne peut peut modifier l'objet du marché ni entrainer une variation cumulée de plus de 30% du montant du marché\nTout avenant impliquant une variation du montant du marché doit faire l'objet d'une autorisation préalable du ministre chargé des Marchés publics après avis de la structure administrative chargée du contrôle des marchés publics nous peine de nullité.",
"Comores":"Art 145 : Avenant max 20%\nSi augmentation du montant du marché <10% alors possible de passer par OS puis régularisation avenant\nSi > 10%, obligation de passation d'un avenant avec exécution.",
"Guinée":"CMP - Art. 112 : Changement dans le volume ou le coût des prestations\n\"Les stipulations relatives au montant d'un marché que public ne peuvent être modifiées que par voie d'avenant et dans la limite de vingt (20) pour cent de la valeur totale du marché de base, augmenté des montants issus de l'application éventuelle des clauses d'actualisation ou de révision du marché. \nLe jeu normal de l'actualisation et des révisions des prix, en application des clauses contractuelles, ne donne pas lieu à la passation d'avenant. L'actualisation et la révision des prix sont cependant soumises au contrôle de la structure en charge du contrôle.\n[...]\"",
}},
{n:"Pénalités",
c:{
"Cote d'Ivoire":"Art 91 - Pénalités de retard\nSi montant des pénalités atteint 10% de la valeur du marché, l'autorité contractante peut en demander la résiliation.",
"Comores":"Art 146 : Pénalités pour retard.\nMontant maximale doit être précisé dans le CCAP.\nLorsque le montant visé à l'article précédent est dépassé, la personne responsable du marché public peut le résilier.",
"Guinée":"CMP - Art. 143 : Pénalités particulières\n\"Indépendamment des pénalités pour dépassement du délai contractuel, le marché peut prévoir des pénalités particulières pour inobservation des dispositions techniques.\nEn tout état de cause, le montant cumulé des pénalités de retard et des pénalités particulières ne saurait excéder dix (10) pour cent du montant TTC du marché de base avec ses avenants, sous peine de résilation.\"",
}},
{n:"Réception",
c:{
"Cote d'Ivoire":"Art 94 - Réception des prestations\n\"L'autorité contractante peut utiliser des parties d'ouvrages ou fournitures faisant partie du marché au fur et à mesure de leur achèvement ou de leur livraison. Toute prise de possession de parties d'ouvrages ou fournitures par l'unité de gestion administrative, le maître d'ouvrage délégué ou le maître d'œuvre s'il existe, doit être précédée d'une réception provisoire partielle. \nToutefois, s'il y a urgence, la prise de possession peut intervenir antérieurement à la réception, sous réserve de l'établissement par l'unité de gestion administrative, le maître d'ouvrage délégué ou le maître d'œuvre s'il existe, d'un inventaire des travaux ou fournitures en suspens, préalablement approuvé par les parties au contrat. \"",
"Comores":"Art 15 : Au sein de la COEO, une Commission de reception est chargée de procéder à la reception des travaux, fournitures et prestations de services.\nLa composiation, les attributions et les modalités de fonctionnement de la commission sont determinés par décret.",
"Guinée":"Art 13\nIl y a une Commission chargée de la réception des travaux",
}},
{n:"Mise en régie",
c:{
"Comores":"Art 139 : Les prestations peuvent être exécutées en régie en cas de défaillance du titulaire, et après avis favorable de la DNCM. Elle est nécessairement précédée d'une mise en demeure dont le délai ne peux être <10 jours.\nLe montant des travaux en régie ne peut être supérieur à 20% du montant TTC du marché.",
"Guinée":"CMP - Art. 130 : Mise en régie \n\"[...] En cas de mise en régie, le titulaire est dessaisi de ses prérogatives de chef d'entreprise. La direction des travaux appartient à l'autorité contractante qui dispose du matériel et des approvisionnements de ce dernier. \n[...]\nLa mise en régie ne met pas fin au marché. L'entreprise demeure titulaire du marché et elle est autorisée à en suivre l'exécution sans pouvoir entraver les ordres du maître d'oeuvre ou de ses représentants.\n[...]\"",
}},
{n:"Mise en Demeure",
c:{
"Cote d'Ivoire":"Art 117 - Mise en Demeure\nLorsque le titulaire ne se conforme pas aux stipulations du marché ou aux ordres de service, l'autorité contractante, le maître d'ouvrage délégué, le maître d'œuvre s'il existe, le met en demeure, par notification écrite revêtant la forme d'un ordre de service, d'y satisfaire dans un délai de quinze jours à compter de la notification de la mise en demeure. L'application des dispositions de l'alinéa précédent ne fait pas obstacle à l'application de pénalités de retard. \nArt 117 - Mise en Demeure Infructueuse\n\"Si le titulaire n'obtempère pas à la mise en demeure, l'autorité contractante, le maître d'ouvrage délégué ou le maître d'œuvre \ns'il existe, peut demander soit : \n1. l'établissement d'une régie totale ou partielle aux frais et risques du titulaire, selon les dispositions prévues au marché à cet effet; \n2. la résiliation du marché, aux torts, frais et risques du titulaire, selon les dispositions prévues au marché à cet effet ou conformément aux règles du présent Code. \"",
}},
{n:"Résiliation",
c:{
"Cote d'Ivoire":"Art 122 - Pouvoir de résiliation\n\"122.1 : Tout marché dont le montant est supérieur au seuil de contrôle défini à l'article 75.3 du présent Code peut faire l'objet d'une résiliation par le ministre chargé des Marchés publics ou son délégué, après avis de la structure administrative chargée du contrôle des marchés publics. Le ministre chargé des Marchés publics peut déléguer son pouvoir de résiliation dans des conditions qu'il fixe par arrêté. \n122.2 : Tout marché dont le montant est inférieur au seuil de dépenses défini à l'article 75.3 du présent Code peut faire l'objet d'une résiliation par le ministre de tutelle technique ou son délégué après avis de la structure administrative chargée du contrôle des marchés publics. \"\nArt 123 - Procédure de résiliation\nLa saisine de la structure administrative chargée du contrôle des marchés publics incombe à la partie qui prend l'initiative de la résiliation, concomitamment avec l'information de l'autre partie. La partie la plus diligente saisit la structure administrative chargée du contrôle des marchés publics par demande écrite, accompagnée des pièces justificatives. En tout état de cause, la structure administrative chargée du contrôle des marchés publics peut s'autosaisir, en cas d'inaction des parties au contrat, en vue de protéger les intérêts de l'État. La structure administrative chargée du contrôle des marchés publics instruit le dossier, puis transmet son avis à l'autorité compétente pour décision. \n\nArt 124 - Résiliation à l'initiative de l'autorité contractante\nLa résiliation à l'initiative de l'autorité contractante peut être prononcée par l'un des organes mentionnés à l'article 122 du présent Code soit en l'absence d'une faute du titulaire, soit en cas d'une faute ou d'un manquement du titulaire, ou en application de l'article 91.l du présent Code si le montant cumulé des pénalités de retard atteint 10 % de la valeur initiale du marché et de ses avenants éventuels. Dans le cas d'une faute ou d'un manquement de l'entreprise, le marché ne peut être résilié que si le titulaire a préalablement fait l'objet d'une mise en demeure restée infructueuse.",
"Comores":"Art 151 : Résiliation du marché\nAprès avis favorable de la DNCM :\n- en raison d'une faute du titulaire, d'un retard entrainant des pénalités au delà du seuil, du décès de la personne physique ou liquidation de la sté\n- à l'initiative du titulaire, pour défaut de paiement à la suite d'une mise en demeure restée sans effet pdt 3 mois (ou par suite journement)\n- suite à accord entre les 2 parties.\nOu si cas de force majeur qui rend impossible l'exécution du marché.",
"Guinée":"CMP - Art. 131 : Résiliation",
}},
];
// ════════ RETOURS D'EXPÉRIENCE (Phase 7) ════════
const RETEX_THEMES=["Controle technique","Modes opératoires","Rédaction de DAO","Rédaction de DP","Rédaction de DP, Rédaction de TdR","Rédaction de DP, Rédaction de TdR, Rédaction de Programme","Rédaction de Programme","Rédaction de TdR","Rédaction de TdR, Rédaction de DP","Rédaction de TdR, Rédaction de DP, Rédaction d'AMI"];
const RETEX_KW=["Critères","E&S","Facturation","GFA","Gestion","Gestion infra","Livrables","Multisite","Notation","Passation de marchés","Personnels clés","Phases","Projet anglophone","Préqualification","Rendus MOE","Répartition des points","STD","Urbanisme","Validations"];
const RETEX_DATA=[
{th:"Rédaction de DP, Rédaction de TdR",kw:"Projet anglophone / GFA",pj:"225_22_PALESTINE_ISC",ed:"Maël",cm:"Se renseigner sur tous les couts à prendre en charge par la MOE. Enregistrement du projet auprès de différentes autorités. Dans certains cas c'est à prendre en charge par la MOE et le cout dépend de la Gross Area finale",},
{th:"Rédaction de Programme",kw:"Projet anglophone / GFA",pj:"225_22_PALESTINE_ISC",ed:"Maël",cm:"Attention sur les projets anglophones à l'importance de la Gross Floor Area. CPO met systématiquement la Surface de Plancher qui a une définition légérement différente mais qui n'est pas parlante pour les MOE non françaises.",},
{th:"Rédaction de TdR, Rédaction de DP",kw:"Rendus MOE",pj:"225_12_RCI_LSY",ed:"Maël",cm:"Bien cadrer, surtout sur les gros projets, certains rendus attendus. Par exemple, imposer le sommaire et le contenu (avec des commentaires indicatifs) de la notice architecturale.\nPeut être même donner le tableau de surfaces vide à remplir au format qu'on veut.   \nEgalement un tableau récapitulatif du type d'intervention de réhabilitation par lot technique par bâtiment/salle",},
{th:"Rédaction de TdR, Rédaction de DP",kw:"Phases",pj:"225_12_RCI_LSY",ed:"Maël",cm:"Si c'est nécessaire à cause de la complexité du projet, insister pour faire 3 phase de conception APS APD PRO au lieu  de juste deux meme si c'est la norme localement.",},
{th:"Rédaction de DP, Rédaction de TdR",kw:"STD",pj:"225_12_RCI_LSY",ed:"Maël",cm:"STD: bien cadrer ce qui est demandé pour la STD, surtout dans les pays ou ce n'est pas courant. Eventuellement ne rien demander en APS.",},
{th:"Rédaction de DP, Rédaction de TdR, Rédaction de Programme",kw:"Validations",pj:"225_18_RCI_UFHB, 225_22_PALESTINE_ISC",ed:"Maël",cm:"Obtenir  une validation formelle du préprogramme avant de continuer.\nLes scénarios d'implantation sur le site, et d'accès, doivent être validés par les décideurs, pour ne pas qu'ils contestent en APD quand ils décrouvent le projet.",},
{th:"Rédaction de Programme",kw:"E&S",pj:"225_18_RCI_UFHB",ed:"Maël",cm:"Coordonner avec l'E&S pour avoir les principales contraintes environnementales et de site des le préprogramme. Attention de ne pas lancer les consultations de parties prenantes avant la validation du préprogramme et la validations des arbitrages sur le contenu du projet. L'enjeu est de ne pas parler aux gens de la construction d'un amphi si à la fin il ne sera pas fait.",},
{th:"Rédaction de Programme",kw:"Urbanisme",pj:"225_18_RCI_UFHB",ed:"Maël",cm:"Commencer à se renseigner sur les contraintes d'urbanisme / permis de construire. Le Guichet Unique du Permis de Construire peut délivrer un certificat d'urbanisme qui donnes les règles à resperter (hauteur de bâtiment, éloignement, etc). Mais il faut donner des précisions sur le projet.",},
{th:"Rédaction de Programme",kw:"Livrables",pj:"225_12_RCI_LSY, 225_22_PALESTINE_ISC",ed:"Maël",cm:"Prévoir une version résumée qui permettra d'être mieux partagée à la MOA si le PTD est trop lourd",},
{th:"Modes opératoires",kw:"Multisite",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Avoir en tête que sur les projets infras multisites éparpillés sur le territoire, les processus liés au paiement des entreprises, avec mission de contrôleur financier, accompagnés par l'UCP, sont extrêmement chronophages et mobilisent du personnel.",},
{th:"Modes opératoires",kw:"Multisite",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Pour les projets multisites avec éparpillement sur le territoire, essayer de décentraliser au maximum la gestion opérationnelle quotidienne, en utilisant de préférence des outils collaboratifs.",},
{th:"Modes opératoires",kw:"Passation de marchés / Gestion",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"La fonction qui est sur le chemin critique de tous les projets est la passation des marchés. Il faut s'assurer qu'elle soit suffisament staffée et avec des personnels séniors.",},
{th:"Modes opératoires",kw:"Gestion infra",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Sur le CCBAD, comme il y a peu de travaux, ils ont recruté un consultant individuel pour s'occuper des tâches infras. Le consultant est local et travail sur d'autres projets en parallèle. Permet plus de flexibilité, et une présence seulement aux moments clés.",},
{th:"Rédaction de DAO",kw:"Préqualification",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"La préqualification est déconseillée s'il n'y a pas d'enjeu de complexité de travaux car elle multiplie sensiblement les délais et ne garantie pas la présélection des bonnes entreprises à cause des fraudes difficiles à détecter.",},
{th:"Rédaction de TdR, Rédaction de DP",kw:"Critères",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Faire des lots MOE cohérents avec les lots travaux pour faciliter la gestion des marchés (éviter de croiser les lots).",},
{th:"Rédaction de TdR, Rédaction de DP, Rédaction d'AMI",kw:"Critères",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Attention aux critères: Afrique de l'Ouest pour les références. Exclut de fait toutes les expériences en Afrique centrale qui sont aussi pertinentes",},
{th:"Rédaction de TdR, Rédaction de DP",kw:"Facturation",pj:"225_15_RCI_Collèges, 225_12_RCI_LSY",ed:"Maël",cm:"Simplifier au maximum la facturation\nEssayer de garder un paiement à la livraison puis à la validation.",},
{th:"Rédaction de TdR, Rédaction de DP",kw:"Personnels clés",pj:"225_12_RCI_LSY",ed:"Maël",cm:"Etre bien clair dans la demande d'avoir un architecte dans l'équipe\nEtre bien clair sur les demandes d'agrément de l'architecte",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"§ dans les TdR + contrat sur le respect de l'enveloppe prévisionnelle travaux à respecter en AVP, tolérance de dépassement? Mise à jour AVP sans rémunération supplémentaire en cas de dépassement (mais quid quand ca a été tellement mal chiffré à la base que c'est impossible??).",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Ajouter dans la liste des livrables une notice explicative sur l'estimation AVP : méthode, origine des coûts, expliciter les dépassements",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Liste livrables : préciser la liste complète des corps d'état technique pour lesquels on veut une notice et des plans.",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Faire valider le tableau des estimations AVP avant le rendu AVP (s'assurer que les SP/SU sont indiqués ou équivalents, que les prix sont indiqués par bâtiments, etc.) ou carrément fournir un modèle..",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Prévoir une réunion obligatoire avant rendu AVP pour présenter les principales orientations, les dépassements de budgets pressenties, etc. pour obtenir des pré-validations intermédiaires avant de rendre un AVP à côté de la plaque.",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"ARCHI : imposer en AVP de fournir des 3D extérieur/intérieur",},
{th:"Rédaction de TdR, Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"ARCHI : imposer dans les livrables que les plans archis soient côtés et avec lignes de repères",},
{th:"Rédaction de Programme",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"VRD : être très précis dans le programme sur le périmètre à traiter.",},
{th:"Rédaction de Programme",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"ELEC : être très précis dans le programme sur les hypothèses à prendre en compte (circuit général / prioritaire secouru / tolérance coupure, etc.) et sur le fait d'obtenir une notice claire existant/stratégie projet et hypothèse dimensionnement / fonctionnement/ entretien maintenance + Prévoir réunion spécifique sur le lot elec avec futur usager en cous d'AVP.",},
{th:"Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"DP :  Critère sur le CV préférer « Adéquation des CV avec les exigences des TdR en termes de qualification, compétences, experience » plutôt que « Adéquation des CV avec les services attendus ».",},
{th:"Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"DP : Être clair sur ce qui constitue un « sous-critère » et ce qui correspond à un atout + Faire attention à être clairs dans la formulation des sous-critères (une liste à la Prévert de sous-critère rend l’évaluation délicate) + Préciser la distribution de la note en fonction des sous-critères ?",},
{th:"Rédaction de DP",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"DP : prévoir note minimle requise par critère? Prévoir critère excluant?",},
{th:"Rédaction de DP",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Attention aux modalités de paiement, et au paiement de la MOE à l'avancement de l'entreprise. Si les chantiers s'arrêtent, la MOE reste mobilisée sans être payée.",},
{th:"Rédaction de DP",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Prévoir de demander à la MOE des rapports photographiques hebdomadaires pour apprécier l'avancement à distance.",},
{th:"Rédaction de DAO",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Garantie de soumission : préciser si la garantie est attendue par lot/pour par offre.",},
{th:"Rédaction de DAO",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Quand on sépare les lots en différents AO, les limites de capacité ne sont pas cumulables entres les différents AO. Par exemple, si une entreprise ne peut être attributaire de 2 lots sur un AO parce que sont CA n'est pas suffisant, elle peut quand même remporter deux lots s'ils sont séparés en 2 AO. Il faut prévoir ce cas de figure dans le DAO.",},
{th:"Rédaction de DAO",pj:"225_11_COMORES PDFC",ed:"Aliénor",cm:"Sur le rapport d'évaluation des offres : Quand une solution d'attribution paraît meilleure qu'une autre, il faut bien le faire apparaître de manière formelle dans le rapport (ou en note annexe), plutôt que dans des échanges par mail.",},
{th:"Rédaction de DAO",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Préférer les petits lots car plus faciles à résilier et plus accessibles aux entreprises typiques de Cote d'Ivoire. Les gros lots sont moins accessibles et augmentent le risque d'entreprises trop faibles qui trichent sur leur capacité financière.",},
{th:"Rédaction de DAO",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Prendre en compte la proximité géographique avec coefficient d'éloignement pour calcul des couts estimatifs",},
{th:"Rédaction de DAO",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Mettre en place des jalons contractuels tôt dans les travaux pour être en mesure de résilier rapidement si entreprise sera clairement trop faible.",},
{th:"Rédaction de DAO",pj:"225_15_RCI_Collèges",ed:"Maël",cm:"Prévoir le paiement des entreprises à des moments prédéfinis (jalons physiques ou % pré-définis tous les 20 % par exemple) pour faciliter la gestion, ne pas multiplier les demandes d'attachements pour des sommes dérisoires, et motiver l'entreprise à atteindre le jalon suivant pour être payés.",},
{th:"Controle technique",pj:"225_20_GUINEE_PAIED, 225_21_GUINEE_MNG",ed:"Aliénor",cm:"Mission CT à prévoir en fonction de la complexité du projet : CT prévu pour projet MNG / Pas de CT pour projet PAIED",},
{th:"Controle technique",pj:"225_20_GUINEE_PAIED, 225_21_GUINEE_MNG",ed:"Aliénor",cm:"Article 44 du Code de la Construction et de l'Urbanisme / Loi n° L/2015/020/ A.N \nContrôle technique obligatoire dans les cas de figure suivants : \n    \"a- Tout immeuble de trois (3) étages et plus, \n    b- Toute construction avec sous sol de (04) quatre mètres et plus ; \n    c- Toute construction nécessitant des reprises en sous œuvre ou des travaux de soutènement d’ouvrages voisins ;  \n    d- Toute unité industrielle, agricole ou autre dotée d’un pont roulant ; \n    e- Tout établissement destiné à recevoir du grand public (stade, université, théâtre, hôpital, centre commercial, lieux de culte). \n    f- Tout ouvrage comportant des éléments en porte à faux de portée égale ou supérieure à (03) trois mètres, ou des poutres ou arcs de portée supérieure à (08) huit mètres ; \n    g- Toute autre construction qui, en raison de sa nature ou de son importance, présente des risques particuliers pour la sécurité des personnes et des biens.\"",},
{th:"Controle technique",pj:"225_28_TUNISIE_EFMT",ed:"Aliénor",cm:"Article 16 du Décret n°2017-967 du 31 Juillet 2017, portant réglementation de la construction des bâtiments civils \n\"Tout projet de bâtiment civil doit faire l'objet d'un contrôle technique des études et de l'exécution des travaux par des contrôleurs techniques agréés par le ministère chargé de l'équipement conformément à la législation et à la réglementation en vigueur.\"\n>> Contrôle technique obligatoire pour tous projets de bâtiments civils",},
{th:"Controle technique",pj:"225_28_TUNISIE_EFMT",ed:"Aliénor",cm:"Mission CT à prévoir en cas de projets publics pour éviter blocages administration / Dérogation en cas de projets bailleurs peut-être possible si projet non complexe et dans ce cas, confier à l'AMO infra et/ou au responsable infrastructure une revue technique des études",},
{th:"Controle technique",pj:"225_14_COMORES PROFI, 225_11_COMORES PDFC",ed:"Aliénor",cm:"Absence de cadre légal",},
{th:"Controle technique",pj:"225_17_RWANDA_AFTER",ed:"Clément",cm:"Article 39 de la Loi n°10/2012 du 02/05/2012 portant Code de l'urbanisme et de la construction au Rwanda \nConstructions soumises au contrôle technique obligatoire :\n\"1. Tout immeuble complexe, à usage industriel et commercial;\n  2. Tout bâtiment à usage public;\n  3. Toute autre construction qui, en raison de sa nature ou de son importance, présente des risques particuliers pour la sécurité des personnes et des biens.\"",},
{th:"Rédaction de TdR, Rédaction de DP, Rédaction d'AMI",pj:"225_33_BURUNDI_CANKUZO",ed:"Clément",cm:"Pour s'assurer de l'appropriation des documents par la MOA prévoir systématiquement une réunion pour expliquer la DP TDR. Notamment la grille de notation et les critères proposées dans les TDR",},
{th:"Rédaction de TdR",kw:"STD",pj:"225_22_PALESTINE_ISC",ed:"Maël",cm:"Si on veut  spécifiquemennt certaines études environnementales comme une étude de lumière du jour, l'expliciter clairement, ne pas mettre juste STD. Ne pas hésiter à détailler tous les résultats attendus.",},
{th:"Rédaction de DP",kw:"Notation",pj:"225_33_BURUNDI_CANKUZO",ed:"Louis",cm:"Bien vérifier la cohérence entre les exigences des TdR sur le sprofils et le contenu de la DP. Notamment sur l'ancienneté des références, cela doit aussi apparaitre dans la DP. De même vérfier la cohérence sur l'ancienneté et le montant des références entre l'AMI et la DP.",},
{th:"Rédaction de DP",kw:"Répartition des points",pj:"225_33_BURUNDI_CANKUZO",ed:"Louis",cm:"Il n'est pas utile d'accorder trop de point au personnel clé lorsque les soumissionnaires sont des groupements internationaux. Le PC est alors systématiqueement conforme avec des références adéquate, l'attribution de ces points n'est plus discrimante.",},
];
// ════════ RÉFÉRENTIEL AFD (Phase 8) ════════
const REF_DOCS=[
{id:"dtao",name:"DTAO Travaux",ref:"AFD-M0030",ver:"Août 2025",dir:"2024",cat:"Travaux",desc:"Dossier Type d'Appel d'Offres pour les marchés de travaux"},
{id:"prequal",name:"Pré-qualification Travaux",ref:"—",ver:"Février 2024",dir:"2024",cat:"Travaux",desc:"Document type de pré-qualification pour les marchés de travaux importants"},
{id:"dp",name:"Demande de Propositions (consultants)",ref:"AFD-M0031",ver:"Août 2025",dir:"2024",cat:"PI",desc:"DTDP complète pour la sélection de consultants (> 200 000 €)"},
{id:"d3pi",name:"D3PI (petites PI)",ref:"AFD-M0330",ver:"Août 2025",dir:"2024",cat:"PI",desc:"Demande de Propositions pour les petites prestations intellectuelles (< 200 000 €)"},
{id:"dpei",name:"DP Expert individuel",ref:"AFD-M0039",ver:"Mai 2025",dir:"2024",cat:"PI",desc:"Demande de Propositions pour consultants individuels (< 50 000 €)"},
{id:"ami",name:"AMI (consultants)",ref:"AFD-M0038",ver:"Août 2025",dir:"2024",cat:"PI",desc:"Appel à Manifestations d'Intérêt pour l'établissement de listes restreintes"},
{id:"ami_conc",name:"AMI Concours",ref:"—",ver:"Décembre 2025",dir:"2024",cat:"PI",desc:"AMI spécifique aux concours d'architecture"},
{id:"dp_conc",name:"DP Concours d'architecture",ref:"—",ver:"Décembre 2025",dir:"2024",cat:"PI",desc:"Demande de Propositions dans le cadre d'un concours d'architecture"},
{id:"db",name:"Design-Build",ref:"—",ver:"—",dir:"2024",cat:"Travaux",desc:"Document type pour les marchés de conception-réalisation"},
{id:"ppm",name:"Plan de Passation des Marchés",ref:"AFD-M0041",ver:"Août 2025",dir:"2024",cat:"Transversal",desc:"Modèle de PPM obligatoire (Dir. §1.6.1)"},
{id:"apm",name:"Checklist APM",ref:"—",ver:"—",dir:"2024",cat:"Transversal",desc:"Points de vigilance et contrôles avant ANO"},
{id:"dir2024",name:"Directives 2024 (v9)",ref:"AFD-R0097",ver:"Février 2024",dir:"2024",cat:"Cadre",desc:"Directives pour la Passation des Marchés dans les États étrangers — Version 9"},
{id:"dir2019",name:"Directives 2019",ref:"AFD-R0097",ver:"2019",dir:"2019",cat:"Cadre",desc:"Directives version antérieure — Option A, encore applicable sur certains projets"},
{id:"exclusion",name:"Liste d'exclusion du Groupe AFD",ref:"—",ver:"Révision 2022",dir:"2024",cat:"Cadre",desc:"Liste des activités non alignées avec les engagements du Groupe AFD"},
];



// Checklist: [id, section, text, tip, sources[]]

// ════════════════════════════════════════════════════════════
// CHECKLISTS TRAVAUX — Dir. AFD 2024 (§4.1-4.10, Annexe 5) + Checklist APM
// Format: [id, section, texte, conseil, [sources]]
// ════════════════════════════════════════════════════════════
const CL_DAO=[
// Avis d'AO
["d01","Avis d'AO","Une large publicité est prévue : (i) journal à tirage national, (ii) journal officiel, (iii) portail d'accès gratuit, (iv) portail dgmarket pour les AOI. Un AOI est obligatoire si le marché est estimé supérieur à 5 M€.","Réf. Dir. §4.2 — Checklist APM DAO",["DIR","APM"]],
["d02","Avis d'AO","Si un paiement est demandé pour retirer le dossier, il doit être raisonnable et avoir pour seul objectif de couvrir les coûts d'édition, non les coûts d'élaboration.","Checklist APM DAO",["APM"]],
["d03","Avis d'AO","Les critères de qualification doivent être indiqués dans l'avis s'il n'y a pas eu de phase de pré-qualification, pour éviter que le dossier ne soit retiré par des candidats non qualifiés.","Checklist APM DAO",["APM"]],
// DPAO
["d10","Données particulières AO","Informations sur les demandes d'éclaircissement, la réunion préparatoire et/ou visite de site. La pratique d'une réunion préparatoire est à encourager, sauf si la compétition risque d'être limitée (risque de collusion).","Checklist APM DAO §II",["APM"]],
["d11","Données particulières AO","Le délai pour le dépôt des offres doit être de 8 semaines minimum pour les AOI.","Réf. Dir. §4.2 — Checklist APM DAO",["DIR","APM"]],
["d12","Données particulières AO","L'ouverture des offres doit se faire en séance publique. L'AFD préconise 1 seule enveloppe avec énoncé des prix à l'ouverture (évite une pression sur l'enveloppe financière). L'ouverture doit avoir lieu très peu de temps après la date limite de remise.","Réf. Dir. §4.3 — Checklist APM DAO",["DIR","APM"]],
["d13","Données particulières AO","Traitement des variantes techniques et/ou de délais. Autoriser des variantes est recommandé. Prévoir des spécifications techniques minimales pour chaque variante et indiquer la méthode d'évaluation. Les variantes spontanées ne sont prises en compte que pour l'offre conforme la moins-disante sur la solution de base.","Réf. Dir. §4.5 — Checklist APM DAO",["DIR","APM"]],
["d14","Données particulières AO","Type de prix (révisables ou fermes). La révision est recommandée si (1) le marché dure ≥ 18 mois et (2) on anticipe volatilité des matières premières et/ou inflation significative. Le coefficient X de la formule de révision doit être fixé par la MOA dans le DAO.","Checklist APM DAO",["APM"]],
["d15","Données particulières AO","Période de validité de l'offre entre 90 et 120 jours. Au-delà de 120 jours : prévoir un processus d'actualisation du montant de l'offre en cas de prolongation. Le modèle AFD le prévoit.","Checklist APM DAO",["APM"]],
["d16","Données particulières AO","Garantie de soumission : normale pour les travaux. Le montant doit être spécifié par la MOA et ne doit pas excéder 3% du montant estimé du marché.","Checklist APM DAO",["APM"]],
["d17","Données particulières AO","Marge de préférence nationale : l'AFD ne l'accepte que si elle est imposée (pas seulement recommandée) par la loi, est explicitement prévue dans les documents, et ne conduit pas à l'exclusion de fait d'une concurrence étrangère. Max 7,5% travaux, 15% prix importation HT équipements. Une exigence de main-d'œuvre locale n'est acceptable que si imposée par la réglementation.","Réf. Dir. §2.1.4 — Checklist APM DAO",["DIR","APM"]],
// Critères
["d20","Critères d'évaluation","Les critères de qualification doivent être proportionnés aux enjeux du marché. Ils portent sur la capacité des candidats à exécuter le marché (références récentes similaires, situation financière). L'évaluation ne doit pas se baser sur une notation pondérée. Tous les candidats éligibles répondant aux critères doivent être admis, sans limite de nombre.","Réf. Dir. §4.1 — Checklist APM DAO §III",["DIR","APM"]],
["d21","Critères d'évaluation","Critères d'éligibilité : prêter attention à la possible existence de critères locaux discriminants. En cas de financements délégués UE (IMDA) : vérifier liste d'exclusion UE. Les critères administratifs doivent être limités aux exigences de la réglementation locale. Refuser les critères d'élimination purement formels sauf si la loi l'impose.","Réf. Dir. §1.4, §4.4 — Checklist APM DAO",["DIR","APM"]],
["d22","Critères d'évaluation","Capacité financière : les exigences en matière de CA et d'expérience spécifique doivent être correctement dimensionnées, au risque soit d'éliminer tout le monde, soit d'autoriser des candidats de taille trop petite. Pour un groupement : exigences par membre (chacun et/ou en cumulé) à spécifier.","Checklist APM DAO §III",["APM"]],
["d23","Critères d'évaluation","Expérience : les critères doivent être cohérents avec les caractéristiques du marché (technicité, taille, localisation) et correctement dimensionnés.","Checklist APM DAO §III",["APM"]],
["d24","Critères d'évaluation","Qualification ESSS : sauf si aucun risque majeur ESSS n'a été identifié, s'assurer de la présence de critères de qualification ESSS et de leur cohérence avec la nature du marché et les enjeux identifiés.","Checklist APM DAO §III",["APM"]],
["d25","Critères d'évaluation","L'évaluation est prévue en termes monétaires et ne fait pas appel à un système à points. Tous les critères servant à l'évaluation doivent être chiffrables. Exception : contrats DB ou DBO où une notation peut être utilisée pour la partie conception, avec prise en compte du coût sur la durée de vie.","Réf. Dir. §4.4 — Checklist APM DAO §III",["DIR","APM"]],
// Formulaires
["d30","Formulaires","Tableau des prix : préciser la nature du marché et des prix (forfait ou PU), identifier les taxes dans une colonne séparée. Pour DB/DBO : prix forfaitaire avec tableaux séparés pour pièces détachées, consommables, entretien, énergie. Un bordereau ESSS spécifique si aspects ESSS identifiés dans le PGES.","Checklist APM DAO §IV",["APM"]],
["d31","Formulaires","Méthodologie ESSS demandée sur les sujets sensibles, de manière détaillée uniquement pour les aspects les plus importants identifiés dans le PGES du projet.","Checklist APM DAO §IV",["APM"]],
["d32","Formulaires","La Déclaration d'Intégrité est présente dans le dossier. Peut être remplacée par d'autres dispositions en cas de cofinancement joint (déclaration MRI, BM, etc.).","Réf. Dir. §4.2f — Checklist APM DAO",["DIR","APM"]],
// Spécifications
["d40","Spécifications techniques","Prise en compte des questions de santé, sécurité, impact environnemental et social du chantier. Demander l'insertion des spécifications ESSS en annulant les clauses non applicables.","Checklist APM DAO §VII",["APM"]],
["d41","Spécifications techniques","Les normes et spécifications techniques permettent une large concurrence. S'assurer que les technologies et normes permettent aux entreprises de répondre. Précision suffisante pour assurer la qualité. Aucune marque spécifique de matériaux ou matériels ne doit être exigée.","Réf. Dir. §4.2e — Checklist APM DAO §VII",["DIR","APM"]],
// CCAG/CCAP
["d50","CCAG / CCAP","Le CCAG est présent et non modifié. S'il s'agit du modèle AFD, aucune modification ne doit avoir été apportée. Sinon, privilégier les conditions générales FIDIC si montant > 1 M€. Les dispositions peuvent être précisées et/ou modifiées uniquement par les Conditions particulières.","Réf. Dir. §4.2g — Checklist APM DAO §VIII-IX",["DIR","APM"]],
["d51","CCAG / CCAP","Le CCAP est obligatoirement renseigné avant le lancement de l'AO. Ses clauses ont un impact sur le prix de l'offre.","Checklist APM DAO §IX",["APM"]],
["d52","CCAG / CCAP","Type de rémunération adapté : forfaitaire, prix unitaires, ou mixte. Une rémunération forfaitaire est à exclure en cas d'incertitudes et de risques élevés dans le chiffrage.","Checklist APM DAO §IX",["APM"]],
["d53","CCAG / CCAP","Garanties et assurances : la GBE est standard. Si une retenue est aussi appliquée, le total GBE + retenue ne doit pas excéder 15% du montant du marché. Plafonds d'assurances fixés par la MOA.","Checklist APM DAO §IX",["APM"]],
["d54","CCAG / CCAP","Prolongation du délai d'achèvement : les possibilités sont prévues (force majeure, conditions climatiques exceptionnelles).","Checklist APM DAO §IX",["APM"]],
["d55","CCAG / CCAP","Impôts et taxes identifiés et exemptions précisées. L'AFD finançant hors taxes, cette identification est essentielle.","Réf. Dir. §4.9 — Checklist APM DAO §IX",["DIR","APM"]],
["d56","CCAG / CCAP","Révision du prix : spécifier si le prix est révisable ou non. La révision est fortement recommandée si la durée des travaux est > 18 mois. Le coefficient X de la formule doit être fixé par la MOA dans le DAO.","Checklist APM DAO §IX",["APM"]],
["d57","CCAG / CCAP","Pénalités de retard : montant standard (environ 1/1000e du montant du marché par jour de retard).","Checklist APM DAO §IX",["APM"]],
["d58","CCAG / CCAP","Sanctions ESSS : les clauses applicables sont incluses dans le CCAP (par défaut dans le DAO Travaux AFD).","Checklist APM DAO §IX",["APM"]],
["d59","CCAG / CCAP","Modalités de règlement : l'avance de démarrage doit être décorrélée du paiement du contrat (avance de X%, suivie de paiements pour 100%, desquels se déduit un pourcentage pour remboursement). Garantie bancaire exigée avant versement. Le pourcentage de déduction doit être supérieur au pourcentage de l'avance.","Checklist APM DAO §IX",["APM"]],
["d60","CCAG / CCAP","Réception provisoire et définitive : les modalités sont clairement décrites (éventuellement par section) ainsi que les tests complets à effectuer.","Checklist APM DAO §IX",["APM"]],
["d61","CCAG / CCAP","Clauses de responsabilité : veiller à ce que la responsabilité soit limitée, en général, au montant du marché.","Checklist APM DAO §IX",["APM"]],
["d62","CCAG / CCAP","Suspension / résiliation : la possibilité pour le MOA de suspendre les travaux et les conséquences associées sont décrites. Le MOA peut résilier pour faute de l'entreprise et pour convenance.","Checklist APM DAO §IX",["APM"]],
["d63","CCAG / CCAP","Droit applicable et arbitrage : dans le cas d'un AOI, le recours à un arbitrage international doit être explicitement prévu et décrit (règles d'arbitrage international et lieu neutre).","Réf. Dir. §4.9 — Checklist APM DAO §IX",["DIR","APM"]],
];
const CL_RAP=[
// Introduction (Annexe 5)
["r01","Introduction","Brèves informations sur le projet et le contenu du marché.","Réf. Dir. Annexe 5 §1a",["DIR"]],
["r02","Introduction","Budget estimé pour le marché.","Réf. Dir. Annexe 5 §1b",["DIR"]],
["r03","Introduction","Rappel du processus de passation retenu : type de publication (national/international), type de consultation (AO avec/sans pré-qualification, DC, gré à gré), méthode de sélection (moins-disant, mieux-disant…), modalités particulières (2 étapes, lots, tranches, bons de commande).","Réf. Dir. Annexe 5 §1c",["DIR"]],
["r04","Introduction","Étape/enveloppe évaluée dans le rapport (qualification, technique, financière, combinée) et étapes déjà évaluées le cas échéant.","Réf. Dir. Annexe 5 §1d",["DIR"]],
["r05","Introduction","Calendrier complet du processus : début et fin de chaque période (pré-qualification, soumission), détail des prolongations avec motivation et preuve des publications. Date prévue de démarrage des prestations.","Réf. Dir. Annexe 5 §1e",["DIR"]],
["r06","Introduction","Réunion préalable et/ou visite de site : date, heure, lieu, liste des participants. Le PV doit être inclus en annexe.","Réf. Dir. Annexe 5 §1f",["DIR"]],
["r07","Introduction","Principaux éclaircissements/avenants apportés aux documents pendant la période de soumission. Le détail des demandes et réponses en annexe.","Réf. Dir. Annexe 5 §1g",["DIR"]],
// Évaluation
["r10","Évaluation","Noms et fonctions des membres du comité d'évaluation.","Réf. Dir. Annexe 5 §2a",["DIR"]],
["r11","Évaluation","PV d'ouverture des offres : date, heure, lieu, participants. Contenant les informations requises conformément aux Documents de Passation de Marchés.","Réf. Dir. Annexe 5 §2b",["DIR"]],
["r12","Évaluation","Base de l'évaluation : documents type AFD ou nationaux, liste des éléments évalués (administratifs, techniques…).","Réf. Dir. Annexe 5 §2c",["DIR"]],
["r13","Évaluation","Résultats de l'évaluation technique : conformité selon chaque critère, analyse des non-conformités mineures et des divergences/réserves/omissions importantes de chaque offre (en vue de faciliter les débriefings). Justification des offres jugées non conformes.","Réf. Dir. Annexe 5 §2d",["DIR"]],
["r15","Évaluation","Résultats de l'évaluation financière : montants des offres HT, en précisant les corrections ou ajustements apportés. Si utile, présentation sous forme de tableau par grandes masses.","Réf. Dir. Annexe 5 §2d",["DIR"]],
["r16","Évaluation","Résultats de l'évaluation globale : application des modalités d'évaluation combinée technico-financière prévues dans les documents de passation (si évaluation en 2 étapes).","Réf. Dir. Annexe 5 §2e",["DIR"]],
// Vérifications APM
["r20","Vérifications APM","La publicité a effectivement été faite (large publicité vérifiée).","Checklist APM Rapport TVX",["DIR","APM"]],
["r21","Vérifications APM","Si le DAO a été modifié sans avoir sollicité l'ANO de l'AFD : vérifier la pertinence de la modification et le report de la date limite de remise des offres.","Checklist APM Rapport TVX",["APM"]],
["r22","Vérifications APM","Le dossier transmis par la MOA doit être complet : (i) PV de la commission d'ouverture, (ii) rapport complet d'évaluation, (iii) copie de l'offre lauréate. Le responsable EP ne doit pas se substituer à la MOA ni refaire les évaluations, mais peut demander communication des offres si le rapport ne lui paraît pas satisfaisant.","Checklist APM Rapport TVX",["APM"]],
["r23","Vérifications APM","Éligibilité : ANO conditionné au contrôle dans WORLDCHECK ONE (Case Report + Profile). Pour les groupements, chaque entité doit être vérifiée. DI incluse non modifiée et signée. Si exclusion BM : transmettre à JUR et DCO-Conformité. Entreprise publique : vérifier autonomie juridique et financière.","Checklist APM Rapport TVX",["APM"]],
["r24","Vérifications APM","Groupement modifié entre la pré-qualification et l'offre : sauf interdiction réglementaire, réévaluer la qualification du nouveau groupement. S'il ne remplit pas les exigences : offre éliminée.","Réf. Dir. §4.4 — Checklist APM Rapport TVX",["DIR","APM"]],
["r25","Vérifications APM","Le dossier d'évaluation est complet et étayé : pour chaque offre, détail des omissions/réserves/divergences et leurs conséquences (acceptables ou non, préjudice chiffré). Les évaluations individuelles de chaque évaluateur doivent être incluses.","Checklist APM Rapport TVX",["APM"]],
["r26","Vérifications APM","L'évaluation a été faite en conformité avec les dispositions et critères du DAO. Attention : aux variantes, aux marchés avec allotissement, aux DB/DBO. Valider les éliminations, la conformité des offres retenues, les corrections apportées. Si une offre compétitive a été rejetée, demander des explications claires.","Checklist APM Rapport TVX",["APM"]],
["r27","Vérifications APM","Offre anormalement basse : si inférieure de 20% ou plus à l'estimation de la MOA, le comité doit demander clarifications et décomposition/sous-détail des prix. En l'absence de réponse satisfaisante ou si incohérence entre offre technique et prix : rejet. Le MOA ne doit pas fixer de seuil automatique de rejet.","Réf. Dir. §4.4 — Checklist APM Rapport TVX",["DIR","APM"]],
["r28","Vérifications APM","Écart entre offre attributaire et estimation de la MOA : s'il y a un écart important, en rechercher les causes.","Checklist APM Rapport TVX",["APM"]],
["r29","Vérifications APM","Vérification de la qualification : même si une pré-qualification a eu lieu, la MOA doit revérifier la qualification avant de statuer sur l'attributaire. Le CA et les références pourraient avoir changé.","Réf. Dir. §4.4 — Checklist APM Rapport TVX",["DIR","APM"]],
["r30","Vérifications APM","AO infructueux ou annulé : motifs et argumentation solides requis. L'annulation pour convenance de la MOA n'est pas autorisée. Un ANO est nécessaire. Il n'est pas permis de rejeter toutes les offres pour relancer sur les mêmes bases afin d'obtenir des prix inférieurs.","Réf. Dir. §4.10 — Checklist APM Rapport TVX",["DIR","APM"]],
["r31","Vérifications APM","Une seule offre conforme ou reçue : investiguer la réalité de la concurrence. Faire demander aux candidats ayant retiré le DAO pourquoi ils n'ont pas soumis. Scruter les éliminations. Le DAO type AFD autorise l'ouverture même en cas d'offre unique.","Checklist APM Rapport TVX",["APM"]],
// Conclusions
["r40","Conclusions","Liste des offres conformes pour l'essentiel, et liste des offres rejetées avec motifs (référence à l'article du DAO prévoyant le rejet).","Réf. Dir. Annexe 5 §3a-b",["DIR"]],
["r42","Conclusions","Classement final et proposition d'attributaire. Comparaison avec le budget estimé et commentaires.","Réf. Dir. Annexe 5 §3c-d",["DIR"]],
["r44","Conclusions","Signatures de tous les membres du comité d'évaluation.","Réf. Dir. Annexe 5 §3f",["DIR"]],
// Annexes
["r50","Annexes","Preuves de publication + PV d'ouverture joint + Grille d'analyse détaillée des offres (conformité critère par critère).","Réf. Dir. Annexe 5 §4",["DIR"]],
];
const CL_CTR=[
["c01","Identité","L'attributaire est identique au candidat retenu. Pas de substitution par une filiale. Groupement intact. PV de négociation joint si ajustements (calendrier, lieu d'arbitrage, impôts). Les négociations financières sont interdites sauf accord exprès de l'AFD.","Réf. Dir. §4.9 — Checklist APM Marché TVX",["DIR","APM"]],
["c03","Intégrité","Déclaration d'Intégrité contractuelle signée et non modifiée incluse dans le marché.","Réf. Dir. §4.2f — Checklist APM Marché TVX",["DIR","APM"]],
["c04","Finances","Montant HT apparent et taxes identifiées. L'AFD finance hors taxes, cette identification est essentielle.","Checklist APM Marché TVX",["APM"]],
["c05","Garanties","Garantie de bonne exécution prévue. Montant et forme de la garantie précisés.","Checklist APM Marché TVX",["APM"]],
["c06","Délais","Prolongation du délai d'achèvement prévue (force majeure, conditions climatiques exceptionnelles).","Checklist APM Marché TVX",["APM"]],
["c07","Finances","Impôts et taxes identifiés avec exemptions.","Checklist APM Marché TVX",["APM"]],
["c08","Finances","Révision du prix : il est spécifié si le prix est révisable. Révision fortement recommandée si durée > 18 mois.","Checklist APM Marché TVX",["APM"]],
["c09","Finances","Pénalités de retard : montant standard (~1/1000e du montant du marché par jour).","Checklist APM Marché TVX",["APM"]],
["c10","Finances","Modalités de règlement : avance décorrélée du paiement, garantie bancaire exigée avant versement.","Checklist APM Marché TVX",["APM"]],
["c11","Réception","Réception provisoire et définitive clairement décrites avec tests complets à effectuer.","Checklist APM Marché TVX",["APM"]],
["c12","Responsabilité","Responsabilité limitée au montant du marché.","Checklist APM Marché TVX",["APM"]],
["c13","Litiges","Suspension/résiliation prévue. Le MOA peut suspendre et résilier pour faute ou convenance.","Checklist APM Marché TVX",["APM"]],
["c14","Litiges","Droit applicable et arbitrage : pour un AOI, arbitrage international explicitement prévu et décrit (règles internationales, lieu neutre).","Réf. Dir. §4.9 — Checklist APM Marché TVX",["DIR","APM"]],
];

// ════════ CHECKLISTS PI (Dir. AFD 2024 §5 + Checklist APM PI) ════════
const CL_AMI=[
["a01","Publicité","Large publicité prévue","Journal national + officiel + portail gratuit + dgmarket AOI. AOI obligatoire si >200k€",["DIR","APM"]],
["a02","Publicité","AOI obligatoire si montant > 200 000 €","En dessous: liste ad hoc possible (Demande de Cotations)",["DIR"]],
["a03","Contenu","Pas de CV ni méthodologie exigés dans l'AMI","Il ne s'agit pas de solliciter une proposition",["APM"]],
["a04","Contenu","Expériences passées pertinentes demandées","Préciser: même nature, même secteur, contextes géographiques similaires",["APM"]],
["a05","Contenu","Délai candidatures ≥ 3 semaines","",["APM"]],
["a06","Contenu","Nombre max short-listés spécifié","Limiter à 6 (4 à 6 sauf accord AFD)",["DIR","APM"]],
["a07","Contenu","Déclaration d'Intégrité incluse","",["DIR","APM"]],
["a08","Évaluation","Pas de notation recommandée par l'AFD","Si notation: critères et poids explicités dans l'AMI",["DIR","APM"]],
];
const CL_LR=[
["l01","Constitution","AMI utilisé pour > 200k€ (obligatoire)","Possible en dessous de ce seuil",["DIR","APM"]],
["l02","Constitution","Large publicité effective vérifiée","",["APM"]],
["l03","Constitution","Liste ad hoc possible < 200k€","Consultants qualifiés, intéressés et capables",["DIR"]],
["l04","Composition","4 à 6 consultants","Sauf accord exprès de l'AFD",["DIR","APM"]],
["l05","Composition","Liste homogène (même nature)","Ne pas mélanger sociétés + EI + ONG",["DIR","APM"]],
["l06","Composition","Pas de critère de nationalité restrictif","Principe d'ouverture",["DIR"]],
["l07","Communication","Candidats retenus informés par écrit","",["DIR"]],
["l08","Évaluation","Rapport évaluation candidatures (Annexe 5)","",["DIR"]],
["l09","Éligibilité","WorldCheck One sur chaque candidat","",["APM"]],
["l10","Éligibilité","DI signée par chaque candidat","",["DIR","APM"]],
];
const CL_DP=[
["p01","Instructions Consultants","Section I non modifiée","Toutes modifications dans Données particulières",["DIR","APM"]],
["p02","Instructions Consultants","Validité proposition ≤ 90 jours","",["APM"]],
["p03","Instructions Consultants","Avantage compétitif inéquitable traité","Infos études amont fournies à tous les candidats",["APM"]],
["p04","Instructions Consultants","Association/sous-traitance autorisée","Sous-traitant peut participer à plusieurs propositions. 2 BE de la LR non souhaitable",["APM"]],
["p05","Instructions Consultants","Pas de garantie de soumission","Sauf si exigée par réglementation locale",["APM"]],
["p10","Données particulières","Méthode sélection spécifiée (SFQC/SQS/SBD/SMC)","AFD recommande SFQC. Budget max → SBD",["DIR","APM"]],
["p11","Données particulières","Estimation temps ou budget communiquée","Éviter propositions disproportionnées",["APM"]],
["p12","Données particulières","Ouverture propositions en séance publique","2 enveloppes remises simultanément (tech + fin)",["DIR","APM"]],
["p13","Données particulières","Notes techniques annoncées à ouverture financière","Modèle AFD le prévoit",["APM"]],
["p14","Données particulières","Exigences expérience experts ≤ 5 ans","Ne pas surestimer",["APM"]],
["p20","Grille d'évaluation","Critères: méthodologie (20-50%) + experts clés (40-70%)","",["DIR","APM"]],
["p22","Grille d'évaluation","Note technique minimum 70-80","",["APM"]],
["p23","Grille d'évaluation","Grille pas trop détaillée / mécanique","",["APM"]],
["p24","Grille d'évaluation","Note financière au prorata des montants","Modalité de calcul spécifiée dans la DP",["APM"]],
["p25","Grille d'évaluation","Pondération tech 70-80% / fin 20-30%","",["APM"]],
["p30","Formulaires","DI incluse + tableau prix conforme au type contrat","Temps passé ou forfaitaire. Taxes isolées",["DIR","APM"]],
["p32","Formulaires","Décomposition prix forfaitaires demandée","Pour faciliter avenants éventuels",["APM"]],
["p40","Termes de Référence","TdR: livrables, délais, expertises précisés","Experts internationaux clairement indiqués",["APM"]],
["p41","Termes de Référence","Cohérence TdR / grille évaluation / paiements","",["APM"]],
["p42","Termes de Référence","Pas de critères d'évaluation dans les TdR","Réservés Section II – Données particulières",["APM"]],
["p43","Termes de Référence","Pas de modalités de paiement dans les TdR","Réservées conditions du contrat",["APM"]],
["p44","Termes de Référence","Compléments ESSS pour MOE travaux","Disponibles auprès GPS/AES",["APM"]],
["p50","Conditions Contrat","Conditions générales non modifiées","Modifs dans conditions particulières",["DIR","APM"]],
["p51","Conditions Contrat","Type contrat adapté (forfait / temps passé)","",["APM"]],
["p53","Conditions Contrat","Arbitrage prévu (AOI: international)","",["DIR","APM"]],
];
const CL_EVTECH=[
["t01","Comité","Comité évaluation identifié (noms, fonctions)","",["DIR"]],
["t02","Ouverture","PV ouverture propositions techniques","Date, heure, lieu, participants",["DIR"]],
["t03","Évaluation","Évaluation conforme à la grille DP","Critères et sous-critères respectés",["DIR","APM"]],
["t04","Évaluation","Notation individuelle détaillée et argumentée","Chaque évaluateur, chaque critère",["DIR"]],
["t05","Évaluation","Note consensus du comité + forces/lacunes","Pour faciliter débriefings",["DIR"]],
["t06","Évaluation","Entretien chef de mission: Q&R consignées","Si prévu",["DIR"]],
["t07","Résultats","Consultants sous seuil technique éliminés","Note minimum 70-80",["DIR","APM"]],
["t08","Éligibilité","WorldCheck + DI signée non modifiée","Chaque entité vérifiée",["DIR","APM"]],
];
const CL_EVFIN=[
["f01","Ouverture financière","Ouverture publique, notes techniques annoncées","",["DIR","APM"]],
["f02","Ouverture financière","Seuls consultants ≥ seuil technique ouverts","",["DIR"]],
["f03","Évaluation financière","Montants HT, taxes distinguées, corrections","",["DIR"]],
["f04","Évaluation financière","Note financière selon formule DP","Au prorata des montants",["DIR","APM"]],
["f05","Évaluation combinée","Note globale = tech (70-80%) + fin (20-30%)","",["DIR","APM"]],
["f06","Évaluation combinée","Classement final établi","",["DIR"]],
["f07","Vérifications","Écart budget estimé analysé","",["APM"]],
["f08","Vérifications","Proposition unique ≠ absence concurrence","Si délai suffisant + note > seuil + prix raisonnables: poursuivre",["DIR"]],
["f09","Conclusions","Points à négocier listés + signatures comité","Spécifique PI",["DIR"]],
["f11","Annexes","Preuves publication + PV + grille notation détaillée","",["DIR"]],
];
const CL_NEGO=[
["n01","Cadre","Négociations techniques avant financières","Méthodologie, programme, personnel",["DIR","APM"]],
["n02","Technique","TdR finalisés, programme travail confirmé","",["DIR"]],
["n03","Technique","Personnel clé confirmé","Remplacement selon conditions DP",["DIR","APM"]],
["n04","Technique","Méthodologie validée","",["DIR"]],
["n05","Financière","Pas de négo sur taux rémunération (temps passé)","",["DIR","APM"]],
["n06","Financière","Clarifications prix unitaires si très élevés","",["APM"]],
["n07","Financière","Impôts/taxes identifiés","",["DIR"]],
["n08","Processus","Échec → consultant suivant (pas de reprise)","",["DIR"]],
["n09","Processus","PV négociations établi","",["APM"]],
];
const CL_CTRPI=[
["cp01","Identité","Attributaire = classé premier, groupement intact","Accord groupement signé avant signature contrat",["APM"]],
["cp02","Identité","Contrat conforme à DP négociée","",["DIR","APM"]],
["cp03","Intégrité","DI contractuelle signée","",["DIR","APM"]],
["cp04","Contrat","Type rémunération adapté (forfait/temps passé)","",["APM"]],
["cp05","Contrat","Montant HT, taxes isolées (AFD finance HT)","",["DIR","APM"]],
["cp06","Contrat","Conditions générales non modifiées","",["DIR","APM"]],
["cp07","Contrat","Conditions particulières renseignées","",["APM"]],
["cp08","Contrat","Arbitrage prévu (AOI: international)","",["DIR","APM"]],
["cp09","Contrat","Responsabilité limitée","",["APM"]],
["cp10","Contrat","Modalités paiement cohérentes + résiliation prévue","",["APM"]],
["cp11","Contrat","Publication résultats + notification consultants","",["DIR"]],
];


const CL_PROG=[
["pg01","Contenu","Le programme définit précisément les besoins fonctionnels, les surfaces, les contraintes techniques et réglementaires du projet.","Retex AI — Rédaction de Programme",["RETEX"]],
["pg02","Contenu","Les hypothèses sur le périmètre VRD et les réseaux sont précisées. Être très précis sur le périmètre à traiter pour éviter les litiges.","Retex AI — Rédaction de Programme",["RETEX"]],
["pg03","Contenu","Les hypothèses électriques (puissance, raccordement, secours) sont précisées dans le programme.","Retex AI — Rédaction de Programme",["RETEX"]],
["pg04","Validations","Le préprogramme est formellement validé par la MOA avant de passer à la phase suivante. Les scénarios d'implantation et d'accès sont validés par les décideurs pour éviter une contestation tardive.","Retex AI — Rédaction de Programme",["RETEX"]],
["pg05","E&S","Coordination avec l'E&S pour avoir les principales contraintes environnementales et de site dès le préprogramme. Attention à ne pas lancer les consultations de parties prenantes avant la validation des arbitrages.","Retex AI — Rédaction de Programme",["RETEX"]],
["pg06","Urbanisme","Se renseigner sur les contraintes d'urbanisme / permis de construire dès le programme. Le Guichet Unique peut délivrer un certificat d'urbanisme.","Retex AI — Rédaction de Programme",["RETEX"]],
["pg07","Livrables","Prévoir une version résumée du programme (PTD) pour faciliter le partage avec la MOA si le document complet est trop volumineux.","Retex AI — Rédaction de Programme",["RETEX"]],
];
const CL_TDR=[
["td01","Contenu","Les TdR précisent les livrables, les délais et les expertises à fournir. Les exigences en experts internationaux et/ou expertises internationales doivent être clairement indiquées. Contrôler la cohérence TdR / grille d'évaluation / articulation avec les paiements.","Réf. Dir. §5.2 — Checklist APM DP §VII",["DIR","APM"]],
["td02","Contenu","Les TdR ne contiennent aucune disposition sur les critères d'évaluation des Propositions (réservés aux Données Particulières §II) ni sur les modalités de paiement du contrat (réservées aux Conditions du Contrat §VIII).","Checklist APM DP §VII",["APM"]],
["td03","ESSS","Pour les TdR des missions de MOE travaux (études, appui passation, supervision), des compléments spécifiques sur les missions relatives aux aspects ESSS ont été développés. Disponibles auprès de GPS/AES.","Checklist APM DP §VII",["APM"]],
["td04","Rendus MOE","Bien cadrer les rendus attendus sur les gros projets. Par exemple, imposer le sommaire et le contenu indicatif de la notice architecturale. Donner le tableau de surfaces vide au format souhaité. Prévoir un tableau récapitulatif par lot technique.","Retex AI — Rédaction de TdR",["RETEX"]],
["td05","Phases","Si nécessaire pour la complexité du projet, insister pour faire 3 phases de conception (APS-APD-PRO) au lieu de 2, même si la norme locale ne le prévoit pas.","Retex AI — Rédaction de TdR",["RETEX"]],
["td06","STD","Bien cadrer ce qui est demandé pour la STD, surtout dans les pays où ce n'est pas courant. Éventuellement ne rien demander en APS.","Retex AI — Rédaction de TdR",["RETEX"]],
["td07","Personnels clés","Être clair dans la demande d'avoir un architecte dans l'équipe. Être clair sur les profils requis et les exigences de présence sur site.","Retex AI — Rédaction de TdR",["RETEX"]],
["td08","Facturation","Simplifier au maximum la facturation. Essayer de garder un paiement à la livraison plutôt qu'à l'avancement, qui est complexe à gérer.","Retex AI — Rédaction de TdR",["RETEX"]],
["td09","Enveloppe","Prévoir un § dans les TdR + contrat sur le respect de l'enveloppe prévisionnelle travaux.","Retex AI — Rédaction de TdR",["RETEX"]],
["td10","Livrables","Ajouter dans la liste des livrables une notice explicative sur l'estimation AVP et faire valider le tableau des estimations avant le rendu AVP.","Retex AI — Rédaction de TdR",["RETEX"]],
];

const CLS_TVX={dao:CL_DAO,rapport:CL_RAP,contrat:CL_CTR};
const CLS_PI={ami:CL_AMI,lr:CL_LR,prog:CL_PROG,tdr:CL_TDR,dp:CL_DP,evtech:CL_EVTECH,evfin:CL_EVFIN,nego:CL_NEGO,cpi:CL_CTRPI};
const TABS_TVX=[{id:"dao",l:"DAO"},{id:"rapport",l:"Rapport évaluation"},{id:"contrat",l:"Contrat"}];
const TABS_PI=[{id:"ami",l:"AMI"},{id:"lr",l:"Liste restreinte"},{id:"prog",l:"Programme"},{id:"tdr",l:"Termes de Référence"},{id:"dp",l:"Dem. Propositions"},{id:"evtech",l:"Éval. technique"},{id:"evfin",l:"Éval. fin./combinée"},{id:"nego",l:"Négociations"},{id:"cpi",l:"Contrat"}];

async function sG(k){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):null}catch{return null}}
async function sS(k,v){try{await window.storage.set(k,JSON.stringify(v))}catch(e){console.error(e)}}
function SI({name:n,act:a}){const c=a?"#E30513":"rgba(255,255,255,0.55)";const w="1.5";const P={folder:<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke={c} strokeWidth={w} fill="none"/>,search:<><circle cx="11" cy="11" r="8" stroke={c} strokeWidth={w} fill="none"/><path d="M21 21l-4.35-4.35" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/></>,book:<><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke={c} strokeWidth={w} fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke={c} strokeWidth={w} fill="none"/></>,scale:<path d="M16 3l-4 4-4-4M12 7v14M4 14l4-4 4 4M20 14l-4-4-4 4" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none"/>,file:<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={c} strokeWidth={w} fill="none"/><polyline points="14 2 14 8 20 8" stroke={c} strokeWidth={w} fill="none"/></>,settings:<><circle cx="12" cy="12" r="3" stroke={c} strokeWidth={w} fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={c} strokeWidth={w} fill="none"/></>,
    edit:<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke={c} strokeWidth={w} fill="none"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke={c} strokeWidth={w} fill="none"/></>};return<svg width="18" height="18" viewBox="0 0 24 24">{P[n]}</svg>;}

function RI({id,text,tip,sr,st,cm,onChange}){
  return<div style={{padding:"8px 12px",borderBottom:"1px solid #DFE4E8",fontSize:13}}>
    <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
      <div style={{display:"flex",gap:3,flexShrink:0,marginTop:2}}>
        {[["ok","C","#22c55e"],["nok","NC","#E30513"],["na","NA","#999"]].map(([v,l,co])=>
          <button key={v} onClick={()=>onChange(id,"status",v)} style={{width:26,height:20,borderRadius:3,border:st===v?"2px solid "+co:"1px solid #DFE4E8",background:st===v?co:"#fff",color:st===v?"#fff":"#aaa",fontSize:9,fontWeight:700,cursor:"pointer",padding:0}}>{l}</button>
        )}
      </div>
      <div style={{flex:1}}>
        <div style={{color:"#30323E",lineHeight:1.4}}>{text}</div>
        {tip&&<div style={{fontSize:11,color:"#4D4D4D",marginTop:3,fontStyle:"italic"}}>{tip}</div>}
        <div style={{display:"flex",gap:3,marginTop:3}}>{sr.map(s=>{const x=SRC.find(z=>z.id===s);return<span key={s} style={{padding:"1px 7px",borderRadius:10,fontSize:8,fontWeight:700,background:x?.co||"#999",color:"#fff"}}>{x?.lb||s}</span>;})}</div>
      </div>
    </div>
    {(st==="nok"||cm)&&<textarea placeholder="Commentaire..." value={cm||""} onChange={e=>onChange(id,"comment",e.target.value)} style={{width:"100%",marginTop:6,padding:"5px 8px",border:"1.5px solid #DFE4E8",borderRadius:4,fontSize:12,fontFamily:"'Open Sans',sans-serif",resize:"vertical",minHeight:36,outline:"none"}}/>}
  </div>;
}

export default function App(){
  const[data,setData]=useState({countries:[],projects:{},markets:{},equipe:DEQ,reviews:{}});
  const[ld,setLd]=useState(false);
  const[selC,sC]=useState(null);const[selP,sP]=useState(null);const[selM,sM]=useState(null);
  const[nav,sNav]=useState("projets");const[ep,sEp]=useState(false);
  const[sNC,sSNC]=useState(false);const[sNP,sSNP]=useState(false);const[sNM,sSNM]=useState(false);
  const[ncN,sNcN]=useState("");const[npN,sNpN]=useState("");
  const[nmN,sNmN]=useState("");const[nmT,sNmT]=useState("");const[nmR,sNmR]=useState("relecture");
  const[nmM,sNmM]=useState("");const[nmMt,sNmMt]=useState("");const[nmST,sNmST]=useState("");const[nmDA,sNmDA]=useState("");const[nmDL,sNmDL]=useState("");const[nmDD,sNmDD]=useState("");const[nmDS,sNmDS]=useState("");const[nmDSig,sNmDSig]=useState("");
  const[sq,sSq]=useState("");const[ft,sFt]=useState("");const[fc,sFc]=useState("");
  const[nMem,sNMem]=useState("");const[mTab,sMTab]=useState("dao");const[srcF,sSrcF]=useState(null);
  const[refFilter,sRefFilter]=useState("");const[refEdit,sRefEdit]=useState(null);const[refLogEntry,sRefLogEntry]=useState("");
  const[memoPays,sMemoPays]=useState("");
  const[memoTheme,sMemoTheme]=useState("");
  const[retexTheme,sRetexTheme]=useState("");const[retexKw,sRetexKw]=useState([]);const[retexSearch,sRetexSearch]=useState("");const[showNewRetex,sShowNewRetex]=useState(false);const[nrTheme,sNrTheme]=useState("");const[nrKw,sNrKw]=useState([]);const[nrProject,sNrProject]=useState("");const[nrEditor,sNrEditor]=useState("");const[nrComment,sNrComment]=useState("");
  const[editCat,sEditCat]=useState("Travaux");const[editDoc,sEditDoc]=useState("dao");const[editSrcF,sEditSrcF]=useState(null);
  const[editMkt,sEditMkt]=useState(null);
  const[rexCat,sRexCat]=useState("");const[rexDoc,sRexDoc]=useState("");
  const[rexSec,sRexSec]=useState("");const[rexTxt,sRexTxt]=useState("");
  const[rexTip,sRexTip]=useState("");const[rexAuteur,sRexAuteur]=useState("");
  const[rexPays,sRexPays]=useState("");const[rexProjet,sRexProjet]=useState("");
  const[rexCond,sRexCond]=useState("");
  useEffect(()=>{sG("apd8").then(d=>{if(d)setData(d);setLd(true)});},[]);
  const sv=useCallback(nd=>{setData(nd);sS("apd8",nd);},[]);
  const saveTextOverride=(itemId,field,value)=>{const ov={...(data.textOverrides||{}),[itemId]:{...((data.textOverrides||{})[itemId]||{}),[field]:value}};sv({...data,textOverrides:ov});};
  const getOv=(itemId,field,orig)=>{const o=(data.textOverrides||{})[itemId];return o&&o[field]!==undefined?o[field]:orig;};
  const getMarketStep=(mid,cat)=>{
    var tabs=cat==="PI"?TABS_PI:TABS_TVX;
    var cls=cat==="PI"?CLS_PI:CLS_TVX;
    for(var i=0;i<tabs.length;i++){
      var t=tabs[i];var mk=mid+"_"+t.id;var rv=(data.reviews||{})[mk]||{};
      var items=cls[t.id]||[];
      if(items.length===0)continue;
      var filled=Object.keys(rv).filter(function(k){return rv[k]&&rv[k].status;}).length;
      if(filled===0)return{idx:i,tab:t,label:t.l,status:"todo",progress:0};
      if(filled<items.length)return{idx:i,tab:t,label:t.l,status:"wip",progress:Math.round(filled/items.length*100)};
    }
    return{idx:tabs.length-1,tab:tabs[tabs.length-1],label:"Terminé",status:"done",progress:100};
  };


  const aC=()=>{if(!ncN.trim())return;const id="C"+Date.now();sv({...data,countries:[...data.countries,{id,name:ncN.trim()}],projects:{...data.projects,[id]:[]}});sNcN("");sSNC(false);};
  const rC=cid=>{if(!confirm("Supprimer ce pays ?"))return;const nd={...data};nd.countries=nd.countries.filter(c=>c.id!==cid);(nd.projects[cid]||[]).forEach(p=>delete nd.markets[p.id]);delete nd.projects[cid];sv(nd);if(selC===cid){sC(null);sP(null);sM(null);}};
  const aP=()=>{if(!npN.trim()||!selC)return;const id="P"+Date.now();sv({...data,projects:{...data.projects,[selC]:[...(data.projects[selC]||[]),{id,name:npN.trim(),sec:"",dir:"2024",secu:"standard",verif:"eac",mt:"",desc:"",lang:"Français",tcon:"",ctx:"",site:"",resp:"",eq:[]}]},markets:{...data.markets,[id]:[]}});sNpN("");sSNP(false);};
  const rP=pid=>{if(!confirm("Supprimer ?"))return;sv({...data,projects:{...data.projects,[selC]:(data.projects[selC]||[]).filter(p=>p.id!==pid)}});if(selP===pid){sP(null);sM(null);}};
  const uP=(pid,u)=>{sv({...data,projects:{...data.projects,[selC]:(data.projects[selC]||[]).map(p=>p.id===pid?{...p,...u}:p)}});};
  const aM=()=>{if(!nmN.trim()||!nmT||!selP)return;const tp=TYPES.find(t=>t.v===nmT);sv({...data,markets:{...data.markets,[selP]:[...(data.markets[selP]||[]),{id:"M"+Date.now(),name:nmN.trim(),type:nmT,tl:tp?.l||"",cat:tp?.c||"",role:nmR,meth:nmM,mont:nmMt,st:nmST,date:new Date().toISOString().slice(0,10),dateAmi:nmDA,dateLr:nmDL,dateDp:nmDD,dateSel:nmDS,dateSig:nmDSig}]}});sNmN("");sNmT("");sNmM("");sNmMt("");sNmST("");sNmDA("");sNmDL("");sNmDD("");sNmDS("");sNmDSig("");sSNM(false);};
  const rM=mid=>{if(!confirm("Supprimer ?"))return;sv({...data,markets:{...data.markets,[selP]:(data.markets[selP]||[]).filter(m=>m.id!==mid)}});if(selM===mid)sM(null);};
  const uM=(mid,updates)=>{sv({...data,markets:{...data.markets,[selP]:(data.markets[selP]||[]).map(m=>m.id===mid?{...m,...updates}:m)}});};

  const aEq=()=>{if(!nMem.trim())return;sv({...data,equipe:[...(data.equipe||[]),nMem.trim()]});sNMem("");};
  
  const addRex=()=>{if(!rexCat||!rexDoc||!rexTxt.trim())return;const allTabs=[...TABS_TVX,...TABS_PI];const docLabel=(allTabs.find(t=>t.id===rexDoc)||{}).l||rexDoc;const newRex={id:"REX"+Date.now(),cat:rexCat,doc:rexDoc,docLabel,section:rexSec.trim()||"Retour d'expérience",text:rexTxt.trim(),tip:rexTip.trim(),auteur:rexAuteur,pays:rexPays.trim(),projet:rexProjet.trim(),conditions:rexCond.trim(),date:new Date().toISOString().slice(0,10)};sv({...data,rexItems:[...(data.rexItems||[]),newRex]});sRexTxt("");sRexTip("");sRexSec("");sRexPays("");sRexProjet("");sRexCond("");};
const tEq=(pid,nm)=>{const p=(data.projects[selC]||[]).find(x=>x.id===pid);if(!p)return;const eq=p.eq||[];uP(pid,{eq:eq.includes(nm)?eq.filter(n=>n!==nm):[...eq,nm]});};
  const hRC=(iid,f,v)=>{const rv={...(data.reviews||{})};const mk=selM+"_"+mTab;if(!rv[mk])rv[mk]={};if(!rv[mk][iid])rv[mk][iid]={};rv[mk][iid][f]=v;sv({...data,reviews:rv});};
  const gI=(iid)=>{const mk=selM+"_"+mTab;return((data.reviews||{})[mk]||{})[iid]||{};

};

  const allM=useMemo(()=>{const r=[];data.countries.forEach(c=>(data.projects[c.id]||[]).forEach(p=>(data.markets[p.id]||[]).forEach(m=>r.push({...m,pN:p.name,cN:c.name,cI:c.id,pI:p.id}))));return r;},[data]);
  const fM=useMemo(()=>{let r=allM;if(sq){const q=sq.toLowerCase();r=r.filter(m=>(m.name+m.pN+m.tl+m.cN).toLowerCase().includes(q));}if(ft)r=r.filter(m=>m.type===ft);if(fc)r=r.filter(m=>m.cI===fc);return r;},[allM,sq,ft,fc]);
  const cPs=selC?(data.projects[selC]||[]):[];const pMs=selP?(data.markets[selP]||[]):[];
  const cC=data.countries.find(c=>c.id===selC);const cP=cPs.find(p=>p.id===selP);const cM=pMs.find(m=>m.id===selM);
  const cCat=nmT?(TYPES.find(t=>t.v===nmT)||{}).c:null;const eq=data.equipe||DEQ;

  // Filtered checklist items
  const clItems=useMemo(()=>{const raw=[...((selM&&cM?(cM.cat==="PI"?CLS_PI:CLS_TVX):CLS_TVX)[mTab]||[]),...((data.rexItems||[]).filter(rx=>{const isP=cM?.cat==="PI";return(isP?rx.cat==="PI":rx.cat==="Travaux")&&rx.doc===mTab;}).map(rx=>[rx.id,rx.section,rx.text,rx.tip,["REX"]]))];if(!srcF)return raw;return raw.filter(r=>r[4].includes(srcF));},[mTab,srcF]);
  const clSections=useMemo(()=>{const seen=new Set();return clItems.reduce((a,r)=>{if(!seen.has(r[1])){seen.add(r[1]);a.push(r[1]);}return a;},[]);},[clItems]);
  const rSt=useMemo(()=>{if(!selM)return{ok:0,nk:0,na:0};const mk=selM+"_"+mTab;const rv=(data.reviews||{})[mk]||{};let ok=0,nk=0,na=0;Object.values(rv).forEach(r=>{if(r.status==="ok")ok++;else if(r.status==="nok")nk++;else if(r.status==="na")na++;});return{ok,nk,na};},[data.reviews,selM,mTab]);

  if(!ld)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'Open Sans',sans-serif"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:40,height:40,border:"3px solid #DFE4E8",borderTop:"3px solid #E30513",borderRadius:"50%",animation:"spin 1s linear infinite"}}/></div>;

  const home=()=>{sC(null);sP(null);sM(null);sEp(false);sNav("projets");};
  const B=({bg,co,children})=><span style={{display:"inline-block",padding:"2px 10px",borderRadius:12,fontSize:11,fontWeight:600,background:bg,color:co}}>{children}</span>;
  const DC=({sel,onClick,title})=><div onClick={onClick} style={{padding:"7px 14px",borderRadius:6,cursor:"pointer",border:sel?"2px solid #30323E":"1.5px solid #DFE4E8",background:sel?"#30323E":"#fff",color:sel?"#fff":"#30323E",fontWeight:600,fontSize:13}}>{title}</div>;

  /* ═══ MARKET PAGE ═══ */
  if(selM&&cM){
    const isPI=cM.cat==="PI";
    const curCLS=isPI?CLS_PI:CLS_TVX;
    const curTabs=isPI?TABS_PI:TABS_TVX;
    const defTab=isPI?"ami":"dao";
    const exportNote=()=>{
    var items=[...(curCLS[mTab]||[]),...((data.rexItems||[]).filter(function(rx){return(isPI?rx.cat==="PI":rx.cat==="Travaux")&&rx.doc===mTab;}).map(function(rx){return[rx.id,rx.section,rx.text,rx.tip,["REX"]];}))];
    var mk=selM+"_"+mTab;
    var rv=(data.reviews||{})[mk]||{};
    var tabLabel=(curTabs.find(function(t){return t.id===mTab;})||{}).l||mTab;
    var ok=0,nok=0,na=0,nr=0;
    items.forEach(function(r){var s=(rv[r[0]]||{}).status;if(s==="ok")ok++;else if(s==="nok")nok++;else if(s==="na")na++;else nr++;});
    // CSS
    var css="*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;margin:40px;color:#30323E;font-size:11pt;line-height:1.6}";
    css+="h1{color:#E30513;font-size:18pt;margin:4px 0}h2{color:#30323E;font-size:14pt;margin-top:28px;border-bottom:2px dotted #E30513;padding-bottom:4px}";
    css+=".ban{background:#E30513;color:#fff;padding:10px 20px;text-align:center;font-weight:700;font-size:11pt;margin-bottom:20px}";
    css+=".hdr{background:#F2F2F2;padding:12px 20px;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:16px}";
    css+=".hdr img{height:36px}";
    css+=".rt{border-collapse:collapse;width:100%}.rt td{padding:4px 10px;font-size:10pt;border-bottom:1px solid #DFE4E8;vertical-align:top}.rt .lb{font-weight:600;color:#4D4D4D;white-space:nowrap;width:220px}";
    css+=".syn{display:flex;gap:16px;margin:16px 0}.syn div{padding:10px 24px;border-radius:6px;text-align:center;font-weight:700;font-size:15pt}";
    css+=".ok{background:#dcfce7;color:#16a34a}.nk{background:#F9E1E3;color:#E30513}.naa{background:#F2F2F2;color:#666}";
    css+=".leg{background:#F2F2F2;padding:8px 16px;font-size:9pt;margin-bottom:16px;border-radius:4px}";
    css+="table.cl{width:100%;border-collapse:collapse;margin-top:8px;font-size:10pt}";
    css+="table.cl th{background:#30323E;color:#fff;padding:6px 10px;text-align:left;font-size:9pt}";
    css+="table.cl td{padding:8px 10px;border-bottom:1px solid #DFE4E8;vertical-align:top}";
    css+="tr.nkr{background:#FEF2F2}tr.nkr td{border-bottom-color:#fca5a5}";
    css+=".bdg{display:inline-block;padding:1px 8px;border-radius:10px;font-size:8pt;font-weight:700;color:#fff;margin-right:3px}";
    css+=".obs{font-style:italic;color:#E30513;font-size:9pt;margin-top:6px;padding:4px 8px;background:#FEF2F2;border-radius:4px}";
    css+=".tip{color:#4D4D4D;font-size:9pt;font-style:italic;padding-left:8px;border-left:2px solid #DFE4E8;margin-top:4px}";
    css+=".ftr{margin-top:40px;padding-top:8px;border-top:1px solid #ccc;font-size:8pt;color:#4D4D4D;display:flex;justify-content:space-between;align-items:center}";
    css+=".ftr img{height:18px;margin-right:6px}";
    css+="@media print{body{margin:15mm}.ban{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";
    var h="<!DOCTYPE html><html><head><meta charset=utf-8><title>Note de relecture - "+cM.name+"</title><style>"+css+"</style></head><body>";
    // Bandeau catégorie + étape
    var catTxt=isPI?"PRESTATIONS INTELLECTUELLES":"TRAVAUX";
    h+="<div class=ban>"+catTxt+" — Étape : "+tabLabel.toUpperCase()+"</div>";
    h+="<h1>NOTE DE RELECTURE</h1>";
    h+="<p style=font-size:13pt;font-weight:700;color:#30323E>"+cM.name+"</p>";
    h+="<p style=color:#4D4D4D;border-bottom:3px solid #E30513;padding-bottom:8px;margin-bottom:20px>"+new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})+"</p>";
    // 1. Récapitulatif
    h+="<h2>1. Récapitulatif du marché et de la procédure</h2><table class=rt>";
    var rr=[["Pays",cC?cC.name:""],["Projet",cP?cP.name:""],["Intitulé du marché",cM.name],["Catégorie",cM.cat||""],["Type de procédure",cM.tl||""],["Méthode de sélection",cM.method||cM.meth||""],["Montant estimé",cM.mont||cM.amount||""]];
    if(cM.st||cM.subtype)rr.push(["Nature PI",cM.st||cM.subtype]);
    rr.push(["Rôle Assemblage ingénierie",cM.role==="production"?"Production":"Relecture"]);
    if(cP){
      if(cP.sec)rr.push(["Secteur",cP.sec]);
      rr.push(["Directives applicables",cP.dir==="2024"?"Directives 2024 — Option B":"Directives 2019 — Option A"]);
      if(cP.tcon)rr.push(["Type de construction",cP.tcon]);
      if(cP.ctx)rr.push(["Contexte",cP.ctx]);
      if(cP.site)rr.push(["Site",cP.site]);
      if(cP.secu==="zone-risque")rr.push(["Contexte sécuritaire","Zone à risque — Art. 1.5.2"]);
      var vl2=cP.verif==="eac"?"Ex-ante complète":cP.verif==="eas"?"Ex-ante simplifiée":"Ex-post";
      rr.push(["Modalité de vérification AFD",vl2]);
    }
    rr.forEach(function(r){if(r[1])h+="<tr><td class=lb>"+r[0]+"</td><td>"+r[1]+"</td></tr>";});
    h+="</table>";
    // Calendrier
    var dt=[];
    if(cM.dateAmi)dt.push(["Publication AMI / Pré-qualification",new Date(cM.dateAmi).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})]);
    if(cM.dateLr)dt.push(["Validation liste restreinte",new Date(cM.dateLr).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})]);
    if(cM.dateDp)dt.push(["Diffusion DP / AO",new Date(cM.dateDp).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})]);
    if(cM.dateSel)dt.push(["Sélection du lauréat",new Date(cM.dateSel).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})]);
    if(cM.dateSig)dt.push(["Signature du contrat",new Date(cM.dateSig).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})]);
    if(dt.length>0){h+="<h3 style=margin-top:16px;color:#30323E>Calendrier</h3><table class=rt>";dt.forEach(function(d){h+="<tr><td class=lb>"+d[0]+"</td><td>"+d[1]+"</td></tr>";});h+="</table>";}
    // 2. Synthèse
    h+="<h2>2. Synthèse de la relecture</h2>";
    h+="<p>La présente note porte sur la relecture de la <strong>"+tabLabel+"</strong> du marché de "+((cM.cat||"").toLowerCase())+" « "+cM.name+" »"+(cP?" dans le cadre du projet "+cP.name:"")+(cC?" en "+cC.name:"")+".</p>";
    h+="<div class=syn><div class=ok>"+ok+" Conforme"+(ok>1?"s":"")+"</div><div class=nk>"+nok+" Non-conforme"+(nok>1?"s":"")+"</div><div class=naa>"+na+" N/A</div></div>";
    // 3. Détail
    h+="<h2>3. Détail de la relecture par section</h2>";
    h+="<div class=leg><strong>Légende</strong> — <strong style=color:#30323E>DIR</strong> = Directives de l'AFD pour la Passation des Marchés (2024) • <strong style=color:#E30513>APM</strong> = Checklist Appui à la Passation des Marchés • <strong style=color:#16a34a>C</strong> = Conforme • <strong style=color:#E30513>NC</strong> = Non conforme • <strong style=color:#666>NA</strong> = Non applicable</div>";
    var secs=[],seen3={};
    items.forEach(function(r){if(!seen3[r[1]]){seen3[r[1]]=1;secs.push(r[1]);}});
    secs.forEach(function(sec){
      var si=items.filter(function(r){return r[1]===sec;});
      h+="<h3 style=margin-top:20px;color:#30323E>"+sec+" <span style=font-weight:400;color:#999;font-size:10pt>("+si.length+" items)</span></h3>";
      h+="<table class=cl><tr><th style=width:80px>Source</th><th>Point de vérification</th><th style=width:55px>Statut</th></tr>";
      si.forEach(function(r){
        var d=rv[r[0]]||{};var st=d.status;
        var stL=st==="ok"?"C":st==="nok"?"NC":st==="na"?"NA":"—";
        var stC=st==="ok"?"#16a34a":st==="nok"?"#E30513":st==="na"?"#666":"#ccc";
        var stBg=st==="ok"?"#dcfce7":st==="nok"?"#F9E1E3":st==="na"?"#F2F2F2":"#fff";
        var rc=st==="nok"?" class=nkr":"";
        var txt=getOv(r[0],"text",r[2]);var tp=getOv(r[0],"tip",r[3]);
        h+="<tr"+rc+"><td>";
        r[4].forEach(function(s){var co=s==="DIR"?"#30323E":s==="APM"?"#E30513":s==="RETEX"?"#2563eb":"#f59e0b";h+="<span class=bdg style=background:"+co+">"+s+"</span>";});
        h+="</td><td>"+txt;
        if(tp)h+="<div class=tip>"+tp+"</div>";
        if(d.comment)h+="<div class=obs>Observation : "+d.comment+"</div>";
        h+="</td><td style=text-align:center;background:"+stBg+"><strong style=color:"+stC+">"+stL+"</strong></td></tr>";
      });
      h+="</table>";
    });
    h+="<div class=ftr><span>Assemblage ingénierie — 79 rue Victor Hugo, 94200 Ivry-sur-Seine — assemblage.net</span><span>"+new Date().toLocaleDateString("fr-FR")+" "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+"</span></div>";
    h+="</body></html>";
    try{var w=window.open("","_blank","width=900,height=700");if(w){w.document.write(h);w.document.close();w.document.title="Note relecture - "+cM.name;}else{alert("Le navigateur a bloqué le popup. Autorisez les popups pour ce site.");}}catch(e){alert("Erreur export: "+e.message);}
  };

    const tabs=curTabs;
    const catColor=isPI?"#E30513":"#30323E";
    const totalItems=(curCLS[mTab]||[]).length;
    return(
      <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Open Sans',sans-serif",overflow:"hidden"}}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input,select,button,textarea{font-family:'Open Sans',sans-serif}button{cursor:pointer}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#DFE4E8;border-radius:3px}`}</style>
        <div style={{background:catColor,color:"#fff",padding:"14px 24px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <button onClick={()=>{sM(null);sSrcF(null);sMTab(defTab);}} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer"}}>←</button>
          <Fg n={cC?.name} s={24}/>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{cM.name}</div><div style={{fontSize:11,opacity:.7}}>{cC?.name} · {cP?.name} · {cM.tl}</div></div>
          <B bg="#22c55e" co="#fff">{rSt.ok} C</B><B bg="#E30513" co="#fff">{rSt.nk} NC</B><B bg="#666" co="#fff">{rSt.na} NA</B>
          <span style={{fontSize:11,opacity:.5}}>{totalItems-rSt.ok-rSt.nk-rSt.na} rest.</span>
          <B bg={cM.role==="production"?"#F9E1E3":"#DFE4E8"} co="#30323E">{cM.role==="production"?"Prod.":"Relect."}</B>
          <button onClick={()=>exportNote()} style={{background:"#fff",border:"1.5px solid #fff",borderRadius:4,padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer",color:"#30323E",marginLeft:8}}>Exporter note ↓</button>
        </div>
        <div style={{display:"flex",borderBottom:"2px solid #DFE4E8",background:"#F2F2F2",flexShrink:0}}>
          {tabs.map(t=><div key={t.id} onClick={()=>{sMTab(t.id);sSrcF(null);}} style={{padding:"10px 18px",cursor:"pointer",fontSize:13,fontWeight:mTab===t.id?700:400,color:mTab===t.id?catColor:"#4D4D4D",borderBottom:mTab===t.id?"3px solid "+catColor:"3px solid transparent",background:mTab===t.id?"#fff":"transparent"}}>{t.l} <span style={{fontSize:11,opacity:.5}}>({(curCLS[t.id]||[]).length})</span></div>)}
        </div>
        <div style={{padding:"10px 24px",display:"flex",gap:8,alignItems:"center",borderBottom:"1px solid #DFE4E8",flexShrink:0}}>
          <span style={{fontSize:12,color:"#4D4D4D",fontWeight:600}}>Source :</span>
          <span onClick={()=>sSrcF(null)} style={{padding:"3px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",border:!srcF?"2px solid #30323E":"1.5px solid #DFE4E8",background:!srcF?"#30323E":"#fff",color:!srcF?"#fff":"#30323E"}}>Toutes</span>
          {SRC.map(s=>{const cnt=(curCLS[mTab]||[]).filter(r=>r[4].includes(s.id)).length;if(!cnt)return null;return<span key={s.id} onClick={()=>sSrcF(srcF===s.id?null:s.id)} style={{padding:"3px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",border:srcF===s.id?"2px solid "+s.co:"1.5px solid #DFE4E8",background:srcF===s.id?s.co:"#fff",color:srcF===s.id?"#fff":"#30323E"}}>{s.lb} ({cnt})</span>;})}
        </div>
        
        {/* Alertes contextuelles */}
        {(()=>{
          var alerts=[];
          if(cP&&cP.secu==="zone-risque")alerts.push({co:"#E30513",bg:"#FEF2F2",tx:"Zone à risque (Art. 1.5.2) — Vérifier l'inclusion de la Déclaration d'Engagement Sûreté (Annexe 4 des Directives 2024) et des exigences minima de sûreté dans les documents de passation."});
          if(cP&&cP.dir==="2019")alerts.push({co:"#f59e0b",bg:"#FFFBEB",tx:"Directives 2019 (Option A) — Ce projet est soumis aux Directives 2019 antérieures. Certaines dispositions diffèrent (seuils, modalités de vérification, exigences ESSS)."});
          if(cP&&cP.site==="Multisite")alerts.push({co:"#2563eb",bg:"#EFF6FF",tx:"Projet multisite — Attention aux processus de paiement chronophages. Décentraliser la gestion opérationnelle. S'assurer que la passation des marchés est suffisamment staffée."});
          if(cP&&cP.lang&&cP.lang!=="Français")alerts.push({co:"#30323E",bg:"#F2F2F2",tx:"Projet "+cP.lang.toLowerCase()+" — Vérifier la cohérence des termes techniques. Attention aux différences de définitions (ex: Gross Floor Area vs Surface de Plancher)."});
          if(cP&&cP.ctx==="Rural")alerts.push({co:"#16a34a",bg:"#F0FDF4",tx:"Contexte rural — Prendre en compte les contraintes d'accès, de logistique et de disponibilité des entreprises locales."});
          if(alerts.length===0)return null;
          return<div style={{padding:"8px 20px",borderBottom:"1px solid #DFE4E8",flexShrink:0}}>
            {alerts.map(function(a,i){return<div key={i} style={{background:a.bg,borderLeft:"3px solid "+a.co,borderRadius:4,padding:"8px 12px",marginBottom:4,fontSize:12,color:"#30323E",lineHeight:1.4}}>
              <strong style={{color:a.co}}>Alerte</strong> — {a.tx}
            </div>;})}
          </div>;
        })()}
<div style={{flex:1,overflow:"auto",padding:20}}>
          <div style={{maxWidth:880,margin:"0 auto"}}>

            {/* Conseils pertinents pour cet onglet */}
            {(()=>{
              var tabKeywords={"dao":"DAO","rapport":"DAO","contrat":"DAO","ami":"AMI","lr":"AMI","prog":"Programme","tdr":"TdR","dp":"DP","evtech":"DP","evfin":"DP","nego":"DP","cpi":"DP"};
              var kw=tabKeywords[mTab];var kwFull={"DAO":"DAO","AMI":"AMI","Programme":"Programme","TdR":"Termes de Référence","DP":"Demande de Propositions"};
              if(!kw)return null;
              var allR=[...RETEX_DATA,...(data.customRetex||[])];
              var primaryMatch=allR.filter(function(r){if(!r.th)return false;var primary=r.th.split(",")[0].trim().replace("Rédaction de ","").replace("Rédaction d'","");return primary===kw;});
              var conseils=primaryMatch.length>0?primaryMatch:allR.filter(function(r){if(!r.th)return false;return r.th.indexOf(kw)!==-1;});
              if(conseils.length===0)return null;
              return<div style={{marginBottom:20}}>
                <div style={{background:"#2563eb",color:"#fff",padding:"8px 14px",borderRadius:"6px 6px 0 0",fontWeight:700,fontSize:13,display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={function(){var el=document.getElementById("conseils-panel");if(el)el.style.display=el.style.display==="none"?"block":"none";}}>
                  <span>Conseils — {kwFull[kw]||kw}</span>
                  <span style={{opacity:.5}}>{conseils.length} conseil{conseils.length>1?"s":""}</span>
                </div>
                <div id="conseils-panel" style={{border:"1px solid #DFE4E8",borderTop:"none",borderRadius:"0 0 6px 6px",maxHeight:300,overflow:"auto",display:"none"}}>
                  {conseils.map(function(r,i){return<div key={r.id||i} style={{padding:"8px 14px",borderBottom:"1px solid #F2F2F2",fontSize:12}}>
                    <div style={{display:"flex",gap:4,marginBottom:3}}>
                      {r.kw&&r.kw.split(" / ").slice(0,3).map(function(k,j){return k.trim()?<span key={j} style={{padding:"1px 6px",borderRadius:8,fontSize:8,fontWeight:600,background:"#EFF6FF",color:"#2563eb"}}>{k.trim()}</span>:null;})}
                      {r.custom&&<span style={{padding:"1px 6px",borderRadius:8,fontSize:8,fontWeight:700,background:"#f59e0b",color:"#fff"}}>PERSO</span>}
                    </div>
                    <div style={{color:"#30323E",lineHeight:1.4}}>{r.cm}</div>
                    {(r.ed||r.pj)&&<div style={{fontSize:10,color:"#999",marginTop:2}}>{r.ed}{r.pj?" — "+r.pj:""}</div>}
                  </div>;})}
                </div>
              </div>;
            })()}
            {clSections.map((sec,si)=>{const items=clItems.filter(r=>r[1]===sec);return<div key={si} style={{marginBottom:16}}>
              <div style={{background:catColor,color:"#fff",padding:"7px 12px",borderRadius:"6px 6px 0 0",fontWeight:700,fontSize:12,display:"flex",justifyContent:"space-between"}}><span>{sec}</span><span style={{opacity:.5}}>{items.length}</span></div>
              <div style={{border:"1px solid #DFE4E8",borderTop:"none",borderRadius:"0 0 6px 6px"}}>{items.map(r=>{const d=gI(r[0]);return<RI key={r[0]} id={r[0]} text={getOv(r[0],"text",r[2])} tip={getOv(r[0],"tip",r[3])} sr={r[4]} st={d.status} cm={d.comment} onChange={hRC}/>;})}
            
            </div>
            </div>;})}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ MAIN ═══ */
  const NI=[{id:"projets",ic:"folder",lb:"Projets"},{id:"recherche",ic:"search",lb:"Recherche marchés"},{id:"memo",ic:"book",lb:"Mémo Passation"},{id:"codes",ic:"scale",lb:"Mémo Codes"},{id:"ref",ic:"file",lb:"Référentiel AFD"},{id:"parametrage",ic:"edit",lb:"Paramétrage checklists"},{id:"admin",ic:"settings",lb:"Administration"}];
  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Open Sans',sans-serif",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input,select,button,textarea{font-family:'Open Sans',sans-serif}button{cursor:pointer}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#DFE4E8;border-radius:3px}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.fade{animation:fadeIn .25s ease-out}.card{transition:all .2s;border:1.5px solid #DFE4E8;border-radius:8px;padding:20px;cursor:pointer;position:relative}.card:hover{box-shadow:0 4px 20px rgba(0,0,0,.07)}.ni{transition:all .15s;display:flex;align-items:center;gap:12px;padding:12px 20px;cursor:pointer}.ni:hover{background:rgba(255,255,255,.08)}.br{background:#E30513;color:#fff;border:none;padding:8px 20px;border-radius:4px;font-weight:600;font-size:13px}.bo{background:transparent;color:#30323E;border:1.5px solid #DFE4E8;padding:8px 20px;border-radius:4px;font-weight:600;font-size:13px}.bo:hover{border-color:#E30513;color:#E30513}.ip{border:1.5px solid #DFE4E8;border-radius:4px;padding:8px 12px;font-size:14px;width:100%;outline:none;background:#fff}.ip:focus{border-color:#E30513}textarea.ip{resize:vertical;min-height:50px}.lb{font-size:12px;font-weight:600;color:#4D4D4D;display:block;margin-bottom:4px}.del{background:none;border:none;opacity:.2;position:absolute;top:12px;right:12px;font-size:16px}.del:hover{opacity:1}`}</style>
      <div style={{height:72,background:"#F2F2F2",display:"flex",alignItems:"center",padding:"0 24px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flex:1}}>
          <div style={{width:32,height:32,background:"#E30513",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16}}>.A</div>
          <span style={{fontWeight:700,fontSize:14,color:"#30323E",lineHeight:1.2}}>Assemblage<br/><span style={{fontWeight:400,fontSize:11,color:"#4D4D4D"}}>ingénierie</span></span>
          <div style={{width:1,height:36,background:"#DFE4E8"}}/>
          <span style={{fontWeight:700,fontSize:19,color:"#30323E"}}>Passation des Marchés AFD</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#4D4D4D"}}>
          <span style={{cursor:"pointer",color:"#E30513",fontWeight:600}} onClick={home}>Accueil</span>
          {cC&&<><span style={{color:"#ccc"}}> › </span><span style={{cursor:"pointer"}} onClick={()=>{sP(null);sM(null);sEp(false);}}><Fg n={cC.name} s={18}/> {cC.name}</span></>}
          {cP&&<><span style={{color:"#ccc"}}> › </span><span style={{fontWeight:600}} onClick={()=>sM(null)}>{cP.name}</span></>}
        </div>
      </div>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{width:220,background:"#30323E",flexShrink:0,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"24px 0",flex:1}}>{NI.map(it=><div key={it.id} className="ni" onClick={()=>{sNav(it.id);sC(null);sP(null);sM(null);sEp(false);}} style={{borderLeft:nav===it.id?"3px solid #E30513":"3px solid transparent",background:nav===it.id?"rgba(227,5,19,.08)":"transparent"}}><SI name={it.ic} act={nav===it.id}/><span style={{color:nav===it.id?"#fff":"rgba(255,255,255,.55)",fontSize:14,fontWeight:nav===it.id?600:400}}>{it.lb}</span></div>)}</div>
          <div style={{padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,.08)",fontSize:11,color:"rgba(255,255,255,.25)"}}>v8.0 — Phases 3+4</div>
        </div>
        <div style={{flex:1,overflow:"auto"}}>
          <div className="fade" style={{maxWidth:960,margin:"0 auto",padding:32}}>

            {nav==="projets"&&!selC&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><h1 style={{fontSize:24,fontWeight:700,color:"#30323E"}}>Projets par pays</h1><button className="br" onClick={()=>sSNC(true)}>+ Pays</button></div>
              {sNC&&<div className="fade" style={{background:"#F9E1E3",borderRadius:8,padding:20,marginBottom:20,display:"flex",gap:12,alignItems:"center"}}><select className="ip" style={{maxWidth:300}} value={ncN} onChange={e=>sNcN(e.target.value)} autoFocus><option value="">— Choisir un pays —</option>{PAYS_LIST.filter(p=>!data.countries.some(c=>c.name.toLowerCase()===p.toLowerCase())).map(p=><option key={p} value={p}>{p}</option>)}</select><button className="br" onClick={aC}>OK</button><button className="bo" onClick={()=>{sSNC(false);sNcN("");}}>×</button></div>}
              {data.countries.length===0?<p style={{textAlign:"center",padding:"60px 0",color:"#999"}}>Aucun pays.</p>
              :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>{data.countries.map(c=>{const pc=(data.projects[c.id]||[]).length;return<div key={c.id} className="card" onClick={()=>sC(c.id)}><div style={{display:"flex",alignItems:"center",gap:14}}><Fg n={c.name} s={48}/><div><div style={{fontWeight:700,fontSize:16,color:"#30323E"}}>{c.name}</div><div style={{fontSize:12,color:"#4D4D4D"}}>{pc} projet{pc>1?"s":""}</div></div></div><button className="del" onClick={e=>{e.stopPropagation();rC(c.id);}}>×</button></div>})}</div>}
            </div>}

            {nav==="projets"&&selC&&!selP&&<div>
              <button className="bo" onClick={()=>sC(null)} style={{marginBottom:20}}>← Retour</button>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><div style={{display:"flex",alignItems:"center",gap:12}}><Fg n={cC?.name} s={48}/><h1 style={{fontSize:24,fontWeight:700,color:"#30323E"}}>{cC?.name}</h1></div><button className="br" onClick={()=>sSNP(true)}>+ Projet</button></div>
              {sNP&&<div className="fade" style={{background:"#F9E1E3",borderRadius:8,padding:20,marginBottom:20,display:"flex",gap:12,alignItems:"center"}}><input className="ip" style={{maxWidth:350}} value={npN} onChange={e=>sNpN(e.target.value)} onKeyDown={e=>e.key==="Enter"&&aP()} placeholder="Nom du projet" autoFocus/><button className="br" onClick={aP}>OK</button><button className="bo" onClick={()=>{sSNP(false);sNpN("");}}>×</button></div>}
              {cPs.length===0?<p style={{textAlign:"center",padding:"60px 0",color:"#999"}}>Aucun projet.</p>
              :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>{cPs.map(p=><div key={p.id} className="card" onClick={()=>sP(p.id)}><div style={{fontWeight:700,fontSize:15,color:"#30323E",marginBottom:4}}>{p.name}</div><div style={{display:"flex",gap:6}}><B bg="#F2F2F2" co="#30323E">Dir. {p.dir}</B>{p.secu==="zone-risque"&&<B bg="#F9E1E3" co="#E30513">Zone risque</B>}</div><button className="del" onClick={e=>{e.stopPropagation();rP(p.id);}}>×</button></div>)}</div>}
            </div>}

            {nav==="projets"&&selP&&!selM&&<div>
              <button className="bo" onClick={()=>{sP(null);sEp(false);}} style={{marginBottom:20}}>← Retour</button>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}><Fg n={cC?.name} s={36}/><div><h1 style={{fontSize:24,fontWeight:700,color:"#30323E"}}>{cP?.name}</h1><p style={{fontSize:14,color:"#4D4D4D"}}>{cC?.name}</p></div></div>
                <div style={{display:"flex",gap:8}}><button className="bo" onClick={()=>sEp(!ep)}>{ep?"Fermer":"Cadrage"}</button><button className="br" onClick={()=>sSNM(true)}>+ Marché</button></div>
              </div>
              {ep&&cP&&<div className="fade" style={{background:"#F2F2F2",borderRadius:8,padding:24,marginBottom:24,borderLeft:"4px solid #30323E"}}>
                <h3 style={{fontSize:16,fontWeight:700,color:"#30323E",marginBottom:16}}>Cadrage</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  <div><label className="lb">Nom du projet</label><input className="ip" value={cP.name||""} onChange={e=>uP(cP.id,{name:e.target.value})}/></div>
                  <div><label className="lb">Montant global</label><input className="ip" value={cP.mt||""} onChange={e=>uP(cP.id,{mt:e.target.value})}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  <div><label className="lb">Secteur</label><select className="ip" value={cP.sec||""} onChange={e=>uP(cP.id,{sec:e.target.value})}><option value="">—</option>{SECT.map(s=><option key={s}>{s}</option>)}</select></div>
                  <div><label className="lb">Langue</label><select className="ip" value={cP.lang||"Français"} onChange={e=>uP(cP.id,{lang:e.target.value})}>{LANG.map(l=><option key={l}>{l}</option>)}</select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  
                  <div><label className="lb">Responsable EP</label><input className="ip" value={cP.resp||""} onChange={e=>uP(cP.id,{resp:e.target.value})}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
                  <div><label className="lb">Construction</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Construction neuve","Réhabilitation"].map(v=><DC key={v} sel={cP.tcon===v} onClick={()=>uP(cP.id,{tcon:v})} title={v}/>)}</div></div>
                  <div><label className="lb">Contexte</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Urbain","Rural"].map(v=><DC key={v} sel={cP.ctx===v} onClick={()=>uP(cP.id,{ctx:v})} title={v}/>)}</div></div>
                  <div><label className="lb">Site</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Site unique","Multisite"].map(v=><DC key={v} sel={cP.site===v} onClick={()=>uP(cP.id,{site:v})} title={v}/>)}</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  <div><label className="lb">Directives</label><div style={{display:"flex",flexDirection:"column",gap:5}}><DC sel={cP.dir==="2024"} onClick={()=>uP(cP.id,{dir:"2024"})} title="Dir. 2024 — Option B"/><DC sel={cP.dir==="2019"} onClick={()=>uP(cP.id,{dir:"2019"})} title="Dir. 2019 — Option A"/></div></div>
                  <div><label className="lb">Vérification</label><select className="ip" value={cP.verif||""} onChange={e=>uP(cP.id,{verif:e.target.value})}><option value="eac">Ex-ante complète</option><option value="eas">Ex-ante simplifiée</option><option value="exp">Ex-post</option></select></div>
                </div>
                <div style={{marginBottom:14}}><label className="lb">Sécurité</label><div style={{display:"flex",flexDirection:"column",gap:5}}><DC sel={cP.secu==="standard"} onClick={()=>uP(cP.id,{secu:"standard"})} title="Standard"/><DC sel={cP.secu==="zone-risque"} onClick={()=>uP(cP.id,{secu:"zone-risque"})} title="Zone à risque — Art. 1.5.2"/></div></div>
                <div style={{marginBottom:14}}><label className="lb">Équipe AI</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>{eq.map(n=>{const s=(cP.eq||[]).includes(n);return<span key={n} onClick={()=>tEq(cP.id,n)} style={{padding:"4px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",background:s?"#30323E":"#fff",color:s?"#fff":"#30323E",border:s?"2px solid #30323E":"1.5px solid #DFE4E8"}}>{n}</span>;})}</div><div style={{display:"flex",gap:6}}><input className="ip" style={{maxWidth:160,fontSize:12}} value={nMem} onChange={e=>sNMem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&aEq()} placeholder="Ajouter..."/><button className="bo" style={{padding:"4px 10px",fontSize:12}} onClick={aEq}>+</button></div></div>
                <div><label className="lb">Notes</label><textarea className="ip" value={cP.desc||""} onChange={e=>uP(cP.id,{desc:e.target.value})}/></div>
              </div>}
              {!ep&&cP&&<div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{cP.sec&&<B bg="#F2F2F2" co="#30323E">{cP.sec}</B>}{cP.lang&&cP.lang!=="Français"&&<B bg="#F2F2F2" co="#30323E">{cP.lang}</B>}<B bg="#F2F2F2" co="#30323E">Dir. {cP.dir}</B>{cP.tcon&&<B bg="#F2F2F2" co="#30323E">{cP.tcon}</B>}{cP.ctx&&<B bg="#F2F2F2" co="#30323E">{cP.ctx}</B>}{cP.site&&<B bg="#F2F2F2" co="#30323E">{cP.site}</B>}{cP.secu==="zone-risque"&&<B bg="#F9E1E3" co="#E30513">Zone risque</B>}{(cP.eq||[]).map(n=><B key={n} bg="#30323E" co="#fff">{n}</B>)}</div>}
              {sSNM&&sNM&&<div className="fade" style={{background:"#F2F2F2",borderRadius:8,padding:24,marginBottom:24}}>
                <h3 style={{fontSize:15,fontWeight:700,color:"#30323E",marginBottom:14}}>Nouveau marché</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label className="lb">Intitulé</label><input className="ip" value={nmN} onChange={e=>sNmN(e.target.value)}/></div>
                  <div><label className="lb">Type</label><select className="ip" value={nmT} onChange={e=>{sNmT(e.target.value);sNmM("");sNmST("");}}><option value="">—</option><optgroup label="Travaux">{TYPES.filter(t=>t.c==="Travaux").map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</optgroup><optgroup label="PI">{TYPES.filter(t=>t.c==="PI").map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</optgroup><optgroup label="Autre">{TYPES.filter(t=>t.c==="Autre").map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</optgroup></select></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:cCat==="PI"?"1fr 1fr 1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label className="lb">Montant</label><input className="ip" value={nmMt} onChange={e=>sNmMt(e.target.value)}/></div>
                  {cCat&&cCat!=="Autre"&&<div><label className="lb">Méthode</label><select className="ip" value={nmM} onChange={e=>sNmM(e.target.value)}><option value="">—</option>{cCat==="Travaux"?<option value="QCMD">QCMD</option>:["SFQC","SQS","SBD","SMC"].map(m=><option key={m} value={m}>{m}</option>)}</select></div>}
                  {cCat==="PI"&&<div><label className="lb">Nature PI</label><select className="ip" value={nmST} onChange={e=>sNmST(e.target.value)}><option value="">—</option>{SPI.map(s=><option key={s}>{s}</option>)}</select></div>}
                </div>
                <div style={{marginBottom:14}}><label className="lb">Rôle</label><div style={{display:"flex",gap:10}}>{[["production","Production"],["relecture","Relecture"]].map(([v,l])=><div key={v} onClick={()=>sNmR(v)} style={{flex:1,padding:"8px 14px",borderRadius:6,cursor:"pointer",border:nmR===v?"2px solid #E30513":"1.5px solid #DFE4E8",background:nmR===v?"#F9E1E3":"#fff",fontWeight:600,fontSize:13,color:nmR===v?"#E30513":"#30323E"}}>{l}</div>)}</div></div>
                <div style={{background:"#fff",borderRadius:6,padding:14,marginBottom:14,border:"1px solid #DFE4E8"}}>
                    <label className="lb" style={{fontSize:12,marginBottom:8,display:"block"}}>Dates clés de la procédure (à renseigner au fur et à mesure)</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <div><label className="lb">Publication AMI / Pré-qual.</label><input className="ip" type="date" value={nmDA} onChange={e=>sNmDA(e.target.value)}/></div>
                      <div><label className="lb">Validation liste restreinte</label><input className="ip" type="date" value={nmDL} onChange={e=>sNmDL(e.target.value)}/></div>
                      <div><label className="lb">Diffusion DP / AO</label><input className="ip" type="date" value={nmDD} onChange={e=>sNmDD(e.target.value)}/></div>
                      <div><label className="lb">Sélection du lauréat</label><input className="ip" type="date" value={nmDS} onChange={e=>sNmDS(e.target.value)}/></div>
                      <div><label className="lb">Signature du contrat</label><input className="ip" type="date" value={nmDSig} onChange={e=>sNmDSig(e.target.value)}/></div>
                    </div>
                  </div>
                <div style={{display:"flex",gap:12}}><button className="br" onClick={aM}>Créer</button><button className="bo" onClick={()=>{sSNM(false);sNmN("");sNmT("");}}>Annuler</button></div>
              </div>}
              {!ep&&!sNM&&(pMs.length===0?<p style={{textAlign:"center",padding:"40px 0",color:"#999"}}>Aucun marché.</p>
              :<div style={{display:"flex",flexDirection:"column",gap:10}}>{pMs.map(m=><div key={m.id} style={{border:"1.5px solid #DFE4E8",borderRadius:8,overflow:"hidden",marginBottom:2}}>
                <div style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:m.cat==="Travaux"?"#30323E":"#E30513",color:"#fff",fontWeight:700,fontSize:11}}>{m.cat==="Travaux"?"TVX":"PI"}</div>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,color:"#30323E"}}>{m.name}</div><div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap"}}><B bg={m.cat==="Travaux"?"#30323E":"#E30513"} co="#fff">{m.cat}</B><B bg="#F2F2F2" co="#30323E">{m.tl}</B>{m.st&&<B bg="#F2F2F2" co="#30323E">{m.st}</B>}<B bg={m.role==="production"?"#F9E1E3":"#DFE4E8"} co="#30323E">{m.role==="production"?"Prod.":"Relect."}</B>{(()=>{var step=getMarketStep(m.id,m.cat);if(step.status==="done")return<B bg="#22c55e" co="#fff">Terminé</B>;if(step.status==="wip")return<B bg="#f59e0b" co="#fff">{step.label+" ("+step.progress+"%)"}</B>;return<B bg="#DFE4E8" co="#30323E">{step.label}</B>;})()}</div></div>
                  <button className="bo" style={{padding:"5px 10px",fontSize:11,flexShrink:0}} onClick={()=>sEditMkt(editMkt===m.id?null:m.id)}>{editMkt===m.id?"Fermer":"Éditer"}</button>
                  <button className="bo" style={{padding:"5px 12px",fontSize:12,flexShrink:0}} onClick={()=>{sM(m.id);sMTab(m.cat==="PI"?"ami":"dao");sSrcF(null);}}>Checklist →</button>
                  <button style={{background:"none",border:"none",opacity:.3,fontSize:16}} onClick={()=>rM(m.id)} onMouseEnter={e=>{e.currentTarget.style.opacity=1;}} onMouseLeave={e=>{e.currentTarget.style.opacity=.3;}}>×</button>
                </div>
                {editMkt===m.id&&<div style={{padding:"0 14px 14px",background:"#F2F2F2",borderTop:"1px solid #DFE4E8"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"12px 0"}}>
                    <div><label className="lb">Intitulé</label><input className="ip" value={m.name} onChange={e=>uM(m.id,{name:e.target.value})}/></div>
                    <div><label className="lb">Montant estimé</label><input className="ip" value={m.mont||m.amount||""} onChange={e=>uM(m.id,{mont:e.target.value})}/></div>
                    <div><label className="lb">Rôle</label><select className="ip" value={m.role} onChange={e=>uM(m.id,{role:e.target.value})}><option value="production">Production</option><option value="relecture">Relecture</option></select></div>
                  </div>
                  <div style={{background:"#fff",borderRadius:6,padding:12,border:"1px solid #DFE4E8"}}>
                    <label className="lb" style={{fontSize:12,marginBottom:8,display:"block"}}>Dates clés de la procédure</label>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <div><label className="lb">Publication AMI / Pré-qual.</label><input className="ip" type="date" value={m.dateAmi||""} onChange={e=>uM(m.id,{dateAmi:e.target.value})}/></div>
                      <div><label className="lb">Validation liste restreinte</label><input className="ip" type="date" value={m.dateLr||""} onChange={e=>uM(m.id,{dateLr:e.target.value})}/></div>
                      <div><label className="lb">Diffusion DP / AO</label><input className="ip" type="date" value={m.dateDp||""} onChange={e=>uM(m.id,{dateDp:e.target.value})}/></div>
                      <div><label className="lb">Sélection du lauréat</label><input className="ip" type="date" value={m.dateSel||""} onChange={e=>uM(m.id,{dateSel:e.target.value})}/></div>
                      <div><label className="lb">Signature du contrat</label><input className="ip" type="date" value={m.dateSig||""} onChange={e=>uM(m.id,{dateSig:e.target.value})}/></div>
                    </div>
                  </div>
                
                  <div style={{marginTop:10}}><label className="lb">Notes libres</label>
                    <textarea className="ip" value={m.notes||""} onChange={e=>uM(m.id,{notes:e.target.value})} placeholder="Observations, points discutés, décisions, questions en suspens…" style={{minHeight:50,fontSize:12}}/>
                  </div>
                </div>}
              </div>)}</div>)}
            </div>}

            {nav==="recherche"&&<div>
              <h1 style={{fontSize:24,fontWeight:700,color:"#30323E",marginBottom:20}}>Recherche</h1>
              <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}><input className="ip" style={{flex:2,minWidth:180}} placeholder="Rechercher..." value={sq} onChange={e=>sSq(e.target.value)}/><select className="ip" style={{flex:1,minWidth:160}} value={ft} onChange={e=>sFt(e.target.value)}><option value="">Tous types</option>{TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select><select className="ip" style={{flex:1,minWidth:140}} value={fc} onChange={e=>sFc(e.target.value)}><option value="">Tous pays</option>{data.countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <p style={{fontSize:13,color:"#4D4D4D",marginBottom:12}}>{fM.length} résultat{fM.length>1?"s":""}</p>
              {fM.map(m=><div key={m.id+m.pI} style={{border:"1.5px solid #DFE4E8",borderRadius:8,padding:12,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>{sC(m.cI);sP(m.pI);sNav("projets");}}><Fg n={m.cN} s={28}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:"#30323E"}}>{m.name}</div><div style={{fontSize:11,color:"#4D4D4D"}}>{m.cN} · {m.pN}</div></div><span style={{color:"#ccc"}}>›</span></div>)}
            </div>}

            {nav==="memo"&&<div>
              <h1 style={{fontSize:24,fontWeight:700,color:"#30323E",marginBottom:8}}>Mémo Passation — Retours d'expérience</h1>
              <p style={{fontSize:13,color:"#4D4D4D",marginBottom:20}}>Base de conseils et retours d'expérience Assemblage ingénierie. Ces items alimentent automatiquement la section « Conseils » dans chaque relecture de document.</p>
              <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
                <select className="ip" style={{maxWidth:250}} value={retexTheme} onChange={e=>sRetexTheme(e.target.value)}>
                  <option value="">— Toutes les thématiques —</option>
                  {RETEX_THEMES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <input className="ip" style={{maxWidth:250}} placeholder="Recherche libre…" value={retexSearch} onChange={e=>sRetexSearch(e.target.value)}/>
                <button className="br" onClick={()=>sShowNewRetex(!showNewRetex)}>{showNewRetex?"Fermer":"+ Nouveau conseil"}</button>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:"#4D4D4D",fontWeight:600,alignSelf:"center"}}>Mots-clés :</span>
                {RETEX_KW.map(k=>{var sel=retexKw.includes(k);return<span key={k} onClick={()=>sRetexKw(sel?retexKw.filter(x=>x!==k):[...retexKw,k])} style={{padding:"3px 12px",borderRadius:16,fontSize:11,fontWeight:600,cursor:"pointer",background:sel?"#2563eb":"#fff",color:sel?"#fff":"#30323E",border:sel?"2px solid #2563eb":"1.5px solid #DFE4E8"}}>{k}</span>;})}
                {retexKw.length>0&&<span onClick={()=>sRetexKw([])} style={{padding:"3px 12px",borderRadius:16,fontSize:11,fontWeight:600,cursor:"pointer",background:"#E30513",color:"#fff"}}>Effacer filtres</span>}
              </div>

              {showNewRetex&&<div className="fade" style={{background:"#F2F2F2",borderRadius:8,padding:24,marginBottom:20,borderLeft:"4px solid #2563eb"}}>
                <h3 style={{fontSize:15,fontWeight:700,color:"#30323E",marginBottom:14}}>Nouveau conseil / retour d'expérience</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div><label className="lb">Thématique</label><select className="ip" value={nrTheme} onChange={e=>sNrTheme(e.target.value)}><option value="">—</option>{RETEX_THEMES.map(t=><option key={t} value={t}>{t}</option>)}<option value="__custom__">+ Autre…</option></select>{nrTheme==="__custom__"&&<input className="ip" style={{marginTop:4}} placeholder="Nouvelle thématique" onChange={e=>{if(e.target.value)sNrTheme(e.target.value);}}/>}</div>
                  <div><label className="lb">Projet</label><input className="ip" value={nrProject} onChange={e=>sNrProject(e.target.value)} placeholder="Ex: 225_15_RCI_Collèges"/></div>
                </div>
                <div style={{marginBottom:12}}><label className="lb">Mots-clés</label>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{RETEX_KW.map(k=>{var sel=nrKw.includes(k);return<span key={k} onClick={()=>sNrKw(sel?nrKw.filter(x=>x!==k):[...nrKw,k])} style={{padding:"3px 10px",borderRadius:14,fontSize:10,fontWeight:600,cursor:"pointer",background:sel?"#2563eb":"#fff",color:sel?"#fff":"#30323E",border:sel?"2px solid #2563eb":"1.5px solid #DFE4E8"}}>{k}</span>;})}</div>
                </div>
                <div style={{marginBottom:12}}><label className="lb">Auteur</label><select className="ip" style={{maxWidth:200}} value={nrEditor} onChange={e=>sNrEditor(e.target.value)}><option value="">—</option>{(data.equipe||[]).map(n=><option key={n}>{n}</option>)}</select></div>
                <div style={{marginBottom:12}}><label className="lb">Commentaire / conseil</label><textarea className="ip" value={nrComment} onChange={e=>sNrComment(e.target.value)} style={{minHeight:80}} placeholder="Décrire le retour d'expérience ou le conseil…"/></div>
                <button className="br" style={{background:"#2563eb"}} onClick={()=>{if(!nrComment.trim()||!nrTheme)return;var item={id:"NR"+Date.now(),th:nrTheme,kw:nrKw.join(" / "),pj:nrProject.trim(),ed:nrEditor,cm:nrComment.trim(),custom:true};sv({...data,customRetex:[...(data.customRetex||[]),item]});sNrComment("");sNrProject("");sNrKw([]);sShowNewRetex(false);}}>Ajouter</button>
              </div>}

              {(()=>{
                var allRetex=[...RETEX_DATA,...(data.customRetex||[])];
                var filtered=allRetex.filter(function(r){
                  if(retexTheme&&r.th!==retexTheme)return false;
                  if(retexKw.length>0&&!retexKw.some(function(k){return(r.kw||"").includes(k);}))return false;
                  if(retexSearch){var q=retexSearch.toLowerCase();if(!(r.cm+r.th+(r.kw||"")+r.pj).toLowerCase().includes(q))return false;}
                  return true;
                });
                return<div>
                  <p style={{fontSize:13,color:"#4D4D4D",marginBottom:12}}>{filtered.length} conseil{filtered.length>1?"s":""}</p>
                  {filtered.map(function(r,i){return<div key={r.id||i} style={{border:"1.5px solid #DFE4E8",borderRadius:8,padding:14,marginBottom:10}}>
                    <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:700,background:r.custom?"#f59e0b":"#2563eb",color:"#fff"}}>{r.th||"—"}</span>
                      {r.kw&&r.kw.split(" / ").map(function(k,j){return k.trim()?<span key={j} style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:600,background:"#F2F2F2",color:"#30323E"}}>{k.trim()}</span>:null;})}
                      {r.custom&&<span style={{padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700,background:"#f59e0b",color:"#fff"}}>PERSONNALISÉ</span>}
                    </div>
                    <div style={{fontSize:13,color:"#30323E",lineHeight:1.5,marginBottom:6,whiteSpace:"pre-line"}}>{r.cm}</div>
                    <div style={{fontSize:11,color:"#999",display:"flex",gap:12}}>
                      {r.ed&&<span>{r.ed}</span>}
                      {r.pj&&<span>{r.pj}</span>}
                    </div>
                    {r.custom&&<button style={{background:"none",border:"none",fontSize:11,color:"#E30513",cursor:"pointer",marginTop:4}} onClick={()=>{if(confirm("Supprimer ce conseil ?"))sv({...data,customRetex:(data.customRetex||[]).filter(x=>x.id!==r.id)});}}>Supprimer</button>}
                  </div>;})}
                </div>;
              })()}
            </div>}
            {nav==="codes"&&<div>
              <h1 style={{fontSize:24,fontWeight:700,color:"#30323E",marginBottom:8}}>Mémo Codes des marchés</h1>
              <p style={{fontSize:13,color:"#4D4D4D",marginBottom:20}}>Comparaison par thématique entre Directives AFD et réglementation locale, par pays.</p>
              <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
                <select className="ip" style={{maxWidth:250}} value={memoPays} onChange={e=>sMemoPays(e.target.value)}>
                  <option value="">— Choisir un pays —</option>
                  {MEMO_PAYS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <select className="ip" style={{maxWidth:300}} value={memoTheme} onChange={e=>sMemoTheme(e.target.value)}>
                  <option value="">— Tous les sujets —</option>
                  {MEMO_DATA.map((t,i)=><option key={i} value={t.n}>{t.n}</option>)}
                </select>
              </div>
              {memoPays&&<div>
                {MEMO_DATA.filter(t=>(memoTheme?t.n===memoTheme:true)&&(t.c[memoPays]||t.c[memoPays.toUpperCase()]||t.d24||t.d19)).map((t,i)=>{
                  var local=t.c[memoPays]||t.c[memoPays.toUpperCase()]||"";
                  var dir=t.d24||t.d19||"";
                  if(!local&&!dir)return null;
                  return<div key={i} style={{marginBottom:16,border:"1.5px solid #DFE4E8",borderRadius:8,overflow:"hidden"}}>
                    <div style={{background:"#30323E",color:"#fff",padding:"8px 14px",fontWeight:700,fontSize:13}}>{t.n}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",minHeight:60}}>
                      <div style={{padding:12,borderRight:"1px solid #DFE4E8",background:"#F9E1E3"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#E30513",marginBottom:4}}>DIRECTIVES AFD</div>
                        <div style={{fontSize:12,color:"#30323E",whiteSpace:"pre-line",lineHeight:1.4}}>{dir||<span style={{color:"#999",fontStyle:"italic"}}>Non renseigné</span>}</div>
                      </div>
                      <div style={{padding:12,background:"#fff"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#30323E",marginBottom:4}}>{memoPays.toUpperCase()}</div>
                        <div style={{fontSize:12,color:"#30323E",whiteSpace:"pre-line",lineHeight:1.4}}>{local||<span style={{color:"#999",fontStyle:"italic"}}>Non renseigné</span>}</div>
                      </div>
                    </div>
                  </div>;
                })}
              </div>}
              {!memoPays&&!memoTheme&&<div style={{textAlign:"center",padding:"40px 0",color:"#999"}}>Sélectionnez un pays et/ou un sujet pour afficher la comparaison.</div>}
              {!memoPays&&memoTheme&&<div>
                {MEMO_DATA.filter(t=>t.n===memoTheme).map((t,i)=>{
                  return<div key={i} style={{marginBottom:16,border:"1.5px solid #DFE4E8",borderRadius:8,overflow:"hidden"}}>
                    <div style={{background:"#30323E",color:"#fff",padding:"8px 14px",fontWeight:700,fontSize:13}}>{t.n}</div>
                    <div style={{padding:12,background:"#F9E1E3",borderBottom:"1px solid #DFE4E8"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#E30513",marginBottom:4}}>DIRECTIVES AFD</div>
                      <div style={{fontSize:12,color:"#30323E",whiteSpace:"pre-line",lineHeight:1.4}}>{t.d24||t.d19||<span style={{color:"#999",fontStyle:"italic"}}>Non renseigné</span>}</div>
                    </div>
                    {MEMO_PAYS.filter(p=>t.c[p]||t.c[p.toUpperCase()]).map(p=><div key={p} style={{padding:12,borderBottom:"1px solid #DFE4E8"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#30323E",marginBottom:4}}>{p.toUpperCase()}</div>
                      <div style={{fontSize:12,color:"#30323E",whiteSpace:"pre-line",lineHeight:1.4}}>{t.c[p]||t.c[p.toUpperCase()]}</div>
                    </div>)}
                  </div>;
                })}
              </div>}
            </div>}
            {nav==="ref"&&<div>
              <h1 style={{fontSize:24,fontWeight:700,color:"#30323E",marginBottom:8}}>Référentiel AFD</h1>
              <p style={{fontSize:13,color:"#4D4D4D",marginBottom:20}}>Documents-types en vigueur et gestion des versions. Mettez à jour les versions quand l'AFD publie de nouvelles éditions.</p>
              
              <div style={{display:"flex",gap:12,marginBottom:20}}>
                {["","Travaux","PI","Transversal","Cadre"].map(f=><span key={f||"all"} onClick={()=>sRefFilter(f)} style={{padding:"4px 14px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",background:refFilter===f?(f==="Travaux"?"#30323E":f==="PI"?"#E30513":f==="Cadre"?"#DFE4E8":"#F2F2F2"):"#fff",color:refFilter===f?(f==="Cadre"||f==="Transversal"?"#30323E":"#fff"):"#30323E",border:refFilter===f?"2px solid "+(f==="Travaux"?"#30323E":f==="PI"?"#E30513":"#DFE4E8"):"1.5px solid #DFE4E8"}}>{f||"Tous"}</span>)}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {REF_DOCS.filter(d=>!refFilter||d.cat===refFilter).map(d=>{
                  var ovr=(data.refVersions||{})[d.id]||{};
                  var curVer=ovr.ver||d.ver;
                  var status=ovr.archived?"Archivé":"En vigueur";
                  var isEditing=refEdit===d.id;
                  return<div key={d.id} style={{border:"1.5px solid #DFE4E8",borderRadius:8,overflow:"hidden"}}>
                    <div style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:44,height:44,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:d.cat==="Travaux"?"#30323E":d.cat==="PI"?"#E30513":d.cat==="Cadre"?"#DFE4E8":"#F2F2F2",color:d.cat==="Cadre"||d.cat==="Transversal"?"#30323E":"#fff",fontWeight:700,fontSize:9,textAlign:"center"}}>{d.cat==="Travaux"?"TVX":d.cat==="PI"?"PI":d.cat==="Cadre"?"DIR":"PPM"}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#30323E"}}>{d.name}</div>
                        <div style={{fontSize:11,color:"#4D4D4D"}}>{d.desc}</div>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:"#F2F2F2",color:"#30323E"}}>{d.ref}</span>
                          <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:"#F2F2F2",color:"#30323E"}}>Version : {curVer}</span>
                          <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:d.dir==="2024"?"#E30513":"#30323E",color:"#fff"}}>Dir. {d.dir}</span>
                          <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,background:ovr.archived?"#999":"#22c55e",color:"#fff"}}>{status}</span>
                        </div>
                      </div>
                      <button className="bo" style={{padding:"4px 12px",fontSize:11}} onClick={()=>sRefEdit(isEditing?null:d.id)}>{isEditing?"Fermer":"Modifier"}</button>
                    </div>
                    
                    {isEditing&&<div style={{padding:"0 14px 14px",background:"#F2F2F2",borderTop:"1px solid #DFE4E8"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,padding:"12px 0"}}>
                        <div><label className="lb">Version actuelle</label><input className="ip" value={curVer} onChange={e=>{var rv={...(data.refVersions||{}),[d.id]:{...ovr,ver:e.target.value}};sv({...data,refVersions:rv});}}/></div>
                        <div><label className="lb">Directives</label><select className="ip" value={ovr.dir||d.dir} onChange={e=>{var rv={...(data.refVersions||{}),[d.id]:{...ovr,dir:e.target.value}};sv({...data,refVersions:rv});}}><option value="2024">2024</option><option value="2019">2019</option></select></div>
                        <div><label className="lb">Statut</label><select className="ip" value={ovr.archived?"archived":"active"} onChange={e=>{var rv={...(data.refVersions||{}),[d.id]:{...ovr,archived:e.target.value==="archived"}};sv({...data,refVersions:rv});}}><option value="active">En vigueur</option><option value="archived">Archivé</option></select></div>
                      </div>
                      <div style={{marginBottom:8}}><label className="lb">Ajouter une entrée au journal des modifications</label>
                        <div style={{display:"flex",gap:8}}><input className="ip" value={refLogEntry} onChange={e=>sRefLogEntry(e.target.value)} placeholder="Ex: Mise à jour section ESSS, ajout clause sûreté…"/><button className="br" style={{flexShrink:0,padding:"6px 14px",fontSize:11}} onClick={()=>{if(!refLogEntry.trim())return;var rv={...(data.refVersions||{}),[d.id]:{...ovr,log:[...((ovr.log)||[]),{date:new Date().toISOString().slice(0,10),text:refLogEntry.trim()}]}};sv({...data,refVersions:rv});sRefLogEntry("");}}>Ajouter</button></div>
                      </div>
                      {(ovr.log||[]).length>0&&<div style={{background:"#fff",borderRadius:6,padding:10,border:"1px solid #DFE4E8"}}>
                        <div style={{fontSize:11,fontWeight:600,color:"#4D4D4D",marginBottom:6}}>Journal des modifications</div>
                        {(ovr.log||[]).slice().reverse().map(function(entry,i){return<div key={i} style={{fontSize:11,color:"#30323E",padding:"3px 0",borderBottom:"1px solid #F2F2F2"}}>
                          <span style={{color:"#999",marginRight:8}}>{entry.date}</span>{entry.text}
                        </div>;})}
                      </div>}
                    </div>}
                  </div>;
                })}
              </div>
            </div>}

            {nav==="admin"&&<div><h1 style={{fontSize:24,fontWeight:700,color:"#30323E",marginBottom:20}}>Administration</h1><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20}}>{[[data.countries.length,"Pays"],[allM.length,"Marchés"],["10","Docs AFD"]].map(([n,l],i)=><div key={i} style={{background:"#F2F2F2",borderRadius:8,padding:20,textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:"#E30513"}}>{n}</div><div style={{fontSize:13,color:"#4D4D4D"}}>{l}</div></div>)}</div><button className="bo" style={{color:"#E30513",borderColor:"#E30513"}} onClick={()=>{if(confirm("Réinitialiser ?"))sv({countries:[],projects:{},markets:{},equipe:DEQ,reviews:{}});}}>Réinitialiser</button></div>}

          </div>
        </div>
      </div>
      <div style={{position:"fixed",bottom:16,right:16,width:48,height:48,background:"#E30513",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:18,opacity:.15,pointerEvents:"none"}}>.A</div>
    </div>
  );
}
