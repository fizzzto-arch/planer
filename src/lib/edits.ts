// Nakładanie ręcznych zmian i własnych zajęć na plan z USOS. Używa go też serwer powiadomień
// (Node, scripts/send-reminders.ts) - importy wykonywalne tylko z .ts.
import { matchesClassDates, parityMatches, weekNumbers, type WeekOf } from './classDates.ts'
import { addDays, parseDateKey, startOfDay, startOfWeek, toDateKey, toTimeKey, withTime } from './dates.ts'
import { seriesKey, type CustomMeeting, type MeetingOverride, type PlanEdits, type SeriesEdit } from './planEdits.ts'
import type { Meeting } from './usos.ts'

export interface PlanMeeting extends Meeting {
  edited: boolean // zmienione ręcznie względem USOS
  custom: boolean // dodane ręcznie, nie ma ich w USOS
  note: string
  original: Meeting | null // wersja sprzed zmian (tylko gdy edited)
}

// Własne cotygodniowe zajęcia nie mogą się rozwinąć w nieskończoność.
const MAX_REPEATS = 60

export const CUSTOM_ID_PREFIX = 'custom:'
// Terminy grupy dorobione z "co tydzień od–do" (w USOS ich nie ma): series:{klucz grupy}:{dzień}.
export const SERIES_ID_PREFIX = 'series:'

// Dzień tygodnia: 1 = poniedziałek ... 7 = niedziela.
export const weekdayOf = (d: Date) => ((d.getDay() + 6) % 7) + 1

// Stała zmiana grupy (dzień, godziny, sala) jako zmiana tych zajęć; null - nie dotyczy ich.
// Zmiana z dniem tygodnia dotyczy zajęć grupy z jednego dnia (fromWeekday), starsze - wszystkich.
export function seriesOverride(start: Date, series: SeriesEdit | undefined): MeetingOverride | null {
  if (!series) return null
  if (series.fromWeekday && weekdayOf(start) !== series.fromWeekday) return null
  if (!series.room && !series.startTime && !series.endTime && !series.weekday && !series.online) return null
  const day = series.weekday ? addDays(startOfDay(start), series.weekday - weekdayOf(start)) : null
  return {
    date: day ? toDateKey(day) : undefined,
    room: series.room ?? undefined,
    startTime: series.startTime ?? undefined,
    endTime: series.endTime ?? undefined,
    online: series.online || undefined,
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
  if (change.online !== undefined) (changed as T & { online: boolean }).online = change.online
  return changed
}

// Dni własnych zajęć: wybrane dni albo co tydzień od pierwszych do "do kiedy" (też tylko parzyste
// albo nieparzyste tygodnie semestru), albo jeden dzień.
export function customMeetingDays(c: CustomMeeting, weekOf: WeekOf): Date[] {
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

function expandCustomMeetings(customs: CustomMeeting[], weekOf: WeekOf): Meeting[] {
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
        online: c.online === true,
      })
    }
  }
  return out
}

// Terminy grupy co tydzień w zakresie (np. laboratorium od teraz przez 5 tygodni) - także tam, gdzie USOS
// ich nie ma (podaje np. laboratorium od listopada, a naprawdę jest od teraz). Termin z USOS z danego dnia
// zostaje (z notatką i zmianami), brakujący dorabiamy na wzór zajęć grupy. Zakres i tygodnie liczą się
// według dnia, w którym zajęcia naprawdę są (po stałej zmianie dnia tygodnia).
function weeklyInRange(series: SeriesEdit, template: Meeting, members: Meeting[], weekOf: WeekOf): Meeting[] {
  const range = series.dates
  if (range?.kind !== 'range') return []
  const from = parseDateKey(range.from)
  const to = parseDateKey(range.to)
  if (!from || !to) return []
  const usosDay = weekdayOf(template.start)
  const heldDay = series.weekday ?? usosDay
  const byDay = new Map(members.map((m) => [toDateKey(m.start), m]))
  const out: Meeting[] = []
  for (let i = 0, week = startOfWeek(from); i < MAX_REPEATS && week <= to; i++, week = addDays(week, 7)) {
    const day = addDays(week, usosDay - 1) // dzień jak w USOS - zmianę dnia nakłada potem seriesOverride
    const held = addDays(week, heldDay - 1)
    if (held < from || held > to || !parityMatches(range.weeks, held, weekOf)) continue
    out.push(
      byDay.get(toDateKey(day)) ?? {
        ...template,
        id: `${SERIES_ID_PREFIX}${series.id}:${toDateKey(day)}`,
        start: withTime(day, toTimeKey(template.start)),
        end: withTime(day, toTimeKey(template.end)),
        cancelled: false,
      },
    )
  }
  return out
}

// Wzór do dorabiania: zajęcia grupy w najczęstszych godzinach (jednorazowe przesunięcie w USOS nie przenosi
// dorobionych terminów), przy remisie późniejsze.
function usualMeeting(members: Meeting[]): Meeting | undefined {
  const hours = (m: Meeting) => `${toTimeKey(m.start)}-${toTimeKey(m.end)}`
  const count = new Map<string, number>()
  for (const m of members) count.set(hours(m), (count.get(hours(m)) ?? 0) + 1)
  let best: Meeting | undefined
  for (const m of members) if (!best || count.get(hours(m))! >= count.get(hours(best))!) best = m
  return best
}

// Zajęcia z USOS według wybranych dat grup: "wybrane dni" - tylko te terminy z USOS, "co tydzień od–do" -
// każdy (wybrany) tydzień zakresu (weeklyInRange). Wzór grupy spoza listy (patterns) - gdy jej terminów
// nie ma w liście (serwer zna tylko najbliższe tygodnie planu).
function withSeriesDates(meetings: Meeting[], seriesEdits: PlanEdits['seriesEdits'], weekOf: WeekOf, patterns: Meeting[]): Meeting[] {
  const inRange = new Map<string, Meeting[]>() // klucz grupy -> jej terminy, których dotyczy "co tydzień od–do"
  const applies = (m: Meeting, series: SeriesEdit) => !series.fromWeekday || weekdayOf(m.start) === series.fromWeekday
  const out: Meeting[] = []
  for (const m of meetings) {
    const key = seriesKey(m)
    const series = key ? seriesEdits.get(key) : undefined
    if (!series?.dates || !applies(m, series)) out.push(m)
    else if (series.dates.kind === 'dates') {
      if (matchesClassDates(series.dates, m.start, weekOf)) out.push(m)
    } else inRange.set(series.id, [...(inRange.get(series.id) ?? []), m])
  }
  for (const series of seriesEdits.values()) {
    if (series.dates?.kind !== 'range') continue
    const members = (inRange.get(series.id) ?? []).sort((a, b) => a.start.getTime() - b.start.getTime())
    // Bez żadnych zajęć tej grupy w planie (np. zmiana grupy w USOS) - nic nie dorabiamy.
    const template = usualMeeting(members) ?? patterns.find((p) => seriesKey(p) === series.id && applies(p, series))
    if (template) out.push(...weeklyInRange(series, template, members, weekOf))
  }
  return out
}

// weekOf: numery tygodni (parzyste/nieparzyste) - domyślnie z planu z USOS, jak "tydzień 2 · parzysty"
// w Planerze; serwer, który zna tylko najbliższe tygodnie, podaje je z zapamiętanego planu, a do tego
// wzory grup z całego planu (patterns) - do dorabiania terminów "co tydzień od–do".
export function applyEdits(
  meetings: Meeting[],
  extras: PlanEdits,
  weekOf: WeekOf = weekNumbers(meetings),
  patterns: Meeting[] = [],
): PlanMeeting[] {
  const customs = expandCustomMeetings(extras.customMeetings, weekOf)
  const all = [...withSeriesDates(meetings, extras.seriesEdits, weekOf, patterns), ...customs]

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

      // Online: bez sali i budynku (np. bez "zmiany budynku" między zajęciami); sala z USOS zostaje w original.
      if (result.online) result = { ...result, room: null, building: null, address: null }

      const custom = m.id.startsWith(CUSTOM_ID_PREFIX)
      // Dorobione z "co tydzień od–do": zmienione względem USOS, ale bez wersji z USOS do pokazania.
      const generated = m.id.startsWith(SERIES_ID_PREFIX)
      return {
        ...result,
        edited: (edited || generated) && !custom,
        custom,
        note: edit?.note ?? '',
        original: edited && !custom && !generated ? m : null,
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
  online?: boolean
}

// Zajęcia ze zmianą serii, ale bez zmiany pojedynczej - punkt odniesienia dla formularza.
export function seriesBase(original: Meeting, extras: Pick<PlanEdits, 'seriesEdits'>): Meeting {
  const key = seriesKey(original)
  const series = seriesOverride(original.start, key ? extras.seriesEdits.get(key) : undefined)
  if (!series) return original
  const changed = applyChange(original, series)
  return changed.online ? { ...changed, room: null, building: null, address: null } : changed
}

// Zapisujemy tylko pola różne od punktu odniesienia, żeby reszta dalej szła za USOS-em.
export function buildOverride(base: Meeting, values: MeetingFormValues): MeetingOverride | null {
  const override: MeetingOverride = {}
  if (values.date !== toDateKey(base.start)) override.date = values.date
  if (values.startTime !== toTimeKey(base.start)) override.startTime = values.startTime
  if (values.endTime !== toTimeKey(base.end)) override.endTime = values.endTime
  const online = values.online ?? false
  const room = values.room.trim()
  if (!online && room && room !== (base.room ?? '')) override.room = room
  if (values.cancelled !== base.cancelled) override.cancelled = values.cancelled
  if (online !== (base.online ?? false)) override.online = online
  return Object.keys(override).length > 0 ? override : null
}

export function buildSeriesEdit(
  id: string,
  original: Meeting,
  values: Pick<MeetingFormValues, 'startTime' | 'endTime' | 'room' | 'online'> & { weekday: number },
): SeriesEdit {
  const room = values.online ? '' : values.room.trim()
  const fromWeekday = weekdayOf(original.start)
  return {
    id,
    room: room && room !== (original.room ?? '') ? room : null,
    startTime: values.startTime !== toTimeKey(original.start) ? values.startTime : null,
    endTime: values.endTime !== toTimeKey(original.end) ? values.endTime : null,
    weekday: values.weekday !== fromWeekday ? values.weekday : null,
    fromWeekday,
    online: values.online ? true : null,
  }
}
