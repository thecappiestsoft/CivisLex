/**
 * Pamięć sesji quizu (w obrębie karty przeglądarki) — dzięki temu zmiana
 * języka lub parametrów prawnych nie resetuje postępu ucznia.
 */

import type { RunnerSnapshot } from '../../../engine/decisionTree';

export interface ProcedureSession {
  snapshot: RunnerSnapshot;
  skipped: boolean;
  scoreSaved: boolean;
}

const sessions = new Map<string, ProcedureSession>();

export function getSession(procedureId: string): ProcedureSession | undefined {
  return sessions.get(procedureId);
}

export function saveSession(procedureId: string, session: ProcedureSession): void {
  sessions.set(procedureId, session);
}

export function clearSession(procedureId: string): void {
  sessions.delete(procedureId);
}
