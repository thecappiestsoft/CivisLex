/**
 * Powłoka aplikacji: nagłówek, widok, stopka + reakcja na zmiany ustawień.
 * App shell.
 */

import { clear, h } from '../utils/dom';
import { settings } from '../state/settings';
import { lawConstants } from '../state/lawConstants';
import { t } from '../i18n';
import { Header } from './components/header';
import { Footer } from './components/footer';
import { applyTheme } from './components/themeToggle';
import { Router, type ViewCleanup } from './router';
import { HomeView } from './views/homeView';
import { ProcedureView } from './views/procedure/procedureView';
import { DeadlineView } from './views/deadlineView';
import { ArticlesView } from './views/articlesView';
import { TeacherView } from './views/teacherView';

export function startApp(root: HTMLElement): void {
  const router = new Router(HomeView)
    .add('/', HomeView)
    .add('/procedure/:id', ProcedureView)
    .add('/deadlines', DeadlineView)
    .add('/articles', ArticlesView)
    .add('/teacher', TeacherView);

  const headerSlot = h('div', { class: 'header-slot' });
  const main = h('main', { class: 'app-main', id: 'main', tabindex: '-1' });
  const footerSlot = h('div', { class: 'footer-slot' });
  root.append(
    h('a', { class: 'skip-link', href: '#main', onclick: (e: Event) => { e.preventDefault(); main.focus(); } }, '↓'),
    headerSlot,
    main,
    footerSlot,
  );

  let cleanup: ViewCleanup;

  const renderChrome = () => {
    clear(headerSlot);
    headerSlot.appendChild(Header(location.hash || '#/'));
    clear(footerSlot);
    footerSlot.appendChild(Footer());
  };

  const renderView = (scrollTop = false) => {
    if (typeof cleanup === 'function') cleanup();
    clear(main);
    const { view, params } = router.resolve(location.hash);
    cleanup = view(main, params);
    if (scrollTop) window.scrollTo({ top: 0 });
  };

  const renderAll = (scrollTop = false) => {
    const { lang } = settings.get();
    document.documentElement.lang = lang;
    document.title = `${t('app.name')} — ${t('app.tagline')}`;
    renderChrome();
    renderView(scrollTop);
  };

  applyTheme(settings.get().theme);

  settings.subscribe((state, prev) => {
    if (state.theme !== prev.theme) {
      applyTheme(state.theme);
      renderChrome();
    }
    if (state.lang !== prev.lang) renderAll();
  });

  // Hot-reload: zmiana parametrów prawnych odświeża bieżący widok.
  lawConstants.subscribe(() => renderView());

  window.addEventListener('hashchange', () => renderAll(true));
  renderAll();
}
