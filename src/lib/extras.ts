// Własne dodatki użytkownika do planu, przechowywane na koncie (Firestore: users/{uid}/...).
import { isTimeKey, parseDateKey } from './dates'
import type { Meeting } from './usos'

export type DeadlineKind = 'kolokwium' | 'egzamin' | 'projekt' | 'inne'

export const DEADLINE_KINDS: { id: DeadlineKind; label: string }[] = [
  { id: 'kolokwium', label: 'Kolokwium' },
  { id: 'egzamin', label: 'Egzamin' },
  { id: 'projekt', label: 'Projekt' },
  { id: 'inne', label: 'Inne' },
]

export function deadlineKindLabel(kind: DeadlineKind): string {
  return DEADLINE_KINDS.find((k) => k.id === kind)?.label ?? 'Inne'
}

export interface Deadline {
  id: string
  courseName: string | null
  kind: DeadlineKind
  title: string
  date: string // "YYYY-MM-DD"
  time: string | null // "HH:MM"
  note: string
  done: boolean
}

export interface CourseLink {
  id: string
  title: string
  url: string
}

export interface CourseExtra {
  name: string
  note: string
  links: CourseLink[]
}

// Pola zmienione ręcznie w jednych zajęciach; brak pola = bez zmian.
export interface MeetingOverride {
  date?: string
  startTime?: string
  endTime?: string
  room?: string
  cancelled?: boolean
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
}

export interface CustomMeeting {
  id: string
  courseName: string
  type: string
  date: string
  startTime: string
  endTime: string
  room: string | null
  repeatWeeklyUntil: string | null
}

export interface Extras {
  courses: Map<string, CourseExtra> // klucz: courseKey
  deadlines: Deadline[]
  meetingEdits: Map<string, MeetingEdit>
  seriesEdits: Map<string, SeriesEdit>
  customMeetings: CustomMeeting[]
}

export const EMPTY_EXTRAS: Extras = {
  courses: new Map(),
  deadlines: [],
  meetingEdits: new Map(),
  seriesEdits: new Map(),
  customMeetings: [],
}

// Id dokumentu Firestore nie może zawierać "/", więc kodujemy nazwę.
export function courseKey(courseName: string): string {
  return encodeURIComponent(courseName.trim())
}

// Grupa zajęciowa w USOS = zajęcia (unitId) + numer grupy.
export function seriesKey(m: Pick<Meeting, 'unitId' | 'groupNumber'>): string | null {
  return m.unitId && m.groupNumber !== null ? `${m.unitId}-${m.groupNumber}` : null
}

export function isSafeUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url.trim())
}

// ---------- Odczyt dokumentów z chmury (dane mogą być niekompletne) ----------

type Raw = Record<string, unknown>

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const optStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const optTime = (v: unknown): string | null => (typeof v === 'string' && isTimeKey(v) ? v : null)
const optDate = (v: unknown): string | null => (typeof v === 'string' && parseDateKey(v) ? v : null)

export function parseDeadline(id: string, raw: Raw): Deadline | null {
  const date = optDate(raw.date)
  if (!date) return null
  const kind = DEADLINE_KINDS.some((k) => k.id === raw.kind) ? (raw.kind as DeadlineKind) : 'inne'
  return {
    id,
    courseName: optStr(raw.courseName),
    kind,
    title: str(raw.title),
    date,
    time: optTime(raw.time),
    note: str(raw.note),
    done: raw.done === true,
  }
}

export function parseCourse(raw: Raw): CourseExtra | null {
  const name = optStr(raw.name)
  if (!name) return null
  const links = Array.isArray(raw.links) ? raw.links : []
  return {
    name,
    note: str(raw.note),
    links: links
      .filter((l): l is Raw => typeof l === 'object' && l !== null)
      .map((l) => ({ id: str(l.id), title: str(l.title), url: str(l.url) }))
      .filter((l) => l.id && isSafeUrl(l.url)),
  }
}

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
    if (Object.keys(override).length === 0) override = null
  }
  return { id, note: str(raw.note), override }
}

export function parseSeriesEdit(id: string, raw: Raw): SeriesEdit {
  return { id, room: optStr(raw.room), startTime: optTime(raw.startTime), endTime: optTime(raw.endTime) }
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
  }
}
