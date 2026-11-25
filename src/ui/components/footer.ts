/**
 * Stopka aplikacji z informacją o prawach autorskich.
 */

import { h } from '../../utils/dom';
import { t } from '../../i18n';

export const COPYRIGHT = '© 2026 CappySoft.pl';

export function Footer(): HTMLElement {
  return h(
    'footer',
    { class: 'app-footer' },
    h(
      'div',
      { class: 'footer-inner' },
      h('span', { class: 'footer-note' }, t('footer.disclaimer')),
      h('span', { class: 'footer-copy' }, COPYRIGHT),
    ),
  );
}
