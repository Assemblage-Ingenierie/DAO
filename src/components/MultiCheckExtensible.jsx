import { useState, useMemo } from "react";

// MultiCheckExtensible — checklist with predefined "default" options that the
// user can toggle on/off, plus the ability to add custom options at the
// bottom. Each default option may carry a `subClauseRef` (short label) and
// `subClauseText` (the full sub-clause body) that the user can expand via a
// small ℹ️ button next to the label.
//
// State shape stored in formData[fieldId]:
//   [
//     { id: "sc-3-5", label: "...", checked: true,  custom: false },
//     { id: "custom-1234567890", label: "...", checked: true, custom: true },
//   ]
//
// On first render (no stored value) the component seeds the state from
// `defaultOptions` with checked=true for all defaults. The user can then
// uncheck or remove items. Removing a default just toggles checked=false
// (the row is preserved so the export can still highlight it red); removing
// a custom row deletes it entirely.

const cellStyle = {
  padding: "6px 8px",
  fontSize: 12,
  color: "#4D4D4D",
};

export default function MultiCheckExtensible({ value, onChange, defaultOptions = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  // Seed the working list. If the stored value is empty, we present every
  // defaultOption as checked. We never *write* the seed back to formData
  // unless the user interacts — keeps the persistence clean.
  const items = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      // Make sure every defaultOption is represented (in case the field
      // schema added new defaults after a previous save).
      const byId = new Map(value.map((it) => [it.id, it]));
      const merged = [];
      for (const opt of defaultOptions) {
        const existing = byId.get(opt.id);
        merged.push(existing ?? { id: opt.id, label: opt.label, checked: true, custom: false });
        byId.delete(opt.id);
      }
      // Append remaining (custom) entries in their original order
      for (const it of value) {
        if (byId.has(it.id)) merged.push(it);
      }
      return merged;
    }
    return defaultOptions.map((opt) => ({
      id: opt.id,
      label: opt.label,
      checked: true,
      custom: false,
    }));
  }, [value, defaultOptions]);

  const findMeta = (id) => defaultOptions.find((o) => o.id === id) || null;

  const update = (next) => onChange(next);

  const toggleChecked = (id) => {
    update(items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  };

  const updateLabel = (id, label) => {
    update(items.map((it) => (it.id === id ? { ...it, label } : it)));
  };

  const removeItem = (id) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (it.custom) {
      update(items.filter((x) => x.id !== id));
    } else {
      // Default option: just toggle off (so export marks it red)
      update(items.map((x) => (x.id === id ? { ...x, checked: false } : x)));
    }
  };

  const addOption = () => {
    const id = `custom-${Date.now()}`;
    update([...items, { id, label: "", checked: true, custom: true }]);
  };

  return (
    <div>
      <div
        style={{
          border: "1px solid #DFE4E8",
          borderRadius: 4,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {items.map((it, idx) => {
          const meta = findMeta(it.id);
          const expanded = expandedId === it.id;
          const hasInfo = !!(meta && (meta.subClauseRef || meta.subClauseText));
          return (
            <div
              key={it.id}
              style={{
                borderTop: idx === 0 ? "none" : "1px solid #E8EAED",
                background: it.checked ? "#fff" : "#FAFAFA",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, ...cellStyle }}>
                <input
                  type="checkbox"
                  checked={!!it.checked}
                  onChange={() => toggleChecked(it.id)}
                  style={{ marginTop: 3, flexShrink: 0, cursor: "pointer" }}
                />
                {it.custom ? (
                  <input
                    type="text"
                    value={it.label || ""}
                    onChange={(e) => updateLabel(it.id, e.target.value)}
                    placeholder="Saisir le libellé de l'option…"
                    style={{
                      flex: 1,
                      border: "1px solid #DFE4E8",
                      borderRadius: 3,
                      padding: "3px 6px",
                      fontFamily: "Open Sans, sans-serif",
                      fontSize: 12,
                      color: "#4D4D4D",
                      outline: "none",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      lineHeight: 1.4,
                      color: it.checked ? "#4D4D4D" : "#999",
                      textDecoration: it.checked ? "none" : "line-through",
                    }}
                  >
                    {it.label}
                  </span>
                )}
                {hasInfo && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : it.id)}
                    title={expanded ? "Masquer la sous-clause" : "Afficher la sous-clause"}
                    style={{
                      width: 22,
                      height: 22,
                      padding: 0,
                      borderRadius: "50%",
                      border: "1px solid #BBD4F0",
                      background: expanded ? "#1565C0" : "#EAF2FB",
                      color: expanded ? "#fff" : "#1565C0",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    i
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  title={it.custom ? "Supprimer cette option" : "Décocher (sera surligné rouge à l'export)"}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#E30513",
                    fontSize: 16,
                    cursor: "pointer",
                    padding: "0 4px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
              {expanded && meta && (
                <div
                  style={{
                    margin: "0 12px 8px 36px",
                    padding: "8px 10px",
                    background: "#EAF2FB",
                    border: "1px solid #BBD4F0",
                    borderLeft: "3px solid #1565C0",
                    borderRadius: 4,
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: "#1a2a3a",
                    whiteSpace: "pre-line",
                  }}
                >
                  {meta.subClauseRef && (
                    <div style={{ fontWeight: 700, color: "#1565C0", marginBottom: 4 }}>
                      📖 {meta.subClauseRef}
                    </div>
                  )}
                  {meta.subClauseText || "(texte de la sous-clause non fourni)"}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addOption}
        style={{
          marginTop: 8,
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
        + Ajouter une option
      </button>
    </div>
  );
}
