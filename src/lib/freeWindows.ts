// Wspólne okienka ze znajomymi: każdy, kto chce, udostępnia same godziny zajęć (bez nazw,
// sal i grup) na najbliższe 2 tygodnie w sharedBusy/{uid}. Widzą je tylko osoby, które też
// udostępniają (pilnują tego reguły bazy). Tu: liczenie, kiedy wszyscy są na uczelni i wolni.
import { addDays, startOfDay } from './dates'

export const SHARE_DAYS = 14

export interface BusyBlock {
  start: number // ms
  end: number
}

export interface SharedBusy {
  uid: string
  name: string
  busy: BusyBlock[]
  updatedAt: number | null
}

// Zajęte godziny z planu: bez odwołanych, od dziś na SHARE_DAYS dni, nakładające się połączone.
export function busyFromMeetings(meetings: { start: Date; end: Date; cancelled: boolean }[], now: Date): BusyBlock[] {
  const from = startOfDay(now).getTime()
  const until = addDays(startOfDay(now), SHARE_DAYS).getTime()
  const blocks = meetings
    .filter((m) => !m.cancelled && m.end.getTime() > from && m.start.getTime() < until)
    .map((m) => ({ start: m.start.getTime(), end: m.end.getTime() }))
    .sort((a, b) => a.start - b.start)
  const merged: BusyBlock[] = []
  for (const b of blocks) {
    const last = merged[merged.length - 1]
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end)
    else merged.push({ ...b })
  }
  return merged
}

// W bazie jako płaska lista liczb [start, koniec, start, koniec...] - mniej miejsca, prostsze reguły.
export const flattenBusy = (busy: BusyBlock[]) => busy.flatMap((b) => [b.start, b.end])

export function parseSharedBusy(uid: string, raw: Record<string, unknown>): SharedBusy {
  const flat = Array.isArray(raw.busy) ? raw.busy.filter((n): n is number => typeof n === 'number') : []
  const busy: BusyBlock[] = []
  for (let i = 0; i + 1 < flat.length; i += 2) if (flat[i + 1] > flat[i]) busy.push({ start: flat[i], end: flat[i + 1] })
  const updated = raw.updatedAt as { toMillis?: () => number } | number | undefined
  return {
    uid,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 40) : 'Znajomy',
    busy,
    updatedAt: typeof updated === 'number' ? updated : typeof updated?.toMillis === 'function' ? updated.toMillis() : null,
  }
}

export interface DayWindows {
  day: Date
  everyonePresent: boolean // każdy ma tego dnia zajęcia (jest na uczelni)
  windows: BusyBlock[] // wspólne wolne chwile, gdy wszyscy są na uczelni
  allFreeFrom: number | null // od kiedy wszyscy mają już wolne (koniec ostatnich zajęć)
}

// Wspólne okienka jednego dnia dla kilku osób (każda to lista zajętych bloków).
// Okienko = wszyscy są na uczelni (między swoimi pierwszymi a ostatnimi zajęciami) i nikt nie ma zajęć.
export function commonWindows(people: BusyBlock[][], day: Date, minMinutes: number): DayWindows {
  const from = startOfDay(day).getTime()
  const to = addDays(startOfDay(day), 1).getTime()
  const today = people.map((busy) => busy.filter((b) => b.end > from && b.start < to))
  const everyonePresent = today.every((blocks) => blocks.length > 0)
  if (!everyonePresent || people.length === 0) return { day, everyonePresent, windows: [], allFreeFrom: null }

  const presentFrom = Math.max(...today.map((blocks) => blocks[0].start))
  const presentTo = Math.min(...today.map((blocks) => Math.max(...blocks.map((b) => b.end))))
  const allBusy = today.flat().sort((a, b) => a.start - b.start)
  const windows: BusyBlock[] = []
  let cursor = presentFrom
  for (const b of allBusy) {
    if (b.start > cursor) windows.push({ start: cursor, end: Math.min(b.start, presentTo) })
    cursor = Math.max(cursor, b.end)
    if (cursor >= presentTo) break
  }
  return {
    day,
    everyonePresent,
    windows: windows.filter((w) => w.end - w.start >= minMinutes * 60_000),
    allFreeFrom: Math.max(...today.flat().map((b) => b.end)),
  }
}
