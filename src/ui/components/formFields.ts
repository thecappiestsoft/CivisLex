/**
 * Renderowanie pól formularza na podstawie definicji z szablonu (data-driven).
 * Form field renderer.
 */

import { h, uid } from '../../utils/dom';
import { lt } from '../../utils/text';
import type { Lang, TemplateField } from '../../types/models';
import { validatePesel } from '../../utils/fakeIdentity';
import { formatDate } from '../../engine/deadlineCalc';
import { t } from '../../i18n';
import { icon } from './icons';

export type FieldValue = string | boolean | string[];

export interface FieldProps {
  field: TemplateField;
  value: FieldValue | undefined;
  lang: Lang;
  onChange: (value: FieldValue) => void;
}

/** Zwraca kontener pola z atrybutem data-field (do podświetlania błędów lintera). */
export function FormField({ field, value, lang, onChange }: FieldProps): HTMLElement {
  const id = uid('f');
  const label = lt(field.label, lang);
  const placeholder = lt(field.placeholder, lang) || undefined;

  const labelEl = h(
    'label',
    { class: 'field-label', for: id },
    label,
    field.required ? h('span', { class: 'req', title: t('form.required'), 'aria-hidden': 'true' }, '*') : null,
  );

  let control: HTMLElement;
  let extra: HTMLElement | null = null;

  switch (field.type) {
    case 'textarea':
      control = h('textarea', {
        id,
        rows: 4,
        placeholder,
        required: field.required,
        value: String(value ?? ''),
        oninput: (e: Event) => onChange((e.target as HTMLTextAreaElement).value),
      });
      break;

    case 'date':
      control = h('input', {
        id,
        type: 'date',
        required: field.required,
        value: String(value ?? ''),
        oninput: (e: Event) => onChange((e.target as HTMLInputElement).value),
      });
      break;

    case 'checkbox':
      return h(
        'div',
        { class: 'field field-checkbox', dataset: { field: field.key } },
        h(
          'label',
          { class: 'check-label', for: id },
          h('input', {
            id,
            type: 'checkbox',
            checked: Boolean(value),
            onchange: (e: Event) => onChange((e.target as HTMLInputElement).checked),
          }),
          h('span', { class: 'check-box', 'aria-hidden': 'true' }, icon('check', 14)),
          h('span', null, label),
        ),
      );

    case 'select':
      control = h(
        'select',
        {
          id,
          required: field.required,
          onchange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
        },
        (field.options ?? []).map((opt) =>
          h('option', { value: opt.value, selected: opt.value === value }, lt(opt.label, lang)),
        ),
      );
      break;

    case 'list':
      return ListField({ field, value, lang, onChange }, labelEl);

    case 'pesel': {
      extra = h('div', { class: 'field-hint pesel-status', 'aria-live': 'polite' });
      const updateBadge = (v: string) => {
        extra!.className = 'field-hint pesel-status';
        extra!.textContent = '';
        if (!v.trim()) return;
        const res = validatePesel(v);
        if (res.valid) {
          extra!.classList.add('is-ok');
          extra!.textContent = t('form.peselValid', {
            sex: t(res.sex === 'F' ? 'form.sexF' : 'form.sexM'),
            date: formatDate(res.birthDate!, lang),
          });
        } else {
          extra!.classList.add('is-error');
          extra!.textContent = t(`lint.pesel.${res.reason}`);
        }
      };
      control = h('input', {
        id,
        type: 'text',
        inputmode: 'numeric',
        maxlength: 11,
        autocomplete: 'off',
        placeholder,
        value: String(value ?? ''),
        oninput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value.replace(/\D/g, '');
          (e.target as HTMLInputElement).value = v;
          updateBadge(v);
          onChange(v);
        },
      });
      updateBadge(String(value ?? ''));
      break;
    }

    case 'money':
      control = h('input', {
        id,
        type: 'text',
        inputmode: 'decimal',
        placeholder: placeholder ?? '0,00',
        value: String(value ?? ''),
        oninput: (e: Event) => onChange((e.target as HTMLInputElement).value),
      });
      break;

    default:
      control = h('input', {
        id,
        type: 'text',
        placeholder,
        required: field.required,
        value: String(value ?? ''),
        oninput: (e: Event) => onChange((e.target as HTMLInputElement).value),
      });
  }

  return h('div', { class: ['field', `field-${field.type}`], dataset: { field: field.key } }, labelEl, control, extra);
}

/** Edytor listy (np. załączników) — dodawanie/usuwanie pozycji. */
function ListField({ field, value, lang, onChange }: FieldProps, labelEl: HTMLElement): HTMLElement {
  let items = Array.isArray(value) ? [...value] : [];
  const listEl = h('ol', { class: 'list-editor' });

  const render = () => {
    listEl.replaceChildren(
      ...items.map((item, idx) =>
        h(
          'li',
          null,
          h('input', {
            type: 'text',
            value: item,
            placeholder: lt(field.placeholder, lang) || undefined,
            'aria-label': `${lt(field.label, lang)} ${idx + 1}`,
            oninput: (e: Event) => {
              items[idx] = (e.target as HTMLInputElement).value;
              onChange([...items]);
            },
          }),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-icon btn-ghost',
              'aria-label': t('form.removeItem'),
              title: t('form.removeItem'),
              onclick: () => {
                items = items.filter((_, i) => i !== idx);
                onChange([...items]);
                render();
              },
            },
            icon('trash', 16),
          ),
        ),
      ),
    );
  };
  render();

  const addBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      onclick: () => {
        items.push('');
        onChange([...items]);
        render();
        (listEl.lastElementChild?.querySelector('input') as HTMLInputElement | null)?.focus();
      },
    },
    icon('plus', 16),
    t('form.addItem'),
  );

  labelEl.removeAttribute('for');
  return h('div', { class: 'field field-list', dataset: { field: field.key } }, labelEl, listEl, addBtn);
}
