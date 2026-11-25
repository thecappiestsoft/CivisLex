/**
 * Interpreter grafu stanów procedury i walidator odpowiedzi ucznia.
 * Decision-tree interpreter and answer validator.
 *
 * Silnik nie zna żadnej konkretnej procedury — wykonuje dowolny graf
 * opisany w pliku JSON (trees/*.json).
 */

import type { DeadlineCheckNode, ProcedureTree, QuestionNode, TreeNode } from '../types/models';

export interface AnswerResult {
  correct: boolean;
  /** Węzeł, do którego przejdziemy po kliknięciu „Dalej”. */
  nextNodeId: string;
  /** Dla DEADLINE_CHECK — oczekiwana wartość. */
  expected?: number;
}

export interface RunnerSnapshot {
  currentNodeId: string;
  mistakes: number;
  correctAnswers: number;
  history: string[];
  pending: AnswerResult | null;
  /** Id wybranej opcji (dla QUESTION) lub wpisana wartość (DEADLINE_CHECK). */
  lastAnswer: string | null;
}

export class DecisionTreeRunner {
  private state: RunnerSnapshot;

  constructor(
    public readonly tree: ProcedureTree,
    private readonly resolveConst: (key: string) => number | undefined,
    snapshot?: RunnerSnapshot,
  ) {
    this.state = snapshot ?? DecisionTreeRunner.initialState(tree);
  }

  static initialState(tree: ProcedureTree): RunnerSnapshot {
    return {
      currentNodeId: tree.startNodeId,
      mistakes: 0,
      correctAnswers: 0,
      history: [],
      pending: null,
      lastAnswer: null,
    };
  }

  get snapshot(): RunnerSnapshot {
    return { ...this.state, history: [...this.state.history] };
  }

  get currentNode(): TreeNode {
    const node = this.tree.nodes[this.state.currentNodeId];
    if (!node) throw new Error(`Brak węzła ${this.state.currentNodeId} w ${this.tree.procedureId}`);
    return node;
  }

  get currentNodeId(): string {
    return this.state.currentNodeId;
  }

  get isAtDocumentBuilder(): boolean {
    return this.currentNode.type === 'DOCUMENT_BUILDER';
  }

  /** Liczba kroków quizu (węzłów QUESTION/DEADLINE_CHECK) w procedurze. */
  get totalSteps(): number {
    return Object.values(this.tree.nodes).filter((n) => n.type !== 'DOCUMENT_BUILDER').length;
  }

  get completedSteps(): number {
    return this.state.history.length;
  }

  /** Wynik punktowy 0–100: poprawne odpowiedzi pomniejszone o błędy. */
  get score(): number {
    const total = this.totalSteps;
    if (total === 0) return 100;
    const raw = (this.state.correctAnswers - this.state.mistakes * 0.5) / total;
    return Math.max(0, Math.round(raw * 100));
  }

  /** Odpowiedź na pytanie zamknięte. */
  answerOption(optionId: string): AnswerResult {
    const node = this.currentNode as QuestionNode;
    if (node.type !== 'QUESTION') throw new Error('Bieżący węzeł nie jest pytaniem');
    const option = node.options.find((o) => o.id === optionId);
    if (!option) throw new Error(`Nieznana opcja ${optionId}`);
    return this.record(option.isCorrect, option.nextNodeId, optionId);
  }

  /** Odpowiedź liczbowa na pytanie o termin/wartość ustawową. */
  answerDeadline(value: number): AnswerResult {
    const node = this.currentNode as DeadlineCheckNode;
    if (node.type !== 'DEADLINE_CHECK') throw new Error('Bieżący węzeł nie jest sprawdzeniem terminu');
    const expected = this.resolveConst(node.expectedConstantKey);
    if (expected === undefined) throw new Error(`Brak stałej ${node.expectedConstantKey}`);
    const correct = Number.isFinite(value) && Math.abs(value - expected) <= node.toleranceDays;
    // Przy błędnej odpowiedzi zostajemy na tym samym węźle.
    const result = this.record(correct, correct ? node.nextNodeId : this.state.currentNodeId, String(value));
    result.expected = expected;
    return result;
  }

  private record(correct: boolean, nextNodeId: string, answer: string): AnswerResult {
    if (correct) this.state.correctAnswers += 1;
    else this.state.mistakes += 1;
    const result: AnswerResult = { correct, nextNodeId };
    this.state.pending = result;
    this.state.lastAnswer = answer;
    return result;
  }

  /** Przejście do następnego węzła po wyświetleniu informacji zwrotnej. */
  advance(): void {
    const pending = this.state.pending;
    if (!pending) return;
    if (pending.correct && pending.nextNodeId !== this.state.currentNodeId) {
      this.state.history.push(this.state.currentNodeId);
    }
    this.state.currentNodeId = pending.nextNodeId;
    this.state.pending = null;
    this.state.lastAnswer = null;
  }

  /** Ponowna próba bez przechodzenia dalej (po błędnej odpowiedzi). */
  retry(): void {
    this.state.pending = null;
    this.state.lastAnswer = null;
  }

  /** Pominięcie quizu — bezpośrednio do kreatora pisma (np. dla nauczyciela). */
  skipToBuilder(): void {
    const entry = Object.entries(this.tree.nodes).find(([, n]) => n.type === 'DOCUMENT_BUILDER');
    if (entry) {
      this.state.currentNodeId = entry[0];
      this.state.pending = null;
    }
  }

  reset(): void {
    this.state = DecisionTreeRunner.initialState(this.tree);
  }
}

/* ------------------------------------------------------------------ */
/* Walidator struktury drzewa (dla autorów bazy wiedzy)                */
/* ------------------------------------------------------------------ */

/**
 * Sprawdza spójność grafu: istnienie węzłów, poprawne odpowiedzi,
 * acykliczność ścieżki poprawnych odpowiedzi (DAG) i obecność kreatora pisma.
 * Pętle zwrotne przy błędnych odpowiedziach (powrót do pytania) są dozwolone.
 */
export function validateTree(tree: ProcedureTree, knownTemplates: string[] = []): string[] {
  const errors: string[] = [];
  const ids = new Set(Object.keys(tree.nodes));
  if (!ids.has(tree.startNodeId)) errors.push(`startNodeId "${tree.startNodeId}" nie istnieje`);

  const correctEdges = new Map<string, string[]>();
  let hasBuilder = false;

  for (const [id, node] of Object.entries(tree.nodes)) {
    const edges: string[] = [];
    if (node.type === 'QUESTION') {
      if (!node.options.some((o) => o.isCorrect)) errors.push(`${id}: brak poprawnej odpowiedzi`);
      node.options.forEach((o) => {
        if (!ids.has(o.nextNodeId)) errors.push(`${id}/${o.id}: nextNodeId "${o.nextNodeId}" nie istnieje`);
        if (o.isCorrect && o.nextNodeId !== id) edges.push(o.nextNodeId);
      });
    } else if (node.type === 'DEADLINE_CHECK') {
      if (!ids.has(node.nextNodeId)) errors.push(`${id}: nextNodeId "${node.nextNodeId}" nie istnieje`);
      edges.push(node.nextNodeId);
    } else {
      hasBuilder = true;
      if (knownTemplates.length && !knownTemplates.includes(node.templateId)) {
        errors.push(`${id}: nieznany szablon "${node.templateId}"`);
      }
    }
    correctEdges.set(id, edges);
  }
  if (!hasBuilder) errors.push('Brak węzła DOCUMENT_BUILDER');

  // Wykrywanie cykli (DFS z kolorowaniem).
  const color = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): void => {
    color.set(id, 1);
    for (const next of correctEdges.get(id) ?? []) {
      const c = color.get(next) ?? 0;
      if (c === 1) errors.push(`Cykl w ścieżce poprawnych odpowiedzi: ${id} → ${next}`);
      else if (c === 0) visit(next);
    }
    color.set(id, 2);
  };
  if (ids.has(tree.startNodeId)) visit(tree.startNodeId);

  return errors;
}
