/**
 * Panel administracyjny nauczyciela — edycja law_constants.json bez znajomości JSON.
 * Chroniony prostym kodem PIN.
 */

import { h } from '../../utils/dom';
import { lt } from '../../utils/text';
import { formatDate } from '../../engine/deadlineCalc';
import { downloadFile } from '../../engine/pdfExporter';
import { getArticle } from '../../knowledge-base';
import {
  checkPin,
  exportConstantsJson,
  importConstants,
  isModified,
  lawConstants,
  resetConstants,
  saveConstants,
  setPin,
} from '../../state/lawConstants';
import { currentLang, t } from '../../i18n';
import { icon } from '../components/icons';
import { toast } from '../components/toast';
import { confirmModal } from '../components/modal';
import type { View } from '../router';

// Odblokowanie trwa do przeładowania strony lub ręcznego zablokowania.
let unlocked = false;

export const TeacherView: View = (root) => {
  const rerender = () => {
    root.replaceChildren();
    TeacherView(root, {});
  };
  root.append(unlocked ? Editor(rerender) : PinGate(rerender));
};

function PinGate(onUnlock: () => void): HTMLElement {
  const input = h('input', {
    type: 'password',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: 8,
    class: 'pin-input',
    'aria-label': t('teacher.pin'),
    placeholder: '••••',
  });
  const error = h('p', { class: 'form-error', 'aria-live': 'assertive' });

  const form = h(
    'form',
    {
      class: 'pin-form',
      onsubmit: (e: Event) => {
        e.preventDefault();
        if (checkPin(input.value)) {
          unlocked = true;
          onUnlock();
        } else {
          error.textContent = t('teacher.wrongPin');
          input.select();
        }
      },
    },
    h('label', { class: 'field-label' }, t('teacher.pin')),
    h('div', { class: 'inline-fields' }, input, h('button', { type: 'submit', class: 'btn btn-primary' }, icon('unlock', 18), t('teacher.unlock'))),
    error,
    h('p', { class: 'muted small' }, t('teacher.defaultPin')),
  );

  setTimeout(() => input.focus(), 0);
  return h(
    'section',
    { class: 'pin-gate panel clip' },
    h('span', { class: 'stamp stamp-bad' }, t('teacher.restricted')),
    h('h1', null, t('teacher.title')),
    h('p', { class: 'muted' }, t('teacher.locked')),
    form,
  );
}

function Editor(rerender: () => void): HTMLElement {
  const lang = currentLang();
  const { file } = lawConstants.get();
  const draft: Record<string, number> = Object.fromEntries(
    Object.entries(file.constants).map(([k, c]) => [k, c.value]),
  );

  const rows = Object.entries(file.constants).map(([key, c]) => {
    const art = c.ref ? getArticle(c.ref) : undefined;
    const unit = lt(c.unit, lang);
    return h(
      'tr',
      null,
      h(
        'td',
        null,
        h('div', { class: 'const-label' }, lt(c.label, lang)),
        h('code', { class: 'const-key' }, key),
        isModified(key) ? h('span', { class: 'badge' }, t('teacher.modified')) : null,
      ),
      h('td', { class: 'muted small' }, art ? `${art.unit} — ${lt(art.act, lang)}` : '—'),
      h(
        'td',
        null,
        h(
          'label',
          { class: 'num-field' },
          h('input', {
            type: 'number',
            min: 0,
            step: 'any',
            class: 'num-input',
            value: String(c.value),
            'aria-label': lt(c.label, lang),
            dataset: { key },
            oninput: (e: Event) => (draft[key] = Number((e.target as HTMLInputElement).value)),
          }),
          h('span', { class: 'num-unit' }, unit),
        ),
      ),
    );
  });

  const fileInput = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: async (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      if (importConstants(await f.text())) toast(t('teacher.importOk'), 'success');
      else toast(t('teacher.importError'), 'error');
    },
  });

  const pinInput = h('input', { type: 'password', inputmode: 'numeric', maxlength: 8, class: 'pin-input', 'aria-label': t('teacher.newPin'), placeholder: t('teacher.newPin') });

  return h(
    'div',
    { class: 'teacher' },
    h(
      'section',
      { class: 'page-head' },
      h(
        'div',
        { class: 'page-head-row' },
        h('h1', null, icon('unlock', 26), t('teacher.title')),
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { unlocked = false; rerender(); } }, icon('lock', 18), t('teacher.lock')),
      ),
      h('p', { class: 'lead' }, t('teacher.intro')),
      h('p', { class: 'muted small' }, `${t('teacher.lastUpdated')}: ${formatDate(file.lastUpdatedByTeacher, lang)}`),
    ),
    h(
      'form',
      {
        class: 'panel',
        onsubmit: (e: Event) => {
          e.preventDefault();
          saveConstants(draft);
          toast(t('teacher.saved'), 'success');
        },
      },
      h(
        'div',
        { class: 'table-wrap' },
        h(
          'table',
          { class: 'const-table' },
          h('thead', null, h('tr', null, h('th', null, t('teacher.key')), h('th', null, t('teacher.basis')), h('th', null, t('teacher.value')))),
          h('tbody', null, rows),
        ),
      ),
      h(
        'div',
        { class: 'btn-row' },
        h('button', { type: 'submit', class: 'btn btn-primary' }, icon('check', 18), t('teacher.save')),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost',
            onclick: async () => {
              const ok = await confirmModal({ title: t('teacher.reset'), body: t('teacher.reset') + '?', confirmLabel: t('teacher.reset'), cancelLabel: t('lint.cancel'), danger: true });
              if (ok) {
                resetConstants();
                toast(t('teacher.resetDone'), 'success');
              }
            },
          },
          icon('refresh', 18),
          t('teacher.reset'),
        ),
        h('span', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => downloadFile(exportConstantsJson(), 'law_constants.json', 'application/json') }, icon('download', 18), t('teacher.export')),
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => fileInput.click() }, icon('upload', 18), t('teacher.import')),
        fileInput,
      ),
    ),
    h(
      'form',
      {
        class: 'panel pin-change',
        onsubmit: (e: Event) => {
          e.preventDefault();
          if (setPin(pinInput.value)) {
            pinInput.value = '';
            toast(t('teacher.pinChanged'), 'success');
          } else toast(t('teacher.pinInvalid'), 'error');
        },
      },
      h('h2', { class: 'panel-title' }, icon('lock', 18), t('teacher.changePin')),
      h('div', { class: 'inline-fields' }, pinInput, h('button', { type: 'submit', class: 'btn btn-secondary' }, t('teacher.changePin'))),
    ),
  );
}
