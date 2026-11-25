/**
 * Kompilator szablonów pism z obsługą bloków warunkowych.
 * Document template compiler.
 *
 * Obsługiwana składnia:
 *   {{applicant.fullName}}          – zmienna (w trybie roboczym brak = żółte [UZUPEŁNIJ: …])
 *   {#if isElectronicDelivery}…{#else}…{/if}
 *   {#if !flag}…{/if}               – negacja
 *   {#each attachments}{{@number}}. {{this}}{/each}
 *   {@lawRef:UDIP_ART_13}           – treść przepisu z articles_pl.json
 *   {@lawUnit:UDIP_ART_13}          – samo oznaczenie, np. "art. 13 ust. 1"
 *   {@const:KPA_APPEAL_DAYS}        – wartość stałej z law_constants.json
 *
 * Szablon może zawierać zaufany HTML (pisany przez autorów bazy wiedzy);
 * wartości wprowadzane przez użytkownika są zawsze escapowane.
 */

import type { FieldType, Lang } from '../types/models';
import { escapeHtml, formatMoney, getPath, isFilled } from '../utils/text';
import { formatDate } from './deadlineCalc';

/* ------------------------------------------------------------------ */
/* AST                                                                 */
/* ------------------------------------------------------------------ */

type Node =
  | { kind: 'text'; value: string }
  | { kind: 'var'; path: string }
  | { kind: 'if'; path: string; negate: boolean; then: Node[]; else: Node[] }
  | { kind: 'each'; path: string; body: Node[] }
  | { kind: 'lawRef'; id: string }
  | { kind: 'lawUnit'; id: string }
  | { kind: 'const'; key: string };

const TOKEN_RE =
  /\{\{\s*([\w.@]+)\s*\}\}|\{#if\s+(!?)([\w.]+)\s*\}|\{#else\}|\{\/if\}|\{#each\s+([\w.]+)\s*\}|\{\/each\}|\{@lawRef:(\w+)\}|\{@lawUnit:(\w+)\}|\{@const:(\w+)\}/g;

export class TemplateSyntaxError extends Error {}

/** Parsuje źródło szablonu do drzewa AST. */
export function parseTemplate(source: string): Node[] {
  const root: Node[] = [];
  // Stos otwartych bloków: lista, do której aktualnie dopisujemy węzły.
  const stack: { node: Node | null; target: Node[] }[] = [{ node: null, target: root }];
  const top = () => stack[stack.length - 1];

  let last = 0;
  for (const m of source.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) top().target.push({ kind: 'text', value: source.slice(last, idx) });
    last = idx + m[0].length;
    const tok = m[0];

    if (m[1]) {
      top().target.push({ kind: 'var', path: m[1] });
    } else if (m[3]) {
      const node: Node = { kind: 'if', path: m[3], negate: m[2] === '!', then: [], else: [] };
      top().target.push(node);
      stack.push({ node, target: node.then });
    } else if (tok === '{#else}') {
      const cur = top().node;
      if (!cur || cur.kind !== 'if') throw new TemplateSyntaxError('{#else} poza blokiem {#if}');
      top().target = cur.else;
    } else if (tok === '{/if}') {
      const cur = stack.pop();
      if (!cur?.node || cur.node.kind !== 'if') throw new TemplateSyntaxError('Niedomknięty {/if}');
    } else if (m[4]) {
      const node: Node = { kind: 'each', path: m[4], body: [] };
      top().target.push(node);
      stack.push({ node, target: node.body });
    } else if (tok === '{/each}') {
      const cur = stack.pop();
      if (!cur?.node || cur.node.kind !== 'each') throw new TemplateSyntaxError('Niedomknięty {/each}');
    } else if (m[5]) {
      top().target.push({ kind: 'lawRef', id: m[5] });
    } else if (m[6]) {
      top().target.push({ kind: 'lawUnit', id: m[6] });
    } else if (m[7]) {
      top().target.push({ kind: 'const', key: m[7] });
    }
  }
  if (last < source.length) root.push({ kind: 'text', value: source.slice(last) });
  if (stack.length !== 1) throw new TemplateSyntaxError('Niedomknięty blok w szablonie');
  return root;
}

/* ------------------------------------------------------------------ */
/* Renderowanie                                                        */
/* ------------------------------------------------------------------ */

export interface RenderOptions {
  lang: Lang;
  /** draft – brakujące pola podświetlone; final – brakujące jako wykropkowanie. */
  mode: 'draft' | 'final';
  data: Record<string, unknown>;
  /** Etykiety pól (do komunikatu [UZUPEŁNIJ: …]). */
  fieldLabels: Record<string, string>;
  fieldTypes: Record<string, FieldType>;
  /** Zlokalizowane sformułowania opcji select: { ścieżka: { wartość: tekst } }. */
  selectLabels: Record<string, Record<string, string>>;
  missingPrefix: string;
  resolveLaw: (id: string) => { unit: string; text: string } | undefined;
  resolveConst: (key: string) => number | undefined;
}

interface Scope {
  data: Record<string, unknown>;
  item?: unknown;
  index?: number;
}

function lookup(path: string, scope: Scope): unknown {
  if (path === 'this') return scope.item;
  if (path === '@number') return scope.index !== undefined ? scope.index + 1 : undefined;
  if (path === '@index') return scope.index;
  if (path.startsWith('this.')) return getPath(scope.item, path.slice(5));
  return getPath(scope.data, path);
}

function formatValue(path: string, value: unknown, opts: RenderOptions): string {
  const type = opts.fieldTypes[path];
  if (type === 'date' && typeof value === 'string') return escapeHtml(formatDate(value, opts.lang));
  if (type === 'money') return escapeHtml(formatMoney(value, opts.lang));
  if (type === 'select') {
    const label = opts.selectLabels[path]?.[String(value)];
    if (label) return escapeHtml(label);
  }
  // textarea: zachowujemy podziały linii
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function renderNodes(nodes: Node[], scope: Scope, opts: RenderOptions): string {
  let out = '';
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        out += node.value;
        break;
      case 'var': {
        const value = lookup(node.path, scope);
        if (isFilled(value) || typeof value === 'number') {
          out += formatValue(node.path, value, opts);
        } else if (opts.mode === 'draft') {
          const label = opts.fieldLabels[node.path] ?? node.path;
          out += `<mark class="doc-missing" data-field="${escapeHtml(node.path)}">[${escapeHtml(
            opts.missingPrefix,
          )}: ${escapeHtml(label)}]</mark>`;
        } else {
          out += '<span class="doc-blank">..............................</span>';
        }
        break;
      }
      case 'if': {
        const value = lookup(node.path, scope);
        const truthy = Array.isArray(value) ? value.some(isFilled) : Boolean(value) && isFilled(value);
        const cond = node.negate ? !truthy : truthy;
        out += renderNodes(cond ? node.then : node.else, scope, opts);
        break;
      }
      case 'each': {
        const list = lookup(node.path, scope);
        if (Array.isArray(list)) {
          list.filter(isFilled).forEach((item, index) => {
            out += renderNodes(node.body, { ...scope, item, index }, opts);
          });
        }
        break;
      }
      case 'lawRef': {
        const law = opts.resolveLaw(node.id);
        out += law
          ? `<q class="doc-lawref" data-law="${escapeHtml(node.id)}">${escapeHtml(law.text)}</q>`
          : `<mark class="doc-missing">[${escapeHtml(node.id)}?]</mark>`;
        break;
      }
      case 'lawUnit': {
        const law = opts.resolveLaw(node.id);
        out += escapeHtml(law ? law.unit : node.id);
        break;
      }
      case 'const': {
        const value = opts.resolveConst(node.key);
        out += value !== undefined ? escapeHtml(value) : `<mark class="doc-missing">[${escapeHtml(node.key)}?]</mark>`;
        break;
      }
    }
  }
  return out;
}

const astCache = new Map<string, Node[]>();

/** Kompiluje i renderuje szablon do HTML. */
export function renderTemplate(source: string, opts: RenderOptions): string {
  let ast = astCache.get(source);
  if (!ast) {
    ast = parseTemplate(source);
    astCache.set(source, ast);
  }
  return renderNodes(ast, { data: opts.data }, opts);
}

/**
 * Prosta interpolacja tekstów w drzewach decyzyjnych (np. promptach):
 * obsługuje tylko {@const:KEY}.
 */
export function interpolateConstants(text: string, resolveConst: (key: string) => number | undefined): string {
  return text.replace(/\{@const:(\w+)\}/g, (m, key) => {
    const v = resolveConst(key);
    return v === undefined ? m : String(v);
  });
}
