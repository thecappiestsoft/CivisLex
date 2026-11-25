/**
 * Panel „Podstawa prawna” — treść przepisów powiązanych z procedurą.
 */

import { h } from '../../../utils/dom';
import { lt } from '../../../utils/text';
import { getArticle } from '../../../knowledge-base';
import type { Lang } from '../../../types/models';
import { t } from '../../../i18n';
import { icon } from '../../components/icons';

export function LegalBasisPanel(refs: string[], lang: Lang): HTMLElement {
  return h(
    'aside',
    { class: 'panel legal-basis' },
    h('h2', { class: 'panel-title' }, icon('book', 18), t('proc.legalBasis')),
    refs.map((id) => {
      const art = getArticle(id);
      if (!art) return null;
      return h(
        'article',
        { class: 'law-card' },
        h('header', null, h('strong', null, art.unit), h('span', null, lt(art.act, lang))),
        h('p', null, lang === 'en' && art.text_en ? art.text_en : art.text),
      );
    }),
  );
}
