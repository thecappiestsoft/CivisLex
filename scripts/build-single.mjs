/**
 * Składa zbudowaną aplikację (index.html + assets/) w JEDEN samodzielny plik HTML:
 * CSS, JavaScript i ikona (favicon) są osadzone w środku.
 *
 *   npm run build:single   →   build/civislex.html
 *
 * Wymaga wcześniejszego `npm run build` (skrypt npm robi to automatycznie).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('assets/app.css', 'utf8');
const js = readFileSync('assets/app.js', 'utf8');
const favicon = readFileSync('assets/favicon.svg', 'utf8');

// Zabezpieczenie: sekwencje zamykające tag nie mogą wystąpić wewnątrz osadzonego kodu.
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const safeCss = css.replace(/<\/style/gi, '<\\/style');
const faviconUri = 'data:image/svg+xml,' + encodeURIComponent(favicon);

// Funkcje zastępujące (a nie napisy), aby znaki „$” w kodzie nie były interpretowane przez replace().
const out = html
  .replace(/<link rel="icon"[^>]*>/, () => `<link rel="icon" type="image/svg+xml" href="${faviconUri}" />`)
  .replace(/<link rel="stylesheet" href="assets\/app\.css"\s*\/?>/, () => `<style>\n${safeCss}\n</style>`)
  .replace(/<script src="assets\/app\.js" defer><\/script>/, () => `<script>\n${safeJs}\n</script>`);

if (out.includes('assets/app.')) {
  console.error('✖ Nie udało się osadzić wszystkich zasobów — sprawdź index.html.');
  process.exit(1);
}

mkdirSync('build', { recursive: true });
writeFileSync('build/civislex.html', out);
console.log(`✔ Jednoplikowa wersja: build/civislex.html (${(out.length / 1024).toFixed(0)} KB)`);
