/**
 * Magazyn stałych prawnych z obsługą nadpisań nauczyciela (hot-reload).
 * Law constants store — teacher overrides are persisted locally and every
 * subscriber (quiz, templates, calculator) re-renders immediately.
 */

import type { LawConstantsFile } from '../types/models';
import { DEFAULT_LAW_CONSTANTS } from '../knowledge-base';
import { createStore } from './createStore';
import { storage } from './storage';

const STORAGE_KEY = 'lawConstants';
const PIN_KEY = 'teacherPin';
const DEFAULT_PIN = '1234';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Scala zapisane wartości z domyślnym plikiem (nowe klucze z aktualizacji programu nie giną). */
function load(): LawConstantsFile {
  const base = clone(DEFAULT_LAW_CONSTANTS);
  const saved = storage.get<LawConstantsFile | null>(STORAGE_KEY, null);
  if (!saved?.constants) return base;
  for (const [key, c] of Object.entries(saved.constants)) {
    if (base.constants[key] && typeof c?.value === 'number') base.constants[key].value = c.value;
  }
  base.lastUpdatedByTeacher = saved.lastUpdatedByTeacher ?? base.lastUpdatedByTeacher;
  return base;
}

export const lawConstants = createStore<{ file: LawConstantsFile }>({ file: load() });

/** Wartość stałej po kluczu (używana przez silnik). */
export function getConst(key: string): number | undefined {
  return lawConstants.get().file.constants[key]?.value;
}

export function isModified(key: string): boolean {
  return DEFAULT_LAW_CONSTANTS.constants[key]?.value !== getConst(key);
}

/** Zapis nowych wartości (z panelu nauczyciela lub importu). */
export function saveConstants(values: Record<string, number>): void {
  const file = clone(lawConstants.get().file);
  for (const [key, value] of Object.entries(values)) {
    if (file.constants[key] && Number.isFinite(value)) file.constants[key].value = value;
  }
  file.lastUpdatedByTeacher = new Date().toISOString().slice(0, 10);
  storage.set(STORAGE_KEY, file);
  lawConstants.set({ file });
}

export function resetConstants(): void {
  storage.remove(STORAGE_KEY);
  lawConstants.set({ file: clone(DEFAULT_LAW_CONSTANTS) });
}

/** Walidacja i import pliku law_constants.json. Zwraca false przy błędnym formacie. */
export function importConstants(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as LawConstantsFile;
    if (!parsed || typeof parsed.constants !== 'object') return false;
    const values: Record<string, number> = {};
    for (const [key, c] of Object.entries(parsed.constants)) {
      if (typeof c?.value === 'number') values[key] = c.value;
    }
    if (!Object.keys(values).length) return false;
    saveConstants(values);
    return true;
  } catch {
    return false;
  }
}

export function exportConstantsJson(): string {
  return JSON.stringify(lawConstants.get().file, null, 2);
}

/* ---------------- PIN nauczyciela ---------------- */

/**
 * Prosty PIN (zgodnie ze specyfikacją). To zabezpieczenie dydaktyczne,
 * a nie kryptograficzne — dane i tak są lokalne na komputerze w klasie.
 */
export function checkPin(pin: string): boolean {
  return pin === storage.get<string>(PIN_KEY, DEFAULT_PIN);
}

export function setPin(pin: string): boolean {
  if (!/^\d{4,8}$/.test(pin)) return false;
  storage.set(PIN_KEY, pin);
  return true;
}
