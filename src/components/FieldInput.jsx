import { useState } from "react";
import PersonnelTable from "./PersonnelTable.jsx";
import MaterielTable from "./MaterielTable.jsx";
import PropositionTechnique from "./PropositionTechnique.jsx";
import BulletList from "./BulletList.jsx";
import EnjeuxList from "./EnjeuxList.jsx";
import ArticlesTable from "./ArticlesTable.jsx";
import TranchesTable from "./TranchesTable.jsx";
import MultiCheckExtensible from "./MultiCheckExtensible.jsx";
import { getFieldStatus } from "../utils/fieldStatus.js";

// ── Couleurs C2 ────────────────────────────────────────────────────────────
const ACTIVE_RED = "#E30513";
const ACTIVE_RED_BG = "#F9E1E3";

const inputBase = {
  width: "100%",
  border: "1px solid #DFE4E8",
  borderRadius: 4,
  padding: "4px 8px",
  fontFamily: "Open Sans, sans-serif",
  fontSize: 12,
  color: "#4D4D4D",
  background: "#fff",
  outline: "none",
};

// ── Sub-components ─────────────────────────────────────────────────────────

function MultiSelect({ options, value = [], onChange, disabled }) {
  const toggle = (opt) => {
    if (disabled) return;
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <label
            key={opt}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 12,
              border: `1px solid ${selected ? ACTIVE_RED : "#DFE4E8"}`,
              background: selected ? ACTIVE_RED_BG : "#fff",
              fontSize: 11,
              cursor: disabled ? "default" : "pointer",
              color: selected ? ACTIVE_RED : "#4D4D4D",
              fontWeight: selected ? 600 : 400,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => toggle(opt)}
              style={{ display: "none" }}
            />
            {selected && <span>✓</span>}
            {opt}
          </label>
        );
      })}
    </div>
  );
}

function Pill({ children, color = "#999", mono = false }) {
  return (
    <span
      style={{
        fontSize: 10,
        background: "#F2F2F2",
        color,
        padding: "1px 6px",
        borderRadius: 3,
        fontFamily: mono ? "monospace" : undefined,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function InfoIcon({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Afficher le contexte"
      style={{
        width: 22,
        height: 22,
        padding: 0,
        borderRadius: "50%",
        border: "1px solid #BBD4F0",
        background: active ? "#1565C0" : "#EAF2FB",
        color: active ? "#fff" : "#1565C0",
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
  );
}

function CommentIcon({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Commentaire libre"
      style={{
        width: 22,
        height: 22,
        padding: 0,
        borderRadius: 4,
        border: "1px solid #DFE4E8",
        background: active ? "#FFFDE7" : "#F9F9F9",
        color: active ? "#F57F17" : "#777",
        cursor: "pointer",
        fontSize: 11,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      💬
    </button>
  );
}

function ActorButtons({ actors, assigned, onToggle }) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {actors.map((a) => {
        const sel = assigned.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onToggle(a.id)}
            title={`Déléguer à ${a.label}`}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 3,
              border: `1px solid ${sel ? ACTIVE_RED : "#DFE4E8"}`,
              background: sel ? ACTIVE_RED_BG : "#fff",
              color: sel ? ACTIVE_RED : "#999",
              cursor: "pointer",
              lineHeight: 1.4,
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FieldInput({
  field,
  value,
  onChange,
  actorAssignment,
  onActorAssignmentChange,
  fieldComment,
  onFieldCommentChange,
  actors,
  formData,
  // For special table types, pass through row data
  personnelRows,
  onPersonnelRowsChange,
  materielRows,
  onMaterielRowsChange,
  propositionItems,
  onPropositionItemsChange,
  bulletListItems,
  onBulletListItemsChange,
  articlesEsssRows,
  onArticlesEsssRowsChange,
  tranchesRows,
  onTranchesRowsChange,
}) {
  const [expanded, setExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState(!!fieldComment);

  const assigned = actorAssignment || [];
  const isDelegated = assigned.length > 0;

  // Condition: show/hide based on other field value
  if (field.condition) {
    const [condField, condVal] = field.condition.split("=");
    if (!formData || formData[condField] !== condVal) return null;
  }

  const isSpecialType = [
    "personnel_table",
    "materiel_table",
    "proposition_list",
    "bullet_list",
    "enjeux_list",
    "articles_table",
    "tranchesTable",
    "mirror",
    "multi_check_extensible",
  ].includes(field.type);
  // `disabledIf` makes a field non-editable based on another field's value
  // (e.g. "tranches_marche_existe=Non" disables the tranches table).
  const fieldDisabled = (() => {
    if (!field.disabledIf) return false;
    const [k, v] = field.disabledIf.split("=");
    return formData?.[k] === v;
  })();
  // `lockedIf` forces a fixed value + readonly state when the predicate matches
  // (e.g. CCAP-020 auto-fills "Se référer au tableau Résumé des Tranches" when
  // tranches_marche_existe=Oui). The locked value is shown as a non-editable
  // text input; the export uses the locked value verbatim.
  const lockedInfo = (() => {
    if (!field.lockedIf) return null;
    const { condition, value: locked } = field.lockedIf;
    const [k, v] = (condition || "").split("=");
    return formData?.[k] === v ? { value: locked } : null;
  })();
  // `naToggle: true` adds a small "N/A" button next to a text input. When
  // active, the companion key `${id}_na` is set in formData and the input
  // displays "Non applicable" non-editable. The export reads `${id}_na` to
  // decide whether to write the user value or "Non applicable" verbatim.
  const naActive = field.naToggle === true && formData?.[`${field.id}_na`] === true;
  const toggleNa = () => {
    if (!field.naToggle) return;
    onChange(`${field.id}_na`, !naActive);
    if (!naActive) onChange(field.id, "");
  };
  const isReadonly = field.type === "readonly";
  const isTextarea = field.type === "textarea";
  const isMulti = field.type === "multi";

  const fieldStatus = getFieldStatus(field, value, assigned, fieldComment, formData);

  const allNotes = [
    ...(field.note ? [field.note] : []),
    ...(Array.isArray(field.notes) ? field.notes : []),
  ];
  const hasInfo = !!field.context || allNotes.length > 0;

  const toggleActor = (actorId) => {
    const next = assigned.includes(actorId)
      ? assigned.filter((id) => id !== actorId)
      : [...assigned, actorId];
    onActorAssignmentChange(field.id, next);
  };

  const assignedActors = actors.filter((a) => assigned.includes(a.id));

  const renderInput = () => {
    if (field.type === "readonly") return null;
    if (field.type === "personnel_table") {
      return <PersonnelTable rows={personnelRows} onChange={onPersonnelRowsChange} />;
    }
    if (field.type === "materiel_table") {
      return <MaterielTable rows={materielRows} onChange={onMaterielRowsChange} />;
    }
    if (field.type === "proposition_list") {
      return <PropositionTechnique items={propositionItems} onChange={onPropositionItemsChange} />;
    }
    if (field.type === "bullet_list") {
      const stored = bulletListItems?.[field.id];
      const defaults = (field.defaultItems || []).map((it, idx) => ({ id: idx + 1, ...it }));
      return (
        <BulletList
          items={stored}
          defaults={defaults}
          onChange={(next) =>
            onBulletListItemsChange({ ...(bulletListItems || {}), [field.id]: next })
          }
        />
      );
    }
    if (field.type === "enjeux_list") {
      return <EnjeuxList value={value || {}} onChange={(next) => onChange(field.id, next)} />;
    }
    if (field.type === "articles_table") {
      return <ArticlesTable rows={articlesEsssRows} onChange={onArticlesEsssRowsChange} />;
    }
    if (field.type === "tranchesTable") {
      return <TranchesTable rows={tranchesRows} onChange={onTranchesRowsChange} disabled={fieldDisabled} />;
    }
    if (field.type === "multi_check_extensible") {
      return (
        <MultiCheckExtensible
          value={value}
          onChange={(next) => onChange(field.id, next)}
          defaultOptions={field.defaultOptions || []}
        />
      );
    }
    if (field.type === "mirror") {
      const items = (field.mirrorFields || []).map((mfId) => ({
        id: mfId,
        value: formData?.[mfId],
      }));
      return (
        <div
          style={{
            border: "1px dashed #DFE4E8",
            borderRadius: 6,
            background: "#FAFAFA",
            padding: "6px 10px",
          }}
        >
          {items.map((it, idx) => {
            const isEmpty = !it.value || String(it.value).trim() === "";
            return (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "4px 0",
                  borderTop: idx === 0 ? "none" : "1px solid #E8EAED",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: "#BDBDBD",
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: 2,
                    minWidth: 110,
                  }}
                >
                  {it.id}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: isEmpty ? "#C62828" : "#4D4D4D",
                    fontStyle: isEmpty ? "italic" : "normal",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    flex: 1,
                  }}
                >
                  {isEmpty
                    ? "(non renseigné — à compléter dans sa section d'origine)"
                    : it.value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    if (field.type === "toggle") {
      const val = value || "";
      const isOui = val === "Oui";
      const isNon = val === "Non";
      const btnBase = {
        padding: "4px 16px",
        fontSize: 12,
        fontWeight: 700,
        cursor: isDelegated ? "not-allowed" : "pointer",
        border: "1px solid #DFE4E8",
        background: "#fff",
        color: "#4D4D4D",
        fontFamily: "Open Sans, sans-serif",
        opacity: isDelegated ? 0.6 : 1,
      };
      const set = (v) => !isDelegated && onChange(field.id, v === val ? "" : v);
      return (
        <div style={{ display: "inline-flex", borderRadius: 4, overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => set("Oui")}
            disabled={isDelegated}
            style={{
              ...btnBase,
              borderRight: "none",
              background: isOui ? "#2E7D32" : "#fff",
              color: isOui ? "#fff" : "#4D4D4D",
              borderColor: isOui ? "#2E7D32" : "#DFE4E8",
            }}
          >
            OUI
          </button>
          <button
            type="button"
            onClick={() => set("Non")}
            disabled={isDelegated}
            style={{
              ...btnBase,
              background: isNon ? "#C62828" : "#fff",
              color: isNon ? "#fff" : "#4D4D4D",
              borderColor: isNon ? "#C62828" : "#DFE4E8",
            }}
          >
            NON
          </button>
        </div>
      );
    }

    const disabled = isDelegated;
    const style = {
      ...inputBase,
      background: isDelegated ? "#F9F9F9" : "#fff",
      borderColor: isDelegated ? "#DFE4E8" : value ? "#b0b0b0" : "#DFE4E8",
      cursor: isDelegated ? "not-allowed" : "text",
    };

    if (field.type === "textarea") {
      return (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder={
            isDelegated
              ? `(délégué — ${assignedActors.map((a) => a.label).join(", ")})`
              : field.placeholder || ""
          }
          style={{ ...style, resize: "vertical", lineHeight: 1.4 }}
        />
      );
    }
    if (field.type === "select") {
      return (
        <select
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={disabled}
          style={{ ...style, cursor: disabled ? "not-allowed" : "pointer" }}
        >
          <option value="">— Choisir —</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === "multi") {
      return (
        <MultiSelect
          options={field.options}
          value={value || []}
          onChange={(v) => onChange(field.id, v)}
          disabled={disabled}
        />
      );
    }
    if (field.type === "date") {
      return (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={disabled}
          style={style}
        />
      );
    }
    if (field.type === "time") {
      return (
        <input
          type="time"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          disabled={disabled}
          style={style}
        />
      );
    }
    // Locked: predicate forces a fixed readonly value
    if (lockedInfo) {
      return (
        <input
          type="text"
          value={lockedInfo.value}
          readOnly
          title="Champ rempli automatiquement — voir la note"
          style={{
            ...style,
            background: "#F2F2F2",
            color: "#777",
            fontStyle: "italic",
            cursor: "not-allowed",
          }}
        />
      );
    }
    // Default: text. With naToggle, wrap input + small "N/A" button in a flex
    // row. When N/A is active, the input shows "Non applicable" non-editable
    // and the button switches to a "rétablir" state.
    if (field.naToggle) {
      const naButtonStyle = {
        flexShrink: 0,
        padding: "4px 10px",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "Open Sans, sans-serif",
        border: `1px solid ${naActive ? "#E30513" : "#777"}`,
        borderRadius: 4,
        background: naActive ? "#E30513" : "#F2F2F2",
        color: naActive ? "#fff" : "#777",
        cursor: "pointer",
        whiteSpace: "nowrap",
      };
      return (
        <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          <input
            type="text"
            value={naActive ? "Non applicable" : (value || "")}
            onChange={(e) => onChange(field.id, e.target.value)}
            disabled={disabled || naActive}
            placeholder={
              isDelegated
                ? `(délégué — ${assignedActors.map((a) => a.label).join(", ")})`
                : field.placeholder || ""
            }
            style={{
              ...style,
              flex: 1,
              ...(naActive ? { background: "#F2F2F2", color: "#777", fontStyle: "italic", cursor: "not-allowed" } : null),
            }}
          />
          <button
            type="button"
            onClick={toggleNa}
            title={naActive ? "Rétablir le champ (saisir une valeur)" : "Marquer comme Non applicable"}
            style={naButtonStyle}
          >
            {naActive ? "✓ N/A" : "N/A"}
          </button>
        </div>
      );
    }
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        disabled={disabled}
        placeholder={
          isDelegated
            ? `(délégué — ${assignedActors.map((a) => a.label).join(", ")})`
            : field.placeholder || ""
        }
        style={style}
      />
    );
  };

  // Layout choice: inline single-row for simple types, stacked for special tables
  const useInlineLayout = !isSpecialType && !isReadonly;

  // Left-edge state indicator: vert=rempli, orange=délégué/commentaire, rouge=non rempli
  const borderLeftColor = {
    readonly: "#DFE4E8",
    filled: "#66BB6A",
    delegated: "#FFB74D",
    unfilled: ACTIVE_RED,
  }[fieldStatus];

  const cardStyle = {
    padding: "6px 10px",
    background: isDelegated ? "#FAFAFA" : "#fff",
    borderBottom: "1px solid #E8EAED",
    borderLeft: `2px solid ${borderLeftColor}`,
  };

  const labelBlock = (
    <div
      style={{
        minWidth: 200,
        maxWidth: 200,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {field.uid && (
          <Pill mono color="#BDBDBD">
            {field.uid}
          </Pill>
        )}
        {field.ref && <Pill mono>{field.ref}</Pill>}
      </div>
      <label
        style={{
          fontWeight: 700,
          fontSize: 12,
          color: "#30323E",
          lineHeight: 1.25,
        }}
      >
        {field.label}
      </label>
    </div>
  );

  const actionsBlock = !useInlineLayout ? null : (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      {hasInfo && <InfoIcon active={expanded} onClick={() => setExpanded(!expanded)} />}
      <CommentIcon
        active={commentOpen}
        onClick={() => {
          const next = !commentOpen;
          setCommentOpen(next);
          if (!next) onFieldCommentChange(field.id, "");
        }}
      />
      <ActorButtons actors={actors} assigned={assigned} onToggle={toggleActor} />
    </div>
  );

  return (
    <div style={cardStyle}>
      {useInlineLayout ? (
        <div
          style={{
            display: "flex",
            alignItems: isTextarea || isMulti ? "flex-start" : "center",
            gap: 8,
          }}
        >
          {labelBlock}
          <div style={{ flex: 1, opacity: isDelegated ? 0.5 : 1 }}>{renderInput()}</div>
          {actionsBlock}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 6 }}>{labelBlock}</div>
          {/* Context shown BEFORE the input for special/readonly types so the user
              reads the « guide » text from the template before interacting. */}
          {field.context && (
            <div
              style={{
                marginBottom: 6,
                fontSize: 11,
                color: "#9E9E9E",
                fontStyle: "italic",
                borderLeft: "2px solid #DFE4E8",
                paddingLeft: 6,
                whiteSpace: "pre-line",
                lineHeight: 1.5,
              }}
            >
              « {field.context} »
            </div>
          )}
          {field.imageSrc && (
            <div style={{ margin: "8px 0", textAlign: "center" }}>
              <img
                src={field.imageSrc}
                alt={field.imageAlt || ""}
                style={{ maxWidth: "100%", height: "auto", border: "1px solid #DFE4E8", borderRadius: 4 }}
              />
            </div>
          )}
          {!isReadonly && <div>{renderInput()}</div>}
        </>
      )}

      {/* Info panel (context + notes) */}
      {expanded && hasInfo && useInlineLayout && (
        <div
          style={{
            marginTop: 6,
            marginLeft: 208,
            paddingLeft: 6,
            borderLeft: "2px solid #DFE4E8",
          }}
        >
          {field.context && (
            <div
              style={{
                fontSize: 11,
                color: "#9E9E9E",
                fontStyle: "italic",
                marginBottom: 4,
              }}
            >
              « {field.context} »
            </div>
          )}
          {allNotes.map((n, idx) => (
            <div
              key={idx}
              style={{
                fontSize: 10,
                color: "#4D4D4D",
                background: "#F2F2F2",
                border: "1px solid #BDBDBD",
                borderRadius: 3,
                padding: "3px 6px",
                marginTop: 3,
                whiteSpace: "pre-line",
                lineHeight: 1.5,
              }}
            >
              ℹ️ {n}
            </div>
          ))}
        </div>
      )}

      {/* Comment box (inline layout only) */}
      {commentOpen && useInlineLayout && (
        <div style={{ marginTop: 6, marginLeft: 208 }}>
          <textarea
            value={fieldComment || ""}
            onChange={(e) => onFieldCommentChange(field.id, e.target.value)}
            rows={2}
            placeholder="Commentaire libre (sera inséré dans le .docx)…"
            style={{
              width: "100%",
              fontSize: 11,
              fontStyle: "italic",
              fontFamily: "Open Sans, sans-serif",
              border: "1px solid #FFF176",
              background: "#FFFDE7",
              borderRadius: 4,
              padding: "4px 8px",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>
      )}

      {/* Recommendation block (preserved from previous design) */}
      {field.recommendation && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            background: "#EAF2FB",
            border: "1px solid #BBD4F0",
            borderLeft: "3px solid #1565C0",
            borderRadius: 4,
            fontSize: 11,
            color: "#1a2a3a",
            lineHeight: 1.5,
            whiteSpace: "pre-line",
          }}
        >
          <div style={{ fontWeight: 700, color: "#1565C0", marginBottom: 3, fontSize: 11 }}>
            💡 Recommandation AFD — {field.recommendation.title}
          </div>
          {field.recommendation.text}
        </div>
      )}

      {/* Context for non-inline layouts is rendered above the input (see
          earlier render block). Notes still appear below the input so the
          checkbox-style guidance like « Cliquez sur l'icône… » sits next to
          the action it describes. */}
      {!useInlineLayout && allNotes.length > 0 &&
        allNotes.map((n, idx) => (
          <div
            key={idx}
            style={{
              marginTop: 4,
              fontSize: 10,
              color: "#4D4D4D",
              background: "#F2F2F2",
              border: "1px solid #BDBDBD",
              borderRadius: 3,
              padding: "3px 6px",
              whiteSpace: "pre-line",
              lineHeight: 1.5,
            }}
          >
            ℹ️ {n}
          </div>
        ))}
    </div>
  );
}
