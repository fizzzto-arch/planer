// Obserwowanie planu z USOS po stronie serwera: zapamiętane najbliższe tygodnie, porównanie
// z nową wersją (zmiany w planie) oraz plan dnia i przypomnienie przed pierwszymi zajęciami.
// Bez importów wykonywalnych - używa go skrypt w Node (scripts/send-reminders.ts).
import { weekNumbers, type WeekOf } from './classDates.ts'
import { startOfDay, startOfWeek } from './dates.ts'
import { CUSTOM_ID_PREFIX, applyEdits, weekdayOf } from './edits.ts'
import type { PlanEdits } from './planEdits.ts'
import { isHiddenClass, isHiddenUsosClass, type HiddenClass } from './hiddenClasses.ts'
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
  online?: boolean // zaznaczone w Planerze jako online (tylko w planie z ręcznymi zmianami)
  // Grupa i tydzień semestru - do wyboru dat w zmianie grupy (np. laboratorium tylko w tyg. 10-14).
  // Starsze zapamiętane plany ich nie mają - wtedy zajęcia liczą się jak zwykle.
  unitId?: string | null
  groupNumber?: number | null
  week?: number | null
}

export const WATCH_DAYS = 21

// Od początku dzisiejszego dnia: zajęcia, które już się dziś skończyły, zostają - inaczej po odświeżeniu
// w środku dnia drugie zajęcia wyglądałyby na pierwsze (przypomnienie przed pierwszymi zajęciami).
export function snapshotPlan(meetings: Meeting[], now: Date, days = WATCH_DAYS): WatchedMeeting[] {
  const from = startOfDay(now).getTime()
  const until = now.getTime() + days * 24 * 60 * 60 * 1000
  // Numer tygodnia liczony z całego planu (zapamiętujemy tylko najbliższe tygodnie - z nich by się nie dało).
  const weekOf = weekNumbers(meetings)
  return meetings.filter((m) => m.end.getTime() > from && m.start.getTime() < until).map((m) => watched(m, weekOf))
}

function watched(m: Meeting, weekOf: WeekOf): WatchedMeeting {
  return {
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
  }
}

// Wzory grup z całego planu: jedne zajęcia na grupę i dzień tygodnia (najbliższe, a gdy już były -
// ostatnie). Zapamiętujemy tylko najbliższe tygodnie, a "co tydzień od–do" dorabia terminy także grupie,
// której zajęcia w USOS są dopiero później (np. laboratorium od listopada, a naprawdę od teraz).
export function snapshotPatterns(meetings: Meeting[], now: Date): WatchedMeeting[] {
  const weekOf = weekNumbers(meetings)
  const byGroup = new Map<string, Meeting>()
  for (const m of [...meetings].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    if (!m.unitId || m.groupNumber === null) continue
    const key = `${m.unitId}-${m.groupNumber}|${weekdayOf(m.start)}`
    const known = byGroup.get(key)
    if (!known || known.start.getTime() < now.getTime()) byGroup.set(key, m)
  }
  return [...byGroup.values()].map((m) => watched(m, weekOf))
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Tydzień semestru dowolnego dnia z zapamiętanego planu (serwer zna tylko najbliższe tygodnie, więc
// całego semestru nie policzy od nowa): od zajęć z numerem tygodnia, kolejne tygodnie po kolei.
export function snapshotWeekOf(plan: WatchedMeeting[]): WeekOf {
  const known = plan.find((m) => typeof m.week === 'number')
  if (!known) return () => null
  const base = startOfWeek(new Date(known.start)).getTime()
  return (day) => known.week! + Math.round((startOfWeek(day).getTime() - base) / WEEK_MS)
}

// Plan tak, jak widać go w Planerze: z ręcznymi zmianami (sala, godziny, dzień, odwołane, wybrane daty
// grupy) i z własnymi zajęciami - powiadomienia mówią to samo co plan na ekranie.
export function withEdits(plan: WatchedMeeting[], edits: PlanEdits, patterns: WatchedMeeting[] = []): WatchedMeeting[] {
  const weekOf = snapshotWeekOf(plan)
  const toMeeting = (m: WatchedMeeting): Meeting => ({
    id: m.id,
    courseName: m.course,
    type: m.type,
    start: new Date(m.start),
    end: new Date(m.end),
    room: m.room,
    building: null,
    address: null,
    groupNumber: m.groupNumber ?? null,
    unitId: m.unitId ?? null,
    usosUrl: null,
    cancelled: m.cancelled,
  })
  return applyEdits(plan.map(toMeeting), edits, weekOf, patterns.map(toMeeting)).map((m) => ({
    id: m.id,
    course: m.courseName,
    type: m.type,
    start: m.start.getTime(),
    end: m.end.getTime(),
    room: m.room,
    cancelled: m.cancelled,
    online: m.online === true,
    unitId: m.unitId,
    groupNumber: m.groupNumber,
    week: weekOf(m.start),
  }))
}

// Usunięte z planu (cały przedmiot albo rodzaj zajęć) - bez powiadomień o nich. Zajęcia z USOS mają
// typ z USOS (lektorat to tam ćwiczenia), własne - typ jak w Planerze.
export function withoutHidden(plan: WatchedMeeting[], hidden: HiddenClass[]): WatchedMeeting[] {
  if (hidden.length === 0) return plan
  return plan.filter((m) =>
    m.id.startsWith(CUSTOM_ID_PREFIX) ? !isHiddenClass(hidden, m.course, m.type) : !isHiddenUsosClass(hidden, m.course, m.type),
  )
}

// Miejsce zajęć do porównania i treści: sala albo "online".
const place = (m: WatchedMeeting) => (m.online ? 'online' : (m.room ?? ''))

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
    } else if (place(a) !== place(b)) {
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
      if (place(a) === place(b)) changes.splice(changes.indexOf(gone), 1)
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
      return translate(lang, '{what}: sala {from} → {to}', { what, from: place(c.before) || '?', to: place(c.after) || '?' })
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
  const room = first.online ? ', online' : first.room ? translate(lang, ', s. {room}', { room: first.room }) : ''
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
    body: `${clock(first.start)}–${clock(first.end)}${first.online ? ' · online' : first.room ? translate(lang, ' · s. {room}', { room: first.room }) : ''}`,
  }
}
