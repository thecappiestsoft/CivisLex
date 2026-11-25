/**
 * Rejestr lokalnej bazy wiedzy prawnej.
 * Knowledge-base registry — the only place that imports the JSON files.
 *
 * Aby dodać nową procedurę:
 *   1. utwórz plik w ./trees/ (graf decyzyjny),
 *   2. utwórz szablon w ./templates/,
 *   3. dopisz oba importy poniżej.
 */

import type { ArticlesFile, DocumentTemplate, LawConstantsFile, ProcedureTree } from '../types/models';

import lawConstants from './law_constants.json';
import articles from './articles_pl.json';

import udipTree from './trees/udip.json';
import rpoTree from './trees/rpo.json';
import odwolanieTree from './trees/odwolanie.json';
import reklamacjaTree from './trees/reklamacja.json';
import pozewTree from './trees/pozew.json';
import zawiadomienieTree from './trees/zawiadomienie.json';

import udipTpl from './templates/udip_wniosek.json';
import rpoTpl from './templates/rpo_wniosek.json';
import odwolanieTpl from './templates/odwolanie_kpa.json';
import reklamacjaTpl from './templates/reklamacja.json';
import pozewTpl from './templates/pozew_uproszczony.json';
import zawiadomienieTpl from './templates/zawiadomienie.json';

export const DEFAULT_LAW_CONSTANTS = lawConstants as LawConstantsFile;

export const ARTICLES = articles as ArticlesFile;

export const PROCEDURES: ProcedureTree[] = [
  udipTree,
  odwolanieTree,
  rpoTree,
  reklamacjaTree,
  pozewTree,
  zawiadomienieTree,
] as ProcedureTree[];

export const TEMPLATES: Record<string, DocumentTemplate> = Object.fromEntries(
  ([udipTpl, rpoTpl, odwolanieTpl, reklamacjaTpl, pozewTpl, zawiadomienieTpl] as DocumentTemplate[]).map((t) => [
    t.templateId,
    t,
  ]),
);

export function getProcedure(id: string): ProcedureTree | undefined {
  return PROCEDURES.find((p) => p.procedureId === id);
}

export function getArticle(id: string) {
  return ARTICLES.articles.find((a) => a.id === id);
}

/** Szablon powiązany z procedurą (węzeł DOCUMENT_BUILDER). */
export function getTemplateForProcedure(tree: ProcedureTree): DocumentTemplate | undefined {
  const node = Object.values(tree.nodes).find((n) => n.type === 'DOCUMENT_BUILDER');
  return node && node.type === 'DOCUMENT_BUILDER' ? TEMPLATES[node.templateId] : undefined;
}
