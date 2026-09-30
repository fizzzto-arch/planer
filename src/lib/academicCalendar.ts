// Kalendarz akademicki PW (dni wolne, przerwy, sesja) z USOS API. API wymaga klucza aplikacji,
// którego nie wolno umieszczać w stronie - kalendarz pobiera wdrożenie (scripts/usos-calendar.ts)
// i publikuje obok strony jako calendar.json. Bez importów - czyta go też Node.

export interface CalendarEvent {
  start: string // "2026-11-11"
  end: string // "2026-11-11" (włącznie)
  type: string // public_holidays, holidays, rector, break, exam_session...
  dayOff: boolean
  name: string
}

export interface AcademicCalendar {
  fetchedAt: string
  events: CalendarEvent[]
}

// Surowe wydarzenie z USOS -> nasze (null = pomijamy: bez daty albo nieistotne dla planu).
export function parseUsosEvent(raw: Record<string, unknown>): CalendarEvent | null {
  const start = typeof raw.start_date === 'string' ? raw.start_date.slice(0, 10) : ''
  const end = typeof raw.end_date === 'string' ? raw.end_date.slice(0, 10) : start
  const name = (raw.name as { pl?: string } | undefined)?.pl?.trim() ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !name) return null
  return { start, end: end || start, type: typeof raw.type === 'string' ? raw.type : '', dayOff: raw.is_day_off === true, name }
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
  if (event.type === 'exam_session') return 'Sesja'
  if (event.type === 'public_holidays' || event.type === 'holidays') return 'Święto'
  if (/rejestr/i.test(event.name)) return 'Rejestracja'
  if (/wakacje|ferie/i.test(event.name)) return 'Wakacje'
  return 'Wolne'
}
