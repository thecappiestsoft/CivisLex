/**
 * Prosty dostępny modal (zamiast natywnego confirm()).
 */

import { h } from '../../utils/dom';

export interface ModalOptions {
  title: string;
  body: Node | string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
}

export function confirmModal(opts: ModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const close = (result: boolean) => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
      resolve(result);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };

    const confirmBtn = h(
      'button',
      { type: 'button', class: ['btn', opts.danger ? 'btn-danger' : 'btn-primary'], onclick: () => close(true) },
      opts.confirmLabel,
    );
    const backdrop = h(
      'div',
      { class: 'modal-backdrop', onclick: (e: Event) => e.target === backdrop && close(false) },
      h(
        'div',
        { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
        h('h2', { id: 'modal-title', class: 'modal-title' }, opts.title),
        h('div', { class: 'modal-body' }, opts.body),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => close(false) }, opts.cancelLabel),
          confirmBtn,
        ),
      ),
    );
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey);
    confirmBtn.focus();
  });
}
