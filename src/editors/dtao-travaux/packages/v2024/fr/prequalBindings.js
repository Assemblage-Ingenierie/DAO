// ── Pack v2024 FR — bindings du template de Pré-qualification ─────────────
//
// Registre dédié au remplissage du document de Pré-qualification
// (`public/templates/v2024/fr/Pré-qualification ...docx`). Distinct du
// `templateBinding` du DTAO porté par chaque field dans `sections.js` :
// les anchors et la structure du doc préqual ne correspondent pas à
// ceux du DTAO.
//
// Format d'une entrée :
//   - description   : libellé court pour les logs
//   - placeholders  : tableau de chaînes à substituer (variantes acceptées)
//   - global        : si true, remplace TOUTES les occurrences (yellow only)
//   - nth           : si non-global, indice 1-based de l'occurrence à viser
//   - isDate        : passe la valeur dans fmtDate (DD/MM/YYYY)
//   - resolve(fd)   : extrait la valeur de formData (string/number)
//                     retourner null/'' pour ignorer le binding
//
// Premier lot validé avec l'utilisateur : 27 mappings prioritaires
// (Avis Pré-qual + IAC 1.1, 4.1, 7.1, 11.1d, 15.2, 17.1, 23.1, 24.1
// + Section III critères 3.1, 3.2, 4.1, 5.3 ESSS).
// Le mapping #26 (N marchés d'un montant V) du tableau initial est
// volontairement reporté — sa formulation dépendra de ce que l'utilisateur
// veut voir injecté dans la phrase environnante.

export const PREQUAL_BINDINGS = [
  // ── Avis de Pré-qualification (page de garde) ───────────────────────────
  {
    description: 'Avis Pré-qual — Pays',
    placeholders: ['[Insérer : nom du pays]'],
    global: true,
    resolve: (fd) => fd.pays,
  },
  {
    description: 'Avis Pré-qual — Nom du Projet',
    placeholders: ['[Insérer : nom du projet]'],
    global: true,
    resolve: (fd) => fd.nom_projet,
  },
  {
    description: 'Avis Pré-qual — Brève description des travaux',
    placeholders: ['[Insérer : brève description des travaux]'],
    global: true,
    resolve: (fd) => fd.identification_travaux,
  },
  {
    description: 'Avis Pré-qual — Date d\'émission',
    placeholders: ['[Insérer : date]'],
    global: true,
    isDate: true,
    resolve: (fd) => fd.date_emission_prequal,
  },

  // ── Page de garde / corps : références récurrentes ──────────────────────
  {
    description: 'Nom du Maître d\'Ouvrage',
    placeholders: ['[insérer le nom du Maître d’Ouvrage]', "[insérer le nom du Maître d'Ouvrage]"],
    global: true,
    resolve: (fd) => fd.nom_maitrise_ouvrage,
  },
  {
    description: 'Nom du Projet (corps)',
    placeholders: ['[insérer le nom du projet]'],
    global: true,
    resolve: (fd) => fd.nom_projet,
  },

  // ── Section II — FDP — IAC 1.1 ──────────────────────────────────────────
  {
    description: 'IAC 1.1 — Nom + adresse Maître d\'Ouvrage',
    placeholders: [
      '[insérer le nom complet y compris celui du Responsable du projet, ainsi que l’adresse]',
      "[insérer le nom complet y compris celui du Responsable du projet, ainsi que l'adresse]",
    ],
    global: true,
    resolve: (fd) => {
      const nom = fd.nom_maitrise_ouvrage || '';
      const adr = fd.adresse_moa || '';
      return [nom, adr].filter(Boolean).join(', ');
    },
  },
  {
    description: 'IAC 1.1 — Nombre / noms / numéros des lots',
    placeholders: [
      '[insérer le nombre, les noms et les numéros d’identification]',
      "[insérer le nombre, les noms et les numéros d'identification]",
    ],
    global: true,
    resolve: (fd) => fd.nombre_lots,
  },
  {
    description: 'IAC 1.1 — Nom et numéro AOI',
    placeholders: [
      '[insérer le nom et le numéro d’identification]',
      "[insérer le nom et le numéro d'identification]",
    ],
    global: true,
    resolve: (fd) => fd.ref_aoi,
  },

  // ── IAC 4.1 — Groupement d'entreprises ──────────────────────────────────
  {
    description: 'IAC 4.1 — Nombre max de membres GE',
    placeholders: ['[insérer le nombre ou "illimité"]'],
    global: true,
    resolve: (fd) => fd.max_groupement,
  },

  // ── IAC 7.1 — Coordonnées du Maître d'Ouvrage ───────────────────────────
  {
    description: 'IAC 7.1 — À l\'attention de (responsable + bureau)',
    placeholders: ['[insérer le nom et le numéro du bureau du Responsable du projet]'],
    global: true,
    resolve: (fd) => fd.contact_attention,
  },
  {
    description: 'IAC 7.1 — Adresse postale (1re occurrence uniquement)',
    placeholders: ['[insérer l’adresse complète]', "[insérer l'adresse complète]"],
    nth: 1,
    resolve: (fd) => fd.contact_adresse,
  },
  {
    description: 'Pays (récurrent dans IAC 7.1 et IAC 17.1)',
    placeholders: ['[insérer le nom du pays]'],
    global: true,
    resolve: (fd) => fd.pays,
  },
  {
    description: 'Téléphone du Responsable du projet',
    placeholders: ['[insérer le numéro de téléphone ainsi que le préfixe du pays et de la ville]'],
    global: true,
    resolve: (fd) => fd.contact_tel,
  },
  {
    description: 'Email du Responsable du projet',
    placeholders: ['[insérer l’adresse électronique du Responsable du projet]', "[insérer l'adresse électronique du Responsable du projet]"],
    global: true,
    resolve: (fd) => fd.contact_email,
  },

  // ── IAC 11.1(d), 15.2 — Préparation des DDC ─────────────────────────────
  {
    description: 'IAC 11.1(d) — Documents supplémentaires',
    placeholders: ['[insérer la liste des documents supplémentaires, le cas échéant]'],
    global: true,
    resolve: (fd) => fd.documents_additionnels,
  },
  {
    description: 'IAC 15.2 — Nombre de copies papier',
    placeholders: ['[insérer le nombre]'],
    global: true,
    resolve: (fd) => fd.copies_offre,
  },

  // ── IAC 17.1 — Date / heure limite (préqual-spécifique) ─────────────────
  {
    description: 'IAC 17.1 — Date limite de dépôt (Pré-qualification)',
    placeholders: ['[insérer la date]'],
    global: true,
    isDate: true,
    resolve: (fd) => fd.date_limite_prequal,
  },
  {
    description: 'IAC 17.1 — Heure limite de dépôt (Pré-qualification)',
    placeholders: ['[insérer l’heure]', "[insérer l'heure]"],
    global: true,
    resolve: (fd) => fd.heure_limite_prequal,
  },

  // ── IAC 23.1 / 24.1 — Préférence nationale + Sous-traitants désignés ───
  {
    description: 'IAC 23.1 — Marge de préférence (sera / ne sera pas)',
    placeholders: ['[insérer "sera" ou "ne sera pas"]'],
    global: true,
    resolve: (fd) => fd.marge_preference,
  },
  {
    description: 'IAC 24.1 — Sous-traitants désignés (a l\'intention / n\'a pas)',
    placeholders: [
      '[insérer "a l’intention" ou "n’a pas l’intention"]',
      '[insérer "a l\'intention" ou "n\'a pas l\'intention"]',
    ],
    global: true,
    resolve: (fd) => fd.sous_traitants_designes,
  },

  // ── Section III — Critères 3.1 / 3.2 ────────────────────────────────────
  {
    description: 'Critère 3.1 — Trésorerie exigée',
    placeholders: ['[insérer le montant en € correspondant au montant de trois à quatre mois de facturation de travaux pour le marché]'],
    global: true,
    resolve: (fd) => fd.capacite_financiere,
  },
  {
    description: 'Critère 3.2 — Chiffre d\'affaires annuel min. (lettres + chiffres)',
    placeholders: ['[insérer montant en équivalent € en toutes lettres et en chiffres]'],
    global: true,
    resolve: (fd) => fd.ca_minimum,
  },
  {
    description: 'Critère 3.2 — Nombre d\'années pour le CA',
    placeholders: ['[insérer le nombre d’années, généralement 5 ans et au minimum 3 ans]', "[insérer le nombre d'années, généralement 5 ans et au minimum 3 ans]"],
    global: true,
    resolve: (fd) => fd.ca_periode,
  },

  // ── Section III — Critère 4.1 (Expérience générale) ─────────────────────
  {
    description: 'Critère 4.1 — Année de début (S03-005, 1re occurrence du placeholder dans le doc)',
    placeholders: ['[insérer l’année]', "[insérer l'année]"],
    nth: 1,
    resolve: (fd) => fd.exp_generale_annee_depart,
  },

  // ── Section III — Critère 5.3 (Expérience ESSS) ─────────────────────────
  {
    description: 'Critère 5.3 — Nombre de marchés ESSS attendus',
    placeholders: ['[insérer nombre, normalement deux]'],
    global: true,
    resolve: (fd) => fd.exp_esss_nombre,
  },
  {
    description: 'Critère 5.3 — Nombre d\'années ESSS (5-10 ans)',
    placeholders: ['[insérer nombre d’années, entre 5 et 10 ans]', "[insérer nombre d'années, entre 5 et 10 ans]"],
    global: true,
    resolve: (fd) => fd.exp_esss_annees,
  },
];
