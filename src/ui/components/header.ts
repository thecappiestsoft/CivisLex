/**
 * Nagłówek aplikacji: logo, nawigacja, przełączniki języka i motywu.
 */

import { h } from '../../utils/dom';
import { t } from '../../i18n';
import { icon, type IconName } from './icons';
import { ThemeToggle } from './themeToggle';
import { LangToggle } from './langToggle';

const NAV: { href: string; key: string; icon: IconName; match: RegExp }[] = [
  { href: '#/', key: 'nav.home', icon: 'list', match: /^#?\/?$|^#\/procedure/ },
  { href: '#/deadlines', key: 'nav.deadlines', icon: 'calendar', match: /^#\/deadlines/ },
  { href: '#/articles', key: 'nav.articles', icon: 'book', match: /^#\/articles/ },
  { href: '#/teacher', key: 'nav.teacher', icon: 'lock', match: /^#\/teacher/ },
];

export function Header(currentHash: string): HTMLElement {
  return h(
    'header',
    { class: 'app-header' },
    h(
      'div',
      { class: 'header-inner' },
      h(
        'a',
        { class: 'brand', href: '#/' },
        h('span', { class: 'brand-mark' }, icon('scale', 22)),
        h('span', { class: 'brand-text' }, h('strong', null, t('app.name')), h('small', null, t('app.kicker'))),
      ),
      h(
        'nav',
        { class: 'main-nav', 'aria-label': t('nav.menu') },
        NAV.map((item) =>
          h(
            'a',
            {
              href: item.href,
              class: ['nav-link', item.match.test(currentHash) && 'is-active'],
              'aria-current': item.match.test(currentHash) ? 'page' : undefined,
            },
            icon(item.icon, 18),
            h('span', null, t(item.key)),
          ),
        ),
      ),
      h('div', { class: 'header-controls' }, LangToggle(), ThemeToggle()),
    ),
  );
}
