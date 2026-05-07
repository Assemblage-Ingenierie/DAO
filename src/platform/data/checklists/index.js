// ── Plateforme — Index des checklists ────────────────────────────────────
//
// Re-exporte les checklists Travaux et PI sous deux formats :
//   - les listes individuelles (CL_DAO, CL_RAP…) pour usage direct
//   - les agrégats CLS_TVX / CLS_PI indexés par onglet (dao, rapport…)
//   - les listes d'onglets TABS_TVX / TABS_PI utilisées par la page Market
//     pour rendre la barre de navigation entre checklists d'un même marché.
//
// Extraits verbatim du single-file `_imports/plateforme-source.jsx`
// (lignes 451-454).

import { CL_DAO, CL_RAP, CL_CTR } from "./travaux.js";
import {
  CL_AMI,
  CL_LR,
  CL_DP,
  CL_EVTECH,
  CL_EVFIN,
  CL_NEGO,
  CL_CTRPI,
  CL_PROG,
  CL_TDR,
} from "./pi.js";

export {
  CL_DAO,
  CL_RAP,
  CL_CTR,
  CL_AMI,
  CL_LR,
  CL_DP,
  CL_EVTECH,
  CL_EVFIN,
  CL_NEGO,
  CL_CTRPI,
  CL_PROG,
  CL_TDR,
};

export const CLS_TVX = { dao: CL_DAO, rapport: CL_RAP, contrat: CL_CTR };
export const CLS_PI = {
  ami: CL_AMI,
  lr: CL_LR,
  prog: CL_PROG,
  tdr: CL_TDR,
  dp: CL_DP,
  evtech: CL_EVTECH,
  evfin: CL_EVFIN,
  nego: CL_NEGO,
  cpi: CL_CTRPI,
};

export const TABS_TVX = [
  { id: "dao", l: "DAO" },
  { id: "rapport", l: "Rapport évaluation" },
  { id: "contrat", l: "Contrat" },
];

export const TABS_PI = [
  { id: "ami", l: "AMI" },
  { id: "lr", l: "Liste restreinte" },
  { id: "prog", l: "Programme" },
  { id: "tdr", l: "Termes de Référence" },
  { id: "dp", l: "Dem. Propositions" },
  { id: "evtech", l: "Éval. technique" },
  { id: "evfin", l: "Éval. fin./combinée" },
  { id: "nego", l: "Négociations" },
  { id: "cpi", l: "Contrat" },
];
