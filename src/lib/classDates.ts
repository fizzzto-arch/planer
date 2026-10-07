// Kiedy zajęcia faktycznie się odbywają - np. laboratorium tylko w tygodniach 10-14 albo w wybrane dni,
// choć w USOS grupa ma je co tydzień. Dla grupy z USOS (zmiana całej grupy) i dla własnych zajęć.
// Tygodnie parzyste/nieparzyste liczone jak w Planerze ("tydz. 2 · parzysty") - z planu semestru.
// Używa go też serwer powiadomień (Node) - importy tylko z .ts.
import { parseDateKey, toDateKey } from './dates.ts'
import { t } from './i18n.ts'
import { semesterAt, semesters, weekIndex } from './semesterWeek.ts'
import type { Meeting } from './usos.ts'

export type WeekParity = 'all' | 'odd' | 'even'

export type ClassDates =
  | { kind: 'dates'; dates: string[] } // konkretne dni "YYYY-MM-DD"
  | { kind: 'range'; from: string; to: string; weeks: WeekParity } // co tydzień od-do (włącznie)

export const MAX_DATES = 60

// Numer tygodnia semestru danego dnia (null - poza semestrem).
export type WeekOf = (day: Date) => number | null

export function weekNumbers(meetings: Pick<Meeting, 'start' | 'cancelled' | 'type'>[]): WeekOf {
  const list = semesters(meetings)
  return (day) => {
    const semester = semesterAt(day, list)
    return semester ? weekIndex(day, semester) : null
  }
}

export function parityMatches(weeks: WeekParity, day: Date, weekOf: WeekOf): boolean {
  if (weeks === 'all') return true
  const n = weekOf(day)
  return n !== null && (n % 2 === 1) === (weeks === 'odd')
}

export function matchesClassDates(spec: ClassDates, day: Date, weekOf: WeekOf): boolean {
  const key = toDateKey(day)
  if (spec.kind === 'dates') return spec.dates.includes(key)
  return key >= spec.from && key <= spec.to && parityMatches(spec.weeks, day, weekOf)
}

export const parseWeeks = (raw: unknown): WeekParity => (raw === 'odd' || raw === 'even' ? raw : 'all')

export function parseDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const dates = raw.filter((d): d is string => typeof d === 'string' && parseDateKey(d) !== null)
  return [...new Set(dates)].sort().slice(0, MAX_DATES)
}

export function parseClassDates(raw: unknown): ClassDates | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.kind === 'dates') {
    const dates = parseDates(r.dates)
    return dates.length > 0 ? { kind: 'dates', dates } : null
  }
  if (r.kind === 'range' && typeof r.from === 'string' && typeof r.to === 'string' && parseDateKey(r.from) && parseDateKey(r.to)) {
    return { kind: 'range', from: r.from, to: r.to, weeks: parseWeeks(r.weeks) }
  }
  return null
}

// ---------- Formularz ----------

export type DatesMode = 'all' | 'range' | 'dates' // all - wszystkie terminy z USOS / jednorazowo (własne)

export interface DatesDraft {
  mode: DatesMode
  from: string
  to: string
  odd: boolean
  even: boolean
  dates: string[]
}

export function draftFromDates(spec: ClassDates | null, defaults: { from: string; to: string }): DatesDraft {
  const base: DatesDraft = { mode: 'all', from: defaults.from, to: defaults.to, odd: true, even: true, dates: [] }
  if (!spec) return base
  if (spec.kind === 'dates') return { ...base, mode: 'dates', dates: spec.dates }
  return { ...base, mode: 'range', from: spec.from, to: spec.to, odd: spec.weeks !== 'even', even: spec.weeks !== 'odd' }
}

export const draftWeeks = (d: Pick<DatesDraft, 'odd' | 'even'>): WeekParity => (d.odd && d.even ? 'all' : d.odd ? 'odd' : 'even')

// Gotowe zasady albo komunikat, czego brakuje (tekst do pokazania).
export function datesFromDraft(d: DatesDraft): { dates: ClassDates | null } | { error: 'range' | 'parity' | 'empty' } {
  if (d.mode === 'all') return { dates: null }
  if (d.mode === 'dates') {
    const dates = parseDates(d.dates)
    return dates.length > 0 ? { dates: { kind: 'dates', dates } } : { error: 'empty' }
  }
  if (!parseDateKey(d.from) || !parseDateKey(d.to) || d.to < d.from) return { error: 'range' }
  if (!d.odd && !d.even) return { error: 'parity' }
  return { dates: { kind: 'range', from: d.from, to: d.to, weeks: draftWeeks(d) } }
}

// Komunikat dla błędu z datesFromDraft.
export function datesError(error: 'range' | 'parity' | 'empty'): string {
  return error === 'range'
    ? t('Podaj zakres dat: koniec nie może być przed początkiem.')
    : error === 'parity'
      ? t('Zaznacz tygodnie parzyste, nieparzyste albo oba.')
      : t('Wybierz co najmniej jeden dzień.')
}
