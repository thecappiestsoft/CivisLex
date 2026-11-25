/**
 * Krótkie powiadomienia (toast) w rogu ekranu.
 */

import { h } from '../../utils/dom';

let region: HTMLElement | null = null;

function ensureRegion(): HTMLElement {
  if (!region || !document.body.contains(region)) {
    region = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(region);
  }
  return region;
}

export function toast(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  const el = h('div', { class: ['toast', `toast-${kind}`] }, message);
  ensureRegion().appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}
