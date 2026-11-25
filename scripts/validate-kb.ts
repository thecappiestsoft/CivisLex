/**
 * Walidator bazy wiedzy dla autorów treści (npm run validate:kb).
 * Sprawdza grafy decyzyjne, składnię szablonów i odwołania do przepisów/stałych.
 */
import { PROCEDURES, TEMPLATES, ARTICLES, DEFAULT_LAW_CONSTANTS } from '../src/knowledge-base';
import { validateTree } from '../src/engine/decisionTree';
import { parseTemplate } from '../src/engine/templateParser';

const errors: string[] = [];
const articleIds = new Set(ARTICLES.articles.map((a) => a.id));
const constKeys = new Set(Object.keys(DEFAULT_LAW_CONSTANTS.constants));

for (const tree of PROCEDURES) {
  validateTree(tree, Object.keys(TEMPLATES)).forEach((e) => errors.push(`${tree.procedureId}: ${e}`));
  tree.legalBasisRefs.filter((r) => !articleIds.has(r)).forEach((r) => errors.push(`${tree.procedureId}: brak przepisu ${r}`));
  const json = JSON.stringify(tree);
  for (const m of json.matchAll(/\{@const:(\w+)\}|"expectedConstantKey":"(\w+)"/g)) {
    const key = m[1] ?? m[2];
    if (!constKeys.has(key)) errors.push(`${tree.procedureId}: nieznana stała ${key}`);
  }
}

for (const tpl of Object.values(TEMPLATES)) {
  for (const lang of ['pl', 'en'] as const) {
    const src = tpl.body[lang].join('\n');
    try {
      parseTemplate(src);
    } catch (e) {
      errors.push(`${tpl.templateId} [${lang}]: ${(e as Error).message}`);
    }
    for (const m of src.matchAll(/\{@law(?:Ref|Unit):(\w+)\}/g)) {
      if (!articleIds.has(m[1])) errors.push(`${tpl.templateId} [${lang}]: brak przepisu ${m[1]}`);
    }
    for (const m of src.matchAll(/\{@const:(\w+)\}/g)) {
      if (!constKeys.has(m[1])) errors.push(`${tpl.templateId} [${lang}]: nieznana stała ${m[1]}`);
    }
  }
}

if (errors.length) {
  console.error(`✖ Błędy w bazie wiedzy (${errors.length}):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`✔ Baza wiedzy poprawna: ${PROCEDURES.length} procedur, ${Object.keys(TEMPLATES).length} szablonów, ${articleIds.size} przepisów.`);
