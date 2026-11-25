# CivisLex — Interaktywny Asystent Prawno-Obywatelski

Offline-first aplikacja edukacyjna do nauki prawa konstytucyjnego, administracyjnego, cywilnego i karnego w praktyce. Uczeń przechodzi quiz oparty na drzewie decyzyjnym, a potem przygotowuje gotowe pismo z podglądem na żywo, listą kontrolną wymogów formalnych i eksportem do PDF/TXT.

© 2026 CappySoft.pl

---

## Szybki start

Katalog główny repozytorium **jest gotową stroną**: `index.html` + zbudowane pliki w `assets/`.

- **Bez instalacji:** otwórz `index.html` dwuklikiem — działa offline, bez serwera.
- **GitHub Pages:** zobacz [Publikacja na GitHub Pages](#publikacja-na-github-pages).

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie i wgraj **całą zawartość** tego folderu (razem z ukrytymi `.github/` i `.nojekyll`).
2. Wejdź w **Settings → Pages → Build and deployment** i wybierz jedną z opcji:

| Opcja | Ustawienie | Kiedy wybrać |
|---|---|---|
| **A. GitHub Actions** (zalecane) | Source: **GitHub Actions** | Każdy push do `main` sprawdza kod, buduje `assets/` ze źródeł i publikuje stronę. Można edytować pliki nawet w przeglądarce na GitHubie. |
| B. Deploy from a branch | Source: **Deploy from a branch**, gałąź `main`, folder `/ (root)` | Najprostsze, bez automatyzacji. Po każdej zmianie w `src/` trzeba lokalnie uruchomić `npm run build` i wypchnąć też `assets/`. |

3. Po chwili strona będzie dostępna pod adresem `https://<użytkownik>.github.io/<repozytorium>/`.

Wszystkie ścieżki są względne, a nawigacja korzysta z `#/…`, więc aplikacja działa także w podkatalogu repozytorium.

## Praca programisty

Wymagany Node.js 18+.

```bash
npm install
npm run dev          # przebudowa przy każdej zmianie + serwer http://localhost:5173
npm run build        # build produkcyjny → assets/app.js, assets/app.css
npm run check        # typy TypeScript + walidacja bazy wiedzy + testy
npm run build:single # cała aplikacja w jednym pliku → build/civislex.html
npm run desktop      # wersja desktopowa (Electron)
```

**Zasada:** edytujesz tylko pliki w `src/` (i `index.html`). Pliki `assets/app.js` i `assets/app.css` są generowane — nie edytuj ich ręcznie.

### Gdzie co zmienić

| Chcę zmienić… | Plik |
|---|---|
| pytania quizu, odpowiedzi, wyjaśnienia | `src/knowledge-base/trees/*.json` |
| treść i pola pism | `src/knowledge-base/templates/*.json` |
| terminy, progi, kwoty (14 dni, 800 zł…) | `src/knowledge-base/law_constants.json` (lub panel nauczyciela w aplikacji) |
| teksty przepisów | `src/knowledge-base/articles_pl.json` |
| napisy interfejsu PL / EN | `src/i18n/pl.ts`, `src/i18n/en.ts` |
| kolory, motyw jasny/ciemny | `src/styles/tokens.css` |
| wygląd komponentów i ekranów | `src/styles/components.css`, `src/styles/views.css` |
| stopkę (© 2026 CappySoft.pl) | `src/ui/components/footer.ts` |
| logikę terminów, PESEL, szablonów | `src/engine/`, `src/utils/` |

Po zmianach w bazie wiedzy uruchom `npm run check` — walidator wskaże błędy w grafach, szablonach i odwołaniach do przepisów.

## Struktura katalogów

```
civis-lex/
├── index.html                 # strona aplikacji (punkt wejścia)
├── assets/
│   ├── favicon.svg            # ikona (statyczna)
│   ├── app.js                 # ⚙ generowany przez npm run build
│   └── app.css                # ⚙ generowany przez npm run build
├── .github/workflows/pages.yml  # automatyczny build i publikacja na GitHub Pages
├── .nojekyll                  # wyłącza Jekylla na GitHub Pages
├── src/                       # ← KOD ŹRÓDŁOWY (TypeScript)
│   ├── main.ts                # punkt wejścia
│   ├── engine/                # silnik — czysta logika, bez UI
│   │   ├── decisionTree.ts    # interpreter grafu + walidator drzew
│   │   ├── deadlineCalc.ts    # kalkulator terminów, kalendarz świąt
│   │   ├── templateParser.ts  # kompilator szablonów pism
│   │   ├── legalLinter.ts     # walidator formalny pisma
│   │   ├── pdfExporter.ts     # eksport PDF / TXT
│   │   └── documentStyles.ts  # CSS pisma urzędowego (podgląd = PDF)
│   ├── knowledge-base/        # baza wiedzy (JSON) — treści bez programowania
│   │   ├── index.ts           # rejestr: tu dopisujesz nowe procedury
│   │   ├── law_constants.json
│   │   ├── articles_pl.json
│   │   ├── trees/             # grafy decyzyjne procedur
│   │   └── templates/         # szablony pism (PL + EN)
│   ├── i18n/                  # tłumaczenia UI (pl.ts, en.ts — typowane)
│   ├── state/                 # stan: ustawienia, stałe prawne, postęp
│   ├── utils/                 # dom.ts, text.ts, fakeIdentity.ts
│   ├── types/                 # typy modelu danych
│   ├── ui/
│   │   ├── app.ts             # powłoka aplikacji
│   │   ├── router.ts          # router hash (#/…)
│   │   ├── components/        # nagłówek, stopka, przełączniki, pola, lista kontrolna, modal…
│   │   └── views/             # ekrany: start, procedura, terminy, przepisy, nauczyciel
│   └── styles/                # tokens → base → layout → components → views
├── scripts/
│   ├── build.mjs              # build (esbuild / Bun)
│   ├── build-single.mjs       # składanie w jeden plik HTML
│   └── validate-kb.ts         # walidator bazy wiedzy
├── tests/engine.test.ts       # testy silnika
├── electron/main.cjs          # opcjonalna powłoka desktopowa
└── docs/ARCHITEKTURA.md       # architektura, formaty danych, fonty
```

## Funkcje

| Obszar | Opis |
|---|---|
| 6 procedur | Informacja publiczna, odwołanie KPA, wniosek do RPO, reklamacja, pozew uproszczony, zawiadomienie o kradzieży |
| Quiz | Drzewo decyzyjne z punktacją, pieczątką oceny i panelem „Podstawa prawna” |
| Kreator pisma | Formularz + podgląd A4 na żywo, tryb roboczy z podświetlaniem braków `[UZUPEŁNIJ: …]` |
| Lista kontrolna | Elementy obowiązkowe (art. 63 § 2 KPA / art. 126 KPC), suma kontrolna PESEL, limity i terminy |
| Eksport | PDF (okno druku → „Zapisz jako PDF”, A4, marginesy 25 mm) i TXT (UTF-8) |
| RODO | „Fikcyjny obywatel” — poprawny matematycznie PESEL, adres, e-mail w domenie example.com |
| Kalkulator terminów | Art. 57 KPA / art. 111–115 KC, święta stałe i ruchome, soboty |
| Panel nauczyciela | Edycja stałych prawnych bez znajomości JSON, PIN (domyślnie `1234`), eksport/import |
| Interfejs | PL / EN, motyw jasny / ciemny, wygląd „Teczka sprawy”, responsywny |

## Jak dodać nową procedurę

1. Dodaj graf w `src/knowledge-base/trees/` (wzór: `udip.json`).
2. Dodaj szablon w `src/knowledge-base/templates/` (wzór: `udip_wniosek.json`).
3. Zaimportuj oba pliki w `src/knowledge-base/index.ts`.
4. `npm run check`, potem `npm run build` (lub push — przy opcji A zbuduje GitHub).

Szczegóły formatów: [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md).

## Zastrzeżenie

Program ma charakter edukacyjny. Wyciągi przepisów są częściowo skrócone, a teksty angielskie to robocze tłumaczenia — przed użyciem w praktyce sprawdź aktualny tekst jednolity w ISAP (isap.sejm.gov.pl). Wygenerowane pisma nie stanowią porady prawnej.
