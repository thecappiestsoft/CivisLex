# Architektura CivisLex

## Zasady

- **Data-driven engine** — logika procedur nie jest zakodowana w widokach. Silnik (`src/engine`) interpretuje grafy i szablony z `src/knowledge-base`.
- **Rozdział warstw** — `engine/` nie importuje niczego z `ui/` ani `state/` (poza typami i `utils/`). Dzięki temu silnik da się testować bez przeglądarki.
- **Bez frameworka** — UI to czysty TypeScript + mały helper `h()` (`utils/dom.ts`). Każdy widok to funkcja `(root, params) => cleanup?`.
- **Offline-first** — build to statyczne pliki IIFE (bez modułów ES), więc `index.html` w katalogu głównym działa z dysku (`file://`), z GitHub Pages i z każdego serwera statycznego. Dane użytkownika trzymamy w `localStorage` (prefiks `civislex:`).

## Przepływ danych

```
knowledge-base/*.json ──► knowledge-base/index.ts (rejestr)
                                   │
state/lawConstants.ts  ◄── panel nauczyciela (nadpisania, hot-reload)
        │
        ▼
engine/decisionTree ──► ui/views/procedure/quizPanel
engine/templateParser + legalLinter ──► ui/views/procedure/documentBuilder
engine/deadlineCalc ──► ui/views/deadlineView
```

Zmiana języka (`state/settings.ts`) lub stałych prawnych (`state/lawConstants.ts`) powoduje ponowne wyrenderowanie bieżącego widoku (`ui/app.ts`). Postęp quizu jest pamiętany w `ui/views/procedure/session.ts`, a formularz pisma w `localStorage`, więc nic nie ginie.

## Format drzewa decyzyjnego (`trees/*.json`)

```jsonc
{
  "procedureId": "PROC_UDIP_01",
  "title": { "pl": "…", "en": "…" },
  "category": "PRAWO_ADMINISTRACYJNE",     // KONSTYTUCYJNE | ADMINISTRACYJNE | CYWILNE | KARNE
  "legalBasisRefs": ["UDIP_ART_13"],       // id z articles_pl.json
  "startNodeId": "node_1",
  "nodes": {
    "node_1": { "type": "QUESTION", "prompt": {…}, "options": [
      { "id": "opt_a", "label": {…}, "isCorrect": true, "feedback": {…}, "nextNodeId": "node_2" },
      { "id": "opt_b", "label": {…}, "isCorrect": false, "feedback": {…}, "nextNodeId": "node_1" }
    ]},
    "node_2": { "type": "DEADLINE_CHECK", "prompt": {…}, "expectedConstantKey": "UDIP_RESPONSE_DAYS",
                "toleranceDays": 0, "unit": "PLN" /* opcjonalnie */, "feedbackSuccess": {…}, "nextNodeId": "node_form" },
    "node_form": { "type": "DOCUMENT_BUILDER", "templateId": "TPL_UDIP_WNIOSEK" }
  }
}
```

- Teksty mogą zawierać `{@const:KLUCZ}` — wartość jest pobierana z bieżących stałych (zmiana w panelu nauczyciela od razu zmienia pytania).
- Błędna odpowiedź zwykle wraca do tego samego węzła (pętla dozwolona). Ścieżka poprawnych odpowiedzi musi być acykliczna — sprawdza to `validateTree()`.
- Wynik: `(poprawne − 0,5 × błędy) / liczba pytań`.

## Format szablonu pisma (`templates/*.json`)

| Pole | Znaczenie |
|---|---|
| `fields[]` | Definicje pól formularza: `key`, `label`, `type` (`text`, `textarea`, `date`, `checkbox`, `select`, `pesel`, `money`, `list`), `required`, `group`, `placeholder`, `options`, `showIf` (`"flag"` lub `"!flag"`) |
| `formalElements` | Pola wymagane dla elementów: `placeDate`, `sender`, `addressee`, `body` (Linter) |
| `rules[]` | Reguły merytoryczne: `maxConst`, `minConst`, `deadline` |
| `defaults` | Wartości domyślne (`"@today"` = dzisiejsza data) |
| `body.pl[]` / `body.en[]` | Linie szablonu (zaufany HTML + składnia poniżej) |

### Składnia szablonu

| Element | Składnia |
|---|---|
| Zmienna | `{{applicant.fullName}}` — brak wartości w trybie roboczym → żółte `[UZUPEŁNIJ: etykieta]` |
| Blok warunkowy | `{#if isElectronicDelivery}…{#else}…{/if}`, negacja `{#if !flag}` |
| Lista | `{#each attachments}<li>{{this}}</li>{/each}` (`{{@number}}` = numer od 1) |
| Cytat przepisu | `{@lawRef:UDIP_ART_13}` — treść z `articles_pl.json` |
| Oznaczenie przepisu | `{@lawUnit:UDIP_ART_13}` → „art. 13 ust. 1” |
| Stała prawna | `{@const:KPA_APPEAL_DAYS}` |

Klasy CSS pisma (`doc-place`, `doc-sender`, `doc-addressee`, `doc-title`, `doc-subtitle`, `doc-section`, `doc-signature`, `doc-attachments`) są zdefiniowane w `engine/documentStyles.ts` — wspólnie dla podglądu i PDF.

## Kalkulator terminów

`computeDeadline(D0, N, unit)`:
1. `D_start = D0 + 1` (dnia zdarzenia nie wlicza się),
2. `D_raw = D0 + N` dni (albo N miesięcy/lat wg art. 112 KC — brak dnia → ostatni dzień miesiąca),
3. dopóki `D_raw` to sobota, niedziela albo święto → +1 dzień.

Święta: stałe (1.01, 6.01, 1.05, 3.05, 15.08, 1.11, 11.11, 24.12 od 2025 r., 25.12, 26.12) i ruchome liczone od Wielkanocy (algorytm Meeusa/Jonesa/Butchera): Wielkanoc, Poniedziałek Wielkanocny, Zielone Świątki (+49), Boże Ciało (+60).

## PESEL

`S = 1·d1 + 3·d2 + 7·d3 + 9·d4 + 1·d5 + 3·d6 + 7·d7 + 9·d8 + 1·d9 + 3·d10`, `cyfra kontrolna = (10 − S mod 10) mod 10`. Walidator sprawdza też poprawność daty urodzenia (kodowanie stulecia w miesiącu: +80, +0, +20, +40, +60).

## Tłumaczenia

- UI: `src/i18n/pl.ts` (źródło) i `src/i18n/en.ts` — typ `Dictionary` wymusza identyczne klucze. Liczba mnoga: `tp('home.steps', n)` z formami `one/few/many`.
- Baza wiedzy: każdy tekst to `{ "pl": "…", "en": "…" }` (typ `LText`).

## PDF

`engine/pdfExporter.ts` składa kompletny dokument HTML (A4, `@page { margin: 25mm }`, krój Liberation Serif / Times) w ukrytej ramce i otwiera systemowe okno druku („Zapisz jako PDF”). W Electronie można to zastąpić `webContents.printToPDF()`.

## Wygląd „Teczka sprawy” i fonty

Motyw graficzny naśladuje akta sprawy: pasek z zakładkami teczki (nawigacja), kartki papieru (panele), pieczątki (PL | EN, ocena odpowiedzi, status quizu), kratki formularza (odpowiedzi, pola wyboru), wykropkowane rubryki (pola formularza) i „listę kontrolną kancelarii” (linter). Wszystkie kolory są w `src/styles/tokens.css` — osobno dla motywu jasnego i ciemnego („archiwum nocą”).

Projekt zakłada fonty **IBM Plex Sans**, **IBM Plex Mono** i **Source Serif 4** (licencja SIL OFL). Aplikacja działa offline, więc nie pobiera ich z internetu: jeśli są zainstalowane w systemie, zostaną użyte, a w przeciwnym razie przeglądarka użyje zamienników (Segoe UI / Georgia / Courier New). Aby osadzić je w aplikacji:

1. pobierz pliki `.woff2` (np. z Google Fonts) do `assets/fonts/`,
2. dodaj do `src/styles/tokens.css` reguły `@font-face`, np.
   `@font-face { font-family: 'IBM Plex Mono'; src: url('fonts/IBMPlexMono-Regular.woff2') format('woff2'); font-weight: 400; }`
   (ścieżka względem `assets/app.css`),
3. `npm run build`.
