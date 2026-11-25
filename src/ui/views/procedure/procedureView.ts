/**
 * Widok procedury: quiz (drzewo decyzyjne) → kreator pisma.
 * Procedure view orchestrator.
 */

import { h } from '../../../utils/dom';
import { lt } from '../../../utils/text';
import { DecisionTreeRunner } from '../../../engine/decisionTree';
import { getProcedure, getTemplateForProcedure } from '../../../knowledge-base';
import { getConst } from '../../../state/lawConstants';
import { saveScore } from '../../../state/progress';
import { currentLang, t } from '../../../i18n';
import { icon } from '../../components/icons';
import type { View } from '../../router';
import { clearSession, getSession, saveSession } from './session';
import { QuizPanel } from './quizPanel';
import { LegalBasisPanel } from './legalBasisPanel';
import { DocumentBuilder } from './documentBuilder';

export const ProcedureView: View = (root, params) => {
  const lang = currentLang();
  const tree = getProcedure(params.id);
  if (!tree) {
    root.append(h('div', { class: 'empty' }, h('p', null, '404'), h('a', { class: 'btn btn-primary', href: '#/' }, t('proc.back'))));
    return;
  }
  const template = getTemplateForProcedure(tree);
  const session = getSession(tree.procedureId);
  const runner = new DecisionTreeRunner(tree, getConst, session?.snapshot);
  let skipped = session?.skipped ?? false;
  let scoreSaved = session?.scoreSaved ?? false;

  const body = h('div', { class: 'proc-body' });

  const persist = () =>
    saveSession(tree.procedureId, { snapshot: runner.snapshot, skipped, scoreSaved });

  const renderBody = (focusFeedback = false) => {
    if (runner.isAtDocumentBuilder && template) {
      // Quiz dobiegł końca (albo został pominięty)
      if (!skipped && runner.completedSteps < runner.totalSteps) skipped = true;
      if (!skipped && !scoreSaved) {
        saveScore(tree.procedureId, runner.score);
        scoreSaved = true;
      }
      persist();
      const summary = h(
        'div',
        { class: ['quiz-summary', skipped && 'is-skipped'] },
        h('span', { class: ['stamp', skipped ? 'stamp-bad' : 'stamp-ok'] }, t(skipped ? 'proc.stampSkipped' : 'proc.stampDone')),
        skipped
          ? h('span', null, t('proc.quizSkipped'))
          : h('span', null, t('proc.score', { score: runner.score }), ' · ', t('proc.mistakes', { n: runner.snapshot.mistakes })),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => {
              runner.reset();
              skipped = false;
              scoreSaved = false;
              clearSession(tree.procedureId);
              renderBody();
            },
          },
          icon('refresh', 16),
          t('proc.restart'),
        ),
      );
      body.replaceChildren(DocumentBuilder({ template, lang, summary }));
    } else {
      persist();
      body.replaceChildren(
        h(
          'div',
          { class: 'split' },
          QuizPanel({ runner, lang, onUpdate: () => renderBody(true) }),
          LegalBasisPanel(tree.legalBasisRefs, lang),
        ),
      );
      if (focusFeedback) {
        (body.querySelector('.feedback .btn') as HTMLElement | null)?.focus() ??
          (body.querySelector('.option:not([disabled]), .num-input') as HTMLElement | null)?.focus();
      }
    }
  };

  root.append(
    h(
      'div',
      { class: 'proc-head' },
      h('a', { class: 'back-link', href: '#/' }, icon('arrowLeft', 18), t('proc.back')),
      h('span', { class: ['cat-tag', `cat-${tree.category}`] }, t(`category.${tree.category}`)),
      h('h1', { class: 'proc-title' }, lt(tree.title, lang)),
    ),
    body,
  );
  renderBody();
};
