/**
 * Przełącznik języka PL | EN — w formie dwóch pieczątek.
 * Aktywny język to „odbita” czerwona pieczątka.
 */

import { h } from '../../utils/dom';
import { settings } from '../../state/settings';
import { SUPPORTED_LANGS, t } from '../../i18n';

export function LangToggle(): HTMLElement {
  const { lang } = settings.get();
  return h(
    'div',
    { class: 'lang-toggle', role: 'group', 'aria-label': t('lang.switch') },
    SUPPORTED_LANGS.map((code, i) => [
      i > 0 ? h('span', { class: 'lang-sep', 'aria-hidden': 'true' }, '|') : null,
      h(
        'button',
        {
          type: 'button',
          class: ['stamp-btn', code === lang && 'is-active'],
          'aria-pressed': String(code === lang),
          lang: code,
          onclick: () => settings.set({ lang: code }),
        },
        code.toUpperCase(),
      ),
    ]),
  );
}
