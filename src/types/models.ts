/**
 * Wspólne typy modelu danych CivisLex.
 * Shared data-model types for CivisLex.
 *
 * Wszystkie teksty widoczne dla użytkownika w bazie wiedzy są typu LText —
 * albo zwykły string (jednakowy dla obu języków), albo obiekt { pl, en }.
 */

export type Lang = 'pl' | 'en';

/** Tekst zlokalizowany / localized text. */
export type LText = string | { pl: string; en: string };

/* ------------------------------------------------------------------ */
/* Stałe prawne (law_constants.json)                                   */
/* ------------------------------------------------------------------ */

export interface LawConstant {
  value: number;
  label: LText;
  /** Jednostka wyświetlana obok wartości, np. "dni" / "PLN". */
  unit?: LText;
  /** Odwołanie do przepisu (id z articles_pl.json). */
  ref?: string;
}

export interface LawConstantsFile {
  lastUpdatedByTeacher: string;
  constants: Record<string, LawConstant>;
}

/* ------------------------------------------------------------------ */
/* Artykuły (articles_pl.json)                                         */
/* ------------------------------------------------------------------ */

export interface LawArticle {
  id: string;
  act: LText;
  /** Oznaczenie jednostki redakcyjnej, np. "art. 13 ust. 1". */
  unit: string;
  /** Treść przepisu po polsku (oryginał). */
  text: string;
  /** Tłumaczenie robocze na angielski (cel dydaktyczny, nie urzędowy). */
  text_en?: string;
}

export interface ArticlesFile {
  disclaimer: LText;
  articles: LawArticle[];
}

/* ------------------------------------------------------------------ */
/* Drzewa decyzyjne (trees/*.json)                                     */
/* ------------------------------------------------------------------ */

export type Category =
  | 'PRAWO_KONSTYTUCYJNE'
  | 'PRAWO_ADMINISTRACYJNE'
  | 'PRAWO_CYWILNE'
  | 'PRAWO_KARNE';

export interface QuestionOption {
  id: string;
  label: LText;
  isCorrect: boolean;
  feedback: LText;
  nextNodeId: string;
}

export interface QuestionNode {
  type: 'QUESTION';
  prompt: LText;
  hint?: LText;
  options: QuestionOption[];
}

export interface DeadlineCheckNode {
  type: 'DEADLINE_CHECK';
  prompt: LText;
  /** Klucz w law_constants.json z oczekiwaną wartością. */
  expectedConstantKey: string;
  toleranceDays: number;
  /** Jednostka podpowiadana przy polu (domyślnie "dni"). */
  unit?: LText;
  feedbackSuccess: LText;
  feedbackFailure?: LText;
  nextNodeId: string;
}

export interface DocumentBuilderNode {
  type: 'DOCUMENT_BUILDER';
  templateId: string;
}

export type TreeNode = QuestionNode | DeadlineCheckNode | DocumentBuilderNode;

export interface ProcedureTree {
  procedureId: string;
  title: LText;
  description?: LText;
  category: Category;
  legalBasisRefs: string[];
  startNodeId: string;
  nodes: Record<string, TreeNode>;
}

/* ------------------------------------------------------------------ */
/* Szablony pism (templates/*.json)                                    */
/* ------------------------------------------------------------------ */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'pesel'
  | 'money'
  | 'list';

export interface TemplateField {
  /** Ścieżka w kontekście, np. "applicant.fullName". */
  key: string;
  label: LText;
  type: FieldType;
  required?: boolean;
  /** Grupa (sekcja formularza), klucz z pliku i18n: form.group.* */
  group?: string;
  placeholder?: LText;
  /** Opcje pola select; docLabel = sformułowanie wstawiane do treści pisma. */
  options?: { value: string; label: LText; docLabel?: LText }[];
  /** Pole widoczne tylko, gdy warunek jest spełniony ("flag" lub "!flag"). */
  showIf?: string;
}

/** Elementy formalne pisma (art. 63 § 2 KPA, art. 126 KPC). */
export interface FormalElements {
  placeDate: string[];
  sender: string[];
  addressee: string[];
  body: string[];
}

export type LintRule =
  | {
      type: 'maxConst';
      field: string;
      constKey: string;
      message: LText;
    }
  | {
      /** Wartość pola musi PRZEKRACZAĆ stałą (inaczej ostrzeżenie). */
      type: 'minConst';
      field: string;
      constKey: string;
      message: LText;
    }
  | {
      type: 'deadline';
      /** Pole z datą zdarzenia (np. doręczenia decyzji). */
      fromField: string;
      /** Pole z datą pisma. */
      toField: string;
      constKey: string;
      unit?: 'days' | 'months' | 'years';
      message: LText;
    };

export interface DocumentTemplate {
  templateId: string;
  title: LText;
  /** Elementy formalne sprawdzane przez linter. */
  formalElements: FormalElements;
  fields: TemplateField[];
  rules?: LintRule[];
  /** Wartości domyślne pól; "@today" = dzisiejsza data. */
  defaults?: Record<string, string | boolean | string[]>;
  /** Linie szablonu (składnia: {{var}}, {#if}, {#each}, {@lawRef:ID}, {@const:KEY}). */
  body: { pl: string[]; en: string[] };
}

/* ------------------------------------------------------------------ */
/* Dane osobowe / identity                                             */
/* ------------------------------------------------------------------ */

export interface FakeIdentity {
  firstName: string;
  lastName: string;
  fullName: string;
  sex: 'F' | 'M';
  birthDate: string; // ISO
  pesel: string;
  street: string;
  postalCode: string;
  city: string;
  address: string;
  email: string;
  phone: string;
}
