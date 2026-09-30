// Kalendarz akademicki PW (dni wolne, przerwy, sesja) z USOS API. API wymaga klucza aplikacji,
// którego nie wolno umieszczać w stronie - kalendarz pobiera wdrożenie (scripts/usos-calendar.ts)
// i publikuje obok strony jako calendar.json. Czyta go też Node - importy tylko z .ts.
import { getLanguage, msg, t, tk } from './i18n.ts'

export interface CalendarEvent {
  start: string // "2026-11-11"
  end: string // "2026-11-11" (włącznie)
  type: string // public_holidays, holidays, rector, break, exam_session...
  dayOff: boolean
  name: string
  nameEn?: string // nazwa angielska z USOS (jeśli jest)
}

export interface AcademicCalendar {
  fetchedAt: string
  events: CalendarEvent[]
}

// Surowe wydarzenie z USOS -> nasze (null = pomijamy: bez daty albo nieistotne dla planu).
export function parseUsosEvent(raw: Record<string, unknown>): CalendarEvent | null {
  const start = typeof raw.start_date === 'string' ? raw.start_date.slice(0, 10) : ''
  const end = typeof raw.end_date === 'string' ? raw.end_date.slice(0, 10) : start
  const names = raw.name as { pl?: string; en?: string } | undefined
  const name = names?.pl?.trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !name) return null
  const event: CalendarEvent = { start, end: end || start, type: typeof raw.type === 'string' ? raw.type : '', dayOff: raw.is_day_off === true, name }
  const nameEn = names?.en?.trim()
  if (nameEn) event.nameEn = nameEn
  return event
}

// Te same wydarzenia z kilku wydziałów (EiTI, Mechatronika) i miesięcy - bez powtórzeń.
export function dedupeEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>()
  for (const e of events) seen.set(`${e.start}|${e.end}|${e.name}`, e)
  return [...seen.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
}

// Co pokazać przy dniu: jedna etykieta. Najpierw konkretne dni wolne (święto, dzień rektorski),
// potem sesja, na końcu dłuższe przerwy (wakacje). Wydarzenia bez wolnego i spoza sesji pomijamy.
const RANK: Record<string, number> = { public_holidays: 0, holidays: 0, rector: 1, exam_session: 2, break: 3 }

export function dayLabel(events: CalendarEvent[], dateKey: string): CalendarEvent | null {
  const matching = events.filter(
    (e) => e.start <= dateKey && dateKey <= e.end && (e.dayOff || e.type === 'exam_session'),
  )
  matching.sort((a, b) => (RANK[a.type] ?? 4) - (RANK[b.type] ?? 4))
  return matching[0] ?? null
}

// Krótka etykieta do wąskich miejsc (nagłówek kolumny w siatce tygodnia) - pełna nazwa w podpowiedzi.
export function shortDayLabel(event: CalendarEvent): string {
  if (event.type === 'exam_session') return t('Sesja')
  if (event.type === 'public_holidays' || event.type === 'holidays') return t('Święto')
  if (/rejestr/i.test(event.name)) return t('Rejestracja')
  if (/wakacje|ferie/i.test(event.name)) return t('Wakacje')
  return t('Wolne')
}

// Nazwy z kalendarza PW - USOS nie podaje ich po angielsku, więc tłumaczymy sami (słownik).
// Lista tylko po to, żeby test wymagał tłumaczenia każdej z nich.
export const KNOWN_EVENT_NAMES = [
  msg('Wakacje letnie'),
  msg('Święto Wojska Polskiego, Wniebowzięcie Najświętszej Maryi Panny'),
  msg('Jesienna sesja egzaminacyjna'),
  msg('Okres rejestracyjny'),
  msg('Ostatni dzień roku akademickiego'),
  msg('Uroczysta inauguracja roku akademickiego'),
  msg('Dzień Wszystkich Świętych'),
  msg('Narodowe Święto Niepodległości'),
  msg('Dzień PW'),
  msg('Wigilia'),
  msg('Wakacje zimowe'),
  msg('Boże Narodzenie, pierwszy dzień świąt'),
  msg('Boże Narodzenie, drugi dzień świąt'),
  msg('Nowy Rok'),
  msg('Trzech Króli (Objawienie Pańskie)'),
  msg('Zimowa sesja egzaminacyjna'),
  msg('Wakacje wiosenne'),
  msg('Letnia sesja egzaminacyjna'),
]

// Pełna nazwa w języku interfejsu: angielska z USOS, nasze tłumaczenie albo - dla nazwy, której
// jeszcze nie znamy - rodzaj dnia po angielsku z polską nazwą w nawiasie.
export function eventName(event: CalendarEvent): string {
  if (getLanguage() !== 'en') return event.name
  if (event.nameEn) return event.nameEn
  const translated = tk(event.name)
  return translated !== event.name ? translated : `${shortDayLabel(event)} (${event.name})`
}
