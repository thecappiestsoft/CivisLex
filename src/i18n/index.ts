/**
 * Moduł tłumaczeń. Użycie: t('proc.step', { n: 1, total: 3 }).
 * i18n module.
 */

import type { Lang } from '../types/models';
import { interpolate } from '../utils/text';
import { settings } from '../state/settings';
import { pl, type Dictionary } from './pl';
import { en } from './en';

const DICTIONARIES: Record<Lang, Dictionary> = { pl, en };

export const SUPPORTED_LANGS: Lang[] = ['pl', 'en'];

/** Zwraca przetłumaczony tekst dla bieżącego języka. */
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = settings.get().lang;
  const value = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES.pl, key);
  if (typeof value !== 'string') {
    console.warn(`[i18n] Brak klucza: ${key}`);
    return key;
  }
  return interpolate(value, params);
}

/** Liczba mnoga: klucz wskazuje obiekt { one, few, many } (reguły Intl.PluralRules). */
export function tp(key: string, n: number): string {
  const lang = settings.get().lang;
  const forms = lookup(DICTIONARIES[lang], key) as Record<string, string> | undefined;
  if (!forms || typeof forms !== 'object') return key;
  const rule = new Intl.PluralRules(lang === 'pl' ? 'pl-PL' : 'en-GB').select(n);
  const form = forms[rule] ?? forms.many ?? forms.other ?? Object.values(forms)[0];
  return interpolate(form, { n });
}

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    dict,
  );
}

export function currentLang(): Lang {
  return settings.get().lang;
}
