/**
 * Ekran startowy — lista procedur obywatelskich z filtrem kategorii.
 */

import { h } from '../../utils/dom';
import { caseSignature, lt } from '../../utils/text';
import { t, tp, currentLang } from '../../i18n';
import { PROCEDURES } from '../../knowledge-base';
import { getBestScore } from '../../state/progress';
import type { Category, ProcedureTree } from '../../types/models';
import { icon } from '../components/icons';
import type { View } from '../router';

const CATEGORIES: Category[] = ['PRAWO_KONSTYTUCYJNE', 'PRAWO_ADMINISTRACYJNE', 'PRAWO_CYWILNE', 'PRAWO_KARNE'];

let activeFilter: Category | 'ALL' = 'ALL';

function quizSteps(tree: ProcedureTree): number {
  return Object.values(tree.nodes).filter((n) => n.type !== 'DOCUMENT_BUILDER').length;
}

function ProcedureCard(tree: ProcedureTree): HTMLElement {
  const lang = currentLang();
  const best = getBestScore(tree.procedureId);
  const href = `#/procedure/${encodeURIComponent(tree.procedureId)}`;
  return h(
    'article',
    { class: 'proc-card', dataset: { category: tree.category } },
    h('span', { class: ['cat-tag', `cat-${tree.category}`] }, t(`category.${tree.category}`)),
    h('span', { class: 'proc-sig' }, `${t('home.sig')}: ${caseSignature(tree.procedureId)}`),
    h('h3', { class: 'proc-card-title' }, h('a', { href }, lt(tree.title, lang))),
    h('p', { class: 'proc-card-desc' }, lt(tree.description, lang)),
    h(
      'div',
      { class: 'proc-card-meta' },
      h('span', null, icon('quiz', 16), tp('home.steps', quizSteps(tree))),
      best !== undefined ? h('span', { class: 'best-score' }, icon('check', 16), t('home.best', { score: best })) : null,
    ),
    h('a', { class: 'btn btn-primary proc-card-btn', href, tabindex: '-1' }, t('home.start'), icon('arrowRight', 18)),
  );
}

export const HomeView: View = (root) => {
  const grid = h('div', { class: 'proc-grid' });

  const renderGrid = () => {
    grid.replaceChildren(
      ...PROCEDURES.filter((p) => activeFilter === 'ALL' || p.category === activeFilter).map(ProcedureCard),
    );
  };

  const filters = h('div', { class: 'chip-row', role: 'group' });
  const renderFilters = () => {
    filters.replaceChildren(
      ...(['ALL', ...CATEGORIES] as const).map((cat) =>
        h(
          'button',
          {
            type: 'button',
            class: ['chip', activeFilter === cat && 'is-active'],
            'aria-pressed': String(activeFilter === cat),
            onclick: () => {
              activeFilter = cat;
              renderFilters();
              renderGrid();
            },
          },
          cat === 'ALL' ? t('home.all') : t(`category.${cat}`),
        ),
      ),
    );
  };

  renderFilters();
  renderGrid();

  root.append(
    h(
      'section',
      { class: 'hero' },
      h('p', { class: 'eyebrow' }, t('app.offline')),
      h('h1', { class: 'hero-title' }, t('home.title')),
      h('p', { class: 'hero-intro' }, t('home.intro')),
      h(
        'ul',
        { class: 'feature-list' },
        h('li', null, icon('quiz', 18), t('home.featureQuiz')),
        h('li', null, icon('doc', 18), t('home.featureDoc')),
        h('li', null, icon('shield', 18), t('home.featureRodo')),
      ),
    ),
    filters,
    grid,
  );
};
