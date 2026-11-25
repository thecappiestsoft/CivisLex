/**
 * Mini-helper do tworzenia elementów DOM bez frameworka.
 * Tiny hyperscript helper.
 *
 *   h('button', { class: 'btn', onclick: () => … }, 'Tekst')
 */

type Child = Node | string | number | null | undefined | false | Child[];

type Attrs = Record<string, unknown> & {
  class?: string | (string | false | null | undefined)[];
  dataset?: Record<string, string>;
  style?: string;
  html?: string;
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') {
        el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value);
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value as Record<string, string>);
      } else if (key === 'html') {
        el.innerHTML = String(value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2), value as EventListener);
      } else if (key === 'value' || (key in el && typeof value !== 'string')) {
        // właściwości DOM: checked, value, disabled…
        (el as unknown as Record<string, unknown>)[key] = value;
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    }
  }
  append(el, children);
  return el;
}

function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Tworzy element z surowego SVG (ikony). */
export function svg(markup: string): SVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as SVGElement;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
