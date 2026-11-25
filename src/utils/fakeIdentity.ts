/**
 * Generator poprawnych składniowo fikcyjnych danych osobowych (PESEL, adres).
 * Fake identity generator — protects students' real personal data (RODO/GDPR).
 *
 * UWAGA: wygenerowane numery PESEL są poprawne matematycznie, ale fikcyjne.
 */

import type { FakeIdentity } from '../types/models';

const FIRST_NAMES_F = ['Anna', 'Maria', 'Katarzyna', 'Zofia', 'Julia', 'Magdalena', 'Agnieszka', 'Hanna', 'Natalia', 'Aleksandra', 'Ewa', 'Barbara'];
const FIRST_NAMES_M = ['Jan', 'Piotr', 'Krzysztof', 'Tomasz', 'Michał', 'Paweł', 'Jakub', 'Antoni', 'Szymon', 'Marek', 'Adam', 'Filip'];

/** Nazwiska w parze [forma męska, forma żeńska]. */
const LAST_NAMES: [string, string][] = [
  ['Nowak', 'Nowak'],
  ['Kowalski', 'Kowalska'],
  ['Wiśniewski', 'Wiśniewska'],
  ['Wójcik', 'Wójcik'],
  ['Kamiński', 'Kamińska'],
  ['Lewandowski', 'Lewandowska'],
  ['Zieliński', 'Zielińska'],
  ['Szymański', 'Szymańska'],
  ['Dąbrowski', 'Dąbrowska'],
  ['Mazur', 'Mazur'],
  ['Jabłoński', 'Jabłońska'],
  ['Krawczyk', 'Krawczyk'],
];

const STREETS = ['ul. Lipowa', 'ul. Polna', 'ul. Słoneczna', 'ul. Kościuszki', 'ul. Mickiewicza', 'al. Niepodległości', 'ul. Ogrodowa', 'ul. Szkolna', 'ul. Kwiatowa', 'ul. Długa'];

/** Miasta z przykładowymi (fikcyjnymi dla celów ćwiczeń) kodami pocztowymi. */
const CITIES: [string, string][] = [
  ['Warszawa', '00-950'],
  ['Kraków', '31-000'],
  ['Łódź', '90-001'],
  ['Wrocław', '50-001'],
  ['Poznań', '60-001'],
  ['Gdańsk', '80-001'],
  ['Lublin', '20-001'],
  ['Białystok', '15-001'],
  ['Rzeszów', '35-001'],
  ['Toruń', '87-100'],
];

const WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pad = (n: number, len = 2) => String(n).padStart(len, '0');

/** Cyfra kontrolna PESEL: S = Σ w_i·d_i; check = (10 − S mod 10) mod 10. */
export function peselCheckDigit(first10: string): number {
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(first10[i]), 0);
  return (10 - (sum % 10)) % 10;
}

/** Kodowanie miesiąca w PESEL zależnie od stulecia. */
function encodeMonth(year: number, month: number): number {
  if (year >= 1800 && year < 1900) return month + 80;
  if (year >= 2000 && year < 2100) return month + 20;
  if (year >= 2100 && year < 2200) return month + 40;
  if (year >= 2200) return month + 60;
  return month;
}

function decodeBirthDate(pesel: string): { y: number; m: number; d: number } | null {
  let y = Number(pesel.slice(0, 2));
  let m = Number(pesel.slice(2, 4));
  const d = Number(pesel.slice(4, 6));
  if (m > 80) { y += 1800; m -= 80; }
  else if (m > 60) { y += 2200; m -= 60; }
  else if (m > 40) { y += 2100; m -= 40; }
  else if (m > 20) { y += 2000; m -= 20; }
  else y += 1900;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { y, m, d };
}

export interface PeselValidation {
  valid: boolean;
  /** Klucz komunikatu i18n: pesel.* */
  reason?: 'format' | 'checksum' | 'date';
  birthDate?: string;
  sex?: 'F' | 'M';
}

/** Pełna walidacja PESEL: format, suma kontrolna, poprawność daty. */
export function validatePesel(input: string): PeselValidation {
  const pesel = (input ?? '').trim();
  if (!/^\d{11}$/.test(pesel)) return { valid: false, reason: 'format' };
  if (peselCheckDigit(pesel.slice(0, 10)) !== Number(pesel[10])) return { valid: false, reason: 'checksum' };
  const birth = decodeBirthDate(pesel);
  if (!birth) return { valid: false, reason: 'date' };
  return {
    valid: true,
    birthDate: `${birth.y}-${pad(birth.m)}-${pad(birth.d)}`,
    sex: Number(pesel[9]) % 2 === 0 ? 'F' : 'M',
  };
}

/** Generuje poprawny PESEL dla podanej daty urodzenia i płci. */
export function generatePesel(birth: Date, sex: 'F' | 'M'): string {
  const y = birth.getUTCFullYear();
  const m = birth.getUTCMonth() + 1;
  const d = birth.getUTCDate();
  const serial = pad(randInt(0, 999), 3);
  let sexDigit = randInt(0, 9);
  if (sex === 'F' && sexDigit % 2 === 1) sexDigit = (sexDigit + 1) % 10;
  if (sex === 'M' && sexDigit % 2 === 0) sexDigit = sexDigit + 1;
  const first10 = `${pad(y % 100)}${pad(encodeMonth(y, m))}${pad(d)}${serial}${sexDigit}`;
  return first10 + peselCheckDigit(first10);
}

function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase();
}

/** Tworzy kompletną, fikcyjną tożsamość obywatela (dorosłego, 18–75 lat). */
export function generateFakeIdentity(): FakeIdentity {
  const sex: 'F' | 'M' = Math.random() < 0.5 ? 'F' : 'M';
  const firstName = pick(sex === 'F' ? FIRST_NAMES_F : FIRST_NAMES_M);
  const lastPair = pick(LAST_NAMES);
  const lastName = sex === 'F' ? lastPair[1] : lastPair[0];

  const now = new Date();
  const year = now.getFullYear() - randInt(18, 75);
  const birth = new Date(Date.UTC(year, randInt(0, 11), randInt(1, 28)));
  const pesel = generatePesel(birth, sex);

  const street = `${pick(STREETS)} ${randInt(1, 120)}${Math.random() < 0.4 ? `/${randInt(1, 60)}` : ''}`;
  const [city, postalCode] = pick(CITIES);

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    sex,
    birthDate: birth.toISOString().slice(0, 10),
    pesel,
    street,
    postalCode,
    city,
    address: `${street}, ${postalCode} ${city}`,
    // Domena example.com jest zarezerwowana (RFC 2606) — adres na pewno nie istnieje.
    email: `${stripDiacritics(firstName)}.${stripDiacritics(lastName)}@example.com`,
    phone: `+48 ${randInt(500, 799)} ${pad(randInt(0, 999), 3)} ${pad(randInt(0, 999), 3)}`,
  };
}
