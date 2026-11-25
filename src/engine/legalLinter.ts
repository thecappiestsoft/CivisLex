/**
 * Linter Prawny — walidator formalny pisma (art. 63 § 2 KPA, art. 126 KPC).
 * Formal document validator run before PDF export.
 */

import type { DocumentTemplate, LText } from '../types/models';
import { getPath, isFilled } from '../utils/text';
import { validatePesel } from '../utils/fakeIdentity';
import { computeDeadline } from './deadlineCalc';

export type LintStatus = 'ok' | 'error' | 'warning';

export interface LintItem {
  status: LintStatus;
  /** Klucz tłumaczenia UI (lint.*) albo tekst z reguły szablonu. */
  labelKey?: string;
  label?: LText;
  /** Klucze pól, których dotyczy problem (do podświetlenia formularza). */
  fields: string[];
  /** Parametry do interpolacji komunikatu. */
  params?: Record<string, string | number>;
}

export interface LintReport {
  items: LintItem[];
  errors: number;
  warnings: number;
}

const FORMAL_KEYS = ['placeDate', 'sender', 'addressee', 'body'] as const;

export function lintDocument(
  template: DocumentTemplate,
  data: Record<string, unknown>,
  resolveConst: (key: string) => number | undefined,
): LintReport {
  const items: LintItem[] = [];
  const missing = (keys: string[]) => keys.filter((k) => !isFilled(getPath(data, k)));

  // 1. Elementy obowiązkowe
  for (const key of FORMAL_KEYS) {
    const fields = template.formalElements[key];
    const empty = missing(fields);
    items.push({ status: empty.length ? 'error' : 'ok', labelKey: `lint.${key}`, fields: empty });
  }

  // Tytuł pisma i miejsce na podpis są częścią szablonu
  items.push({ status: lt(template.title) ? 'ok' : 'error', labelKey: 'lint.docTitle', fields: [] });
  const hasSignature = template.body.pl.some((l) => l.includes('doc-signature'));
  items.push({ status: hasSignature ? 'ok' : 'error', labelKey: 'lint.signature', fields: [] });

  // 2. Pozostałe pola wymagane
  const formalFields = new Set(Object.values(template.formalElements).flat());
  const visible = template.fields.filter((f) => isFieldVisible(f.showIf, data));
  const otherRequired = visible.filter((f) => f.required && !formalFields.has(f.key)).map((f) => f.key);
  const otherMissing = missing(otherRequired);
  if (otherRequired.length) {
    items.push({
      status: otherMissing.length ? 'warning' : 'ok',
      labelKey: 'lint.requiredFields',
      fields: otherMissing,
      params: { n: otherMissing.length },
    });
  }

  // 3. PESEL — suma kontrolna
  for (const field of visible.filter((f) => f.type === 'pesel')) {
    const value = getPath(data, field.key);
    if (!isFilled(value)) {
      if (field.required) items.push({ status: 'error', labelKey: 'lint.peselMissing', fields: [field.key] });
      continue;
    }
    const res = validatePesel(String(value));
    items.push({
      status: res.valid ? 'ok' : 'error',
      labelKey: res.valid ? 'lint.peselOk' : `lint.pesel.${res.reason}`,
      fields: res.valid ? [] : [field.key],
    });
  }

  // 4. Reguły merytoryczne zdefiniowane w szablonie (data-driven)
  for (const rule of template.rules ?? []) {
    if (rule.type === 'maxConst') {
      const raw = getPath(data, rule.field);
      if (!isFilled(raw)) continue;
      const value = Number(String(raw).replace(',', '.').replace(/\s/g, ''));
      const limit = resolveConst(rule.constKey);
      if (limit === undefined || !Number.isFinite(value)) continue;
      items.push({
        status: value <= limit ? 'ok' : 'error',
        label: rule.message,
        fields: value <= limit ? [] : [rule.field],
        params: { limit },
      });
    } else if (rule.type === 'minConst') {
      const raw = getPath(data, rule.field);
      if (!isFilled(raw)) continue;
      const value = Number(String(raw).replace(',', '.').replace(/\s/g, ''));
      const limit = resolveConst(rule.constKey);
      if (limit === undefined || !Number.isFinite(value)) continue;
      items.push({
        status: value > limit ? 'ok' : 'warning',
        label: rule.message,
        fields: value > limit ? [] : [rule.field],
        params: { limit },
      });
    } else if (rule.type === 'deadline') {
      const from = getPath(data, rule.fromField);
      const to = getPath(data, rule.toField);
      const amount = resolveConst(rule.constKey);
      if (!isFilled(from) || !isFilled(to) || amount === undefined) continue;
      const res = computeDeadline(String(from), amount, rule.unit ?? 'days');
      const ok = String(to) <= res.finalDate;
      items.push({
        status: ok ? 'ok' : 'warning',
        label: rule.message,
        fields: ok ? [] : [rule.fromField, rule.toField],
        params: { date: res.finalDate, n: amount },
      });
    }
  }

  return {
    items,
    errors: items.filter((i) => i.status === 'error').length,
    warnings: items.filter((i) => i.status === 'warning').length,
  };
}

/** Obsługa warunku showIf: "flag" albo "!flag". */
export function isFieldVisible(showIf: string | undefined, data: Record<string, unknown>): boolean {
  if (!showIf) return true;
  const negate = showIf.startsWith('!');
  const value = Boolean(getPath(data, negate ? showIf.slice(1) : showIf));
  return negate ? !value : value;
}

function lt(text: LText): string {
  return typeof text === 'string' ? text : text.pl;
}
