// ── Plateforme — export "Note de relecture" en HTML ──────────────────────
//
// Construit un document HTML complet (charte AFD : rouge #E30513, violet
// #30323E, gris #DFE4E8) et l'ouvre dans un nouvel onglet pour permettre
// à l'utilisateur de l'imprimer / sauver en PDF. Pas de dépendance, pas
// de fichier .docx généré (l'usage typique est : impression PDF depuis
// le navigateur, ou copier-coller dans Word).
//
// Fonction pure côté logique : reçoit l'état complet (market, project,
// country, items, reviews, overrides, tabLabel) et retourne le HTML.
// L'effet de bord (window.open) est isolé dans `openReviewNoteWindow`.
//
// Refactor du bloc `exportNote = () => {...}` du single-file
// `_imports/plateforme-source.jsx` (lignes 561-652).

const SOURCE_COLORS = {
  DIR: "#30323E",
  APM: "#E30513",
  RETEX: "#2563eb",
  REX: "#f59e0b",
};

// Escape pour interpolation dans du texte HTML. Toutes les valeurs
// user-controlled (noms de marché/projet/pays, commentaires de relecture,
// overrides de checklist, etc.) passent par ici avant d'être concaténées
// dans la chaîne HTML — sans ça, un nom contenant `<script>` exécute dans
// la fenêtre d'export (XSS stocké, vrai risque dès que plusieurs users
// partagent le même workspace en Phase 4).
function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// CSS embarqué dans le HTML exporté — charte Assemblage / AFD.
function buildCSS() {
  return [
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:Arial,sans-serif;margin:40px;color:#30323E;font-size:11pt;line-height:1.6}",
    "h1{color:#E30513;font-size:18pt;margin:4px 0}",
    "h2{color:#30323E;font-size:14pt;margin-top:28px;border-bottom:2px dotted #E30513;padding-bottom:4px}",
    ".ban{background:#E30513;color:#fff;padding:10px 20px;text-align:center;font-weight:700;font-size:11pt;margin-bottom:20px}",
    ".hdr{background:#F2F2F2;padding:12px 20px;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:16px}",
    ".hdr img{height:36px}",
    ".rt{border-collapse:collapse;width:100%}",
    ".rt td{padding:4px 10px;font-size:10pt;border-bottom:1px solid #DFE4E8;vertical-align:top}",
    ".rt .lb{font-weight:600;color:#4D4D4D;white-space:nowrap;width:220px}",
    ".syn{display:flex;gap:16px;margin:16px 0}",
    ".syn div{padding:10px 24px;border-radius:6px;text-align:center;font-weight:700;font-size:15pt}",
    ".ok{background:#dcfce7;color:#16a34a}",
    ".nk{background:#F9E1E3;color:#E30513}",
    ".naa{background:#F2F2F2;color:#666}",
    ".leg{background:#F2F2F2;padding:8px 16px;font-size:9pt;margin-bottom:16px;border-radius:4px}",
    "table.cl{width:100%;border-collapse:collapse;margin-top:8px;font-size:10pt}",
    "table.cl th{background:#30323E;color:#fff;padding:6px 10px;text-align:left;font-size:9pt}",
    "table.cl td{padding:8px 10px;border-bottom:1px solid #DFE4E8;vertical-align:top}",
    "tr.nkr{background:#FEF2F2}tr.nkr td{border-bottom-color:#fca5a5}",
    ".bdg{display:inline-block;padding:1px 8px;border-radius:10px;font-size:8pt;font-weight:700;color:#fff;margin-right:3px}",
    ".obs{font-style:italic;color:#E30513;font-size:9pt;margin-top:6px;padding:4px 8px;background:#FEF2F2;border-radius:4px}",
    ".tip{color:#4D4D4D;font-size:9pt;font-style:italic;padding-left:8px;border-left:2px solid #DFE4E8;margin-top:4px}",
    ".ftr{margin-top:40px;padding-top:8px;border-top:1px solid #ccc;font-size:8pt;color:#4D4D4D;display:flex;justify-content:space-between;align-items:center}",
    ".ftr img{height:18px;margin-right:6px}",
    "@media print{body{margin:15mm}.ban{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
  ].join("");
}

// Formatage date FR long ("4 mars 2026")
function frDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Récupère un texte/tip avec override éventuel.
function withOverride(overrides, itemId, field, original) {
  const o = (overrides || {})[itemId];
  return o && o[field] !== undefined ? o[field] : original;
}

export function buildReviewNoteHTML({
  market,
  project,
  country,
  tabLabel,
  items,
  reviews,
  overrides,
}) {
  const isPI = market.cat === "PI";
  const reviewState = reviews || {};

  // Compte les statuts.
  let ok = 0;
  let nok = 0;
  let na = 0;
  items.forEach((row) => {
    const itemState = (reviewState[row[0]] || {}).status;
    if (itemState === "ok") ok++;
    else if (itemState === "nok") nok++;
    else if (itemState === "na") na++;
  });

  const today = new Date();
  const catTxt = isPI ? "PRESTATIONS INTELLECTUELLES" : "TRAVAUX";

  let html = "<!DOCTYPE html><html><head><meta charset=utf-8>";
  html += "<title>Note de relecture - " + esc(market.name) + "</title>";
  html += "<style>" + buildCSS() + "</style>";
  html += "</head><body>";

  // Bandeau catégorie + étape
  html += "<div class=ban>" + catTxt + " — Étape : " + esc(String(tabLabel).toUpperCase()) + "</div>";
  html += "<h1>NOTE DE RELECTURE</h1>";
  html += "<p style=font-size:13pt;font-weight:700;color:#30323E>" + esc(market.name) + "</p>";
  html +=
    "<p style=color:#4D4D4D;border-bottom:3px solid #E30513;padding-bottom:8px;margin-bottom:20px>" +
    frDate(today.toISOString()) +
    "</p>";

  // 1. Récapitulatif
  html += "<h2>1. Récapitulatif du marché et de la procédure</h2><table class=rt>";
  const recap = [
    ["Pays", country ? country.name : ""],
    ["Projet", project ? project.name : ""],
    ["Intitulé du marché", market.name],
    ["Catégorie", market.cat || ""],
    ["Type de procédure", market.tl || ""],
    ["Méthode de sélection", market.method || market.meth || ""],
    ["Montant estimé", market.mont || market.amount || ""],
  ];
  if (market.st || market.subtype) recap.push(["Nature PI", market.st || market.subtype]);
  recap.push([
    "Rôle Assemblage ingénierie",
    market.role === "production" ? "Production" : "Relecture",
  ]);
  if (project) {
    if (project.sec) recap.push(["Secteur", project.sec]);
    recap.push([
      "Directives applicables",
      project.dir === "2024" ? "Directives 2024 — Option B" : "Directives 2019 — Option A",
    ]);
    if (project.tcon) recap.push(["Type de construction", project.tcon]);
    if (project.ctx) recap.push(["Contexte", project.ctx]);
    if (project.site) recap.push(["Site", project.site]);
    if (project.secu === "zone-risque")
      recap.push(["Contexte sécuritaire", "Zone à risque — Art. 1.5.2"]);
    const verifLabel =
      project.verif === "eac"
        ? "Ex-ante complète"
        : project.verif === "eas"
          ? "Ex-ante simplifiée"
          : "Ex-post";
    recap.push(["Modalité de vérification AFD", verifLabel]);
  }
  recap.forEach((r) => {
    if (r[1]) html += "<tr><td class=lb>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>";
  });
  html += "</table>";

  // Calendrier
  const dateRows = [];
  if (market.dateAmi) dateRows.push(["Publication AMI / Pré-qualification", frDate(market.dateAmi)]);
  if (market.dateLr) dateRows.push(["Validation liste restreinte", frDate(market.dateLr)]);
  if (market.dateDp) dateRows.push(["Diffusion DP / AO", frDate(market.dateDp)]);
  if (market.dateSel) dateRows.push(["Sélection du lauréat", frDate(market.dateSel)]);
  if (market.dateSig) dateRows.push(["Signature du contrat", frDate(market.dateSig)]);
  if (dateRows.length > 0) {
    html += "<h3 style=margin-top:16px;color:#30323E>Calendrier</h3><table class=rt>";
    dateRows.forEach((d) => {
      html += "<tr><td class=lb>" + d[0] + "</td><td>" + d[1] + "</td></tr>";
    });
    html += "</table>";
  }

  // 2. Synthèse
  html += "<h2>2. Synthèse de la relecture</h2>";
  html +=
    "<p>La présente note porte sur la relecture de la <strong>" +
    esc(tabLabel) +
    "</strong> du marché de " +
    esc((market.cat || "").toLowerCase()) +
    " « " +
    esc(market.name) +
    " »" +
    (project ? " dans le cadre du projet " + esc(project.name) : "") +
    (country ? " en " + esc(country.name) : "") +
    ".</p>";
  html +=
    "<div class=syn><div class=ok>" +
    ok +
    " Conforme" +
    (ok > 1 ? "s" : "") +
    "</div><div class=nk>" +
    nok +
    " Non-conforme" +
    (nok > 1 ? "s" : "") +
    "</div><div class=naa>" +
    na +
    " N/A</div></div>";

  // 3. Détail par section
  html += "<h2>3. Détail de la relecture par section</h2>";
  html +=
    "<div class=leg><strong>Légende</strong> — <strong style=color:#30323E>DIR</strong> = Directives de l'AFD pour la Passation des Marchés (2024) • <strong style=color:#E30513>APM</strong> = Checklist Appui à la Passation des Marchés • <strong style=color:#16a34a>C</strong> = Conforme • <strong style=color:#E30513>NC</strong> = Non conforme • <strong style=color:#666>NA</strong> = Non applicable</div>";

  const sectionList = [];
  const sectionSeen = {};
  items.forEach((r) => {
    if (!sectionSeen[r[1]]) {
      sectionSeen[r[1]] = 1;
      sectionList.push(r[1]);
    }
  });
  sectionList.forEach((sec) => {
    const sectionItems = items.filter((r) => r[1] === sec);
    html +=
      "<h3 style=margin-top:20px;color:#30323E>" +
      esc(sec) +
      ' <span style=font-weight:400;color:#999;font-size:10pt>(' +
      sectionItems.length +
      " items)</span></h3>";
    html += "<table class=cl><tr><th style=width:80px>Source</th><th>Point de vérification</th><th style=width:55px>Statut</th></tr>";
    sectionItems.forEach((r) => {
      const itemState = reviewState[r[0]] || {};
      const st = itemState.status;
      const stLabel = st === "ok" ? "C" : st === "nok" ? "NC" : st === "na" ? "NA" : "—";
      const stColor =
        st === "ok" ? "#16a34a" : st === "nok" ? "#E30513" : st === "na" ? "#666" : "#ccc";
      const stBg =
        st === "ok" ? "#dcfce7" : st === "nok" ? "#F9E1E3" : st === "na" ? "#F2F2F2" : "#fff";
      const rowClass = st === "nok" ? " class=nkr" : "";
      const text = withOverride(overrides, r[0], "text", r[2]);
      const tip = withOverride(overrides, r[0], "tip", r[3]);
      html += "<tr" + rowClass + "><td>";
      r[4].forEach((s) => {
        const co = SOURCE_COLORS[s] || "#999";
        html += "<span class=bdg style=background:" + co + ">" + esc(s) + "</span>";
      });
      html += "</td><td>" + esc(text);
      if (tip) html += "<div class=tip>" + esc(tip) + "</div>";
      if (itemState.comment) html += "<div class=obs>Observation : " + esc(itemState.comment) + "</div>";
      html +=
        "</td><td style=text-align:center;background:" +
        stBg +
        "><strong style=color:" +
        stColor +
        ">" +
        stLabel +
        "</strong></td></tr>";
    });
    html += "</table>";
  });

  // Footer
  html +=
    "<div class=ftr><span>Assemblage ingénierie — 79 rue Victor Hugo, 94200 Ivry-sur-Seine — assemblage.net</span><span>" +
    today.toLocaleDateString("fr-FR") +
    " " +
    today.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) +
    "</span></div>";
  html += "</body></html>";
  return html;
}

// Effet de bord : ouvre une fenêtre et y écrit le HTML. Sépare l'I/O de
// la génération pour faciliter les tests éventuels.
export function openReviewNoteWindow({
  market,
  project,
  country,
  tabLabel,
  items,
  reviews,
  overrides,
}) {
  const html = buildReviewNoteHTML({
    market,
    project,
    country,
    tabLabel,
    items,
    reviews,
    overrides,
  });
  try {
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) {
      w.document.write(html);
      w.document.close();
      // Assignation à la propriété .title (pas innerHTML) — pas de parsing
      // HTML donc pas de risque XSS ici, on garde la chaîne brute.
      w.document.title = "Note relecture - " + market.name;
    } else {
      window.alert(
        "Le navigateur a bloqué le popup. Autorisez les popups pour ce site.",
      );
    }
  } catch (e) {
    window.alert("Erreur export : " + (e?.message || e));
  }
}
