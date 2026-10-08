// Plany wszystkich grup zajęciowych przedmiotów z planu użytkownika - z publicznego USOS API PW
// (bez logowania; serwer pozwala na zapytania z przeglądarki).
import { addDays, startOfWeek, toDateKey } from './dates'
import { t } from './i18n'
import type { GroupOption, OptMeeting, Slot } from './optimizer'
import { semesters, weekIndex } from './semesterWeek'
import type { Meeting } from './usos'

export const USOS_API = 'https://apps.usos.pw.edu.pl/services'
const PARALLEL = 8 // tyle zapytań naraz - szybko, a bez zasypywania serwera USOS
const DAY_MS = 24 * 60 * 60 * 1000
export const CACHE_MAX_AGE_MS = 7 * DAY_MS
const FRESH_MAX_AGE_MS = DAY_MS

// Po jakim czasie zapamiętane plany grup mogą być nieaktualne (podpowiadamy wtedy odświeżenie).
// Na początku semestru (od 4 tygodni przed do 3. tygodnia zajęć) USOS zmienia grupy, sale
// i terminy co chwilę - wtedy już po dobie.
export function groupsCacheMaxAge(planMeetings: Pick<Meeting, 'start' | 'cancelled'>[], now: Date): number {
  const starting = semesters(planMeetings).some((s) => {
    const week = weekIndex(now, s)
    return week >= -3 && week <= 3
  })
  return starting ? FRESH_MAX_AGE_MS : CACHE_MAX_AGE_MS
}

interface Activity {
  start_time: string // "2026-10-07 08:15:00" (czas warszawski)
  end_time: string
  classtype_id: string
  group_number: number
  unit_id: number | string
  room_number?: string | null
  building_id?: string | null
}

// Błąd odpowiedzi USOS z kodem HTTP (np. 404 - nie ma takiego przedmiotu).
export class UsosError extends Error {
  status: number
  constructor(status: number) {
    super(t('USOS odpowiedział błędem {status}.', { status }))
    this.status = status
  }
}

export async function getJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error(t('Brak połączenia z USOS. Sprawdź internet.'))
  }
  if (!response.ok) throw new UsosError(response.status)
  return (await response.json()) as T
}

// Wykonuje zadania po kilka naraz, zgłaszając postęp.
export async function runLimited<T>(tasks: (() => Promise<T>)[], onDone: () => void): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++
      results[i] = await tasks[i]()
      onDone()
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, tasks.length) }, worker))
  return results
}

export function parseUsosTime(value: string): Date {
  const [date, time] = value.split(' ')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

// "1030-ETI" -> "EiTI" (skróty jak przy planie z iCal)
export function shortBuildingId(id: string | null | undefined): string | null {
  if (!id) return null
  if (id.endsWith('-ETI')) return 'EiTI'
  if (id.endsWith('-MCH')) return 'Mechatronika'
  if (id.endsWith('-SWF')) return 'SWFiS'
  return id
}

export interface GroupsProgress {
  done: number
  total: number
}

type PlanRef = Pick<Meeting, 'unitId' | 'groupNumber' | 'start'>

// Obecna grupa: ta, której terminy pokrywają się z planem. Sam numer grupy z planu nie wystarcza -
// po zmianie grupy w planie zostają czasem zajęcia ze starym numerem (np. sprzed zmiany, z początku
// tygodnia) i wtedy optymalizator dalej podpowiadał przejście do grupy, w której już jesteś.
// Przy remisie (np. dwie grupy w tym samym czasie) decyduje, ile zajęć w planie ma numer grupy.
export function currentOptionIndex(options: GroupOption[], plan: PlanRef[]): number | null {
  const units = new Set(options.map((o) => o.unitId))
  const mine = plan.filter((m) => m.unitId !== null && units.has(m.unitId))
  const starts = new Set(mine.map((m) => m.start.getTime()))
  let best: number | null = null
  let bestOverlap = 0
  let bestLabelled = 0
  options.forEach((o, i) => {
    const overlap = o.meetings.filter((m) => starts.has(m.start.getTime())).length
    const labelled = mine.filter((m) => m.unitId === o.unitId && m.groupNumber === o.groupNumber).length
    if (overlap === 0 && labelled === 0) return
    if (best === null || overlap > bestOverlap || (overlap === bestOverlap && labelled > bestLabelled)) {
      best = i
      bestOverlap = overlap
      bestLabelled = labelled
    }
  })
  return best
}

// Buduje "sloty" (przedmiot + typ zajęć z planu użytkownika) ze wszystkimi grupami do wyboru.
export async function fetchSlots(meetings: Meeting[], onProgress: (p: GroupsProgress) => void): Promise<Slot[]> {
  // Zajęcia z USOS (własne i bez identyfikatora pomijamy).
  const units = new Map<string, { courseName: string; meetings: Meeting[] }>()
  for (const m of meetings) {
    if (!m.unitId) continue
    const u = units.get(m.unitId) ?? { courseName: m.courseName, meetings: [] }
    u.meetings.push(m)
    units.set(m.unitId, u)
  }
  if (units.size === 0) return []

  const progress = { done: 0, total: units.size }
  const tick = () => {
    progress.done++
    onProgress({ ...progress })
  }
  onProgress({ ...progress })

  // 1. Do jakiego przedmiotu i semestru należą zajęcia.
  const unitInfo = await runLimited(
    [...units.keys()].map((unitId) => () =>
      getJson<{ course_id: string; term_id: string; classtype_id: string }>(
        `${USOS_API}/courses/unit?unit_id=${unitId}&fields=course_id|term_id|classtype_id`,
      ).then((info) => ({ unitId, ...info })),
    ),
    tick,
  )

  // 2. Tygodnie semestru (z planu użytkownika) - wszystkie, bo część zajęć jest co dwa tygodnie
  //    albo zaczyna się później.
  const all = [...units.values()].flatMap((u) => u.meetings)
  const first = startOfWeek(new Date(Math.min(...all.map((m) => m.start.getTime()))))
  const last = new Date(Math.max(...all.map((m) => m.start.getTime())))
  const weeks: Date[] = []
  for (let w = first; w <= last; w = addDays(w, 7)) weeks.push(w)

  const courses = new Map<string, string>() // courseId -> termId
  for (const u of unitInfo) courses.set(u.course_id, u.term_id)

  progress.total += courses.size * weeks.length
  onProgress({ ...progress })

  // 3. Zajęcia wszystkich grup każdego przedmiotu, tydzień po tygodniu.
  const fields = 'start_time|end_time|classtype_id|group_number|unit_id|room_number|building_id'
  const tasks = [...courses.entries()].flatMap(([courseId, termId]) =>
    weeks.map((week) => () =>
      getJson<Activity[]>(
        `${USOS_API}/tt/course_edition?course_id=${encodeURIComponent(courseId)}&term_id=${termId}` +
          `&start=${toDateKey(week)}&days=7&fields=${fields}`,
      ).then((activities) => ({ courseId, activities })),
    ),
  )
  const results = await runLimited(tasks, tick)

  // 4. Sloty: przedmiot + typ zajęć, w których jest użytkownik.
  const slots = new Map<string, Slot & { groups: Map<number, GroupOption> }>()
  for (const u of unitInfo) {
    const id = `${u.course_id}|${u.classtype_id}`
    if (slots.has(id)) continue
    slots.set(id, {
      id,
      courseName: units.get(u.unitId)!.courseName,
      classType: u.classtype_id,
      options: [],
      currentIndex: null,
      groups: new Map(),
    })
  }
  for (const { courseId, activities } of results) {
    for (const a of activities) {
      const slot = slots.get(`${courseId}|${a.classtype_id}`)
      if (!slot) continue
      const option = slot.groups.get(a.group_number) ?? {
        unitId: String(a.unit_id),
        groupNumber: a.group_number,
        meetings: [],
      }
      const meeting: OptMeeting = {
        start: parseUsosTime(a.start_time),
        end: parseUsosTime(a.end_time),
        room: a.room_number ?? null,
        building: shortBuildingId(a.building_id),
      }
      // Ten sam termin może przyjść dwa razy (zapytania o sąsiednie tygodnie) - bez duplikatów.
      if (!option.meetings.some((m) => m.start.getTime() === meeting.start.getTime())) option.meetings.push(meeting)
      slot.groups.set(a.group_number, option)
    }
  }

  return [...slots.values()]
    .map(({ groups, ...slot }) => {
      const options = [...groups.values()].sort((a, b) => a.groupNumber - b.groupNumber)
      for (const o of options) o.meetings.sort((a, b) => a.start.getTime() - b.start.getTime())
      return { ...slot, options, currentIndex: currentOptionIndex(options, meetings) }
    })
    .filter((s) => s.options.length > 0)
    .sort((a, b) => a.courseName.localeCompare(b.courseName, 'pl') || a.classType.localeCompare(b.classType))
}

// ---------- Pamięć podręczna (w przeglądarce) ----------
// Plany grup zmieniają się rzadko, a pobranie to ponad sto zapytań do USOS - pobieramy je tylko
// na żądanie ("Odśwież") albo gdy w planie jest przedmiot, którego grup jeszcze nie znamy.

const CACHE_KEY = 'planer.groups.v2'
// Poprzedni zapis: zajęcia w kluczu "unitId:grupa,..." - zmiana grupy kasowała dane.
const OLD_CACHE_KEY = 'planer.groups.v1'

type StoredMeeting = Omit<OptMeeting, 'start' | 'end'> & { start: number; end: number }

interface StoredSlots {
  units?: string[]
  key?: string // tylko stary zapis
  fetchedAt: number
  slots: (Omit<Slot, 'options'> & { options: (Omit<GroupOption, 'meetings'> & { meetings: StoredMeeting[] })[] })[]
}

export interface CachedSlots {
  units: string[] // zajęcia z USOS (unit_id), których grupy są w danych
  slots: Slot[]
  fetchedAt: number
}

// Zajęcia z USOS w planie - od nich zależy, które przedmioty i typy zajęć są w danych.
export function planUnits(meetings: Pick<Meeting, 'unitId'>[]): string[] {
  return [...new Set(meetings.flatMap((m) => (m.unitId ? [m.unitId] : [])))].sort()
}

// Zajęcia razem z grupami - zmienia się, gdy zmienisz grupę albo przedmiot.
export function slotsCacheKey(meetings: Pick<Meeting, 'unitId' | 'groupNumber'>[]): string {
  return [...new Set(meetings.flatMap((m) => (m.unitId ? [`${m.unitId}:${m.groupNumber}`] : [])))].sort().join(',')
}

// Zapamiętane plany grup dopasowane do obecnego planu: tylko jego zajęcia, terminy od "from"
// i obecna grupa według planu (zmiana grupy nie wymaga pobierania od nowa).
// null - brakuje danych któregoś przedmiotu.
export function slotsForPlan(cached: CachedSlots, meetings: PlanRef[], from: number): Slot[] | null {
  const units = planUnits(meetings)
  const known = new Set(cached.units)
  if (!units.every((u) => known.has(u))) return null
  const wanted = new Set(units)
  const plan = meetings.filter((m) => m.start.getTime() >= from)
  return cached.slots.flatMap((slot) => {
    if (!slot.options.some((o) => wanted.has(o.unitId))) return []
    const options = slot.options
      .map((o) => ({ ...o, meetings: o.meetings.filter((m) => m.start.getTime() >= from) }))
      .filter((o) => o.meetings.length > 0)
    if (options.length === 0) return []
    return [{ ...slot, options, currentIndex: currentOptionIndex(options, plan) }]
  })
}

export function loadCachedSlots(): CachedSlots | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY) ?? localStorage.getItem(OLD_CACHE_KEY)
    const stored = JSON.parse(raw ?? 'null') as StoredSlots | null
    if (!stored || !Array.isArray(stored.slots) || typeof stored.fetchedAt !== 'number') return null
    const units = stored.units ?? (stored.key ?? '').split(',').filter(Boolean).map((unit) => unit.split(':')[0])
    return {
      units,
      fetchedAt: stored.fetchedAt,
      slots: stored.slots.map((s) => ({
        ...s,
        options: s.options.map((o) => ({
          ...o,
          meetings: o.meetings.map((m) => ({ ...m, start: new Date(m.start), end: new Date(m.end) })),
        })),
      })),
    }
  } catch {
    return null
  }
}

export function saveCachedSlots({ units, slots, fetchedAt }: CachedSlots): void {
  const stored: StoredSlots = {
    units,
    fetchedAt,
    slots: slots.map((s) => ({
      ...s,
      options: s.options.map((o) => ({
        ...o,
        meetings: o.meetings.map((m) => ({ ...m, start: m.start.getTime(), end: m.end.getTime() })),
      })),
    })),
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored))
    localStorage.removeItem(OLD_CACHE_KEY)
  } catch {
    // brak miejsca - dane pobiorą się ponownie przy następnym otwarciu
  }
}
