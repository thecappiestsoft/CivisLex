/**
 * Przeglądarka przepisów z bazy wiedzy (articles_pl.json) z wyszukiwarką.
 */

import { h } from '../../utils/dom';
import { lt } from '../../utils/text';
import { ARTICLES, PROCEDURES } from '../../knowledge-base';
import { currentLang, t } from '../../i18n';
import { icon } from '../components/icons';
import type { View } from '../router';

let query = '';

export const ArticlesView: View = (root) => {
  const lang = currentLang();
  const list = h('div', { class: 'articles' });

  const usedBy = (id: string) =>
    PROCEDURES.filter((p) => p.legalBasisRefs.includes(id)).map((p) =>
      h('a', { class: 'chip chip-sm', href: `#/procedure/${p.procedureId}` }, lt(p.title, lang)),
    );

  const render = () => {
    const q = query.trim().toLowerCase();
    const matches = ARTICLES.articles.filter((a) => {
      if (!q) return true;
      const hay = `${a.unit} ${lt(a.act, lang)} ${a.text} ${a.text_en ?? ''}`.toLowerCase();
      return hay.includes(q);
    });

    // grupowanie po akcie prawnym
    const groups = new Map<string, typeof matches>();
    matches.forEach((a) => {
      const act = lt(a.act, lang);
      if (!groups.has(act)) groups.set(act, []);
      groups.get(act)!.push(a);
    });

    list.replaceChildren(
      ...(matches.length
        ? [...groups.entries()].map(([act, arts]) =>
            h(
              'section',
              { class: 'act-group' },
              h('h2', { class: 'act-title' }, act),
              arts.map((a) => {
                const used = usedBy(a.id);
                return h(
                  'article',
                  { class: 'law-card', id: a.id },
                  h('header', null, h('strong', null, a.unit), h('code', null, a.id)),
                  h('p', null, lang === 'en' && a.text_en ? a.text_en : a.text),
                  lang === 'en' && a.text_en ? h('details', null, h('summary', null, 'PL'), h('p', { lang: 'pl' }, a.text)) : null,
                  used.length ? h('div', { class: 'used-in' }, h('span', null, t('articles.usedIn')), used) : null,
                );
              }),
            ),
          )
        : [h('p', { class: 'empty' }, t('articles.none'))]),
    );
  };

  const search = h('input', {
    type: 'search',
    value: query,
    placeholder: t('articles.search'),
    'aria-label': t('articles.search'),
    oninput: (e: Event) => {
      query = (e.target as HTMLInputElement).value;
      render();
    },
  });

  render();
  root.append(
    h(
      'section',
      { class: 'page-head' },
      h('h1', null, icon('book', 26), t('articles.title')),
      h('p', { class: 'lead muted' }, lt(ARTICLES.disclaimer, lang)),
      h('label', { class: 'search-box' }, icon('search', 18), search),
    ),
    list,
  );
};
