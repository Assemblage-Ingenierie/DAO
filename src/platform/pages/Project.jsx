// ── Plateforme — page Project (cadrage + liste marchés) ──────────────────
//
// Affiche un projet : header (drapeau pays + nom projet + pays), bouton
// "Cadrage" qui déplie un formulaire d'édition complet (secteur, langue,
// directives, sécurité, équipe AI, etc.), et la liste des marchés avec
// chacun un bouton "Éditer" inline + un lien "Checklist →" vers Market.
//
// Refactor de la branche `nav==="projets" && selP && !selM` du single-file
// `_imports/plateforme-source.jsx` (lignes 775-864).

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import { TYPES, SECT, LANG, SPI } from "../data/types.js";
import { CLS_TVX, CLS_PI, TABS_TVX, TABS_PI } from "../data/checklists/index.js";
import { usePlatformData } from "../store/usePlatformData.js";
import "../styles.css";

// Petit badge — extrait de Country.jsx pour cohérence (sera relevé en 3.7).
function Badge({ bg, color, children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  );
}

// "Domain choice" — case cliquable façon radio. Source ligne 553 (`DC`).
function DomainChoice({ selected, onClick, title }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 6,
        cursor: "pointer",
        border: selected ? "2px solid #30323E" : "1.5px solid #DFE4E8",
        background: selected ? "#30323E" : "#fff",
        color: selected ? "#fff" : "#30323E",
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {title}
    </div>
  );
}

// Calcule l'étape courante d'un marché (premier onglet de checklist non
// terminé). Source lignes 505-517 — extrait localement pour 3.3a, peut
// remonter en util partagé en 3.7.
function getMarketStep(market, reviews) {
  const tabs = market.cat === "PI" ? TABS_PI : TABS_TVX;
  const cls = market.cat === "PI" ? CLS_PI : CLS_TVX;
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const reviewKey = market.id + "_" + tab.id;
    const reviewItems = (reviews || {})[reviewKey] || {};
    const items = cls[tab.id] || [];
    if (items.length === 0) continue;
    const filledCount = Object.keys(reviewItems).filter(
      (k) => reviewItems[k] && reviewItems[k].status,
    ).length;
    if (filledCount === 0)
      return { idx: i, tab, label: tab.l, status: "todo", progress: 0 };
    if (filledCount < items.length)
      return {
        idx: i,
        tab,
        label: tab.l,
        status: "wip",
        progress: Math.round((filledCount / items.length) * 100),
      };
  }
  const last = tabs[tabs.length - 1];
  return { idx: tabs.length - 1, tab: last, label: "Terminé", status: "done", progress: 100 };
}

// ── Sous-composants extraits pour lisibilité ─────────────────────────────

function CadragePanel({ project, country, equipe, onPatch, onToggleMember, onAddMember }) {
  const [newMemberName, setNewMemberName] = useState("");

  function handleAddMember() {
    if (!newMemberName.trim()) return;
    onAddMember(newMemberName);
    setNewMemberName("");
  }

  return (
    <div
      className="fade"
      style={{
        background: "#F2F2F2",
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
        borderLeft: "4px solid #30323E",
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#30323E", marginBottom: 16 }}>
        Cadrage
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label className="lb">Nom du projet</label>
          <input className="ip" value={project.name || ""} onChange={(e) => onPatch({ name: e.target.value })} />
        </div>
        <div>
          <label className="lb">Montant global</label>
          <input className="ip" value={project.mt || ""} onChange={(e) => onPatch({ mt: e.target.value })} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label className="lb">Secteur</label>
          <select className="ip" value={project.sec || ""} onChange={(e) => onPatch({ sec: e.target.value })}>
            <option value="">—</option>
            {SECT.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="lb">Langue</label>
          <select className="ip" value={project.lang || "Français"} onChange={(e) => onPatch({ lang: e.target.value })}>
            {LANG.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label className="lb">Responsable EP</label>
          <input className="ip" value={project.resp || ""} onChange={(e) => onPatch({ resp: e.target.value })} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label className="lb">Construction</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {["Construction neuve", "Réhabilitation"].map((v) => (
              <DomainChoice key={v} selected={project.tcon === v} onClick={() => onPatch({ tcon: v })} title={v} />
            ))}
          </div>
        </div>
        <div>
          <label className="lb">Contexte</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {["Urbain", "Rural"].map((v) => (
              <DomainChoice key={v} selected={project.ctx === v} onClick={() => onPatch({ ctx: v })} title={v} />
            ))}
          </div>
        </div>
        <div>
          <label className="lb">Site</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {["Site unique", "Multisite"].map((v) => (
              <DomainChoice key={v} selected={project.site === v} onClick={() => onPatch({ site: v })} title={v} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label className="lb">Directives</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <DomainChoice selected={project.dir === "2024"} onClick={() => onPatch({ dir: "2024" })} title="Dir. 2024 — Option B" />
            <DomainChoice selected={project.dir === "2019"} onClick={() => onPatch({ dir: "2019" })} title="Dir. 2019 — Option A" />
          </div>
        </div>
        <div>
          <label className="lb">Vérification</label>
          <select className="ip" value={project.verif || ""} onChange={(e) => onPatch({ verif: e.target.value })}>
            <option value="eac">Ex-ante complète</option>
            <option value="eas">Ex-ante simplifiée</option>
            <option value="exp">Ex-post</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="lb">Sécurité</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <DomainChoice selected={project.secu === "standard"} onClick={() => onPatch({ secu: "standard" })} title="Standard" />
          <DomainChoice
            selected={project.secu === "zone-risque"}
            onClick={() => onPatch({ secu: "zone-risque" })}
            title="Zone à risque — Art. 1.5.2"
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="lb">Équipe AI</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {equipe.map((memberName) => {
            const isSelected = (project.eq || []).includes(memberName);
            return (
              <span
                key={memberName}
                onClick={() => onToggleMember(memberName)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 16,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: isSelected ? "#30323E" : "#fff",
                  color: isSelected ? "#fff" : "#30323E",
                  border: isSelected ? "2px solid #30323E" : "1.5px solid #DFE4E8",
                }}
              >
                {memberName}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="ip"
            style={{ maxWidth: 160, fontSize: 12 }}
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
            placeholder="Ajouter..."
          />
          <button className="bo" style={{ padding: "4px 10px", fontSize: 12 }} onClick={handleAddMember}>
            +
          </button>
        </div>
      </div>

      <div>
        <label className="lb">Notes</label>
        <textarea className="ip" value={project.desc || ""} onChange={(e) => onPatch({ desc: e.target.value })} />
      </div>
    </div>
  );
}

function ProjectMetaBadges({ project }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
      {project.sec && <Badge bg="#F2F2F2" color="#30323E">{project.sec}</Badge>}
      {project.lang && project.lang !== "Français" && <Badge bg="#F2F2F2" color="#30323E">{project.lang}</Badge>}
      <Badge bg="#F2F2F2" color="#30323E">Dir. {project.dir}</Badge>
      {project.tcon && <Badge bg="#F2F2F2" color="#30323E">{project.tcon}</Badge>}
      {project.ctx && <Badge bg="#F2F2F2" color="#30323E">{project.ctx}</Badge>}
      {project.site && <Badge bg="#F2F2F2" color="#30323E">{project.site}</Badge>}
      {project.secu === "zone-risque" && <Badge bg="#F9E1E3" color="#E30513">Zone risque</Badge>}
      {(project.eq || []).map((n) => (
        <Badge key={n} bg="#30323E" color="#fff">{n}</Badge>
      ))}
    </div>
  );
}

function NewMarketForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [montant, setMontant] = useState("");
  const [method, setMethod] = useState("");
  const [subtype, setSubtype] = useState("");
  const [role, setRole] = useState("relecture");
  const [dateAmi, setDateAmi] = useState("");
  const [dateLr, setDateLr] = useState("");
  const [dateDp, setDateDp] = useState("");
  const [dateSel, setDateSel] = useState("");
  const [dateSig, setDateSig] = useState("");

  const typeMeta = TYPES.find((t) => t.v === type);
  const cat = typeMeta ? typeMeta.c : null;

  function handleCreate() {
    if (!name.trim() || !type) return;
    onCreate({
      name: name.trim(),
      type,
      tl: typeMeta?.l || "",
      cat: typeMeta?.c || "",
      role,
      meth: method,
      mont: montant,
      st: subtype,
      dateAmi,
      dateLr,
      dateDp,
      dateSel,
      dateSig,
    });
  }

  return (
    <div className="fade" style={{ background: "#F2F2F2", borderRadius: 8, padding: 24, marginBottom: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#30323E", marginBottom: 14 }}>Nouveau marché</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label className="lb">Intitulé</label>
          <input className="ip" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="lb">Type</label>
          <select
            className="ip"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setMethod("");
              setSubtype("");
            }}
          >
            <option value="">—</option>
            <optgroup label="Travaux">
              {TYPES.filter((t) => t.c === "Travaux").map((t) => (
                <option key={t.v} value={t.v}>{t.l}</option>
              ))}
            </optgroup>
            <optgroup label="PI">
              {TYPES.filter((t) => t.c === "PI").map((t) => (
                <option key={t.v} value={t.v}>{t.l}</option>
              ))}
            </optgroup>
            <optgroup label="Autre">
              {TYPES.filter((t) => t.c === "Autre").map((t) => (
                <option key={t.v} value={t.v}>{t.l}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: cat === "PI" ? "1fr 1fr 1fr" : "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <label className="lb">Montant</label>
          <input className="ip" value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        {cat && cat !== "Autre" && (
          <div>
            <label className="lb">Méthode</label>
            <select className="ip" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">—</option>
              {cat === "Travaux" ? (
                <option value="QCMD">QCMD</option>
              ) : (
                ["SFQC", "SQS", "SBD", "SMC"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
        {cat === "PI" && (
          <div>
            <label className="lb">Nature PI</label>
            <select className="ip" value={subtype} onChange={(e) => setSubtype(e.target.value)}>
              <option value="">—</option>
              {SPI.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label className="lb">Rôle</label>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            ["production", "Production"],
            ["relecture", "Relecture"],
          ].map(([v, label]) => (
            <div
              key={v}
              onClick={() => setRole(v)}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: 6,
                cursor: "pointer",
                border: role === v ? "2px solid #E30513" : "1.5px solid #DFE4E8",
                background: role === v ? "#F9E1E3" : "#fff",
                fontWeight: 600,
                fontSize: 13,
                color: role === v ? "#E30513" : "#30323E",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 6, padding: 14, marginBottom: 14, border: "1px solid #DFE4E8" }}>
        <label className="lb" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
          Dates clés de la procédure (à renseigner au fur et à mesure)
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <label className="lb">Publication AMI / Pré-qual.</label>
            <input className="ip" type="date" value={dateAmi} onChange={(e) => setDateAmi(e.target.value)} />
          </div>
          <div>
            <label className="lb">Validation liste restreinte</label>
            <input className="ip" type="date" value={dateLr} onChange={(e) => setDateLr(e.target.value)} />
          </div>
          <div>
            <label className="lb">Diffusion DP / AO</label>
            <input className="ip" type="date" value={dateDp} onChange={(e) => setDateDp(e.target.value)} />
          </div>
          <div>
            <label className="lb">Sélection du lauréat</label>
            <input className="ip" type="date" value={dateSel} onChange={(e) => setDateSel(e.target.value)} />
          </div>
          <div>
            <label className="lb">Signature du contrat</label>
            <input className="ip" type="date" value={dateSig} onChange={(e) => setDateSig(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="br" onClick={handleCreate}>Créer</button>
        <button className="bo" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function MarketCard({ market, reviews, isEditing, onToggleEdit, onPatch, onRemove }) {
  const step = getMarketStep(market, reviews);
  const stepBadge =
    step.status === "done" ? (
      <Badge bg="#22c55e" color="#fff">Terminé</Badge>
    ) : step.status === "wip" ? (
      <Badge bg="#f59e0b" color="#fff">{step.label + " (" + step.progress + "%)"}</Badge>
    ) : (
      <Badge bg="#DFE4E8" color="#30323E">{step.label}</Badge>
    );

  return (
    <div style={{ border: "1.5px solid #DFE4E8", borderRadius: 8, overflow: "hidden", marginBottom: 2 }}>
      <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: market.cat === "Travaux" ? "#30323E" : "#E30513",
            color: "#fff",
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {market.cat === "Travaux" ? "TVX" : "PI"}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#30323E" }}>{market.name}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
            <Badge bg={market.cat === "Travaux" ? "#30323E" : "#E30513"} color="#fff">{market.cat}</Badge>
            <Badge bg="#F2F2F2" color="#30323E">{market.tl}</Badge>
            {market.st && <Badge bg="#F2F2F2" color="#30323E">{market.st}</Badge>}
            <Badge bg={market.role === "production" ? "#F9E1E3" : "#DFE4E8"} color="#30323E">
              {market.role === "production" ? "Prod." : "Relect."}
            </Badge>
            {stepBadge}
          </div>
        </div>

        <button
          className="bo"
          style={{ padding: "5px 10px", fontSize: 11, flexShrink: 0 }}
          onClick={onToggleEdit}
        >
          {isEditing ? "Fermer" : "Éditer"}
        </button>

        {market.cat === "Travaux" && market.role === "production" && (
          <Link
            to={`/marches/${market.id}/edit`}
            className="br"
            style={{
              padding: "5px 12px",
              fontSize: 12,
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            Éditeur DTAO →
          </Link>
        )}
        <Link
          to={`/markets/${market.id}/review`}
          className="bo"
          style={{ padding: "5px 12px", fontSize: 12, flexShrink: 0, textDecoration: "none" }}
        >
          Checklist →
        </Link>

        <button
          style={{ background: "none", border: "none", opacity: 0.3, fontSize: 16, cursor: "pointer" }}
          onClick={onRemove}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.3)}
        >
          ×
        </button>
      </div>

      {isEditing && (
        <div style={{ padding: "0 14px 14px", background: "#F2F2F2", borderTop: "1px solid #DFE4E8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 0" }}>
            <div>
              <label className="lb">Intitulé</label>
              <input className="ip" value={market.name} onChange={(e) => onPatch({ name: e.target.value })} />
            </div>
            <div>
              <label className="lb">Montant estimé</label>
              <input
                className="ip"
                value={market.mont || market.amount || ""}
                onChange={(e) => onPatch({ mont: e.target.value })}
              />
            </div>
            <div>
              <label className="lb">Rôle</label>
              <select className="ip" value={market.role} onChange={(e) => onPatch({ role: e.target.value })}>
                <option value="production">Production</option>
                <option value="relecture">Relecture</option>
              </select>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 6, padding: 12, border: "1px solid #DFE4E8" }}>
            <label className="lb" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
              Dates clés de la procédure
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label className="lb">Publication AMI / Pré-qual.</label>
                <input
                  className="ip"
                  type="date"
                  value={market.dateAmi || ""}
                  onChange={(e) => onPatch({ dateAmi: e.target.value })}
                />
              </div>
              <div>
                <label className="lb">Validation liste restreinte</label>
                <input
                  className="ip"
                  type="date"
                  value={market.dateLr || ""}
                  onChange={(e) => onPatch({ dateLr: e.target.value })}
                />
              </div>
              <div>
                <label className="lb">Diffusion DP / AO</label>
                <input
                  className="ip"
                  type="date"
                  value={market.dateDp || ""}
                  onChange={(e) => onPatch({ dateDp: e.target.value })}
                />
              </div>
              <div>
                <label className="lb">Sélection du lauréat</label>
                <input
                  className="ip"
                  type="date"
                  value={market.dateSel || ""}
                  onChange={(e) => onPatch({ dateSel: e.target.value })}
                />
              </div>
              <div>
                <label className="lb">Signature du contrat</label>
                <input
                  className="ip"
                  type="date"
                  value={market.dateSig || ""}
                  onChange={(e) => onPatch({ dateSig: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="lb">Notes libres</label>
            <textarea
              className="ip"
              value={market.notes || ""}
              onChange={(e) => onPatch({ notes: e.target.value })}
              placeholder="Observations, points discutés, décisions, questions en suspens…"
              style={{ minHeight: 50, fontSize: 12 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────

export default function Project() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [data, mutate] = usePlatformData();
  const [showCadrage, setShowCadrage] = useState(false);
  const [showNewMarket, setShowNewMarket] = useState(false);
  const [editingMarketId, setEditingMarketId] = useState(null);

  // Trouver le projet et son pays — la donnée est indexée par pays donc on
  // cherche dans tous les groupes.
  let foundProject = null;
  let countryId = null;
  for (const cId of Object.keys(data.projects || {})) {
    const list = data.projects[cId] || [];
    const match = list.find((p) => p.id === projectId);
    if (match) {
      foundProject = match;
      countryId = cId;
      break;
    }
  }
  const country = countryId ? (data.countries || []).find((c) => c.id === countryId) : null;
  const markets = (data.markets[projectId] || []);

  if (!foundProject) {
    return (
      <div className="fade" style={{ padding: "60px 0", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: 16 }}>Projet introuvable.</p>
        <Link to="/" className="bo" style={{ textDecoration: "none" }}>
          ← Accueil
        </Link>
      </div>
    );
  }

  async function patchProject(updates) {
    await mutate.updateProject(countryId, projectId, updates);
  }
  async function toggleMember(memberName) {
    await mutate.toggleProjectMember(countryId, projectId, memberName);
  }
  async function addMember(name) {
    await mutate.addEquipeMember(name);
  }
  async function createMarket(market) {
    // Pré-remplit editor_data avec le contexte Plateforme :
    //  - PREA-002 (Nom du Projet)         ← nom du projet Plateforme
    //  - PREA-003 (Identification Travaux) ← nom du marché
    //  - S02-001 (Pré-qualification est/n'est pas) ← dérivé du type de
    //    marché : AO_TVX_PQ → "est", AO_TVX_SP → "n'est pas".
    // Pré-remplissage one-shot — l'utilisateur peut ensuite éditer
    // librement, et les futures modifs côté Plateforme ne propagent plus.
    const seedPrequalification =
      market.type === "AO_TVX_PQ"
        ? { prequalification: "est" }
        : market.type === "AO_TVX_SP"
          ? { prequalification: "n'est pas" }
          : {};
    const enriched = {
      ...market,
      editor_data: {
        ...(market.editor_data || {}),
        formData: {
          ...((market.editor_data && market.editor_data.formData) || {}),
          nom_projet: foundProject.name,
          identification_travaux: market.name,
          ...seedPrequalification,
        },
      },
    };
    await mutate.addMarket(projectId, enriched);
    setShowNewMarket(false);
  }
  async function patchMarket(marketId, updates) {
    await mutate.updateMarket(projectId, marketId, updates);
  }
  async function deleteMarket(marketId) {
    if (!window.confirm("Supprimer ?")) return;
    await mutate.removeMarket(marketId);
    if (editingMarketId === marketId) setEditingMarketId(null);
  }

  return (
    <div className="fade">
      <button
        className="bo"
        onClick={() => navigate(countryId ? `/countries/${countryId}` : "/")}
        style={{ marginBottom: 20 }}
      >
        ← Retour
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Flag name={country?.name} size={36} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#30323E" }}>{foundProject.name}</h1>
            <p style={{ fontSize: 14, color: "#4D4D4D" }}>{country?.name}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bo" onClick={() => setShowCadrage(!showCadrage)}>
            {showCadrage ? "Fermer" : "Cadrage"}
          </button>
          <button className="br" onClick={() => setShowNewMarket(true)}>
            + Marché
          </button>
        </div>
      </div>

      {showCadrage && (
        <CadragePanel
          project={foundProject}
          country={country}
          equipe={data.equipe || []}
          onPatch={patchProject}
          onToggleMember={toggleMember}
          onAddMember={addMember}
        />
      )}

      {!showCadrage && <ProjectMetaBadges project={foundProject} />}

      {showNewMarket && <NewMarketForm onCreate={createMarket} onCancel={() => setShowNewMarket(false)} />}

      {!showCadrage &&
        !showNewMarket &&
        (markets.length === 0 ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#999" }}>Aucun marché.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                reviews={data.reviews}
                isEditing={editingMarketId === market.id}
                onToggleEdit={() =>
                  setEditingMarketId(editingMarketId === market.id ? null : market.id)
                }
                onPatch={(updates) => patchMarket(market.id, updates)}
                onRemove={() => deleteMarket(market.id)}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
