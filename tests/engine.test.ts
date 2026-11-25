/**
 * Testy silnika (uruchom: npm test).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeDeadline, easterSunday, isPolishHoliday, parseISO, toISO } from '../src/engine/deadlineCalc';
import { parseTemplate, renderTemplate, type RenderOptions } from '../src/engine/templateParser';
import { DecisionTreeRunner, validateTree } from '../src/engine/decisionTree';
import { lintDocument } from '../src/engine/legalLinter';
import { generateFakeIdentity, peselCheckDigit, validatePesel } from '../src/utils/fakeIdentity';
import { PROCEDURES, TEMPLATES, DEFAULT_LAW_CONSTANTS } from '../src/knowledge-base';

const getConst = (k: string) => DEFAULT_LAW_CONSTANTS.constants[k]?.value;

/* ---------- Terminy ---------- */

test('Wielkanoc (algorytm Meeusa)', () => {
  assert.equal(toISO(easterSunday(2024)), '2024-03-31');
  assert.equal(toISO(easterSunday(2025)), '2025-04-20');
  assert.equal(toISO(easterSunday(2026)), '2026-04-05');
  assert.equal(toISO(easterSunday(2027)), '2027-03-28');
});

test('Święta ruchome i stałe', () => {
  assert.ok(isPolishHoliday(parseISO('2026-04-06'))); // Poniedziałek Wielkanocny
  assert.ok(isPolishHoliday(parseISO('2026-06-04'))); // Boże Ciało
  assert.ok(isPolishHoliday(parseISO('2026-11-11')));
  assert.ok(!isPolishHoliday(parseISO('2026-11-12')));
});

test('Termin 14 dni — bez przesunięcia', () => {
  // doręczenie w środę 2026-03-04 → +14 = środa 2026-03-18
  const r = computeDeadline('2026-03-04', 14);
  assert.equal(r.startDate, '2026-03-05');
  assert.equal(r.finalDate, '2026-03-18');
  assert.equal(r.shifted, false);
});

test('Termin kończący się w sobotę przesuwa się na poniedziałek', () => {
  // 2026-03-07 to sobota; zdarzenie 2026-02-21 + 14 = 2026-03-07
  const r = computeDeadline('2026-02-21', 14);
  assert.equal(r.rawEndDate, '2026-03-07');
  assert.equal(r.finalDate, '2026-03-09');
});

test('Termin kończący się w Wielkanoc przesuwa się za Poniedziałek Wielkanocny', () => {
  // 2026-04-05 (niedziela Wielkanocna) → 06.04 święto → wtorek 07.04
  const r = computeDeadline('2026-03-22', 14);
  assert.equal(r.rawEndDate, '2026-04-05');
  assert.equal(r.finalDate, '2026-04-07');
});

test('Termin miesięczny — ostatni dzień miesiąca (art. 112 KC)', () => {
  const r = computeDeadline('2026-01-31', 1, 'months');
  assert.equal(r.rawEndDate, '2026-02-28');
});

/* ---------- PESEL ---------- */

test('PESEL — suma kontrolna', () => {
  assert.equal(peselCheckDigit('4405140135'), 9);
  assert.ok(validatePesel('44051401359').valid);
  assert.equal(validatePesel('44051401358').reason, 'checksum');
  assert.equal(validatePesel('123').reason, 'format');
});

test('Generator fikcyjnych tożsamości zwraca poprawne PESEL', () => {
  for (let i = 0; i < 200; i++) {
    const p = generateFakeIdentity();
    const v = validatePesel(p.pesel);
    assert.ok(v.valid, `${p.pesel} niepoprawny`);
    assert.equal(v.sex, p.sex);
    assert.equal(v.birthDate, p.birthDate);
  }
});

/* ---------- Szablony ---------- */

const baseOpts = (data: Record<string, unknown>): RenderOptions => ({
  lang: 'pl',
  mode: 'draft',
  data,
  fieldLabels: { 'applicant.fullName': 'Imię i nazwisko' },
  fieldTypes: {},
  selectLabels: {},
  missingPrefix: 'UZUPEŁNIJ',
  resolveLaw: (id) => (id === 'X' ? { unit: 'art. 1', text: 'Treść' } : undefined),
  resolveConst: (k) => (k === 'N' ? 14 : undefined),
});

test('Parser — zmienne, braki, if/else, each, lawRef, const', () => {
  const src =
    'A {{applicant.fullName}} {#if flag}T{#else}F{/if} {#each list}{{@number}}.{{this}};{/each} {@lawRef:X} {@const:N}';
  const html = renderTemplate(src, baseOpts({ flag: false, list: ['a', '', 'b'] }));
  assert.match(html, /\[UZUPEŁNIJ: Imię i nazwisko\]/);
  assert.match(html, / F /);
  assert.match(html, /1\.a;2\.b;/);
  assert.match(html, /Treść/);
  assert.match(html, /14$/);
});

test('Parser — escapowanie danych użytkownika', () => {
  const html = renderTemplate('{{x}}', baseOpts({ x: '<script>' }));
  assert.equal(html, '&lt;script&gt;');
});

test('Parser — błąd przy niedomkniętym bloku', () => {
  assert.throws(() => parseTemplate('{#if a}x'));
});

test('Wszystkie szablony się kompilują (PL i EN)', () => {
  for (const tpl of Object.values(TEMPLATES)) {
    parseTemplate(tpl.body.pl.join('\n'));
    parseTemplate(tpl.body.en.join('\n'));
  }
});

/* ---------- Drzewa ---------- */

test('Wszystkie drzewa są poprawnymi DAG-ami z istniejącymi szablonami', () => {
  for (const tree of PROCEDURES) {
    assert.deepEqual(validateTree(tree, Object.keys(TEMPLATES)), [], tree.procedureId);
  }
});

test('Runner — przejście poprawnej ścieżki UDIP', () => {
  const tree = PROCEDURES.find((p) => p.procedureId === 'PROC_UDIP_01')!;
  const r = new DecisionTreeRunner(tree, getConst);
  assert.equal(r.answerOption('opt_b').correct, false);
  r.retry();
  assert.equal(r.answerOption('opt_a').correct, true);
  r.advance();
  r.answerOption('opt_b');
  r.advance();
  assert.equal(r.answerDeadline(14).correct, true);
  r.advance();
  assert.ok(r.isAtDocumentBuilder);
  assert.equal(r.snapshot.mistakes, 1);
});

/* ---------- Linter ---------- */

test('Linter — puste pismo ma błędy, kompletne nie ma', () => {
  const tpl = TEMPLATES.TPL_UDIP_WNIOSEK;
  assert.ok(lintDocument(tpl, {}, getConst).errors > 0);
  const full = {
    document: { place: 'Kraków', date: '2026-11-13' },
    applicant: { fullName: 'Jan Nowak', address: 'ul. Polna 1, 31-000 Kraków' },
    addressee: { name: 'Prezydent Miasta Krakowa', address: 'pl. Wszystkich Świętych 3-4' },
    request: { subject: 'Kopie umów' },
  };
  assert.equal(lintDocument(tpl, full, getConst).errors, 0);
});

test('Linter — reguła limitu postępowania uproszczonego', () => {
  const tpl = TEMPLATES.TPL_POZEW_UPROSZCZONY;
  const over = lintDocument(tpl, { claim: { amount: '25000' } }, getConst);
  assert.ok(over.items.some((i) => i.status === 'error' && i.fields.includes('claim.amount')));
});
