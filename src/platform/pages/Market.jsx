// ── Plateforme — page Market (checklist + export note relecture) ────────
//
// Page d'un marché : header coloré (rouge PI / violet Travaux), tabs par
// type de checklist (DAO/Rapport/Contrat ou AMI/LR/Prog/TdR/DP/EvTech/
// EvFin/Nego/CPI), filtres par source (DIR/APM/RETEX/REX), alertes
// contextuelles selon la métadonnée projet (zone-risque, dir 2019, etc.),
// panneau de conseils Retex pertinents pour l'onglet courant, puis la
// liste des items groupés par section avec ReviewItem.
//
// Bouton "Exporter note ↓" : génère un HTML formaté et l'ouvre dans une
// nouvelle fenêtre (utility extraite dans utils/exportReviewNote.js).
//
// Refactor de la branche `if (selM && cM) {...}` du single-file
// `_imports/plateforme-source.jsx` (lignes 555-732).

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import ReviewItem from "../components/ReviewItem.jsx";
import { SRC } from "../data/types.js";
import { CLS_TVX, CLS_PI, TABS_TVX, TABS_PI } from "../data/checklists/index.js";
import { RETEX_DATA } from "../data/retexData.js";
import { usePlatformData } from "../store/usePlatformData.js";
import { openReviewNoteWindow } from "../utils/exportReviewNote.js";
import "../styles.css";

// Petit badge — extrait des autres pages pour cohérence.
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

// Récupère un texte/tip avec override projet éventuel (édition manuelle de
// l'item via l'admin ChecklistConfig en 3.3c). Source ligne 504.
function withOverride(overrides, itemId, field, original) {
  const o = (overrides || {})[itemId];
  return o && o[field] !== undefined ? o[field] : original;
}

// Mappage onglet → mot-clé Retex pour suggérer les conseils pertinents.
// Source ligne 698.
const TAB_KEYWORDS = {
  dao: "DAO",
  rapport: "DAO",
  contrat: "DAO",
  ami: "AMI",
  lr: "AMI",
  prog: "Programme",
  tdr: "TdR",
  dp: "DP",
  evtech: "DP",
  evfin: "DP",
  nego: "DP",
  cpi: "DP",
};
const KEYWORD_LABELS = {
  DAO: "DAO",
  AMI: "AMI",
  Programme: "Programme",
  TdR: "Termes de Référence",
  DP: "Demande de Propositions",
};

// ── Sous-composants ──────────────────────────────────────────────────────

function HeaderBar({
  market,
  project,
  country,
  status,
  totalItems,
  catColor,
  onBack,
  onExport,
}) {
  const remaining = totalItems - status.ok - status.nk - status.na;
  return (
    <div
      style={{
        background: catColor,
        color: "#fff",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
        }}
      >
        ←
      </button>
      <Flag name={country?.name} size={24} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{market.name}</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          {country?.name} · {project?.name} · {market.tl}
        </div>
      </div>
      <Badge bg="#22c55e" color="#fff">{status.ok} C</Badge>
      <Badge bg="#E30513" color="#fff">{status.nk} NC</Badge>
      <Badge bg="#666" color="#fff">{status.na} NA</Badge>
      <span style={{ fontSize: 11, opacity: 0.5 }}>{remaining} rest.</span>
      <Badge bg={market.role === "production" ? "#F9E1E3" : "#DFE4E8"} color="#30323E">
        {market.role === "production" ? "Prod." : "Relect."}
      </Badge>
      <button
        onClick={onExport}
        style={{
          background: "#fff",
          border: "1.5px solid #fff",
          borderRadius: 4,
          padding: "4px 12px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          color: "#30323E",
          marginLeft: 8,
        }}
      >
        Exporter note ↓
      </button>
    </div>
  );
}

function TabsBar({ tabs, currentTab, onChange, catColor, getCount }) {
  return (
    <div
      style={{
        display: "flex",
        borderBottom: "2px solid #DFE4E8",
        background: "#F2F2F2",
        flexShrink: 0,
      }}
    >
      {tabs.map((t) => {
        const isActive = currentTab === t.id;
        return (
          <div
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "10px 18px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? catColor : "#4D4D4D",
              borderBottom: isActive ? "3px solid " + catColor : "3px solid transparent",
              background: isActive ? "#fff" : "transparent",
            }}
          >
            {t.l}{" "}
            <span style={{ fontSize: 11, opacity: 0.5 }}>({getCount(t.id)})</span>
          </div>
        );
      })}
    </div>
  );
}

function SourceFilter({ tabItems, sourceFilter, onChange }) {
  return (
    <div
      style={{
        padding: "10px 24px",
        display: "flex",
        gap: 8,
        alignItems: "center",
        borderBottom: "1px solid #DFE4E8",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 12, color: "#4D4D4D", fontWeight: 600 }}>Source :</span>
      <span
        onClick={() => onChange(null)}
        style={{
          padding: "3px 12px",
          borderRadius: 16,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          border: !sourceFilter ? "2px solid #30323E" : "1.5px solid #DFE4E8",
          background: !sourceFilter ? "#30323E" : "#fff",
          color: !sourceFilter ? "#fff" : "#30323E",
        }}
      >
        Toutes
      </span>
      {SRC.map((s) => {
        const count = tabItems.filter((r) => r[4].includes(s.id)).length;
        if (!count) return null;
        const isActive = sourceFilter === s.id;
        return (
          <span
            key={s.id}
            onClick={() => onChange(isActive ? null : s.id)}
            style={{
              padding: "3px 12px",
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: isActive ? "2px solid " + s.co : "1.5px solid #DFE4E8",
              background: isActive ? s.co : "#fff",
              color: isActive ? "#fff" : "#30323E",
            }}
          >
            {s.lb} ({count})
          </span>
        );
      })}
    </div>
  );
}

function ContextualAlerts({ project }) {
  if (!project) return null;
  const alerts = [];
  if (project.secu === "zone-risque")
    alerts.push({
      color: "#E30513",
      bg: "#FEF2F2",
      text: "Zone à risque (Art. 1.5.2) — Vérifier l'inclusion de la Déclaration d'Engagement Sûreté (Annexe 4 des Directives 2024) et des exigences minima de sûreté dans les documents de passation.",
    });
  if (project.dir === "2019")
    alerts.push({
      color: "#f59e0b",
      bg: "#FFFBEB",
      text: "Directives 2019 (Option A) — Ce projet est soumis aux Directives 2019 antérieures. Certaines dispositions diffèrent (seuils, modalités de vérification, exigences ESSS).",
    });
  if (project.site === "Multisite")
    alerts.push({
      color: "#2563eb",
      bg: "#EFF6FF",
      text: "Projet multisite — Attention aux processus de paiement chronophages. Décentraliser la gestion opérationnelle. S'assurer que la passation des marchés est suffisamment staffée.",
    });
  if (project.lang && project.lang !== "Français")
    alerts.push({
      color: "#30323E",
      bg: "#F2F2F2",
      text:
        "Projet " +
        project.lang.toLowerCase() +
        " — Vérifier la cohérence des termes techniques. Attention aux différences de définitions (ex: Gross Floor Area vs Surface de Plancher).",
    });
  if (project.ctx === "Rural")
    alerts.push({
      color: "#16a34a",
      bg: "#F0FDF4",
      text: "Contexte rural — Prendre en compte les contraintes d'accès, de logistique et de disponibilité des entreprises locales.",
    });
  if (alerts.length === 0) return null;
  return (
    <div style={{ padding: "8px 20px", borderBottom: "1px solid #DFE4E8", flexShrink: 0 }}>
      {alerts.map((a, i) => (
        <div
          key={i}
          style={{
            background: a.bg,
            borderLeft: "3px solid " + a.color,
            borderRadius: 4,
            padding: "8px 12px",
            marginBottom: 4,
            fontSize: 12,
            color: "#30323E",
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: a.color }}>Alerte</strong> — {a.text}
        </div>
      ))}
    </div>
  );
}

function RetexConseilsPanel({ currentTab, customRetex }) {
  const [open, setOpen] = useState(false);
  const kw = TAB_KEYWORDS[currentTab];
  if (!kw) return null;

  const allRetex = [...RETEX_DATA, ...(customRetex || [])];
  // On préfère les conseils dont le thème PRIMAIRE colle à l'onglet, sinon
  // tout match partiel sur le thème.
  const primary = allRetex.filter((r) => {
    if (!r.th) return false;
    const first = r.th.split(",")[0].trim().replace("Rédaction de ", "").replace("Rédaction d'", "");
    return first === kw;
  });
  const conseils = primary.length > 0 ? primary : allRetex.filter((r) => r.th && r.th.indexOf(kw) !== -1);
  if (conseils.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "#2563eb",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: open ? "6px 6px 0 0" : 6,
          fontWeight: 700,
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>Conseils — {KEYWORD_LABELS[kw] || kw}</span>
        <span style={{ opacity: 0.5 }}>
          {conseils.length} conseil{conseils.length > 1 ? "s" : ""}
        </span>
      </div>
      {open && (
        <div
          style={{
            border: "1px solid #DFE4E8",
            borderTop: "none",
            borderRadius: "0 0 6px 6px",
            maxHeight: 300,
            overflow: "auto",
          }}
        >
          {conseils.map((r, i) => (
            <div
              key={r.id || i}
              style={{
                padding: "8px 14px",
                borderBottom: "1px solid #F2F2F2",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", gap: 4, marginBottom: 3 }}>
                {r.kw &&
                  r.kw
                    .split(" / ")
                    .slice(0, 3)
                    .map((k, j) =>
                      k.trim() ? (
                        <span
                          key={j}
                          style={{
                            padding: "1px 6px",
                            borderRadius: 8,
                            fontSize: 8,
                            fontWeight: 600,
                            background: "#EFF6FF",
                            color: "#2563eb",
                          }}
                        >
                          {k.trim()}
                        </span>
                      ) : null,
                    )}
                {r.custom && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 8,
                      fontSize: 8,
                      fontWeight: 700,
                      background: "#f59e0b",
                      color: "#fff",
                    }}
                  >
                    PERSO
                  </span>
                )}
              </div>
              <div style={{ color: "#30323E", lineHeight: 1.4 }}>{r.cm}</div>
              {(r.ed || r.pj) && (
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>
                  {r.ed}
                  {r.pj ? " — " + r.pj : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────
//
// Note Phase 4 : on extrait `MarketContent` en sous-composant pour que tous
// ses hooks (useState, useMemo) soient appelés de façon stable une fois le
// marché trouvé. La logique de localisation + early return reste dans
// `Market` (le wrapper) qui ne contient que les hooks `useParams`,
// `useNavigate`, `usePlatformData()` — toujours appelés peu importe l'état
// du marché → conforme aux Rules of Hooks.

export default function Market() {
  const { id: marketId } = useParams();
  const [data, mutate] = usePlatformData();

  // Localiser le marché et son projet/pays. Le marché est indexé par
  // projectId — on traverse pour retrouver lequel.
  let market = null;
  let projectId = null;
  let project = null;
  let country = null;
  for (const pId of Object.keys(data.markets || {})) {
    const list = data.markets[pId] || [];
    const found = list.find((m) => m.id === marketId);
    if (found) {
      market = found;
      projectId = pId;
      break;
    }
  }
  if (projectId) {
    for (const cId of Object.keys(data.projects || {})) {
      const found = (data.projects[cId] || []).find((p) => p.id === projectId);
      if (found) {
        project = found;
        country = (data.countries || []).find((c) => c.id === cId) || null;
        break;
      }
    }
  }

  // Cas d'erreur : URL périmée OU marché supprimé par un autre membre
  // pendant la session. Pas de hooks ici, donc montage/démontage propre.
  if (!market) {
    return (
      <div className="fade" style={{ padding: "60px 0", textAlign: "center" }}>
        <p style={{ color: "#999", marginBottom: 16 }}>Marché introuvable.</p>
        <Link to="/" className="bo" style={{ textDecoration: "none" }}>
          ← Accueil
        </Link>
      </div>
    );
  }

  return (
    <MarketContent
      market={market}
      project={project}
      country={country}
      projectId={projectId}
      data={data}
      mutate={mutate}
    />
  );
}

// Sous-composant : tous les hooks (useState, useMemo) sont déclarés ici,
// appelés de manière stable car ce composant ne monte que si market est
// trouvé.
function MarketContent({ market, project, country, projectId, data, mutate }) {
  const navigate = useNavigate();
  const isPI = market.cat === "PI";
  const tabs = isPI ? TABS_PI : TABS_TVX;
  const checklists = isPI ? CLS_PI : CLS_TVX;
  const defaultTab = isPI ? "ami" : "dao";
  const catColor = isPI ? "#E30513" : "#30323E";

  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [sourceFilter, setSourceFilter] = useState(null);

  // Items pour l'onglet courant + REX éventuels stockés dans data.rexItems.
  // Le filtre source réduit ensuite la liste.
  const tabItems = useMemo(() => {
    const baseItems = checklists[currentTab] || [];
    const rexItems = (data.rexItems || [])
      .filter((rx) => (isPI ? rx.cat === "PI" : rx.cat === "Travaux") && rx.doc === currentTab)
      .map((rx) => [rx.id, rx.section, rx.text, rx.tip, ["REX"]]);
    return [...baseItems, ...rexItems];
  }, [checklists, currentTab, data.rexItems, isPI]);

  const filteredItems = useMemo(() => {
    if (!sourceFilter) return tabItems;
    return tabItems.filter((r) => r[4].includes(sourceFilter));
  }, [tabItems, sourceFilter]);

  const sections = useMemo(() => {
    const seen = new Set();
    const result = [];
    filteredItems.forEach((r) => {
      if (!seen.has(r[1])) {
        seen.add(r[1]);
        result.push(r[1]);
      }
    });
    return result;
  }, [filteredItems]);

  // Status counts pour le marché (sur l'onglet courant).
  const status = useMemo(() => {
    const reviewKey = market.id + "_" + currentTab;
    const reviewItems = (data.reviews || {})[reviewKey] || {};
    let ok = 0;
    let nk = 0;
    let na = 0;
    Object.values(reviewItems).forEach((r) => {
      if (r.status === "ok") ok++;
      else if (r.status === "nok") nk++;
      else if (r.status === "na") na++;
    });
    return { ok, nk, na };
  }, [data.reviews, market.id, currentTab]);

  // CRUD review item — appelée par <ReviewItem onChange={...}/>
  // Délègue à la mutation atomique `upsertReview` (1 row dao_reviews).
  async function handleReviewChange(itemId, field, value) {
    await mutate.upsertReview(market.id, currentTab, itemId, { [field]: value });
  }

  function getReviewItemState(itemId) {
    const reviewKey = market.id + "_" + currentTab;
    return ((data.reviews || {})[reviewKey] || {})[itemId] || {};
  }

  function handleExport() {
    const tab = tabs.find((t) => t.id === currentTab);
    openReviewNoteWindow({
      market,
      project,
      country,
      tabLabel: tab?.l || currentTab,
      items: tabItems,
      reviews: (data.reviews || {})[market.id + "_" + currentTab] || {},
      overrides: data.textOverrides,
    });
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Open Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      <HeaderBar
        market={market}
        project={project}
        country={country}
        status={status}
        totalItems={tabItems.length}
        catColor={catColor}
        onBack={() =>
          navigate(projectId ? `/projects/${projectId}` : country ? `/countries/${country.id}` : "/")
        }
        onExport={handleExport}
      />
      <TabsBar
        tabs={tabs}
        currentTab={currentTab}
        catColor={catColor}
        onChange={(tabId) => {
          setCurrentTab(tabId);
          setSourceFilter(null);
        }}
        getCount={(tabId) => (checklists[tabId] || []).length}
      />
      <SourceFilter
        tabItems={checklists[currentTab] || []}
        sourceFilter={sourceFilter}
        onChange={setSourceFilter}
      />
      <ContextualAlerts project={project} />
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <RetexConseilsPanel currentTab={currentTab} customRetex={data.customRetex} />
          {sections.map((sec) => {
            const sectionItems = filteredItems.filter((r) => r[1] === sec);
            return (
              <div key={sec} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    background: catColor,
                    color: "#fff",
                    padding: "7px 12px",
                    borderRadius: "6px 6px 0 0",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{sec}</span>
                  <span style={{ opacity: 0.5 }}>{sectionItems.length}</span>
                </div>
                <div
                  style={{
                    border: "1px solid #DFE4E8",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                  }}
                >
                  {sectionItems.map((row) => {
                    const state = getReviewItemState(row[0]);
                    return (
                      <ReviewItem
                        key={row[0]}
                        id={row[0]}
                        text={withOverride(data.textOverrides, row[0], "text", row[2])}
                        tip={withOverride(data.textOverrides, row[0], "tip", row[3])}
                        sources={row[4]}
                        status={state.status}
                        comment={state.comment}
                        onChange={handleReviewChange}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
