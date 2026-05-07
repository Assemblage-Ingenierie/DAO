// ── Plateforme — page ChecklistConfig (paramétrage des checklists) ───────
//
// Paramétrage des items de checklist : override texte/conseil par item, et
// création d'items REX persistants. Côté source le menu "Paramétrage
// checklists" est présent dans la sidebar mais la branche
// `nav==="parametrage"` n'est pas encore implémentée — uniquement les
// state vars (editCat, editDoc, rexCat, rexDoc, …) et la fonction addRex
// existent. Cette page conserve la sémantique "à venir" et liste ce qui
// sera ajouté en 3.7 (polish).
//
// Refactor : pas d'équivalent dans `_imports/plateforme-source.jsx`.
// Stub pour compléter la sidebar de manière cohérente.

import "../styles.css";

export default function ChecklistConfig() {
  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 8 }}>
        Paramétrage des checklists
      </h1>
      <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 20 }}>
        Cette page permettra d'ajuster les items de checklist directement depuis l'interface :
        modifier le texte ou le conseil d'un item existant (via <code>data.textOverrides</code>),
        ajouter des items REX supplémentaires propres à votre équipe (via{" "}
        <code>data.rexItems</code>), et activer ou désactiver des items au cas par cas.
      </p>

      <div
        style={{
          background: "#F2F2F2",
          borderRadius: 8,
          padding: 24,
          borderLeft: "4px solid #DFE4E8",
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#30323E", marginBottom: 10 }}>
          À venir (sous-commit 3.7 — polish)
        </h3>
        <ul style={{ fontSize: 13, color: "#4D4D4D", lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Sélection catégorie (Travaux / PI) + onglet de checklist</li>
          <li>
            Édition inline du libellé ou du conseil de chaque item (sauve dans{" "}
            <code>textOverrides</code>)
          </li>
          <li>
            Ajout d'items REX additionnels (catégorie, onglet, section, texte, conseil) —
            persistés dans <code>rexItems</code> et automatiquement injectés dans la page Market
            quand le mot-clé matche
          </li>
          <li>Filtre par source (DIR / APM / RETEX / REX) pour repérer les items à ajuster</li>
        </ul>
        <p style={{ fontSize: 12, color: "#999", marginTop: 14, fontStyle: "italic" }}>
          Le code de paramétrage existe déjà sous forme de state non câblé dans la source
          d'origine (variables <code>editCat</code>, <code>editDoc</code>, fonction{" "}
          <code>addRex</code> de la Plateforme single-file). Il sera réactivé sur cette page lors
          du polish 3.7.
        </p>
      </div>
    </div>
  );
}
