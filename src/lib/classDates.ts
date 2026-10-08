// Kiedy zajęcia faktycznie się odbywają - np. laboratorium tylko w tygodniach 10-14 albo w wybrane dni,
// choć w USOS grupa ma je co tydzień. Dla grupy z USOS (zmiana całej grupy) i dla własnych zajęć.
// Tygodnie parzyste/nieparzyste liczone jak w Planerze ("tydzień 2 · parzysty") - z planu semestru.
// Używa go też serwer powiadomień (Node) - importy tylko z .ts.
import { addDays, parseDateKey, toDateKey } from './dates.ts'
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

// Najwięcej tygodni, które liczymy w przód (jak powtarzanie własnych zajęć).
const MAX_WEEKS = 60

// Pierwszy dzień zajęć od "from": ten sam dzień albo - dla grupy, która ma zajęcia w konkretny dzień
// tygodnia (weekday: 1 = poniedziałek) - najbliższy taki dzień.
function firstClassDay(from: string, weekday?: number): Date | null {
  const day = parseDateKey(from)
  if (!day || !weekday) return day
  return addDays(day, (weekday - (((day.getDay() + 6) % 7) + 1) + 7) % 7)
}

// Dzień N-tych zajęć co tydzień od "from" - liczone są tylko wybrane tygodnie (parzyste/nieparzyste).
// "Na 5 zajęć" zamiast samemu liczyć datę końca. null - tylu zajęć się nie da (np. poza semestrem).
export function nthWeeklyDate(from: string, count: number, weeks: WeekParity, weekOf: WeekOf, weekday?: number): string | null {
  const first = firstClassDay(from, weekday)
  if (!first || !Number.isInteger(count) || count < 1) return null
  let found = 0
  for (let i = 0; i < MAX_WEEKS; i++) {
    const day = addDays(first, 7 * i)
    if (parityMatches(weeks, day, weekOf) && ++found === count) return toDateKey(day)
  }
  return null
}

// Ile zajęć wypada co tydzień od "from" do "to" (włącznie) w wybranych tygodniach.
export function weeklyCount(from: string, to: string, weeks: WeekParity, weekOf: WeekOf, weekday?: number): number {
  const first = firstClassDay(from, weekday)
  const last = parseDateKey(to)
  if (!first || !last || last < first) return 0
  let count = 0
  for (let i = 0; i < MAX_WEEKS; i++) {
    const day = addDays(first, 7 * i)
    if (day > last) break
    if (parityMatches(weeks, day, weekOf)) count++
  }
  return count
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
  count?: number | null // wpisana liczba zajęć: zmiana początku albo tygodni przelicza koniec
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
