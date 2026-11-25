/**
 * Narzędzia tekstowe i operacje na ścieżkach obiektów.
 * Text helpers and object-path helpers.
 */

import type { Lang, LText } from '../types/models';

/** Zwraca tekst w wybranym języku (z fallbackiem na polski). */
export function lt(text: LText | undefined, lang: Lang): string {
  if (text === undefined || text === null) return '';
  if (typeof text === 'string') return text;
  return text[lang] ?? text.pl;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Odczyt wartości po ścieżce "a.b.c". */
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Zapis wartości po ścieżce "a.b.c" (tworzy brakujące obiekty). */
export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur: Record<string, unknown> = obj;
  keys.slice(0, -1).forEach((key) => {
    if (!cur[key] || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  });
  cur[keys[keys.length - 1]] = value;
}

/** Czy wartość pola uznajemy za "wypełnioną". */
export function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((v) => isFilled(v));
  return true;
}

/** Proste formatowanie kwot pieniężnych. */
export function formatMoney(value: unknown, lang: Lang): string {
  const n = Number(String(value).replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' zł';
}

/** Interpolacja parametrów w napisach UI: "Masz {n} błędów". */
export function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) => (key in params ? String(params[key]) : m));
}

/** Sygnatura akt z identyfikatora procedury: PROC_UDIP_01 → UDIP/2026/01. */
export function caseSignature(procedureId: string, year = 2026): string {
  const m = procedureId.replace(/^PROC_/, '').match(/^(.*?)_(\d+)$/);
  return m ? `${m[1].replace(/_/g, '-')}/${year}/${m[2]}` : procedureId;
}
