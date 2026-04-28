import { loadTemplateXml, splitIntoParagraphs } from './_helpers.mjs';

const xml = await loadTemplateXml();
const paras = splitIntoParagraphs(xml);

// Dump paragraphs 1925–2050 to see the form sequence
for (let i = 1925; i < 2050; i++) {
  const p = paras[i];
  if (!p) continue;
  const t = p.text.slice(0, 160);
  if (t.trim()) console.log(`[${i}] ${t}`);
}
