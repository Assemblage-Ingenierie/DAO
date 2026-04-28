import { useState } from "react";

let nextId = 20;

const DEFAULT_ITEMS = [
  { id: 1, label: "Variantes techniques", enabled: true, description: "Proposition pour les éléments des ouvrages pour lesquels des variantes techniques sont autorisées" },
  { id: 2, label: "Méthodologie ESSS", enabled: true, description: "Version préliminaire du PGES-Travaux conforme aux Spécifications ESSS" },
  { id: 3, label: "Liste des sous-traitants", enabled: true, description: "Sous-traitants proposés avec formulaire d'engagement ESSS" },
  { id: 4, label: "Organisation des travaux sur site et Méthode de réalisation", enabled: true, description: "Dispositions et méthodes, gestion coordination accès Site, aspects géotechniques" },
  { id: 5, label: "Programme / Calendrier de Construction", enabled: true, description: "Programme détaillé, calendrier mobilisation, étapes clés, chemin critique" },
  { id: 6, label: "Personnel proposé et CV (formulaires PER-1 et PER-2)", enabled: true, description: "Noms et CV du personnel qualifié pour les postes clés" },
  { id: 7, label: "Matériel (formulaire MAT)", enabled: true, description: "Détails matériel proposé pour les équipements clés" },
];

export default function PropositionTechnique({ items, onChange }) {
  const [editingId, setEditingId] = useState(null);
  const data = items && items.length > 0 ? items : DEFAULT_ITEMS;

  const updateItem = (id, patch) => {
    onChange(data.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    onChange([
      ...data,
      { id: nextId++, label: "Nouvel élément", enabled: true, description: "" },
    ]);
  };

  const removeItem = (id) => {
    onChange(data.filter((it) => it.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #DFE4E8",
            borderRadius: 6,
            padding: "10px 12px",
            background: item.enabled ? "#fff" : "#F9F9F9",
            opacity: item.enabled ? 1 : 0.6,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) => updateItem(item.id, { enabled: e.target.checked })}
              style={{ marginTop: 3, accentColor: "#E30513", flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              {editingId === item.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    style={{
                      border: "1px solid #DFE4E8",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontFamily: "Open Sans, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#4D4D4D",
                      width: "100%",
                    }}
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    rows={2}
                    style={{
                      border: "1px solid #DFE4E8",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontFamily: "Open Sans, sans-serif",
                      fontSize: 12,
                      color: "#4D4D4D",
                      width: "100%",
                      resize: "vertical",
                    }}
                    placeholder="Description…"
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: "4px 12px",
                        background: "#E30513",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        padding: "4px 12px",
                        background: "none",
                        color: "#E30513",
                        border: "1px solid #E30513",
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => setEditingId(item.id)}
                  title="Cliquer pour modifier"
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#4D4D4D", marginBottom: 2 }}>
                    {item.label}
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#aaa", fontWeight: 400 }}>✏️</span>
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 12, color: "#777", fontStyle: "italic" }}>
                      {item.description}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        style={{
          alignSelf: "flex-start",
          marginTop: 4,
          padding: "6px 14px",
          background: "#F9E1E3",
          border: "1px solid #E30513",
          borderRadius: 4,
          color: "#E30513",
          fontWeight: 600,
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        + Ajouter un élément
      </button>
    </div>
  );
}
