/**
 * Budowanie CivisLex.
 *
 *   npm run build   – build produkcyjny → assets/app.js + assets/app.css
 *   npm run dev     – tryb deweloperski: przebudowa przy każdej zmianie
 *                     + serwer http://localhost:5173
 *
 * Kod źródłowy jest w src/, a wynik trafia do assets/ w katalogu głównym —
 * obok index.html. Dzięki temu katalog główny repozytorium jest od razu
 * gotową stroną (GitHub Pages, dowolny serwer statyczny albo dwuklik
 * w index.html — bundel to IIFE, więc działa także z file://).
 *
 * Domyślnie używany jest esbuild (devDependency). Skrypt działa też pod Bunem
 * (`bun scripts/build.mjs`) — wtedy korzysta z wbudowanego bundlera Bun.
 */
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const watch = process.argv.includes('--watch');
const OUT = 'assets';
const ENTRY = 'src/main.ts';

mkdirSync(OUT, { recursive: true });
// Usuwamy tylko pliki generowane — favicon i inne zasoby statyczne zostają.
for (const f of ['app.js', 'app.css', 'app.js.map']) rmSync(join(OUT, f), { force: true });

if (typeof Bun !== 'undefined') {
  // ---- Bun ----
  const result = await Bun.build({
    entrypoints: [ENTRY],
    outdir: OUT,
    format: 'iife',
    target: 'browser',
    minify: !watch,
    naming: { entry: 'app.[ext]', asset: '[name].[ext]' },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
  // Bun nazywa plik CSS tak jak wejście — ujednolicamy do app.css
  for (const f of readdirSync(OUT)) {
    if (f.endsWith('.css') && f !== 'app.css' && f.startsWith('main')) renameSync(join(OUT, f), join(OUT, 'app.css'));
  }
  console.log('✔ CivisLex zbudowany (Bun) → assets/app.js, assets/app.css');
} else {
  // ---- esbuild ----
  const esbuild = await import('esbuild');
  /** @type {import('esbuild').BuildOptions} */
  const options = {
    entryPoints: { app: ENTRY },
    bundle: true,
    format: 'iife',
    target: ['es2020', 'chrome100', 'firefox100', 'safari15'],
    outdir: OUT,
    sourcemap: watch ? 'inline' : false,
    minify: !watch,
    legalComments: 'none',
    logLevel: 'info',
  };
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    const { port } = await ctx.serve({ servedir: '.', port: 5173 });
    console.log(`\n  CivisLex: http://localhost:${port}\n`);
  } else {
    await esbuild.build(options);
    console.log('✔ CivisLex zbudowany (esbuild) → assets/app.js, assets/app.css');
  }
}
