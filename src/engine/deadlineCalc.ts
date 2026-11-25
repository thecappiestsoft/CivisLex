/**
 * Kalkulator terminów procesowych (art. 57 KPA, art. 111–115 KC).
 * Procedural deadline calculator.
 *
 * Wszystkie daty są traktowane jako daty kalendarzowe (bez strefy czasowej),
 * reprezentowane wewnętrznie jako obiekty Date ustawione na północ UTC.
 */

import type { Lang } from '../types/models';

export type DeadlineUnit = 'days' | 'months' | 'years';

export interface HolidayInfo {
  date: string; // YYYY-MM-DD
  name: { pl: string; en: string };
}

export interface DeadlineStep {
  /** Klucz kroku do tłumaczenia w UI: deadline.step.* */
  kind: 'start' | 'raw' | 'shift' | 'final';
  date: string;
  /** Powód przesunięcia (dla kind === 'shift'). */
  reason?: { pl: string; en: string };
}

export interface DeadlineResult {
  eventDate: string;
  amount: number;
  unit: DeadlineUnit;
  startDate: string; // pierwszy dzień liczenia terminu
  rawEndDate: string;
  finalDate: string;
  shifted: boolean;
  steps: DeadlineStep[];
}

/* ------------------------------------------------------------------ */
/* Pomocnicze operacje na datach                                       */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

/** Parsuje "YYYY-MM-DD" do Date (UTC, północ). */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formatuje Date (UTC) do "YYYY-MM-DD". */
export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Dodaje miesiące wg art. 112 KC: termin kończy się w dniu, który datą
 * odpowiada początkowemu dniowi, a gdyby takiego dnia nie było —
 * w ostatnim dniu miesiąca.
 */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const d = date.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay)));
}

export function todayISO(): string {
  const now = new Date();
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function formatDate(iso: string, lang: Lang): string {
  if (!iso) return '';
  const date = parseISO(iso);
  return date.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function weekdayName(iso: string, lang: Lang): string {
  return parseISO(iso).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    weekday: 'long',
    timeZone: 'UTC',
  });
}

/* ------------------------------------------------------------------ */
/* Kalendarz świąt                                                     */
/* ------------------------------------------------------------------ */

/**
 * Data Wielkanocy (niedziela) — algorytm Meeusa/Jonesa/Butchera
 * (anonimowy algorytm gregoriański, wariant algorytmu Gaussa).
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzec, 4 = kwiecień
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const FIXED_HOLIDAYS: { md: string; name: { pl: string; en: string }; fromYear?: number }[] = [
  { md: '01-01', name: { pl: 'Nowy Rok', en: "New Year's Day" } },
  { md: '01-06', name: { pl: 'Święto Trzech Króli', en: 'Epiphany' } },
  { md: '05-01', name: { pl: 'Święto Pracy', en: 'Labour Day' } },
  { md: '05-03', name: { pl: 'Święto Konstytucji 3 Maja', en: 'Constitution Day (3 May)' } },
  { md: '08-15', name: { pl: 'Wniebowzięcie NMP', en: 'Assumption of Mary' } },
  { md: '11-01', name: { pl: 'Wszystkich Świętych', en: "All Saints' Day" } },
  { md: '11-11', name: { pl: 'Narodowe Święto Niepodległości', en: 'Independence Day' } },
  // Wigilia jest dniem wolnym od pracy od 2025 r. (nowelizacja ustawy o dniach wolnych).
  { md: '12-24', name: { pl: 'Wigilia Bożego Narodzenia', en: 'Christmas Eve' }, fromYear: 2025 },
  { md: '12-25', name: { pl: 'Boże Narodzenie (1. dzień)', en: 'Christmas Day' } },
  { md: '12-26', name: { pl: 'Boże Narodzenie (2. dzień)', en: 'Second Day of Christmas' } },
];

const holidayCache = new Map<number, HolidayInfo[]>();

/** Lista świąt ustawowo wolnych od pracy w danym roku. */
export function polishHolidays(year: number): HolidayInfo[] {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const list: HolidayInfo[] = FIXED_HOLIDAYS.filter((h) => !h.fromYear || year >= h.fromYear).map(
    (h) => ({ date: `${year}-${h.md}`, name: h.name }),
  );

  const easter = easterSunday(year);
  list.push(
    { date: toISO(easter), name: { pl: 'Wielkanoc', en: 'Easter Sunday' } },
    { date: toISO(addDays(easter, 1)), name: { pl: 'Poniedziałek Wielkanocny', en: 'Easter Monday' } },
    { date: toISO(addDays(easter, 49)), name: { pl: 'Zielone Świątki', en: 'Pentecost Sunday' } },
    { date: toISO(addDays(easter, 60)), name: { pl: 'Boże Ciało', en: 'Corpus Christi' } },
  );

  list.sort((a, b) => a.date.localeCompare(b.date));
  holidayCache.set(year, list);
  return list;
}

export function holidayOn(date: Date): HolidayInfo | undefined {
  const iso = toISO(date);
  return polishHolidays(date.getUTCFullYear()).find((h) => h.date === iso);
}

export function isPolishHoliday(date: Date): boolean {
  return holidayOn(date) !== undefined;
}

/** Dzień wolny od pracy lub sobota (art. 57 § 4 KPA, art. 115 KC). */
export function isNonWorkingDay(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6 || isPolishHoliday(date);
}

function nonWorkingReason(date: Date): { pl: string; en: string } {
  const holiday = holidayOn(date);
  if (holiday) return holiday.name;
  if (date.getUTCDay() === 6) return { pl: 'sobota', en: 'Saturday' };
  return { pl: 'niedziela', en: 'Sunday' };
}

/* ------------------------------------------------------------------ */
/* Główny algorytm                                                     */
/* ------------------------------------------------------------------ */

/**
 * Oblicza koniec terminu.
 *
 * 1. Dzień zdarzenia (D0) nie jest wliczany: D_start = D0 + 1.
 * 2. D_raw = D0 + N (dni) albo D0 + N miesięcy/lat (art. 112 KC).
 * 3. Jeżeli D_raw to sobota lub dzień ustawowo wolny — przesuwamy na
 *    najbliższy dzień roboczy.
 */
export function computeDeadline(eventISO: string, amount: number, unit: DeadlineUnit = 'days'): DeadlineResult {
  const d0 = parseISO(eventISO);
  const start = addDays(d0, 1);

  let raw: Date;
  if (unit === 'days') raw = addDays(d0, amount);
  else if (unit === 'months') raw = addMonths(d0, amount);
  else raw = addMonths(d0, amount * 12);

  const steps: DeadlineStep[] = [
    { kind: 'start', date: toISO(start) },
    { kind: 'raw', date: toISO(raw) },
  ];

  let final = raw;
  while (isNonWorkingDay(final)) {
    if (final.getTime() === raw.getTime()) steps[1].reason = nonWorkingReason(final);
    else steps.push({ kind: 'shift', date: toISO(final), reason: nonWorkingReason(final) });
    final = addDays(final, 1);
  }
  steps.push({ kind: 'final', date: toISO(final) });

  return {
    eventDate: eventISO,
    amount,
    unit,
    startDate: toISO(start),
    rawEndDate: toISO(raw),
    finalDate: toISO(final),
    shifted: final.getTime() !== raw.getTime(),
    steps,
  };
}

/** Czy pismo z datą `actionISO` mieści się w terminie liczonym od `eventISO`. */
export function isWithinDeadline(
  eventISO: string,
  actionISO: string,
  amount: number,
  unit: DeadlineUnit = 'days',
): boolean {
  const { finalDate } = computeDeadline(eventISO, amount, unit);
  return actionISO <= finalDate;
}
