// Helpers partagés pour les scripts de vérification de l'export DOCX.
//
// Les scripts `verify*.mjs` simulent à vide les fonctions de surlignage rouge
// définies dans `src/export/exportDocx.js` et vérifient qu'elles ciblent les
// bons paragraphes du template (template-DTAO.docx) sans déborder dans la
// Section I (« règle d'or » : cette section ne doit JAMAIS être modifiée).
//
// Ils sont volontairement auto-contenus (pas d'import depuis src/) pour rester
// exécutables rapidement sans bundler : `node scripts/verify-export/verifyXxx.mjs`.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charge document.xml depuis template-DTAO.docx (racine projet).
//
// Ordre de résolution :
//   1. Variable d'environnement DTAO_DOC_XML : chemin vers un document.xml déjà extrait.
//   2. JSZip : lit template-DTAO.docx à la racine du projet et extrait
//      word/document.xml en mémoire.
//
// Le fallback (1) permet d'exécuter les scripts même si node_modules n'est
// pas installé (ex. : checkout propre sans `npm install`), en pré-extrayant
// le template manuellement via Explorer / 7-Zip / unzip.
export async function loadTemplateXml() {
  const envPath = process.env.DTAO_DOC_XML;
  if (envPath) {
    if (!existsSync(envPath)) {
      throw new Error(`DTAO_DOC_XML="${envPath}" : fichier introuvable`);
    }
    return readFileSync(envPath, 'utf-8');
  }
  const docxPath = resolve(__dirname, '..', '..', 'template-DTAO.docx');
  const { default: JSZip } = await import('jszip');
  const buf = readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);
  return zip.file('word/document.xml').async('string');
}

export const normApos = (s) => s.replace(/[\u2018\u2019\u02BC]/g, "'");
export const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export function extractRunNodes(para) {
  const runs = [];
  const runRe = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
  let m;
  while ((m = runRe.exec(para)) !== null) {
    const xmlR = m[0];
    const rPrM = xmlR.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    const texts = [...xmlR.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('');
    runs.push({
      xml: xmlR,
      start: m.index,
      end: m.index + xmlR.length,
      rPr: rPrM?.[0] || '',
      text: texts,
    });
  }
  return runs;
}

export function hasYellowHighlight(rPr) {
  return /<w:highlight\b[^>]*\bw:val\s*=\s*["']yellow["']/i.test(rPr || '');
}

export function withRedHighlight(rPr) {
  const cleaned = (rPr || '')
    .replace(/<w:highlight\b[^/]*\/>/gi, '')
    .replace(/<w:i\s*\/>/gi, '')
    .replace(/<w:iCs\s*\/>/gi, '');
  if (!cleaned) return '<w:rPr><w:highlight w:val="red"/></w:rPr>';
  return cleaned.replace('</w:rPr>', '<w:highlight w:val="red"/></w:rPr>');
}

export function escapeXml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function makeRedRun(rPr, text) {
  if (!text) return '';
  return `<w:r>${withRedHighlight(rPr)}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

export function findSectionIBounds(xml) {
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let startPos = -1;
  let endPos = -1;
  let m;
  while ((m = paraRe.exec(xml)) !== null) {
    if (!/<w:pStyle\s+w:val="TITLESECTION"/.test(m[0])) continue;
    const t = stripTags(m[0]);
    if (startPos === -1 && /^Section\s+I\s+Instructions aux Soumissionnaires/i.test(t)) startPos = m.index;
    else if (startPos !== -1) { endPos = m.index; break; }
  }
  return { startPos, endPos };
}

export function buildPartPositions(parts) {
  const positions = new Array(parts.length);
  let cur = 0;
  for (let i = 0; i < parts.length; i++) {
    positions[i] = cur;
    cur += parts[i].length;
  }
  return positions;
}

export function splitIntoParagraphs(xml) {
  const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  const paras = [];
  let m;
  while ((m = paraRe.exec(xml)) !== null) {
    const runs = [...m[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]).join('');
    paras.push({
      raw: m[0],
      start: m.index,
      combined: normApos(runs),
      text: normApos(stripTags(m[0])),
    });
  }
  return paras;
}
