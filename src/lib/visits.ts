// Licznik otwarć Planera - administrator widzi, kto korzysta (bez tego, co ktoś w Planerze robi).
// Na koncie (access/{uid}): otwarcia z ostatnich 7 dni według dni ("2026-10-15": 3) i kiedy ostatnio.
// Otwarcie = start Planera albo powrót do niego po co najmniej 30 minutach przerwy.
import { addDays, parseDateKey, startOfDay, toDateKey } from './dates'

export const VISIT_DAYS = 7
export const VISIT_GAP_MS = 30 * 60 * 1000

export type Visits = Record<string, number>

export function parseVisits(raw: unknown): Visits {
  if (typeof raw !== 'object' || raw === null) return {}
  const visits: Visits = {}
  for (const [day, n] of Object.entries(raw)) {
    if (parseDateKey(day) && typeof n === 'number' && Number.isInteger(n) && n > 0) visits[day] = n
  }
  return visits
}

// Pierwszy dzień okna "ostatnie 7 dni" (dziś i 6 dni wstecz).
const firstDay = (now: Date) => toDateKey(addDays(startOfDay(now), -(VISIT_DAYS - 1)))

// Dni sprzed okna - usuwane przy zapisie, żeby na koncie zostawał tylko ostatni tydzień.
export function staleVisitDays(visits: Visits, now: Date): string[] {
  const from = firstDay(now)
  return Object.keys(visits).filter((day) => day < from)
}

// Otwarcia i dni z otwarciem w ostatnich 7 dniach.
export function visitSummary(visits: Visits, now: Date): { opens: number; days: number } {
  const from = firstDay(now)
  const today = toDateKey(now)
  const recent = Object.entries(visits).filter(([day]) => day >= from && day <= today)
  return { opens: recent.reduce((sum, [, n]) => sum + n, 0), days: recent.length }
}

// Czy to nowe otwarcie: ostatnio Planer był widoczny co najmniej 30 minut temu (albo nigdy).
export function isNewVisit(lastSeenAt: number | null, now: number): boolean {
  return lastSeenAt === null || now - lastSeenAt >= VISIT_GAP_MS
}
