/**
 * Ustawienia użytkownika: język i motyw (zapamiętywane lokalnie).
 * User settings: language and theme.
 */

import type { Lang } from '../types/models';
import { createStore } from './createStore';
import { storage } from './storage';

export type Theme = 'light' | 'dark';

export interface Settings {
  lang: Lang;
  theme: Theme;
}

function detectInitial(): Settings {
  const saved = storage.get<Partial<Settings>>('settings', {});
  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  const browserLang = (typeof navigator !== 'undefined' ? navigator.language : 'pl').toLowerCase();
  return {
    lang: saved.lang ?? (browserLang.startsWith('pl') ? 'pl' : 'en'),
    theme: saved.theme ?? (prefersDark ? 'dark' : 'light'),
  };
}

export const settings = createStore<Settings>(detectInitial(), (s) => storage.set('settings', s));
