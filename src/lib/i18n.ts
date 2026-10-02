// Język interfejsu. Tekstem źródłowym jest polski - on jest zarazem kluczem słownika angielskiego
// (i18n.en.ts). Nazwy przedmiotów, sale i dane z USOS zostają bez tłumaczenia (nazwy można skrócić
// w ustawieniach). Bez importów przeglądarki - słownika używa też skrypt powiadomień w Node.
import { EN } from './i18n.en.ts'

export type Language = 'pl' | 'en'
export const LANGUAGES: readonly Language[] = ['pl', 'en']

// Pierwsze wejście: język przeglądarki (poza polskim - angielski). Potem wybór z ustawień.
// Przeglądarka albo Node (skrypt powiadomień) - bez typów DOM.
const env = globalThis as {
  navigator?: { language?: string; languages?: readonly string[] }
  document?: { documentElement: { lang: string } }
}

export function detectLanguage(): Language {
  const nav = env.navigator
  const langs = nav ? (nav.languages?.length ? nav.languages : [nav.language]) : []
  if (langs.length === 0) return 'pl'
  return langs.some((l) => l?.toLowerCase().startsWith('pl')) ? 'pl' : 'en'
}

let current: Language = 'pl'

export function setLanguage(lang: Language): void {
  current = lang
  if (env.document) env.document.documentElement.lang = lang
}

export function getLanguage(): Language {
  return current
}

// Tekst w innym języku niż interfejs - np. maile do prowadzących zawsze po polsku.
export function inLanguage<T>(lang: Language, build: () => T): T {
  const previous = current
  current = lang
  try {
    return build()
  } finally {
    current = previous
  }
}

// Dzień albo data w środku zdania: po polsku małą literą ("w USOS: środa"), po angielsku jak jest.
export function midSentence(text: string): string {
  return current === 'pl' ? text.toLowerCase() : text
}

// Język do dat i sortowania ("pl-PL" / "en-GB" - tydzień od poniedziałku, 24 h).
export function locale(lang: Language = current): string {
  return lang === 'en' ? 'en-GB' : 'pl-PL'
}

type Vars = Record<string, string | number>

function fill(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match))
}

// Tłumaczenie w podanym języku (serwer: język odbiorcy powiadomienia).
export function translate(lang: Language, pl: string, vars?: Vars): string {
  return fill(lang === 'en' ? (EN[pl] ?? pl) : pl, vars)
}

// Tłumaczenie w bieżącym języku interfejsu. Zmienne w tekście: t('za {n} min', { n: 5 }).
export function t(pl: string, vars?: Vars): string {
  return translate(current, pl, vars)
}

// Tekst w stałej tabeli (np. etykiety opcji): msg() oznacza go do słownika (sprawdza test),
// a tk() tłumaczy przy wyświetlaniu.
export const msg = (pl: string): string => pl
export function tk(key: string, vars?: Vars): string {
  return translate(current, key, vars)
}

// Odmiana przez liczby: polska (1 termin, 2 terminy, 5 terminów), angielska (1 deadline, 2 deadlines).
// Angielskie formy są w słowniku pod kluczem "termin|terminy|terminów" jako "deadline|deadlines".
export function pluralIn(lang: Language, n: number, one: string, few: string, many: string): string {
  if (lang === 'en') {
    const forms = (EN[`${one}|${few}|${many}`] ?? `${one}|${many}`).split('|')
    return n === 1 ? forms[0] : (forms[1] ?? forms[0])
  }
  if (n === 1) return one
  const lastDigit = n % 10
  const lastTwo = n % 100
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return few
  return many
}
