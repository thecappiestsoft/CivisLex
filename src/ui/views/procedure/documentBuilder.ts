/**
 * Kreator pisma — Split-Screen: formularz (lewa) + podgląd na żywo (prawa).
 * Document builder with live preview, legal linter and PDF/TXT export.
 */

import { h } from '../../../utils/dom';
import { lt, setPath } from '../../../utils/text';
import type { DocumentTemplate, Lang, TemplateField } from '../../../types/models';
import { renderTemplate, type RenderOptions } from '../../../engine/templateParser';
import { lintDocument, isFieldVisible } from '../../../engine/legalLinter';
import { exportPdf, exportTxt, slugify } from '../../../engine/pdfExporter';
import { todayISO } from '../../../engine/deadlineCalc';
import { DOCUMENT_CSS } from '../../../engine/documentStyles';
import { getArticle } from '../../../knowledge-base';
import { getConst } from '../../../state/lawConstants';
import { clearForm, loadForm, saveForm, type FormValues } from '../../../state/progress';
import { generateFakeIdentity } from '../../../utils/fakeIdentity';
import { t } from '../../../i18n';
import { FormField, type FieldValue } from '../../components/formFields';
import { LintPanel, lintItemText } from '../../components/lintPanel';
import { confirmModal } from '../../components/modal';
import { toast } from '../../components/toast';
import { icon } from '../../components/icons';

const GROUP_ORDER = ['document', 'applicant', 'addressee', 'parties', 'content', 'attachments'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

let draftMode = true;

/** Wstrzykuje style pisma do <head> (raz). */
function ensureDocumentStyles(): void {
  if (document.getElementById('civis-doc-styles')) return;
  document.head.appendChild(h('style', { id: 'civis-doc-styles' }, DOCUMENT_CSS));
}

function applyDefaults(template: DocumentTemplate): FormValues {
  const values: FormValues = {};
  for (const [key, val] of Object.entries(template.defaults ?? {})) {
    values[key] = val === '@today' ? todayISO() : val;
  }
  return values;
}

/** Płaska mapa wartości → zagnieżdżony obiekt kontekstu szablonu. */
function toContext(values: FormValues): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(values)) setPath(ctx, key, val);
  return ctx;
}

export interface BuilderProps {
  template: DocumentTemplate;
  lang: Lang;
  /** Pasek z informacją o wyniku quizu. */
  summary: HTMLElement;
}

export function DocumentBuilder({ template, lang, summary }: BuilderProps): HTMLElement {
  ensureDocumentStyles();
  let values: FormValues = loadForm(template.templateId) ?? applyDefaults(template);

  const fieldLabels = Object.fromEntries(template.fields.map((f) => [f.key, lt(f.label, lang)]));
  const fieldTypes = Object.fromEntries(template.fields.map((f) => [f.key, f.type]));
  const selectLabels = Object.fromEntries(
    template.fields
      .filter((f) => f.type === 'select')
      .map((f) => [f.key, Object.fromEntries((f.options ?? []).map((o) => [o.value, lt(o.docLabel ?? o.label, lang)]))]),
  );
  const title = lt(template.title, lang);

  const renderOpts = (mode: 'draft' | 'final'): RenderOptions => ({
    lang,
    mode,
    data: toContext(values),
    fieldLabels,
    fieldTypes,
    selectLabels,
    missingPrefix: t('missing'),
    resolveLaw: (id) => {
      const art = getArticle(id);
      if (!art) return undefined;
      return { unit: art.unit, text: lang === 'en' && art.text_en ? art.text_en : art.text };
    },
    resolveConst: getConst,
  });

  const renderHtml = (mode: 'draft' | 'final') => renderTemplate(template.body[lang].join('\n'), renderOpts(mode));

  /* ---------------- elementy ---------------- */

  const paper = h('article', { class: 'civis-doc paper', 'aria-label': t('form.preview') });
  const lintSlot = h('div', { class: 'lint-slot' });
  const formEl = h('form', { class: 'doc-form', onsubmit: (e: Event) => e.preventDefault() });

  const focusField = (key: string) => {
    const wrap = formEl.querySelector<HTMLElement>(`[data-field="${CSS.escape(key)}"]`);
    if (!wrap) return;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    wrap.querySelector<HTMLElement>('input, textarea, select')?.focus({ preventScroll: true });
    wrap.classList.add('flash');
    setTimeout(() => wrap.classList.remove('flash'), 1200);
  };

  const update = () => {
    const data = toContext(values);

    // Podgląd na żywo
    paper.innerHTML = renderHtml(draftMode ? 'draft' : 'final');

    // Widoczność pól warunkowych
    template.fields.forEach((f) => {
      if (!f.showIf) return;
      const el = formEl.querySelector<HTMLElement>(`[data-field="${CSS.escape(f.key)}"]`);
      if (el) el.hidden = !isFieldVisible(f.showIf, data);
    });

    // Linter
    const report = lintDocument(template, data, getConst);
    const errorFields = new Set(report.items.filter((i) => i.status !== 'ok').flatMap((i) => i.fields));
    formEl.querySelectorAll<HTMLElement>('[data-field]').forEach((el) => {
      el.classList.toggle('has-error', errorFields.has(el.dataset.field ?? ''));
    });
    lintSlot.replaceChildren(LintPanel(report, lang, focusField));
    return report;
  };

  const setValue = (key: string, value: FieldValue) => {
    values = { ...values, [key]: value };
    saveForm(template.templateId, values);
    update();
  };

  const renderForm = () => {
    const groups = new Map<string, TemplateField[]>();
    template.fields.forEach((f) => {
      const g = f.group ?? 'content';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(f);
    });
    const ordered = [...groups.keys()].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
    formEl.replaceChildren(
      ...ordered.map((g, i) =>
        h(
          'fieldset',
          { class: 'form-group' },
          h('legend', null, h('span', { class: 'roman' }, `${ROMAN[i] ?? i + 1}.`), t(`form.group.${g}`)),
          groups.get(g)!.map((field) =>
            FormField({ field, value: values[field.key], lang, onChange: (v) => setValue(field.key, v) }),
          ),
        ),
      ),
    );
  };

  /* ---------------- akcje ---------------- */

  const insertFakeIdentity = () => {
    const p = generateFakeIdentity();
    const map: Record<string, string> = {
      'applicant.fullName': p.fullName,
      'applicant.address': p.address,
      'applicant.pesel': p.pesel,
      'applicant.email': p.email,
      'applicant.phone': p.phone,
      'applicant.edelivery': `AE:PL-${Math.floor(10000 + Math.random() * 89999)}-${Math.floor(10000 + Math.random() * 89999)}-CIVIS-01`,
      'document.place': p.city,
    };
    const keys = new Set(template.fields.map((f) => f.key));
    const patch: FormValues = {};
    for (const [k, v] of Object.entries(map)) if (keys.has(k)) patch[k] = v;
    if (keys.has('document.date') && !values['document.date']) patch['document.date'] = todayISO();
    values = { ...values, ...patch };
    saveForm(template.templateId, values);
    renderForm();
    update();
    toast(t('form.fakeInserted', { name: p.fullName }), 'success');
  };

  const clearAll = () => {
    clearForm(template.templateId);
    values = applyDefaults(template);
    renderForm();
    update();
  };

  const guardedExport = async (doExport: () => void) => {
    const report = update();
    if (report.errors > 0) {
      const issues = report.items.filter((i) => i.status === 'error');
      const ok = await confirmModal({
        title: t('lint.title'),
        body: h(
          'div',
          null,
          h('p', null, t('lint.blocked')),
          h('ul', { class: 'modal-list' }, issues.map((i) => h('li', null, lintItemText(i, lang)))),
        ),
        confirmLabel: t('lint.exportAnyway'),
        cancelLabel: t('lint.cancel'),
      });
      if (!ok) {
        const first = issues.find((i) => i.fields.length);
        if (first) focusField(first.fields[0]);
        return;
      }
    }
    doExport();
  };

  const onPdf = () =>
    guardedExport(() => {
      toast(t('form.pdfHint'));
      exportPdf(renderHtml('final'), title, lang);
    });

  const onTxt = () => guardedExport(() => exportTxt(renderHtml('final'), `${slugify(title)}.txt`));

  /* ---------------- układ ---------------- */

  renderForm();
  update();

  const draftToggle = h(
    'label',
    { class: 'switch' },
    h('input', {
      type: 'checkbox',
      checked: draftMode,
      onchange: (e: Event) => {
        draftMode = (e.target as HTMLInputElement).checked;
        update();
      },
    }),
    h('span', { class: 'switch-track', 'aria-hidden': 'true' }),
    h('span', null, t('form.draftMode')),
  );

  return h(
    'div',
    { class: 'builder' },
    h(
      'section',
      { class: 'builder-form panel clip' },
      summary,
      h('h2', { class: 'panel-title' }, icon('doc', 18), t('proc.builderTitle')),
      h(
        'div',
        { class: 'fake-box' },
        h('p', null, icon('shield', 16), t('form.fakeDataHint')),
        h('button', { type: 'button', class: 'btn btn-secondary', dataset: { action: 'fake' }, onclick: insertFakeIdentity }, icon('idcard', 18), t('form.fakeData')),
      ),
      formEl,
      h('div', { class: 'btn-row', style: 'margin-bottom: var(--space-4)' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: clearAll }, icon('eraser', 16), t('form.clear'))),
    ),
    h(
      'section',
      { class: 'builder-preview' },
      h(
        'div',
        { class: 'preview-toolbar' },
        h('h2', { class: 'panel-title' }, t('form.preview')),
        draftToggle,
        h(
          'div',
          { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn btn-outline', dataset: { action: 'txt' }, onclick: onTxt }, icon('paperclip', 18), t('form.exportTxt')),
          h('button', { type: 'button', class: 'btn btn-stamp', dataset: { action: 'pdf' }, onclick: onPdf }, t('form.exportPdf')),
        ),
      ),
      lintSlot,
      h('div', { class: 'paper-wrap' }, paper),
    ),
  );
}
