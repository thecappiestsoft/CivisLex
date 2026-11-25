/**
 * Postęp ucznia: najlepszy wynik quizu i zapisany formularz dla każdej procedury.
 * Student progress per procedure.
 */

import { storage } from './storage';

type Scores = Record<string, number>;

export function getBestScore(procedureId: string): number | undefined {
  return storage.get<Scores>('scores', {})[procedureId];
}

export function saveScore(procedureId: string, score: number): void {
  const scores = storage.get<Scores>('scores', {});
  if (scores[procedureId] === undefined || score > scores[procedureId]) {
    scores[procedureId] = score;
    storage.set('scores', scores);
  }
}

/** Wartości formularza (płaska mapa klucz → wartość). */
export type FormValues = Record<string, string | boolean | string[]>;

export function loadForm(templateId: string): FormValues | null {
  return storage.get<FormValues | null>(`form:${templateId}`, null);
}

export function saveForm(templateId: string, values: FormValues): void {
  storage.set(`form:${templateId}`, values);
}

export function clearForm(templateId: string): void {
  storage.remove(`form:${templateId}`);
}
