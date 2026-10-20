// Wspólne terminy: kolokwium czy egzamin, który ktoś z roku pokazał innym z tego przedmiotu
// (sharedDeadlines/{id terminu u autora}). Tylko przedmiot, rodzaj, tytuł, data, godzina i podpis autora -
// bez notatki i listy "do przygotowania". Inni dostają propozycję "dodaj u siebie"; gdy autor przesunie
// termin, a ktoś już go dodał - propozycję aktualizacji.
import { courseKey, DEADLINE_KINDS, type Deadline, type DeadlineKind } from './extras'

export interface SharedDeadline {
  id: string // id terminu u autora
  courseKey: string
  courseName: string
  kind: DeadlineKind
  title: string
  date: string // "YYYY-MM-DD"
  time: string | null // "HH:MM"
  sharedBy: string // uid autora
  sharedByName: string // jak go widzą inni
}

export type SharedDeadlineData = Omit<SharedDeadline, 'id'>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function parseSharedDeadline(id: string, raw: Record<string, unknown>): SharedDeadline | null {
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  const date = typeof raw.date === 'string' ? raw.date : ''
  const name = str(raw.courseName, 200)
  if (!DATE_RE.test(date) || !name || typeof raw.sharedBy !== 'string') return null
  const time = typeof raw.time === 'string' ? raw.time : ''
  return {
    id,
    courseKey: str(raw.courseKey, 200) || courseKey(name),
    courseName: name,
    kind: DEADLINE_KINDS.some((k) => k.id === raw.kind) ? (raw.kind as DeadlineKind) : 'inne',
    title: str(raw.title, 200),
    date,
    time: TIME_RE.test(time) ? time : null,
    sharedBy: raw.sharedBy,
    sharedByName: str(raw.sharedByName, 64) || '?',
  }
}

// Termin z przedmiotem -> to, co widzą inni (null - bez przedmiotu nie ma komu pokazać).
export function sharedFromDeadline(d: Omit<Deadline, 'id'>, uid: string, name: string): SharedDeadlineData | null {
  if (!d.courseName) return null
  return {
    courseKey: courseKey(d.courseName),
    courseName: d.courseName,
    kind: d.kind,
    title: d.title.slice(0, 200),
    date: d.date,
    time: d.time,
    sharedBy: uid,
    sharedByName: name.slice(0, 64),
  }
}

// Ten sam termin (ten sam przedmiot, rodzaj, dzień i godzina) - pokazany przez kilka osób liczy się raz.
const sameEvent = (a: Pick<SharedDeadline, 'courseKey' | 'kind' | 'date' | 'time'>) => `${a.courseKey}|${a.kind}|${a.date}|${a.time ?? ''}`

// Czy ktoś inny pokazał już ten termin (wtedy drugi raz nie ma sensu).
export function sharedByOther(list: SharedDeadline[], d: Omit<Deadline, 'id'>, uid: string): SharedDeadline | null {
  if (!d.courseName) return null
  const key = sameEvent({ courseKey: courseKey(d.courseName), kind: d.kind, date: d.date, time: d.time })
  return list.find((s) => s.sharedBy !== uid && sameEvent(s) === key) ?? null
}

export type Suggestion =
  | { kind: 'new'; shared: SharedDeadline; others: number; dismissKey: string } // others - ile jeszcze osób pokazało to samo
  | { kind: 'changed'; shared: SharedDeadline; own: Deadline; dismissKey: string } // autor przesunął termin

// Propozycje dla mnie: terminy z moich przedmiotów, których jeszcze nie mam (ani tego samego, ani dodanego
// z tej propozycji), nie moje, nieukryte i niezakończone; a dla dodanych - zmiana daty albo godziny u autora.
export function sharedSuggestions(
  list: SharedDeadline[],
  opts: { courseKeys: Set<string>; own: Deadline[]; uid: string; dismissed: string[]; today: string },
): Suggestion[] {
  const dismissed = new Set(opts.dismissed)
  const ownEvents = new Set(
    opts.own.flatMap((d) => (d.courseName ? [sameEvent({ courseKey: courseKey(d.courseName), kind: d.kind, date: d.date, time: d.time })] : [])),
  )
  const adopted = new Map(opts.own.flatMap((d) => (d.fromShared ? [[d.fromShared, d] as const] : [])))
  const out: Suggestion[] = []
  const seen = new Map<string, Suggestion & { kind: 'new' }>()
  for (const s of [...list].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))) {
    if (s.sharedBy === opts.uid || s.date < opts.today) continue
    const own = adopted.get(s.id)
    if (own) {
      const dismissKey = `${s.id}@${s.date}T${s.time ?? ''}`
      if ((own.date !== s.date || own.time !== s.time) && !dismissed.has(dismissKey)) out.push({ kind: 'changed', shared: s, own, dismissKey })
      continue
    }
    if (!opts.courseKeys.has(s.courseKey) || ownEvents.has(sameEvent(s)) || dismissed.has(s.id)) continue
    const key = sameEvent(s)
    const earlier = seen.get(key)
    if (earlier) {
      earlier.others++
      continue
    }
    const suggestion = { kind: 'new' as const, shared: s, others: 0, dismissKey: s.id }
    seen.set(key, suggestion)
    out.push(suggestion)
  }
  return out
}

// Ukryte propozycje (w ustawieniach na koncie) - tylko ostatnie, żeby lista nie rosła bez końca.
export const DISMISSED_MAX = 200
export const withDismissed = (dismissed: string[], key: string) => [...dismissed.filter((k) => k !== key), key].slice(-DISMISSED_MAX)
