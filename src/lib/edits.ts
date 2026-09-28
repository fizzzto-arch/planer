// Nakładanie ręcznych zmian i własnych zajęć na plan z USOS.
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

function applyChange(m: Meeting, change: MeetingOverride): Meeting {
  const day = (change.date && parseDateKey(change.date)) || startOfDay(m.start)
  return {
    ...m,
    start: withTime(day, change.startTime ?? toTimeKey(m.start)),
    end: withTime(day, change.endTime ?? toTimeKey(m.end)),
    room: change.room ?? m.room,
    cancelled: change.cancelled ?? m.cancelled,
  }
}

function expandCustomMeetings(customs: Extras['customMeetings']): Meeting[] {
  const out: Meeting[] = []
  for (const c of customs) {
    const first = parseDateKey(c.date)
    if (!first) continue
    const until = c.repeatWeeklyUntil ? parseDateKey(c.repeatWeeklyUntil) : null
    for (let i = 0; i < MAX_REPEATS; i++) {
      const day = addDays(first, 7 * i)
      if (i > 0 && (!until || day > until)) break
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

export function applyEdits(
  meetings: Meeting[],
  extras: Pick<Extras, 'meetingEdits' | 'seriesEdits' | 'customMeetings'>,
): PlanMeeting[] {
  const customs = expandCustomMeetings(extras.customMeetings)
  const all = [...meetings, ...customs]

  return all
    .map((m): PlanMeeting => {
      let result = m
      let edited = false

      const key = seriesKey(m)
      const series = key ? extras.seriesEdits.get(key) : undefined
      if (series && (series.room || series.startTime || series.endTime)) {
        result = applyChange(result, {
          room: series.room ?? undefined,
          startTime: series.startTime ?? undefined,
          endTime: series.endTime ?? undefined,
        })
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
  values: Pick<MeetingFormValues, 'startTime' | 'endTime' | 'room'>,
): SeriesEdit {
  const room = values.room.trim()
  return {
    id,
    room: room && room !== (original.room ?? '') ? room : null,
    startTime: values.startTime !== toTimeKey(original.start) ? values.startTime : null,
    endTime: values.endTime !== toTimeKey(original.end) ? values.endTime : null,
  }
}
