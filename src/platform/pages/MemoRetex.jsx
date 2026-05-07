// ── Plateforme — page MemoRetex (Mémo Passation — REX) ───────────────────
//
// Base des retours d'expérience. Filtres par thématique, mots-clés, et
// recherche libre. Bouton "+ Nouveau conseil" qui ajoute à
// `data.customRetex`. Les conseils alimentent automatiquement le panneau
// "Conseils" de la page Market quand le mot-clé matche l'onglet courant.
//
// Refactor de la branche `nav==="memo"` du single-file
// `_imports/plateforme-source.jsx` (lignes 873-929).

import { useState } from "react";
import { RETEX_THEMES, RETEX_KW, RETEX_DATA } from "../data/retexData.js";
import { usePlatformData } from "../store/usePlatformData.js";
import "../styles.css";

export default function MemoRetex() {
  const [data, setData] = usePlatformData();
  const [theme, setTheme] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  // Form state pour nouveau conseil
  const [newTheme, setNewTheme] = useState("");
  const [newKeywords, setNewKeywords] = useState([]);
  const [newProject, setNewProject] = useState("");
  const [newEditor, setNewEditor] = useState("");
  const [newComment, setNewComment] = useState("");

  function toggleKeyword(k) {
    setKeywords((kws) => (kws.includes(k) ? kws.filter((x) => x !== k) : [...kws, k]));
  }
  function toggleNewKeyword(k) {
    setNewKeywords((kws) => (kws.includes(k) ? kws.filter((x) => x !== k) : [...kws, k]));
  }

  function handleAdd() {
    if (!newComment.trim() || !newTheme) return;
    const item = {
      id: "NR" + Date.now(),
      th: newTheme,
      kw: newKeywords.join(" / "),
      pj: newProject.trim(),
      ed: newEditor,
      cm: newComment.trim(),
      custom: true,
    };
    setData((prev) => ({ ...prev, customRetex: [...(prev.customRetex || []), item] }));
    setNewComment("");
    setNewProject("");
    setNewKeywords([]);
    setShowNewForm(false);
  }

  function handleDelete(id) {
    if (!window.confirm("Supprimer ce conseil ?")) return;
    setData((prev) => ({
      ...prev,
      customRetex: (prev.customRetex || []).filter((x) => x.id !== id),
    }));
  }

  const all = [...RETEX_DATA, ...(data.customRetex || [])];
  const filtered = all.filter((r) => {
    if (theme && r.th !== theme) return false;
    if (keywords.length > 0 && !keywords.some((k) => (r.kw || "").includes(k))) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.cm + r.th + (r.kw || "") + r.pj).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="fade">
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E", marginBottom: 8 }}>
        Mémo Passation — Retours d'expérience
      </h1>
      <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 20 }}>
        Base de conseils et retours d'expérience Assemblage ingénierie. Ces items alimentent
        automatiquement la section « Conseils » dans chaque relecture de document.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <select
          className="ip"
          style={{ maxWidth: 250 }}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="">— Toutes les thématiques —</option>
          {RETEX_THEMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="ip"
          style={{ maxWidth: 250 }}
          placeholder="Recherche libre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="br" onClick={() => setShowNewForm(!showNewForm)}>
          {showNewForm ? "Fermer" : "+ Nouveau conseil"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#4D4D4D", fontWeight: 600, alignSelf: "center" }}>
          Mots-clés :
        </span>
        {RETEX_KW.map((k) => {
          const selected = keywords.includes(k);
          return (
            <span
              key={k}
              onClick={() => toggleKeyword(k)}
              style={{
                padding: "3px 12px",
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                background: selected ? "#2563eb" : "#fff",
                color: selected ? "#fff" : "#30323E",
                border: selected ? "2px solid #2563eb" : "1.5px solid #DFE4E8",
              }}
            >
              {k}
            </span>
          );
        })}
        {keywords.length > 0 && (
          <span
            onClick={() => setKeywords([])}
            style={{
              padding: "3px 12px",
              borderRadius: 16,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              background: "#E30513",
              color: "#fff",
            }}
          >
            Effacer filtres
          </span>
        )}
      </div>

      {showNewForm && (
        <div
          className="fade"
          style={{
            background: "#F2F2F2",
            borderRadius: 8,
            padding: 24,
            marginBottom: 20,
            borderLeft: "4px solid #2563eb",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#30323E", marginBottom: 14 }}>
            Nouveau conseil / retour d'expérience
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="lb">Thématique</label>
              <select
                className="ip"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
              >
                <option value="">—</option>
                {RETEX_THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__custom__">+ Autre…</option>
              </select>
              {newTheme === "__custom__" && (
                <input
                  className="ip"
                  style={{ marginTop: 4 }}
                  placeholder="Nouvelle thématique"
                  onChange={(e) => {
                    if (e.target.value) setNewTheme(e.target.value);
                  }}
                />
              )}
            </div>
            <div>
              <label className="lb">Projet</label>
              <input
                className="ip"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="Ex: 225_15_RCI_Collèges"
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="lb">Mots-clés</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {RETEX_KW.map((k) => {
                const selected = newKeywords.includes(k);
                return (
                  <span
                    key={k}
                    onClick={() => toggleNewKeyword(k)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 14,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: selected ? "#2563eb" : "#fff",
                      color: selected ? "#fff" : "#30323E",
                      border: selected ? "2px solid #2563eb" : "1.5px solid #DFE4E8",
                    }}
                  >
                    {k}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="lb">Auteur</label>
            <select
              className="ip"
              style={{ maxWidth: 200 }}
              value={newEditor}
              onChange={(e) => setNewEditor(e.target.value)}
            >
              <option value="">—</option>
              {(data.equipe || []).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="lb">Commentaire / conseil</label>
            <textarea
              className="ip"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{ minHeight: 80 }}
              placeholder="Décrire le retour d'expérience ou le conseil…"
            />
          </div>

          <button className="br" style={{ background: "#2563eb" }} onClick={handleAdd}>
            Ajouter
          </button>
        </div>
      )}

      <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 12 }}>
        {filtered.length} conseil{filtered.length > 1 ? "s" : ""}
      </p>

      {filtered.map((r, i) => (
        <div
          key={r.id || i}
          style={{
            border: "1.5px solid #DFE4E8",
            borderRadius: 8,
            padding: 14,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 700,
                background: r.custom ? "#f59e0b" : "#2563eb",
                color: "#fff",
              }}
            >
              {r.th || "—"}
            </span>
            {r.kw &&
              r.kw.split(" / ").map((k, j) =>
                k.trim() ? (
                  <span
                    key={j}
                    style={{
                      padding: "2px 10px",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 600,
                      background: "#F2F2F2",
                      color: "#30323E",
                    }}
                  >
                    {k.trim()}
                  </span>
                ) : null,
              )}
            {r.custom && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: 9,
                  fontWeight: 700,
                  background: "#f59e0b",
                  color: "#fff",
                }}
              >
                PERSONNALISÉ
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#30323E",
              lineHeight: 1.5,
              marginBottom: 6,
              whiteSpace: "pre-line",
            }}
          >
            {r.cm}
          </div>
          <div style={{ fontSize: 11, color: "#999", display: "flex", gap: 12 }}>
            {r.ed && <span>{r.ed}</span>}
            {r.pj && <span>{r.pj}</span>}
          </div>
          {r.custom && (
            <button
              style={{
                background: "none",
                border: "none",
                fontSize: 11,
                color: "#E30513",
                cursor: "pointer",
                marginTop: 4,
              }}
              onClick={() => handleDelete(r.id)}
            >
              Supprimer
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
