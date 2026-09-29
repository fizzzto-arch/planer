// Wspólny model eksportu planu - z niego rysujemy zdjęcie, PDF i arkusz Excela.
import { addDays, startOfWeek } from './dates'
import { semesterWeek } from './semesterWeek'
import {
  WEEKDAY_NAMES,
  filterByParity,
  formatClock,
  formatDateShort,
  noteLine,
  recurrenceLabel,
  semesterTitle,
  weekEntries,
  type ParityFilter,
  type Timetable,
  type TimetableEntry,
  type TimetableMeeting,
  type TimetableNote,
} from './timetable'
import { DEFAULT_TYPE_COLORS, type TypeColors } from './typeColors'
import { shortBuilding, typeLabel } from './usos'

export interface ExportOptions {
  scope: 'typical' | 'week' // typowy tydzień semestru albo konkretny tydzień
  parity: ParityFilter
  layout: 'landscape' | 'portrait' // zdjęcie: siatka albo lista dni (telefon)
  theme: 'light' | 'dark'
  showRoom: boolean
  showGroup: boolean
  title: string // pusty = nazwa semestru
  customNotes: string // własne uwagi, każda w osobnej linii
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  scope: 'typical',
  parity: 'both',
  layout: 'landscape',
  theme: 'light',
  showRoom: true,
  showGroup: true,
  title: '',
  customNotes: '',
}

const STORAGE_KEY = 'planer.export.v1'

export function loadExportOptions(): ExportOptions {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<ExportOptions>
    const d = DEFAULT_EXPORT_OPTIONS
    const pick = <T>(v: unknown, allowed: readonly T[], fallback: T) => (allowed.includes(v as T) ? (v as T) : fallback)
    return {
      scope: pick(raw.scope, ['typical', 'week'], d.scope),
      parity: pick(raw.parity, ['both', 'odd', 'even'], d.parity),
      layout: pick(raw.layout, ['landscape', 'portrait'], d.layout),
      theme: pick(raw.theme, ['light', 'dark'], d.theme),
      showRoom: typeof raw.showRoom === 'boolean' ? raw.showRoom : d.showRoom,
      showGroup: typeof raw.showGroup === 'boolean' ? raw.showGroup : d.showGroup,
      title: typeof raw.title === 'string' ? raw.title.slice(0, 80) : d.title,
      customNotes: typeof raw.customNotes === 'string' ? raw.customNotes.slice(0, 2000) : d.customNotes,
    }
  } catch {
    return DEFAULT_EXPORT_OPTIONS
  }
}

export function saveExportOptions(options: ExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch {
    // bez zapisu - opcje zostaną do przeładowania
  }
}

export interface ExportEntry extends TimetableEntry {
  course: string // nazwa do wyświetlenia (skrót, jeśli ustawiony)
  typeName: string // "Wykład"
  time: string // "8:15–10:00"
  meta: string // "Wykład · gr. 101"
  place: string // "s. 170 · EiTI"
  when: string // "tyg. nieparzyste · 13.10–8.12"
  color: string // "#rrggbb"
  lane: number // nakładające się zajęcia obok siebie
  lanes: number
}

export interface ExportDay {
  weekday: number
  name: string // "Poniedziałek"
  date: Date | null // konkretny tydzień
}

export interface ExportModel {
  title: string
  subtitle: string
  days: ExportDay[]
  entries: ExportEntry[]
  notes: string[]
  types: { type: string; name: string; color: string }[] // legenda
  firstMinute: number // zakres godzin siatki (pełne godziny)
  lastMinute: number
  fileBase: string // początek nazwy pliku
}

// Nakładające się zajęcia dzielą szerokość dnia na pasy (jak w widoku tygodnia).
export function layoutLanes(entries: Pick<TimetableEntry, 'id' | 'start' | 'end'>[]): Map<string, { lane: number; lanes: number }> {
  const out = new Map<string, { lane: number; lanes: number }>()
  const sorted = [...entries].sort((a, b) => a.start - b.start || a.end - b.end)
  let cluster: { id: string; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = -Infinity
  const flush = () => {
    for (const c of cluster) out.set(c.id, { lane: c.lane, lanes: laneEnds.length })
    cluster = []
    laneEnds = []
  }
  for (const e of sorted) {
    if (e.start >= clusterEnd) {
      flush()
      clusterEnd = -Infinity
    }
    let lane = laneEnds.findIndex((end) => end <= e.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(e.end)
    } else laneEnds[lane] = e.end
    cluster.push({ id: e.id, lane })
    clusterEnd = Math.max(clusterEnd, e.end)
  }
  flush()
  return out
}

// Uwagi automatyczne dla wybranego zakresu (w konkretnym tygodniu - tylko z tego tygodnia).
export function notesInScope(timetable: Timetable, options: Pick<ExportOptions, 'scope'>, weekStart: Date): TimetableNote[] {
  if (options.scope === 'typical') return timetable.notes
  const end = addDays(weekStart, 7)
  return timetable.notes.filter((n) => n.date < end && (n.dateTo ?? n.date) >= weekStart)
}

interface BuildInput {
  timetable: Timetable
  meetings: TimetableMeeting[]
  options: ExportOptions
  weekStart: Date
  hiddenNotes: Set<string>
  label: (course: string) => string
  colors: TypeColors
}

export function buildExportModel({ timetable, meetings, options, weekStart, hiddenNotes, label, colors }: BuildInput): ExportModel {
  const week = options.scope === 'week'
  const base = week ? weekEntries(meetings, startOfWeek(weekStart)) : filterByParity(timetable.entries, options.parity)
  const colorOf = (type: string) => colors[type] ?? DEFAULT_TYPE_COLORS[type] ?? DEFAULT_TYPE_COLORS.INNE

  const lanesByDay = new Map<number, Map<string, { lane: number; lanes: number }>>()
  for (const wd of new Set(base.map((e) => e.weekday))) lanesByDay.set(wd, layoutLanes(base.filter((e) => e.weekday === wd)))

  const entries: ExportEntry[] = base.map((e) => {
    const typeName = typeLabel(e.type)
    const building = shortBuilding(e.building)
    const { lane, lanes } = lanesByDay.get(e.weekday)!.get(e.id)!
    return {
      ...e,
      course: label(e.courseName),
      typeName,
      time: `${formatClock(e.start)}–${formatClock(e.end)}`,
      meta: [typeName, options.showGroup && e.groupNumber !== null ? `gr. ${e.groupNumber}` : ''].filter(Boolean).join(' · '),
      place: options.showRoom ? [e.room ? `s. ${e.room}` : '', building ?? ''].filter(Boolean).join(' · ') : '',
      when: recurrenceLabel(e),
      color: colorOf(e.type),
      lane,
      lanes,
    }
  })

  const hasWeekend = (wd: number) => entries.some((e) => e.weekday === wd)
  const monday = startOfWeek(weekStart)
  const days: ExportDay[] = [1, 2, 3, 4, 5, 6, 7]
    .filter((wd) => wd <= 5 || hasWeekend(wd))
    .map((wd) => ({ weekday: wd, name: WEEKDAY_NAMES[wd - 1], date: week ? addDays(monday, wd - 1) : null }))

  const notes = [
    ...notesInScope(timetable, options, monday)
      .filter((n) => !hiddenNotes.has(n.id))
      .map(noteLine),
    ...options.customNotes
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  ]

  const semName = semesterTitle(timetable.semester)
  const sw = week ? semesterWeek(monday, meetings) : null
  const subtitle = week
    ? `Tydzień ${formatDateShort(monday)}–${formatDateShort(addDays(monday, 6))}${sw ? ` · ${sw.number}. tydzień, ${sw.odd ? 'nieparzysty' : 'parzysty'}` : ''}`
    : options.parity === 'odd'
      ? 'Tygodnie nieparzyste'
      : options.parity === 'even'
        ? 'Tygodnie parzyste'
        : 'Typowy tydzień'

  const firstMinute = Math.min(8 * 60, ...entries.map((e) => Math.floor(e.start / 60) * 60))
  const lastMinute = Math.max(16 * 60, ...entries.map((e) => Math.ceil(e.end / 60) * 60))

  const types = [...new Set(entries.map((e) => e.type))].map((type) => ({ type, name: typeLabel(type), color: colorOf(type) }))

  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  const fileBase = week
    ? `plan-${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    : `plan-${slug(semName)}${options.parity === 'both' ? '' : options.parity === 'odd' ? '-nieparzyste' : '-parzyste'}`

  return {
    title: options.title.trim() || semName,
    subtitle,
    days,
    entries,
    notes,
    types,
    firstMinute,
    lastMinute,
    fileBase,
  }
}
