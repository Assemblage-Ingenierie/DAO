import { useEffect, useRef, useState } from "react";
import { usePackage } from "../PackageContext.jsx";

// Modal asking the user for the meta of a new project. Currently the only
// active pack is FR v2024 so the language/version selects are read-only;
// they're rendered as informative chips. When phase 3/5 add EN/ES packs,
// this modal flips to real selects.
export default function NewProjectModal({ onCancel, onCreate }) {
  const { labels } = usePackage();
  const m = labels.newProjectModal;
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc to cancel
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ name: trimmed });
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(48, 50, 62, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "Open Sans, sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: "92vw",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#30323E" }}>
          {m.title}
        </h2>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#4D4D4D" }}>
            {m.nameLabel}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={m.namePlaceholder}
            style={{
              border: "1px solid #DFE4E8",
              borderRadius: 5,
              padding: "8px 10px",
              fontSize: 14,
              fontFamily: "Open Sans, sans-serif",
              outline: "none",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <ReadOnlyChip label={m.languageLabel} value="Français" />
          <ReadOnlyChip label={m.versionLabel} value="v2024" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "#fff",
              border: "1px solid #DFE4E8",
              borderRadius: 5,
              fontSize: 13,
              color: "#4D4D4D",
              cursor: "pointer",
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            {m.cancelButton}
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              padding: "8px 18px",
              background: name.trim() ? "#E30513" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 13,
              cursor: name.trim() ? "pointer" : "not-allowed",
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            {m.createButton}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReadOnlyChip({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "6px 10px",
        background: "#F2F2F2",
        border: "1px solid #DFE4E8",
        borderRadius: 5,
        fontSize: 12,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, color: "#30323E" }}>{value}</div>
    </div>
  );
}
