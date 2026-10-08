// Ręczne zmiany planu: pojedyncze zajęcia, cała grupa (sala, godziny, dzień, wybrane daty) i własne
// zajęcia. Czyta je Planer (lib/extras.ts, useExtras) i serwer powiadomień (Node, scripts/send-reminders.ts),
// więc tylko importy z .ts i bez niczego z przeglądarki.
import { parseClassDates, parseDates, parseWeeks, type ClassDates, type WeekParity } from './classDates.ts'
import { isTimeKey, parseDateKey } from './dates.ts'
import type { Meeting } from './usos.ts'

// Pola zmienione ręcznie w jednych zajęciach; brak pola = bez zmian.
export interface MeetingOverride {
  date?: string
  startTime?: string
  endTime?: string
  room?: string
  cancelled?: boolean
  online?: boolean
}

export interface MeetingEdit {
  id: string // id zajęć (UID z USOS albo id własnych zajęć)
  note: string
  override: MeetingOverride | null
}

// Stała zmiana dla wszystkich zajęć jednej grupy.
export interface SeriesEdit {
  id: string // seriesKey
  room: string | null
  startTime: string | null
  endTime: string | null
  weekday?: number | null // nowy dzień tygodnia (1 = poniedziałek), w tym samym tygodniu
  // Których zajęć grupy dotyczy zmiana (dzień tygodnia w USOS). Brak - wszystkich (starsze zmiany).
  fromWeekday?: number | null
  // Kiedy zajęcia faktycznie są (np. laboratorium tylko w tyg. 10-14); pozostałe terminy znikają z planu.
  dates?: ClassDates | null
  online?: boolean | null // zajęcia grupy online (zamiast sali)
}

// Zmiana grupy bez żadnej zmiany (wszystko jak w USOS) - do usunięcia.
export function isEmptySeriesEdit(edit: Omit<SeriesEdit, 'id'>): boolean {
  return !edit.room && !edit.startTime && !edit.endTime && !edit.weekday && !edit.dates && !edit.online
}

export interface CustomMeeting {
  id: string
  courseName: string
  type: string
  date: string // pierwsze zajęcia (przy wybranych dniach - najwcześniejszy)
  startTime: string
  endTime: string
  room: string | null
  repeatWeeklyUntil: string | null // co tydzień od date do tego dnia (włącznie)
  weeks?: WeekParity // przy powtarzaniu: wszystkie, nieparzyste albo parzyste tygodnie semestru
  dates?: string[] | null // wybrane dni zamiast powtarzania
  online?: boolean
}

export interface PlanEdits {
  meetingEdits: Map<string, MeetingEdit>
  seriesEdits: Map<string, SeriesEdit>
  customMeetings: CustomMeeting[]
}

// Grupa zajęciowa w USOS = zajęcia (unitId) + numer grupy.
export function seriesKey(m: Pick<Meeting, 'unitId' | 'groupNumber'>): string | null {
  return m.unitId && m.groupNumber !== null ? `${m.unitId}-${m.groupNumber}` : null
}

// ---------- Odczyt dokumentów z chmury (dane mogą być niekompletne) ----------

export type Raw = Record<string, unknown>

export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
export const optStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
export const optTime = (v: unknown): string | null => (typeof v === 'string' && isTimeKey(v) ? v : null)
export const optDate = (v: unknown): string | null => (typeof v === 'string' && parseDateKey(v) ? v : null)
export const optWeekday = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7 ? v : null)

export function parseMeetingEdit(id: string, raw: Raw): MeetingEdit {
  const o = typeof raw.override === 'object' && raw.override !== null ? (raw.override as Raw) : null
  let override: MeetingOverride | null = null
  if (o) {
    override = {}
    const date = optDate(o.date)
    const startTime = optTime(o.startTime)
    const endTime = optTime(o.endTime)
    const room = optStr(o.room)
    if (date) override.date = date
    if (startTime) override.startTime = startTime
    if (endTime) override.endTime = endTime
    if (room) override.room = room
    if (typeof o.cancelled === 'boolean') override.cancelled = o.cancelled
    if (typeof o.online === 'boolean') override.online = o.online
    if (Object.keys(override).length === 0) override = null
  }
  return { id, note: str(raw.note), override }
}

export function parseSeriesEdit(id: string, raw: Raw): SeriesEdit {
  return {
    id,
    room: optStr(raw.room),
    startTime: optTime(raw.startTime),
    endTime: optTime(raw.endTime),
    weekday: optWeekday(raw.weekday),
    fromWeekday: optWeekday(raw.fromWeekday),
    dates: parseClassDates(raw.dates),
    online: raw.online === true ? true : null,
  }
}

export function parseCustomMeeting(id: string, raw: Raw): CustomMeeting | null {
  const date = optDate(raw.date)
  const startTime = optTime(raw.startTime)
  const endTime = optTime(raw.endTime)
  const courseName = optStr(raw.courseName)
  if (!date || !startTime || !endTime || !courseName) return null
  return {
    id,
    courseName,
    type: str(raw.type, 'INNE'),
    date,
    startTime,
    endTime,
    room: optStr(raw.room),
    repeatWeeklyUntil: optDate(raw.repeatWeeklyUntil),
    weeks: parseWeeks(raw.weeks),
    dates: parseDates(raw.dates).length > 0 ? parseDates(raw.dates) : null,
    online: raw.online === true,
  }
}

// Ręczne zmiany planu z dokumentów bazy - w Planerze (useExtras) i na serwerze powiadomień.
export function parsePlanEdits(
  raw: Partial<Record<'meetingEdits' | 'seriesEdits' | 'customMeetings', { id: string; data: Raw }[]>>,
): PlanEdits {
  return {
    meetingEdits: new Map((raw.meetingEdits ?? []).map((d) => [d.id, parseMeetingEdit(d.id, d.data)])),
    seriesEdits: new Map((raw.seriesEdits ?? []).map((d) => [d.id, parseSeriesEdit(d.id, d.data)])),
    customMeetings: (raw.customMeetings ?? []).flatMap((d) => parseCustomMeeting(d.id, d.data) ?? []),
  }
}
