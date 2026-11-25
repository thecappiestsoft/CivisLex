/**
 * Router oparty na hashu (#/…) — działa również z pliku (file://) bez serwera.
 */

export type ViewCleanup = (() => void) | void;
export type View = (root: HTMLElement, params: Record<string, string>) => ViewCleanup;

interface Route {
  pattern: RegExp;
  keys: string[];
  view: View;
}

export class Router {
  private routes: Route[] = [];

  constructor(private readonly fallback: View) {}

  /** Rejestruje trasę, np. "/procedure/:id". */
  add(path: string, view: View): this {
    const keys: string[] = [];
    const pattern = new RegExp(
      '^' +
        path.replace(/:(\w+)/g, (_, key) => {
          keys.push(key);
          return '([^/]+)';
        }) +
        '/?$',
    );
    this.routes.push({ pattern, keys, view });
    return this;
  }

  resolve(hash: string): { view: View; params: Record<string, string> } {
    const path = hash.replace(/^#/, '') || '/';
    for (const route of this.routes) {
      const m = path.match(route.pattern);
      if (m) {
        const params: Record<string, string> = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        return { view: route.view, params };
      }
    }
    return { view: this.fallback, params: {} };
  }
}
