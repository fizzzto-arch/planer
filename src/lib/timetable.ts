// Plan do eksportu: "typowy tydzień" semestru (każde zajęcia raz, z oznaczeniem, w które tygodnie)
// albo konkretny tydzień, plus uwagi wykrywane z planu (święta, zamiany dni, przerwy, zmiany).
import { addDays, startOfDay, startOfWeek, toDateKey } from './dates'
import { semesterAt, semesters, weekIndex, type Semester } from './semesterWeek'
import { typeLabel, type Meeting } from './usos'

export type TimetableMeeting = Pick<
  Meeting,
  'id' | 'courseName' | 'type' | 'start' | 'end' | 'room' | 'building' | 'groupNumber' | 'cancelled'
>

// 'weekly' - co tydzień, 'odd'/'even' - tygodnie nieparzyste/parzyste.
export type Recurrence = 'weekly' | 'odd' | 'even'

export interface TimetableEntry {
  id: string
  weekday: number // 1 = poniedziałek ... 7 = niedziela
  start: number // minuty od północy
  end: number
  courseName: string
  type: string
  groupNumber: number | null
  room: string | null
  building: string | null
  recurrence: Recurrence
  range: { from: Date; to: Date } | null // tylko część semestru
  only: Date[] | null // zajęcia tylko w te dni (1-2 terminy)
  date: Date | null // konkretny tydzień: dzień zajęć
}

export type NoteKind = 'free' | 'break' | 'swap' | 'change' | 'extra' | 'cancelled'

export interface TimetableNote {
  id: string
  kind: NoteKind
  date: Date
  dateTo: Date | null
  text: string // bez daty - datę dokłada noteLine()
}

export interface Timetable {
  semester: Semester
  entries: TimetableEntry[] // typowy tydzień
  notes: TimetableNote[]
}

export type ParityFilter = 'both' | 'odd' | 'even'

const WEEKDAY_SHORT = ['pn.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.']
export const WEEKDAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
// "zajęcia jak w ..." (biernik)
const WEEKDAY_AS = ['poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę', 'niedzielę']

// Seria ma co najmniej tyle terminów, żeby uznać ją za stałe zajęcia (mniej = zmiana/wyjątek).
const MIN_REGULAR = 3
// Seria krótsza o ponad tyle tygodni od semestru dostaje zakres dat ("22.10–19.11").
const RANGE_SLACK_WEEKS = 2

const weekdayOf = (d: Date) => ((d.getDay() + 6) % 7) + 1
const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

export function formatClock(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

export function formatDateShort(d: Date): string {
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const dayLabel = (d: Date) => `${formatDateShort(d)} (${WEEKDAY_SHORT[weekdayOf(d) - 1]})`

interface Series {
  key: string
  groupKey: string // przedmiot + typ + grupa
  weekday: number
  start: number
  end: number
  meetings: TimetableMeeting[]
  weeks: number[]
}

// Semestr do eksportu: ten, w którym jesteśmy, albo najbliższy (albo ostatni).
function pickSemester(list: Semester[], now: Date): Semester | null {
  return semesterAt(now, list) ?? list.find((s) => s.firstWeek >= startOfWeek(now)) ?? list[list.length - 1] ?? null
}

function mostCommon<T>(values: T[]): T {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function describe(m: Pick<TimetableMeeting, 'courseName' | 'type'>, label: (course: string) => string): string {
  return `${typeLabel(m.type)} – ${label(m.courseName)}`
}

export function buildTimetable(
  meetings: TimetableMeeting[],
  now: Date,
  label: (course: string) => string = (c) => c,
): Timetable | null {
  const semester = pickSemester(semesters(meetings), now)
  if (!semester) return null
  const from = semester.firstWeek
  const to = addDays(semester.lastWeek, 7)
  const inSemester = meetings.filter((m) => m.start >= from && m.start < to)
  const active = inSemester.filter((m) => !m.cancelled)
  const lastWeek = weekIndex(semester.lastWeek, semester)

  // Serie: te same zajęcia w tym samym dniu tygodnia i o tych samych godzinach.
  const byKey = new Map<string, Series>()
  for (const m of active) {
    const groupKey = `${m.courseName}|${m.type}|${m.groupNumber ?? ''}`
    const key = `${groupKey}|${weekdayOf(m.start)}|${minuteOf(m.start)}|${minuteOf(m.end)}`
    let s = byKey.get(key)
    if (!s) {
      s = { key, groupKey, weekday: weekdayOf(m.start), start: minuteOf(m.start), end: minuteOf(m.end), meetings: [], weeks: [] }
      byKey.set(key, s)
    }
    s.meetings.push(m)
    s.weeks.push(weekIndex(m.start, semester))
  }
  const all = [...byKey.values()].map((s) => {
    s.meetings.sort((a, b) => a.start.getTime() - b.start.getTime())
    s.weeks.sort((a, b) => a - b)
    return s
  })

  // Główna seria zajęć (najwięcej terminów) - krótkie serie obok niej to zmiany terminu.
  const main = new Map<string, Series>()
  for (const s of all) {
    const best = main.get(s.groupKey)
    if (!best || s.meetings.length > best.meetings.length) main.set(s.groupKey, s)
  }
  const isException = (s: Series) => {
    const m = main.get(s.groupKey)!
    return m !== s && s.meetings.length < MIN_REGULAR && m.meetings.length >= MIN_REGULAR
  }

  const entries: TimetableEntry[] = []
  const notes: TimetableNote[] = []
  const regular: { series: Series; recurrence: Recurrence }[] = []

  for (const s of all) {
    if (isException(s)) continue
    const n = s.weeks.length
    const odd = s.weeks.filter((w) => w % 2 === 1).length
    const recurrence: Recurrence =
      n >= MIN_REGULAR && odd / n >= 0.8 ? 'odd' : n >= MIN_REGULAR && (n - odd) / n >= 0.8 ? 'even' : 'weekly'
    const first = s.meetings[0]
    const last = s.meetings[s.meetings.length - 1]
    const partial = s.weeks[0] - 1 > RANGE_SLACK_WEEKS || lastWeek - s.weeks[n - 1] > RANGE_SLACK_WEEKS
    const only = n < MIN_REGULAR ? s.meetings.map((m) => startOfDay(m.start)) : null
    entries.push({
      id: s.key,
      weekday: s.weekday,
      start: s.start,
      end: s.end,
      courseName: first.courseName,
      type: first.type,
      groupNumber: first.groupNumber,
      room: mostCommon(s.meetings.map((m) => m.room)),
      building: mostCommon(s.meetings.map((m) => m.building)),
      recurrence,
      range: !only && partial ? { from: startOfDay(first.start), to: startOfDay(last.start) } : null,
      only,
      date: null,
    })
    if (n >= MIN_REGULAR) regular.push({ series: s, recurrence })

    // Zajęcia co 2 tygodnie, które wyjątkowo wypadły w drugim rodzaju tygodnia.
    if (recurrence !== 'weekly') {
      s.meetings.forEach((m, i) => {
        if ((s.weeks[i] % 2 === 1) !== (recurrence === 'odd')) {
          notes.push({ id: `extra:${s.key}:${toDateKey(m.start)}`, kind: 'extra', date: startOfDay(m.start), dateTo: null, text: `${describe(m, label)} (dodatkowo)` })
        }
      })
    }
  }

  // Dni, w których nie odbyły się żadne ze stałych zajęć: święto, przerwa albo zamiana dni.
  const onDay = new Map<string, TimetableMeeting[]>()
  for (const m of active) {
    const k = toDateKey(m.start)
    onDay.set(k, [...(onDay.get(k) ?? []), m])
  }
  const explained = new Set<TimetableMeeting>()
  const freeDays: Date[] = []
  const expectedOn = (day: Date) => {
    const wd = weekdayOf(day)
    const wk = weekIndex(day, semester)
    return regular.filter(({ series, recurrence }) => {
      if (series.weekday !== wd) return false
      if (day < startOfDay(series.meetings[0].start) || day > startOfDay(series.meetings[series.meetings.length - 1].start)) return false
      return recurrence === 'weekly' || (wk % 2 === 1) === (recurrence === 'odd')
    })
  }
  for (let day = new Date(from); day < to; day = addDays(day, 1)) {
    const expected = expectedOn(day)
    if (expected.length === 0) continue
    const present = onDay.get(toDateKey(day)) ?? []
    const anyExpected = expected.some(({ series }) => series.meetings.some((m) => toDateKey(m.start) === toDateKey(day)))
    if (anyExpected) continue
    if (present.length === 0) {
      freeDays.push(new Date(day))
      continue
    }
    // Są zajęcia, ale z innego dnia tygodnia - "piątek z planem środy".
    const movedFrom = present
      .map((m) => main.get(`${m.courseName}|${m.type}|${m.groupNumber ?? ''}`))
      .filter((s): s is Series => !!s && s.weekday !== weekdayOf(day) && s.meetings.length >= MIN_REGULAR)
      .map((s) => s.weekday)
    if (movedFrom.length > 0) {
      const wd = mostCommon(movedFrom)
      present.forEach((m) => explained.add(m))
      notes.push({ id: `swap:${toDateKey(day)}`, kind: 'swap', date: new Date(day), dateTo: null, text: `zajęcia jak w ${WEEKDAY_AS[wd - 1]}` })
    }
  }

  // Wolne dni obok siebie (także przez weekend) łączymy w przerwę.
  for (let i = 0; i < freeDays.length; ) {
    let j = i
    while (j + 1 < freeDays.length && onlyGapDays(freeDays[j], freeDays[j + 1], expectedOn)) j++
    const start = freeDays[i]
    const end = freeDays[j]
    notes.push({
      id: `free:${toDateKey(start)}`,
      kind: j > i ? 'break' : 'free',
      date: start,
      dateTo: j > i ? end : null,
      text: j > i ? 'przerwa, brak zajęć' : 'brak zajęć',
    })
    i = j + 1
  }

  // Pojedyncze zmiany terminu, których nie tłumaczy zamiana dni.
  for (const s of all) {
    if (!isException(s)) continue
    const m0 = main.get(s.groupKey)!
    for (const m of s.meetings) {
      if (explained.has(m)) continue
      const sameDay = m0.weekday === s.weekday
      const instead = sameDay
        ? `zamiast ${formatClock(m0.start)}–${formatClock(m0.end)}`
        : `zamiast ${WEEKDAY_SHORT[m0.weekday - 1]} ${formatClock(m0.start)}`
      notes.push({
        id: `change:${s.key}:${toDateKey(m.start)}`,
        kind: 'change',
        date: startOfDay(m.start),
        dateTo: null,
        text: `${describe(m, label)} ${formatClock(minuteOf(m.start))}–${formatClock(minuteOf(m.end))} (${instead})`,
      })
    }
  }

  // Zajęcia odwołane ręcznie w Planerze.
  for (const m of inSemester) {
    if (!m.cancelled) continue
    notes.push({ id: `cancelled:${m.id}`, kind: 'cancelled', date: startOfDay(m.start), dateTo: null, text: `${describe(m, label)} odwołane` })
  }

  notes.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id))
  entries.sort((a, b) => a.weekday - b.weekday || a.start - b.start || a.end - b.end)
  return { semester, entries, notes }
}

// Między dwoma wolnymi dniami są tylko dni bez stałych zajęć (np. weekend) - to jedna przerwa.
function onlyGapDays(a: Date, b: Date, expectedOn: (day: Date) => unknown[]): boolean {
  for (let d = addDays(a, 1); d < b; d = addDays(d, 1)) if (expectedOn(d).length > 0) return false
  return true
}

// Zajęcia z konkretnego tygodnia jako wpisy planu.
export function weekEntries(meetings: TimetableMeeting[], weekStart: Date): TimetableEntry[] {
  const end = addDays(weekStart, 7)
  return meetings
    .filter((m) => !m.cancelled && m.start >= weekStart && m.start < end)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((m) => ({
      id: m.id,
      weekday: weekdayOf(m.start),
      start: minuteOf(m.start),
      end: minuteOf(m.end),
      courseName: m.courseName,
      type: m.type,
      groupNumber: m.groupNumber,
      room: m.room,
      building: m.building,
      recurrence: 'weekly',
      range: null,
      only: null,
      date: startOfDay(m.start),
    }))
}

export function filterByParity(entries: TimetableEntry[], parity: ParityFilter): TimetableEntry[] {
  if (parity === 'both') return entries
  return entries.filter((e) => e.recurrence === 'weekly' || e.recurrence === parity)
}

// Kiedy odbywają się zajęcia, np. "tyg. nieparzyste · 13.10–8.12"; pusty = co tydzień przez cały semestr.
export function recurrenceLabel(e: TimetableEntry): string {
  if (e.date) return ''
  if (e.only) return `tylko ${e.only.map(formatDateShort).join(', ')}`
  const parts = [e.recurrence === 'odd' ? 'tyg. nieparzyste' : e.recurrence === 'even' ? 'tyg. parzyste' : '']
  if (e.range) parts.push(`${formatDateShort(e.range.from)}–${formatDateShort(e.range.to)}`)
  return parts.filter(Boolean).join(' · ')
}

// Uwaga z datą, np. "11.11 (śr.) – brak zajęć" / "24.12–6.01 – przerwa, brak zajęć".
export function noteLine(n: TimetableNote): string {
  const when = n.dateTo ? `${formatDateShort(n.date)}–${formatDateShort(n.dateTo)}` : dayLabel(n.date)
  return `${when} – ${n.text}`
}

// "Semestr zimowy 2026/27" / "Semestr letni 2026/27".
export function semesterTitle(s: Semester): string {
  const start = addDays(s.firstWeek, 4) // piątek pierwszego tygodnia - na pewno już w semestrze
  const y = start.getFullYear()
  const month = start.getMonth() + 1
  const winter = month >= 8 || month === 1
  const first = winter ? (month === 1 ? y - 1 : y) : y - 1
  return `Semestr ${winter ? 'zimowy' : 'letni'} ${first}/${String(first + 1).slice(2)}`
}
