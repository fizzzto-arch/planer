// Obserwowanie planu z USOS po stronie serwera: zapamiętane najbliższe tygodnie, porównanie
// z nową wersją (zmiany w planie) oraz plan dnia i przypomnienie przed pierwszymi zajęciami.
// Bez importów wykonywalnych - używa go skrypt w Node (scripts/send-reminders.ts).
import { matchesClassDates, parseClassDates, weekNumbers, type ClassDates } from './classDates.ts'
import { msg, pluralIn, translate, type Language } from './i18n.ts'
import type { Meeting } from './usos.ts'

// Zajęcia w zapamiętanym planie - tylko to, co potrzebne do porównania i powiadomień.
export interface WatchedMeeting {
  id: string
  course: string
  type: string
  start: number // ms
  end: number
  room: string | null
  cancelled: boolean
  // Grupa i tydzień semestru - do wyboru dat w zmianie grupy (np. laboratorium tylko w tyg. 10-14).
  // Starsze zapamiętane plany ich nie mają - wtedy zajęcia liczą się jak zwykle.
  unitId?: string | null
  groupNumber?: number | null
  week?: number | null
}

export const WATCH_DAYS = 21

export function snapshotPlan(meetings: Meeting[], now: Date, days = WATCH_DAYS): WatchedMeeting[] {
  const until = now.getTime() + days * 24 * 60 * 60 * 1000
  // Numer tygodnia liczony z całego planu (zapamiętujemy tylko najbliższe tygodnie - z nich by się nie dało).
  const weekOf = weekNumbers(meetings)
  return meetings
    .filter((m) => m.end.getTime() > now.getTime() && m.start.getTime() < until)
    .map((m) => ({
      id: m.id,
      course: m.courseName,
      type: m.type,
      start: m.start.getTime(),
      end: m.end.getTime(),
      room: m.room,
      cancelled: m.cancelled,
      unitId: m.unitId,
      groupNumber: m.groupNumber,
      week: weekOf(m.start),
    }))
}

// Wybór dat ze zmian grupy (users/{uid}/seriesEdits): które terminy grupy naprawdę są.
export interface SeriesDates {
  fromWeekday: number | null // zmiana dotyczy zajęć grupy z tego dnia tygodnia (null - wszystkich)
  dates: ClassDates
}

export function seriesDatesFrom(docs: { id: string; data: Record<string, unknown> }[]): Map<string, SeriesDates> {
  const map = new Map<string, SeriesDates>()
  for (const d of docs) {
    const dates = parseClassDates(d.data.dates)
    if (!dates) continue
    const day = d.data.fromWeekday
    map.set(d.id, { fromWeekday: typeof day === 'number' && day >= 1 && day <= 7 ? day : null, dates })
  }
  return map
}

// Plan zapamiętany przed dodaniem grupy i tygodnia: uzupełniamy je z nowej wersji (te same id zajęć) -
// inaczej terminy spoza wybranych dat raz wyglądałyby na odwołane.
export function withGroups(prev: WatchedMeeting[], next: WatchedMeeting[]): WatchedMeeting[] {
  const byId = new Map(next.map((m) => [m.id, m]))
  return prev.map((m) => {
    const fresh = byId.get(m.id)
    return m.unitId === undefined && fresh ? { ...m, unitId: fresh.unitId, groupNumber: fresh.groupNumber, week: fresh.week } : m
  })
}

// Czy zajęcia są według wyboru dat (bez wyboru albo bez danych grupy - tak).
export function heldPerSeriesDates(m: WatchedMeeting, series: Map<string, SeriesDates>): boolean {
  if (!m.unitId || m.groupNumber === null || m.groupNumber === undefined) return true
  const s = series.get(`${m.unitId}-${m.groupNumber}`)
  if (!s) return true
  const day = new Date(m.start)
  if (s.fromWeekday && ((day.getDay() + 6) % 7) + 1 !== s.fromWeekday) return true
  return matchesClassDates(s.dates, day, () => m.week ?? null)
}

export type PlanChange =
  | { kind: 'moved'; before: WatchedMeeting; after: WatchedMeeting }
  | { kind: 'room'; before: WatchedMeeting; after: WatchedMeeting }
  | { kind: 'cancelled'; before: WatchedMeeting }
  | { kind: 'added'; after: WatchedMeeting }

// Zmiany między starym a nowym planem - tylko w zajęciach, które jeszcze się nie zaczęły,
// i tylko w zasięgu starego planu (zajęcia dochodzące na końcu okna to nie zmiana).
export function diffPlans(prev: WatchedMeeting[], next: WatchedMeeting[], now: Date, prevUntil: number): PlanChange[] {
  const t = now.getTime()
  const inRange = (m: WatchedMeeting) => m.start > t && m.start < prevUntil
  const before = new Map(prev.filter(inRange).map((m) => [m.id, m]))
  const after = new Map(next.filter(inRange).map((m) => [m.id, m]))
  const changes: PlanChange[] = []
  for (const [id, b] of before) {
    const a = after.get(id)
    if (!a) {
      if (!b.cancelled) changes.push({ kind: 'cancelled', before: b })
    } else if (a.cancelled && !b.cancelled) {
      changes.push({ kind: 'cancelled', before: b })
    } else if (a.start !== b.start || a.end !== b.end) {
      changes.push({ kind: 'moved', before: b, after: a })
    } else if ((a.room ?? '') !== (b.room ?? '')) {
      changes.push({ kind: 'room', before: b, after: a })
    }
  }
  for (const [id, a] of after) if (!before.has(id) && !a.cancelled) changes.push({ kind: 'added', after: a })

  // Zniknęły jedne zajęcia i pojawiły się te same (przedmiot i typ) w ciągu tygodnia -
  // to przeniesienie, nawet jeśli USOS nadał nowy identyfikator.
  const WEEK = 7 * 24 * 60 * 60 * 1000
  for (const gone of changes.filter((c) => c.kind === 'cancelled' && !after.has(c.before.id))) {
    if (gone.kind !== 'cancelled') continue
    const twin = changes.find(
      (c): c is Extract<PlanChange, { kind: 'added' }> =>
        c.kind === 'added' &&
        c.after.course === gone.before.course &&
        c.after.type === gone.before.type &&
        Math.abs(c.after.start - gone.before.start) < WEEK,
    )
    if (!twin) continue
    changes.splice(changes.indexOf(twin), 1)
    const b = gone.before
    const a = twin.after
    // Sam nowy identyfikator (USOS czasem je zmienia) - te same godziny i sala to żadna zmiana.
    if (a.start === b.start && a.end === b.end) {
      if ((a.room ?? '') === (b.room ?? '')) changes.splice(changes.indexOf(gone), 1)
      else changes.splice(changes.indexOf(gone), 1, { kind: 'room', before: b, after: a })
    } else {
      changes.splice(changes.indexOf(gone), 1, { kind: 'moved', before: b, after: a })
    }
  }

  const when = (c: PlanChange) => ('after' in c ? c.after.start : c.before.start)
  return changes.sort((x, y) => when(x) - when(y))
}

// Nowy plan wygląda na niepełną odpowiedź USOS (np. chwilowy błąd) - nie porównujemy,
// żeby nie wysłać "wszystko odwołane".
export function looksBroken(prev: WatchedMeeting[], next: WatchedMeeting[], now: Date, prevUntil: number): boolean {
  const t = now.getTime()
  const count = (list: WatchedMeeting[]) => list.filter((m) => m.start > t && m.start < prevUntil && !m.cancelled).length
  const before = count(prev)
  return before >= 3 && count(next) < before * 0.3
}

const WEEKDAYS = [msg('niedz.'), msg('pon.'), msg('wt.'), msg('śr.'), msg('czw.'), msg('pt.'), msg('sob.')]

const clock = (ms: number) => {
  const d = new Date(ms)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
const day = (ms: number, lang: Language) => {
  const d = new Date(ms)
  return `${translate(lang, WEEKDAYS[d.getDay()])} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function changeLine(c: PlanChange, label: (course: string) => string, lang: Language): string {
  const m = 'after' in c ? c.after : c.before
  const what = `${label(m.course)} (${day(m.start, lang)})`
  switch (c.kind) {
    case 'moved': {
      const sameDay = new Date(c.before.start).toDateString() === new Date(c.after.start).toDateString()
      const to = sameDay
        ? `${clock(c.after.start)}–${clock(c.after.end)}`
        : `${day(c.after.start, lang)} ${clock(c.after.start)}`
      return `${label(m.course)} (${day(c.before.start, lang)} ${clock(c.before.start)}) → ${to}`
    }
    case 'room':
      return translate(lang, '{what}: sala {from} → {to}', { what, from: c.before.room ?? '?', to: c.after.room ?? '?' })
    case 'cancelled':
      return translate(lang, '{what} {time} - odwołane', { what, time: clock(m.start) })
    case 'added':
      return translate(lang, '{what} {time} - dodatkowe zajęcia', { what, time: clock(m.start) })
  }
}

const MAX_LINES = 3

// details: wszystkie zmiany - do historii powiadomień w Planerze (w powiadomieniu mieszczą się 3).
// lang: język odbiorcy (z jego ustawień).
export function changesText(
  changes: PlanChange[],
  label: (course: string) => string,
  lang: Language = 'pl',
): { title: string; body: string; details: string[] } {
  const all = changes.map((c) => changeLine(c, label, lang))
  const lines = all.slice(0, MAX_LINES)
  if (changes.length > MAX_LINES) {
    lines.push(translate(lang, 'i jeszcze {n} - szczegóły w Planerze', { n: changes.length - MAX_LINES }))
  }
  return {
    title:
      changes.length === 1
        ? translate(lang, 'Zmiana w planie')
        : translate(lang, 'Zmiany w planie ({n})', { n: changes.length }),
    body: lines.join('\n'),
    details: all,
  }
}

// Zajęcia danego dnia (bez odwołanych), od najwcześniejszych.
export function classesOn(plan: WatchedMeeting[], date: Date): WatchedMeeting[] {
  const key = date.toDateString()
  return plan.filter((m) => !m.cancelled && new Date(m.start).toDateString() === key).sort((a, b) => a.start - b.start)
}

// "Dziś 3 zajęcia, 8:15–14:00" / "Pierwsze: Radiologia, s. 014".
export function daySummaryText(
  classes: WatchedMeeting[],
  label: (course: string) => string,
  lang: Language = 'pl',
): { title: string; body: string } {
  const first = classes[0]
  const last = classes.reduce((a, b) => (b.end > a.end ? b : a))
  const n = classes.length
  // "zajęcia" nie ma liczby pojedynczej: jedne zajęcia, 2-4 zajęcia, 5+ zajęć (ale 22 zajęcia).
  const count =
    n === 1 ? translate(lang, 'jedne zajęcia') : `${n} ${pluralIn(lang, n, 'zajęcia', 'zajęcia', 'zajęć')}`
  const room = first.room ? translate(lang, ', s. {room}', { room: first.room }) : ''
  return {
    title: translate(lang, 'Dziś {count}, {from}–{to}', { count, from: clock(first.start), to: clock(last.end) }),
    body: translate(lang, 'Pierwsze: {course}{room} o {time}', { course: label(first.course), room, time: clock(first.start) }),
  }
}

// Minuty liczone w chwili wysyłki - uruchomienie na serwerze bywa spóźnione.
export function firstClassText(
  first: WatchedMeeting,
  label: (course: string) => string,
  now: Date,
  lang: Language = 'pl',
): { title: string; body: string } {
  const minutes = Math.max(1, Math.round((first.start - now.getTime()) / 60_000))
  return {
    title: translate(lang, 'Za {n} min: {course}', { n: minutes, course: label(first.course) }),
    body: `${clock(first.start)}–${clock(first.end)}${first.room ? translate(lang, ' · s. {room}', { room: first.room }) : ''}`,
  }
}
