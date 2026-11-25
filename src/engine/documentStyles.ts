/**
 * Style sformalizowanego pisma urzędowego (A4, marginesy 25 mm, krój szeryfowy).
 * Jedno źródło prawdy — używane zarówno w podglądzie na żywo, jak i w eksporcie PDF.
 */

export const DOCUMENT_CSS = `
.civis-doc {
  font-family: "Liberation Serif", "Times New Roman", Times, "Noto Serif", serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #111;
  background: #fff;
  text-align: justify;
  hyphens: auto;
}
.civis-doc p { margin: 0 0 0.8em; }
.civis-doc .doc-place { text-align: right; margin-bottom: 1.6em; }
.civis-doc .doc-sender { margin-bottom: 1.6em; text-align: left; }
.civis-doc .doc-sender div, .civis-doc .doc-addressee div { line-height: 1.35; }
.civis-doc .doc-addressee { margin: 0 0 2em 50%; font-weight: bold; text-align: left; }
.civis-doc .doc-title { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.04em; margin: 1.2em 0 0.3em; }
.civis-doc .doc-subtitle { text-align: center; font-style: italic; margin-bottom: 1.4em; }
.civis-doc .doc-section { font-weight: bold; margin: 1.2em 0 0.5em; text-align: center; }
.civis-doc ol, .civis-doc ul { margin: 0 0 0.8em 1.4em; padding: 0; }
.civis-doc li { margin-bottom: 0.3em; }
.civis-doc .doc-lawref { font-style: italic; quotes: "„" "”"; }
.civis-doc .doc-signature { margin: 3em 0 2em 55%; text-align: center; }
.civis-doc .doc-signature .sig-space { height: 2.6em; }
.civis-doc .doc-signature .sig-line { border-top: 1px dotted #333; padding-top: 0.2em; font-size: 9pt; }
.civis-doc .doc-signature .sig-name { margin-top: 0.2em; }
.civis-doc .doc-attachments { margin-top: 2em; font-size: 10.5pt; }
.civis-doc .doc-attachments h4 { margin: 0 0 0.3em; font-size: 10.5pt; text-decoration: underline; }
.civis-doc .doc-attachments ol { margin-left: 1.4em; }
.civis-doc .doc-note { font-size: 9pt; color: #555; border-top: 1px solid #ccc; margin-top: 2.5em; padding-top: 0.4em; text-align: left; }
.civis-doc .doc-missing { background: #ffe86b; color: #5a4500; padding: 0 2px; border-radius: 2px; font-family: system-ui, sans-serif; font-size: 0.85em; }
.civis-doc .doc-blank { letter-spacing: 0.05em; color: #444; }
`;

export const PRINT_PAGE_CSS = `
@page { size: A4; margin: 25mm; }
html, body { margin: 0; padding: 0; background: #fff; }
.civis-doc { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;
