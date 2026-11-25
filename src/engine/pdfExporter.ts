/**
 * Generator sformalizowanych pism urzędowych (A4) — eksport PDF i TXT.
 * PDF/TXT exporter.
 *
 * Eksport PDF korzysta z natywnego silnika druku (okno „Zapisz jako PDF”),
 * co działa w pełni offline i osadza polskie znaki. Strona: A4, marginesy 25 mm.
 * W wersji Electron można zastąpić to wywołaniem webContents.printToPDF().
 */

import { DOCUMENT_CSS, PRINT_PAGE_CSS } from './documentStyles';
import { escapeHtml } from '../utils/text';

/** Buduje kompletny dokument HTML gotowy do druku. */
export function buildPrintableHtml(bodyHtml: string, title: string, lang: string): string {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${DOCUMENT_CSS}${PRINT_PAGE_CSS}</style>
</head>
<body><article class="civis-doc">${bodyHtml}</article></body>
</html>`;
}

/** Otwiera systemowe okno druku (wybierz „Zapisz jako PDF”). */
export function exportPdf(bodyHtml: string, title: string, lang: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(buildPrintableHtml(bodyHtml, title, lang));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  win.addEventListener('afterprint', cleanup, { once: true });
  // Krótka zwłoka, by przeglądarka zdążyła złożyć układ strony.
  setTimeout(() => {
    win.focus();
    win.print();
    // Zabezpieczenie dla przeglądarek, które nie wysyłają afterprint.
    setTimeout(cleanup, 60_000);
  }, 150);
}

const BLOCK_TAGS = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'LI', 'OL', 'UL', 'SECTION', 'ARTICLE']);

/** Zamienia HTML pisma na czysty tekst z zachowaniem akapitów i numeracji. */
export function htmlToPlainText(html: string): string {
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body;
  let out = '';

  const walk = (node: Node, olCounter: { n: number } | null) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? '').replace(/\s+/g, ' ');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === 'BR') {
      out += '\n';
      return;
    }
    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock && !out.endsWith('\n') && out.length) out += '\n';
    if (tag === 'LI') out += olCounter ? `${++olCounter.n}. ` : '- ';
    if (tag === 'Q') out += '„';
    const counter = tag === 'OL' ? { n: 0 } : tag === 'UL' ? null : olCounter;
    node.childNodes.forEach((child) => walk(child, counter));
    if (tag === 'Q') out += '”';
    if (isBlock && !out.endsWith('\n')) out += '\n';
    if (tag === 'P' || node.classList.contains('doc-title') || node.classList.contains('doc-addressee')) out += '\n';
  };
  walk(root, null);

  return out
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

/** Pobiera plik w przeglądarce (bez serwera). */
export function downloadFile(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportTxt(bodyHtml: string, fileName: string): void {
  // BOM, aby Notatnik w Windows poprawnie rozpoznał UTF-8 i polskie znaki.
  downloadFile('﻿' + htmlToPlainText(bodyHtml), fileName, 'text/plain');
}

/** Bezpieczna nazwa pliku z tytułu pisma. */
export function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[łŁ]/g, 'l')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'pismo'
  );
}
