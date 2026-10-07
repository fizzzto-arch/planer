// Nakładanie ręcznych zmian i własnych zajęć na plan z USOS.
import { matchesClassDates, parityMatches, weekNumbers, type WeekOf } from './classDates'
import { addDays, parseDateKey, startOfDay, toDateKey, toTimeKey, withTime } from './dates'
import { seriesKey, type Extras, type MeetingOverride, type SeriesEdit } from './extras'
import type { Meeting } from './usos'

export interface PlanMeeting extends Meeting {
  edited: boolean // zmienione ręcznie względem USOS
  custom: boolean // dodane ręcznie, nie ma ich w USOS
  note: string
  original: Meeting | null // wersja sprzed zmian (tylko gdy edited)
}

// Własne cotygodniowe zajęcia nie mogą się rozwinąć w nieskończoność.
const MAX_REPEATS = 60

export const CUSTOM_ID_PREFIX = 'custom:'

// Dzień tygodnia: 1 = poniedziałek ... 7 = niedziela.
export const weekdayOf = (d: Date) => ((d.getDay() + 6) % 7) + 1

// Stała zmiana grupy (dzień, godziny, sala) jako zmiana tych zajęć; null - nie dotyczy ich.
// Zmiana z dniem tygodnia dotyczy zajęć grupy z jednego dnia (fromWeekday), starsze - wszystkich.
export function seriesOverride(start: Date, series: SeriesEdit | undefined): MeetingOverride | null {
  if (!series) return null
  if (series.fromWeekday && weekdayOf(start) !== series.fromWeekday) return null
  if (!series.room && !series.startTime && !series.endTime && !series.weekday) return null
  const day = series.weekday ? addDays(startOfDay(start), series.weekday - weekdayOf(start)) : null
  return {
    date: day ? toDateKey(day) : undefined,
    room: series.room ?? undefined,
    startTime: series.startTime ?? undefined,
    endTime: series.endTime ?? undefined,
  }
}

// Zajęcia po zmianie (też terminy z optymalizatora - bez pola "odwołane").
export function applyChange<T extends Pick<Meeting, 'start' | 'end' | 'room'>>(m: T, change: MeetingOverride): T {
  const day = (change.date && parseDateKey(change.date)) || startOfDay(m.start)
  const changed: T = {
    ...m,
    start: withTime(day, change.startTime ?? toTimeKey(m.start)),
    end: withTime(day, change.endTime ?? toTimeKey(m.end)),
    room: change.room ?? m.room,
  }
  if (change.cancelled !== undefined) (changed as T & { cancelled: boolean }).cancelled = change.cancelled
  return changed
}

// Dni własnych zajęć: wybrane dni albo co tydzień od pierwszych do "do kiedy" (też tylko parzyste
// albo nieparzyste tygodnie semestru), albo jeden dzień.
export function customMeetingDays(c: Extras['customMeetings'][number], weekOf: WeekOf): Date[] {
  if (c.dates && c.dates.length > 0) return c.dates.flatMap((d) => parseDateKey(d) ?? [])
  const first = parseDateKey(c.date)
  if (!first) return []
  const until = c.repeatWeeklyUntil ? parseDateKey(c.repeatWeeklyUntil) : null
  if (!until) return [first]
  const days: Date[] = []
  for (let i = 0; i < MAX_REPEATS; i++) {
    const day = addDays(first, 7 * i)
    if (day > until) break
    if (parityMatches(c.weeks ?? 'all', day, weekOf)) days.push(day)
  }
  return days
}

function expandCustomMeetings(customs: Extras['customMeetings'], weekOf: WeekOf): Meeting[] {
  const out: Meeting[] = []
  for (const c of customs) {
    for (const day of customMeetingDays(c, weekOf)) {
      out.push({
        id: `${CUSTOM_ID_PREFIX}${c.id}:${toDateKey(day)}`,
        courseName: c.courseName,
        type: c.type,
        start: withTime(day, c.startTime),
        end: withTime(day, c.endTime),
        room: c.room,
        building: null,
        address: null,
        groupNumber: null,
        unitId: null,
        usosUrl: null,
        cancelled: false,
      })
    }
  }
  return out
}

// Zajęcia z USOS, których według zmiany grupy nie ma (np. laboratorium tylko w wybrane tygodnie).
function heldPerSeries(m: Meeting, seriesEdits: Extras['seriesEdits'], weekOf: WeekOf): boolean {
  const key = seriesKey(m)
  const series = key ? seriesEdits.get(key) : undefined
  if (!series?.dates) return true
  if (series.fromWeekday && weekdayOf(m.start) !== series.fromWeekday) return true
  return matchesClassDates(series.dates, m.start, weekOf)
}

export function applyEdits(
  meetings: Meeting[],
  extras: Pick<Extras, 'meetingEdits' | 'seriesEdits' | 'customMeetings'>,
): PlanMeeting[] {
  // Numery tygodni (parzyste/nieparzyste) z planu z USOS - jak "tydz. 2 · parzysty" w Planerze.
  const weekOf = weekNumbers(meetings)
  const customs = expandCustomMeetings(extras.customMeetings, weekOf)
  const all = [...meetings.filter((m) => heldPerSeries(m, extras.seriesEdits, weekOf)), ...customs]

  return all
    .map((m): PlanMeeting => {
      let result = m
      let edited = false

      const key = seriesKey(m)
      const series = seriesOverride(m.start, key ? extras.seriesEdits.get(key) : undefined)
      if (series) {
        result = applyChange(result, series)
        edited = true
      }

      const edit = extras.meetingEdits.get(m.id)
      if (edit?.override) {
        result = applyChange(result, edit.override)
        edited = true
      }

      const custom = m.id.startsWith(CUSTOM_ID_PREFIX)
      return {
        ...result,
        edited: edited && !custom,
        custom,
        note: edit?.note ?? '',
        original: edited && !custom ? m : null,
      }
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

// Id własnych zajęć (dokumentu w chmurze) z id pojedynczego terminu.
export function customMeetingId(meetingId: string): string | null {
  if (!meetingId.startsWith(CUSTOM_ID_PREFIX)) return null
  return meetingId.slice(CUSTOM_ID_PREFIX.length).split(':')[0] || null
}

// ---------- Budowanie zmian z formularza ----------

export interface MeetingFormValues {
  date: string
  startTime: string
  endTime: string
  room: string
  cancelled: boolean
}

// Zajęcia ze zmianą serii, ale bez zmiany pojedynczej - punkt odniesienia dla formularza.
export function seriesBase(original: Meeting, extras: Pick<Extras, 'seriesEdits'>): Meeting {
  return applyEdits([original], { seriesEdits: extras.seriesEdits, meetingEdits: new Map(), customMeetings: [] })[0]
}

// Zapisujemy tylko pola różne od punktu odniesienia, żeby reszta dalej szła za USOS-em.
export function buildOverride(base: Meeting, values: MeetingFormValues): MeetingOverride | null {
  const override: MeetingOverride = {}
  if (values.date !== toDateKey(base.start)) override.date = values.date
  if (values.startTime !== toTimeKey(base.start)) override.startTime = values.startTime
  if (values.endTime !== toTimeKey(base.end)) override.endTime = values.endTime
  const room = values.room.trim()
  if (room && room !== (base.room ?? '')) override.room = room
  if (values.cancelled !== base.cancelled) override.cancelled = values.cancelled
  return Object.keys(override).length > 0 ? override : null
}

export function buildSeriesEdit(
  id: string,
  original: Meeting,
  values: Pick<MeetingFormValues, 'startTime' | 'endTime' | 'room'> & { weekday: number },
): SeriesEdit {
  const room = values.room.trim()
  const fromWeekday = weekdayOf(original.start)
  return {
    id,
    room: room && room !== (original.room ?? '') ? room : null,
    startTime: values.startTime !== toTimeKey(original.start) ? values.startTime : null,
    endTime: values.endTime !== toTimeKey(original.end) ? values.endTime : null,
    weekday: values.weekday !== fromWeekday ? values.weekday : null,
    fromWeekday,
  }
}
