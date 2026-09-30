// Obserwowanie planu z USOS po stronie serwera: zapamiętane najbliższe tygodnie, porównanie
// z nową wersją (zmiany w planie) oraz plan dnia i przypomnienie przed pierwszymi zajęciami.
// Bez importów wykonywalnych - używa go skrypt w Node (scripts/send-reminders.ts).
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
}

export const WATCH_DAYS = 21

export function snapshotPlan(meetings: Meeting[], now: Date, days = WATCH_DAYS): WatchedMeeting[] {
  const until = now.getTime() + days * 24 * 60 * 60 * 1000
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
    }))
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

const WEEKDAYS = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.']

const clock = (ms: number) => {
  const d = new Date(ms)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
const day = (ms: number) => {
  const d = new Date(ms)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function changeLine(c: PlanChange, label: (course: string) => string): string {
  const m = 'after' in c ? c.after : c.before
  const what = `${label(m.course)} (${day(m.start)})`
  switch (c.kind) {
    case 'moved': {
      const sameDay = new Date(c.before.start).toDateString() === new Date(c.after.start).toDateString()
      const to = sameDay ? `${clock(c.after.start)}–${clock(c.after.end)}` : `${day(c.after.start)} ${clock(c.after.start)}`
      return `${label(m.course)} (${day(c.before.start)} ${clock(c.before.start)}) → ${to}`
    }
    case 'room':
      return `${what}: sala ${c.before.room ?? '?'} → ${c.after.room ?? '?'}`
    case 'cancelled':
      return `${what} ${clock(m.start)} - odwołane`
    case 'added':
      return `${what} ${clock(m.start)} - dodatkowe zajęcia`
  }
}

const MAX_LINES = 3

// details: wszystkie zmiany - do historii powiadomień w Planerze (w powiadomieniu mieszczą się 3).
export function changesText(
  changes: PlanChange[],
  label: (course: string) => string,
): { title: string; body: string; details: string[] } {
  const all = changes.map((c) => changeLine(c, label))
  const lines = all.slice(0, MAX_LINES)
  if (changes.length > MAX_LINES) lines.push(`i jeszcze ${changes.length - MAX_LINES} - szczegóły w Planerze`)
  return {
    title: changes.length === 1 ? 'Zmiana w planie' : `Zmiany w planie (${changes.length})`,
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
export function daySummaryText(classes: WatchedMeeting[], label: (course: string) => string): { title: string; body: string } {
  const first = classes[0]
  const last = classes.reduce((a, b) => (b.end > a.end ? b : a))
  const n = classes.length
  // "zajęcia" nie ma liczby pojedynczej: jedne zajęcia, 2-4 zajęcia, 5+ zajęć (ale 22 zajęcia).
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
  const count = n === 1 ? 'jedne zajęcia' : `${n} ${few ? 'zajęcia' : 'zajęć'}`
  return {
    title: `Dziś ${count}, ${clock(first.start)}–${clock(last.end)}`,
    body: `Pierwsze: ${label(first.course)}${first.room ? `, s. ${first.room}` : ''} o ${clock(first.start)}`,
  }
}

// Minuty liczone w chwili wysyłki - uruchomienie na serwerze bywa spóźnione.
export function firstClassText(
  first: WatchedMeeting,
  label: (course: string) => string,
  now: Date,
): { title: string; body: string } {
  const minutes = Math.max(1, Math.round((first.start - now.getTime()) / 60_000))
  return {
    title: `Za ${minutes} min: ${label(first.course)}`,
    body: `${clock(first.start)}–${clock(first.end)}${first.room ? ` · s. ${first.room}` : ''}`,
  }
}
