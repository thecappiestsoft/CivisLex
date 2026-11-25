/**
 * Panel wyników Lintera Prawnego (lista kontrolna elementów pisma).
 */

import { h } from '../../utils/dom';
import { interpolate, lt } from '../../utils/text';
import type { LintItem, LintReport } from '../../engine/legalLinter';
import type { Lang } from '../../types/models';
import { t } from '../../i18n';
import { formatDate } from '../../engine/deadlineCalc';
import { icon } from './icons';

/** Formatuje parametry komunikatu: daty ISO → data słowna, liczby → separator tysięcy. */
function formatParams(params: LintItem['params'], lang: Lang): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const loc = lang === 'pl' ? 'pl-PL' : 'en-GB';
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
        ? formatDate(v, lang)
        : typeof v === 'number'
          ? v.toLocaleString(loc)
          : v,
    ]),
  );
}

export function lintItemText(item: LintItem, lang: Lang): string {
  const params = formatParams(item.params, lang);
  if (item.label) return interpolate(lt(item.label, lang), params);
  return t(item.labelKey ?? '', params);
}

export function LintPanel(report: LintReport, lang: Lang, onFocusField: (key: string) => void): HTMLElement {
  const ok = report.errors === 0 && report.warnings === 0;
  return h(
    'section',
    { class: ['lint-panel', ok ? 'is-ok' : report.errors ? 'has-errors' : 'has-warnings'], 'aria-live': 'polite' },
    h(
      'header',
      { class: 'lint-head' },
      h('h3', null, icon('shield', 18), t('lint.title')),
      h(
        'span',
        { class: 'lint-summary' },
        ok ? t('lint.summaryOk') : t('lint.summaryBad', { errors: report.errors, warnings: report.warnings }),
      ),
    ),
    h(
      'ul',
      { class: 'lint-list' },
      report.items.map((item) =>
        h(
          'li',
          { class: ['lint-item', `is-${item.status}`] },
          h('span', { class: 'lint-icon' }, icon(item.status === 'ok' ? 'check' : item.status === 'error' ? 'x' : 'alert', 14)),
          item.fields.length
            ? h(
                'button',
                { type: 'button', class: 'lint-link', onclick: () => onFocusField(item.fields[0]) },
                lintItemText(item, lang),
              )
            : h('span', null, lintItemText(item, lang)),
        ),
      ),
    ),
    h('p', { class: 'lint-basis' }, t('lint.basis')),
  );
}
