/**
 * Kalkulator terminów procesowych z wizualizacją kroków i kalendarzem świąt.
 */

import { h } from '../../utils/dom';
import { lt } from '../../utils/text';
import {
  computeDeadline,
  formatDate,
  parseISO,
  polishHolidays,
  todayISO,
  weekdayName,
  type DeadlineUnit,
} from '../../engine/deadlineCalc';
import { lawConstants } from '../../state/lawConstants';
import { currentLang, t } from '../../i18n';
import { icon } from '../components/icons';
import type { View } from '../router';

/** Stałe, które są terminami (mają jednostkę czasu). */
function deadlinePresets() {
  const { constants } = lawConstants.get().file;
  return Object.entries(constants)
    .map(([key, c]) => {
      const unitPl = typeof c.unit === 'object' ? c.unit.pl : c.unit ?? '';
      const unit: DeadlineUnit | null = unitPl.startsWith('dni')
        ? 'days'
        : unitPl.startsWith('mies')
          ? 'months'
          : unitPl.startsWith('lat')
            ? 'years'
            : null;
      return unit ? { key, label: c.label, value: c.value, unit } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

// Stan formularza zachowany między renderami (np. przy zmianie języka).
const state = { event: todayISO(), preset: 'KPA_APPEAL_DAYS', amount: 14, unit: 'days' as DeadlineUnit };

export const DeadlineView: View = (root) => {
  const lang = currentLang();
  const presets = deadlinePresets();
  const resultEl = h('div', { class: 'deadline-result' });
  const holidaysEl = h('div', { class: 'holidays' });

  const amountInput = h('input', { type: 'number', min: 1, value: String(state.amount), class: 'num-input' });
  const unitSelect = h(
    'select',
    null,
    (['days', 'months', 'years'] as DeadlineUnit[]).map((u) => h('option', { value: u, selected: u === state.unit }, t(`deadline.unit.${u}`))),
  );

  const syncCustomState = () => {
    const custom = state.preset === 'CUSTOM';
    amountInput.disabled = !custom;
    unitSelect.disabled = !custom;
    if (!custom) {
      const p = presets.find((x) => x.key === state.preset);
      if (p) {
        state.amount = p.value;
        state.unit = p.unit;
        amountInput.value = String(p.value);
        unitSelect.value = p.unit;
      }
    }
  };

  const compute = () => {
    if (!state.event || !(state.amount > 0)) {
      resultEl.replaceChildren();
      return;
    }
    const res = computeDeadline(state.event, state.amount, state.unit);
    const today = todayISO();
    const diff = Math.round((parseISO(res.finalDate).getTime() - parseISO(today).getTime()) / 86_400_000);
    const status =
      diff < 0 ? t('deadline.expired') : diff === 0 ? t('deadline.today') : t('deadline.daysLeft', { n: diff });

    resultEl.replaceChildren(
      h(
        'div',
        { class: ['result-card', diff < 0 && 'is-expired'] },
        h('span', { class: 'result-label' }, t('deadline.result')),
        h('strong', { class: 'result-date' }, formatDate(res.finalDate, lang)),
        h('span', { class: 'result-weekday' }, weekdayName(res.finalDate, lang)),
        h('span', { class: 'result-status' }, status),
        h('p', { class: 'result-note' }, res.shifted ? t('deadline.shifted') : t('deadline.notShifted')),
      ),
      h(
        'ol',
        { class: 'timeline' },
        res.steps.map((s) =>
          h(
            'li',
            { class: ['tl-step', `tl-${s.kind}`] },
            h('span', { class: 'tl-dot', 'aria-hidden': 'true' }),
            h(
              'div',
              null,
              h('span', { class: 'tl-label' }, t(`deadline.step.${s.kind}`)),
              h('span', { class: 'tl-date' }, `${formatDate(s.date, lang)} (${weekdayName(s.date, lang)})`),
              s.reason ? h('span', { class: 'tl-reason' }, s.reason[lang]) : null,
            ),
          ),
        ),
      ),
    );

    const year = parseISO(res.finalDate).getUTCFullYear();
    holidaysEl.replaceChildren(
      h('h3', null, t('deadline.holidays', { year })),
      h(
        'ul',
        { class: 'holiday-list' },
        polishHolidays(year).map((hd) =>
          h(
            'li',
            { class: hd.date === res.rawEndDate ? 'is-hit' : undefined },
            h('span', { class: 'hd-date' }, formatDate(hd.date, lang)),
            h('span', null, hd.name[lang]),
          ),
        ),
      ),
    );
  };

  const presetSelect = h(
    'select',
    {
      onchange: (e: Event) => {
        state.preset = (e.target as HTMLSelectElement).value;
        syncCustomState();
        compute();
      },
    },
    presets.map((p) =>
      h('option', { value: p.key, selected: p.key === state.preset }, `${lt(p.label, lang)} — ${p.value} ${t(`deadline.unit.${p.unit}`)}`),
    ),
    h('option', { value: 'CUSTOM', selected: state.preset === 'CUSTOM' }, t('deadline.custom')),
  );

  amountInput.addEventListener('input', () => {
    state.amount = Number(amountInput.value);
    compute();
  });
  unitSelect.addEventListener('change', () => {
    state.unit = unitSelect.value as DeadlineUnit;
    compute();
  });

  const eventInput = h('input', {
    type: 'date',
    value: state.event,
    oninput: (e: Event) => {
      state.event = (e.target as HTMLInputElement).value;
      compute();
    },
  });

  syncCustomState();
  compute();

  root.append(
    h(
      'section',
      { class: 'page-head' },
      h('h1', null, icon('calendar', 26), t('deadline.title')),
      h('p', { class: 'lead' }, t('deadline.intro')),
    ),
    h(
      'div',
      { class: 'split split-deadline' },
      h(
        'div',
        { class: 'panel' },
        h(
          'form',
          { class: 'deadline-calc', onsubmit: (e: Event) => e.preventDefault() },
          h('div', { class: 'field' }, h('label', { class: 'field-label' }, t('deadline.eventDate')), eventInput),
          h('div', { class: 'field' }, h('label', { class: 'field-label' }, t('deadline.preset')), presetSelect),
          h(
            'div',
            { class: 'field' },
            h('label', { class: 'field-label' }, t('deadline.amount')),
            h('div', { class: 'inline-fields' }, amountInput, unitSelect),
          ),
        ),
        resultEl,
      ),
      h('aside', { class: 'panel' }, holidaysEl),
    ),
  );
};
