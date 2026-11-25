/**
 * Karta pytań — renderuje bieżący węzeł grafu (QUESTION / DEADLINE_CHECK)
 * w stylu formularza urzędowego: kratki, wykropkowania, pieczątka oceny.
 */

import { h } from '../../../utils/dom';
import { caseSignature, lt } from '../../../utils/text';
import type { DecisionTreeRunner } from '../../../engine/decisionTree';
import { interpolateConstants } from '../../../engine/templateParser';
import { getConst } from '../../../state/lawConstants';
import type { DeadlineCheckNode, Lang, LText, QuestionNode } from '../../../types/models';
import { t } from '../../../i18n';
import { icon } from '../../components/icons';

interface QuizProps {
  runner: DecisionTreeRunner;
  lang: Lang;
  /** Wywoływane po każdej zmianie stanu biegu (odpowiedź, dalej, reset). */
  onUpdate: () => void;
}

const txt = (text: LText | undefined, lang: Lang) => interpolateConstants(lt(text, lang), getConst);

/** Postęp jako rząd kratek: ✓ zaliczone, ramka = bieżące, przerywana = przed nami. */
function ProgressBoxes(done: number, total: number): HTMLElement {
  return h(
    'span',
    { class: 'boxes', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done) },
    Array.from({ length: total }, (_, i) =>
      h('span', { class: i < done ? 'is-done' : i === done ? 'is-current' : undefined }, i < done ? icon('check', 12) : null),
    ),
  );
}

export function QuizPanel({ runner, lang, onUpdate }: QuizProps): HTMLElement {
  const node = runner.currentNode;
  const snap = runner.snapshot;
  const stepNo = Math.min(runner.completedSteps + 1, runner.totalSteps);
  const tree = runner.tree;

  let body: HTMLElement;
  if (node.type === 'QUESTION') body = QuestionBody(node, runner, lang, onUpdate);
  else if (node.type === 'DEADLINE_CHECK') body = DeadlineBody(node, runner, lang, onUpdate);
  else body = h('div');

  return h(
    'section',
    { class: 'panel quiz-panel clip' },
    h(
      'div',
      { class: 'quiz-meta' },
      h('span', { class: 'quiz-sig' }, `${t('home.sig')}: ${caseSignature(tree.procedureId)}`),
      h(
        'span',
        { class: 'quiz-progress' },
        snap.mistakes > 0 ? h('span', { class: 'quiz-mistakes' }, t('proc.mistakes', { n: snap.mistakes })) : null,
        h('span', { class: 'quiz-step' }, t('proc.step', { n: stepNo, total: runner.totalSteps })),
        ProgressBoxes(runner.completedSteps, runner.totalSteps),
      ),
    ),
    h('p', { class: 'label-caps quiz-kicker' }, `${t('proc.question', { n: stepNo })} · ${t(`category.${tree.category}`)}`),
    body,
    h(
      'div',
      { class: 'quiz-footer' },
      h(
        'button',
        { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { runner.reset(); onUpdate(); } },
        icon('refresh', 16),
        t('proc.restart'),
      ),
      h(
        'button',
        { type: 'button', class: 'btn btn-tag', dataset: { action: 'skip' }, onclick: () => { runner.skipToBuilder(); onUpdate(); } },
        t('proc.skip'),
      ),
    ),
  );
}

/** Pieczątka oceny + wyjaśnienie + przycisk (Dalej / Popraw odpowiedź). */
function Feedback(correct: boolean, text: string, runner: DecisionTreeRunner, onUpdate: () => void): HTMLElement {
  const action = correct
    ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { runner.advance(); onUpdate(); } }, t('proc.next'), icon('arrowRight', 18))
    : h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { runner.retry(); onUpdate(); } }, icon('refresh', 18), t('proc.retry'));

  return h(
    'div',
    { class: ['feedback', correct ? 'is-correct' : 'is-wrong'], role: 'status' },
    h('span', { class: ['stamp', correct ? 'stamp-ok' : 'stamp-bad'] }, t(correct ? 'proc.correct' : 'proc.wrong')),
    h('div', { class: 'feedback-body' }, h('p', null, text), action),
  );
}

function QuestionBody(node: QuestionNode, runner: DecisionTreeRunner, lang: Lang, onUpdate: () => void): HTMLElement {
  const snap = runner.snapshot;
  const answered = snap.pending !== null;
  const chosen = node.options.find((o) => o.id === snap.lastAnswer);

  return h(
    'div',
    { class: 'quiz-body' },
    h('h2', { class: 'quiz-prompt' }, txt(node.prompt, lang)),
    node.hint ? h('p', { class: 'quiz-hint' }, txt(node.hint, lang)) : null,
    h(
      'div',
      { class: 'options', role: 'group' },
      node.options.map((opt, i) => {
        const isChosen = answered && opt.id === snap.lastAnswer;
        return h(
          'button',
          {
            type: 'button',
            class: ['option', isChosen && (opt.isCorrect ? 'is-correct' : 'is-wrong')],
            disabled: answered,
            'aria-pressed': String(isChosen),
            dataset: { option: opt.id },
            onclick: () => {
              runner.answerOption(opt.id);
              onUpdate();
            },
          },
          h('span', { class: 'option-box', 'aria-hidden': 'true' }, isChosen ? icon(opt.isCorrect ? 'check' : 'x', 16) : null),
          h('span', { class: 'option-label' }, txt(opt.label, lang)),
          h('span', { class: 'option-lead', 'aria-hidden': 'true' }),
          h('span', { class: 'option-key', 'aria-hidden': 'true' }, String.fromCharCode(65 + i)),
        );
      }),
    ),
    answered && chosen ? Feedback(chosen.isCorrect, txt(chosen.feedback, lang), runner, onUpdate) : null,
  );
}

function DeadlineBody(node: DeadlineCheckNode, runner: DecisionTreeRunner, lang: Lang, onUpdate: () => void): HTMLElement {
  const snap = runner.snapshot;
  const answered = snap.pending !== null;
  const unit = node.unit ? lt(node.unit, lang) : t('proc.days');

  const input = h('input', {
    type: 'number',
    min: 0,
    inputmode: 'numeric',
    class: 'num-input',
    'aria-label': t('proc.numberLabel'),
    placeholder: '…',
    value: snap.lastAnswer ?? '',
    disabled: answered,
  });

  const submit = (e: Event) => {
    e.preventDefault();
    if (input.value === '') {
      input.focus();
      return;
    }
    runner.answerDeadline(Number(input.value));
    onUpdate();
  };

  let feedback: HTMLElement | null = null;
  if (answered && snap.pending) {
    const ok = snap.pending.correct;
    const text = ok ? txt(node.feedbackSuccess, lang) : txt(node.feedbackFailure, lang) || t('proc.wrong');
    feedback = Feedback(ok, text, runner, onUpdate);
  }

  return h(
    'div',
    { class: 'quiz-body' },
    h('h2', { class: 'quiz-prompt' }, txt(node.prompt, lang)),
    h(
      'form',
      { class: 'deadline-form', onsubmit: submit },
      h('label', { class: 'num-field' }, input, h('span', { class: 'num-unit' }, unit)),
      h('button', { type: 'submit', class: 'btn btn-primary', disabled: answered }, t('proc.check')),
    ),
    feedback,
  );
}
