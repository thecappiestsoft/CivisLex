/**
 * Przełącznik motywu jasny | ciemny — wyłącznie ikony (bez napisów),
 * w formie przełącznika kołyskowego. Opis dla czytników ekranu: aria-label.
 */

import { h } from '../../utils/dom';
import { settings, type Theme } from '../../state/settings';
import { t } from '../../i18n';
import { icon } from './icons';

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle(): HTMLElement {
  const { theme } = settings.get();
  const make = (value: Theme, iconName: 'sun' | 'moon', label: string) =>
    h(
      'button',
      {
        type: 'button',
        class: ['rocker-btn', theme === value && 'is-active'],
        'aria-pressed': String(theme === value),
        'aria-label': label,
        title: label,
        onclick: () => settings.set({ theme: value }),
      },
      icon(iconName, 18),
    );

  return h(
    'div',
    { class: 'theme-toggle', role: 'group' },
    make('light', 'sun', t('theme.toLight')),
    make('dark', 'moon', t('theme.toDark')),
  );
}
