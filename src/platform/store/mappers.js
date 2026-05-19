// ── Plateforme — mappers SQL ↔ JS (Phase 4) ────────────────────────────
//
// Convention actée (cf. HANDOFF, point 9 du code review) :
//   - SQL  : snake_case + colonnes renommées pour éviter les mots-clés
//            Postgres (`desc` → `descr`, `text` → `content_text`,
//            `date` → `date_ref`).
//   - JS   : camelCase + noms d'origine (les pages consomment `desc`,
//            `text`, `date`).
// Le mapping se fait ici, au boundary du store. Les pages ne connaissent
// que le schéma JS.
//
// Chaque mapper expose :
//   - `fromDb(row)`  : row Supabase → objet JS (inclut tous les champs)
//   - `toDb(partial)`: objet JS partiel → row SQL pour INSERT/UPDATE.
//                      Seules les clés *définies* sont incluses → safe
//                      pour les patches `update(id, { name: "X" })`.
//
// Les colonnes audit (`created_at`, `updated_at`, `created_by`,
// `updated_by`) ne sont jamais écrites côté client (server-managed via
// defaults + triggers). Elles peuvent être lues côté JS si une page en
// a besoin (pas le cas aujourd'hui).

// ── Helpers ──────────────────────────────────────────────────────────────

// Pose une clé sur un objet uniquement si la valeur n'est pas undefined.
// Permet d'écrire des "patch payloads" sans pousser des null involontaires.
function setIfDefined(obj, key, value) {
  if (value !== undefined) obj[key] = value;
}

// ── dao_profiles ─────────────────────────────────────────────────────────

export const profile = {
  fromDb(r) {
    return {
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      legacyPlatformMigrated: r.legacy_platform_migrated,
      createdAt: r.created_at,
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "id", o.id);
    setIfDefined(row, "email", o.email);
    setIfDefined(row, "display_name", o.displayName);
    setIfDefined(row, "legacy_platform_migrated", o.legacyPlatformMigrated);
    return row;
  },
};

// ── dao_countries ────────────────────────────────────────────────────────

export const country = {
  fromDb(r) {
    return { id: r.id, name: r.name };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "name", o.name);
    return row;
  },
};

// ── dao_projects ─────────────────────────────────────────────────────────

export const project = {
  fromDb(r) {
    return {
      id: r.id,
      countryId: r.country_id,
      name: r.name,
      sec: r.sec ?? "",
      dir: r.dir ?? "2024",
      secu: r.secu ?? "standard",
      verif: r.verif ?? "eac",
      mt: r.mt ?? "",
      desc: r.descr ?? "",
      lang: r.lang ?? "Français",
      tcon: r.tcon ?? "",
      ctx: r.ctx ?? "",
      site: r.site ?? "",
      resp: r.resp ?? "",
      eq: r.eq ?? [],
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "country_id", o.countryId);
    setIfDefined(row, "name", o.name);
    setIfDefined(row, "sec", o.sec);
    setIfDefined(row, "dir", o.dir);
    setIfDefined(row, "secu", o.secu);
    setIfDefined(row, "verif", o.verif);
    setIfDefined(row, "mt", o.mt);
    // desc (JS) ↔ descr (SQL)
    setIfDefined(row, "descr", o.desc);
    setIfDefined(row, "lang", o.lang);
    setIfDefined(row, "tcon", o.tcon);
    setIfDefined(row, "ctx", o.ctx);
    setIfDefined(row, "site", o.site);
    setIfDefined(row, "resp", o.resp);
    setIfDefined(row, "eq", o.eq);
    return row;
  },
};

// ── dao_markets ──────────────────────────────────────────────────────────

export const market = {
  fromDb(r) {
    return {
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      type: r.type ?? "",
      tl: r.tl ?? "",
      cat: r.cat ?? "",
      role: r.role ?? "",
      meth: r.meth ?? "",
      mont: r.mont ?? "",
      st: r.st ?? "",
      dateAmi: r.date_ami ?? "",
      dateLr: r.date_lr ?? "",
      dateDp: r.date_dp ?? "",
      dateSel: r.date_sel ?? "",
      dateSig: r.date_sig ?? "",
      notes: r.notes ?? "",
      editor_data: r.editor_data ?? {},
      legacyDtaoId: r.legacy_dtao_id ?? null,
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "project_id", o.projectId);
    setIfDefined(row, "name", o.name);
    setIfDefined(row, "type", o.type);
    setIfDefined(row, "tl", o.tl);
    setIfDefined(row, "cat", o.cat);
    setIfDefined(row, "role", o.role);
    setIfDefined(row, "meth", o.meth);
    setIfDefined(row, "mont", o.mont);
    setIfDefined(row, "st", o.st);
    // Convention JS : dateAmi (camelCase) ↔ SQL date_ami (snake_case)
    // Les inputs date HTML renvoient "" quand vides — Postgres date n'accepte
    // pas les chaînes vides, on normalise en null.
    setIfDefined(row, "date_ami", o.dateAmi || null);
    setIfDefined(row, "date_lr", o.dateLr || null);
    setIfDefined(row, "date_dp", o.dateDp || null);
    setIfDefined(row, "date_sel", o.dateSel || null);
    setIfDefined(row, "date_sig", o.dateSig || null);
    setIfDefined(row, "notes", o.notes);
    setIfDefined(row, "editor_data", o.editor_data);
    setIfDefined(row, "legacy_dtao_id", o.legacyDtaoId);
    return row;
  },
};

// ── dao_reviews ──────────────────────────────────────────────────────────

export const review = {
  fromDb(r) {
    return {
      marketId: r.market_id,
      tabId: r.tab_id,
      itemId: r.item_id,
      status: r.status,
      comment: r.comment ?? "",
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "market_id", o.marketId);
    setIfDefined(row, "tab_id", o.tabId);
    setIfDefined(row, "item_id", o.itemId);
    setIfDefined(row, "status", o.status);
    setIfDefined(row, "comment", o.comment);
    return row;
  },
};

// Agrège la liste plate (`select * from dao_reviews`) dans la forme nested
// attendue par les pages : `{ [marketId + "_" + tabId]: { [itemId]: { status, comment } } }`.
export function reviewsFromDbList(rows) {
  const out = {};
  for (const r of rows) {
    const key = r.market_id + "_" + r.tab_id;
    if (!out[key]) out[key] = {};
    out[key][r.item_id] = { status: r.status, comment: r.comment ?? "" };
  }
  return out;
}

// ── dao_text_overrides ──────────────────────────────────────────────────

export const textOverride = {
  fromDb(r) {
    return { itemId: r.item_id, field: r.field, value: r.value };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "item_id", o.itemId);
    setIfDefined(row, "field", o.field);
    setIfDefined(row, "value", o.value);
    return row;
  },
};

// Agrège la liste plate dans la forme nested attendue par Market.jsx :
// `{ [itemId]: { text: "...", tip: "..." } }`.
export function textOverridesFromDbList(rows) {
  const out = {};
  for (const r of rows) {
    if (!out[r.item_id]) out[r.item_id] = {};
    out[r.item_id][r.field] = r.value;
  }
  return out;
}

// ── dao_rex_items ────────────────────────────────────────────────────────

export const rexItem = {
  fromDb(r) {
    return {
      id: r.id,
      cat: r.cat,
      doc: r.doc,
      docLabel: r.doc_label,
      section: r.section,
      // text (JS) ↔ content_text (SQL)
      text: r.content_text,
      tip: r.tip,
      auteur: r.auteur,
      pays: r.pays,
      projet: r.projet,
      conditions: r.conditions,
      // date (JS) ↔ date_ref (SQL)
      date: r.date_ref,
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "cat", o.cat);
    setIfDefined(row, "doc", o.doc);
    setIfDefined(row, "doc_label", o.docLabel);
    setIfDefined(row, "section", o.section);
    setIfDefined(row, "content_text", o.text);
    setIfDefined(row, "tip", o.tip);
    setIfDefined(row, "auteur", o.auteur);
    setIfDefined(row, "pays", o.pays);
    setIfDefined(row, "projet", o.projet);
    setIfDefined(row, "conditions", o.conditions);
    setIfDefined(row, "date_ref", o.date);
    return row;
  },
};

// ── dao_custom_retex ─────────────────────────────────────────────────────

export const customRetex = {
  fromDb(r) {
    return {
      id: r.id,
      kw: r.kw,
      th: r.th,
      cm: r.cm,
      ed: r.ed,
      pj: r.pj,
      custom: r.custom,
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "kw", o.kw);
    setIfDefined(row, "th", o.th);
    setIfDefined(row, "cm", o.cm);
    setIfDefined(row, "ed", o.ed);
    setIfDefined(row, "pj", o.pj);
    setIfDefined(row, "custom", o.custom);
    return row;
  },
};

// ── dao_equipe ───────────────────────────────────────────────────────────

// Particularité : le store JS expose `data.equipe` comme un simple array
// de noms. Les rows DB sont 1 ligne par nom. Helpers d'aggrégation :

export function equipeFromDbList(rows) {
  return rows.map((r) => r.name);
}

export const equipeMember = {
  // Pas de fromDb individuel (les pages consomment le tableau de noms).
  toDb(name) {
    return { name };
  },
};

// ── dao_ref_versions ─────────────────────────────────────────────────────

// Le JS expose `data.refVersions[docId] = { ver, dir, archived, log: [{date, text}] }`.
// La table SQL a une PK composite `(doc_id, ver)` héritée du HANDOFF — en
// pratique on n'écrit qu'1 ligne par docId (la version courante). Si plus
// tard on veut un historique, il suffira de relâcher cette assomption.

export const refVersion = {
  fromDb(r) {
    return {
      docId: r.doc_id,
      ver: r.ver,
      dir: r.dir ?? "",
      archived: r.archived ?? false,
      log: r.log ?? [],
    };
  },
  toDb(o) {
    const row = {};
    setIfDefined(row, "doc_id", o.docId);
    setIfDefined(row, "ver", o.ver);
    setIfDefined(row, "dir", o.dir);
    setIfDefined(row, "archived", o.archived);
    setIfDefined(row, "log", o.log);
    return row;
  },
};

// Agrège la liste plate (en gardant la 1ère version rencontrée par
// `doc_id`) en `{ [docId]: { ver, dir, archived, log } }`. Si plusieurs
// rows existent pour le même `doc_id` (héritage du PK composite), seule
// la 1ère est conservée — l'app ne sait pas afficher d'historique.
export function refVersionsFromDbList(rows) {
  const out = {};
  for (const r of rows) {
    if (!out[r.doc_id]) {
      out[r.doc_id] = {
        ver: r.ver,
        dir: r.dir ?? "",
        archived: r.archived ?? false,
        log: r.log ?? [],
      };
    }
  }
  return out;
}
