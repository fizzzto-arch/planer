// Plany wszystkich grup zajęciowych przedmiotów z planu użytkownika - z publicznego USOS API PW
// (bez logowania; serwer pozwala na zapytania z przeglądarki).
import { addDays, startOfWeek, toDateKey } from './dates'
import type { GroupOption, OptMeeting, Slot } from './optimizer'
import type { Meeting } from './usos'

const API = 'https://apps.usos.pw.edu.pl/services'
const PARALLEL = 8 // tyle zapytań naraz - szybko, a bez zasypywania serwera USOS
const CACHE_KEY = 'planer.groups.v1'
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface Activity {
  start_time: string // "2026-10-07 08:15:00" (czas warszawski)
  end_time: string
  classtype_id: string
  group_number: number
  unit_id: number | string
  room_number?: string | null
  building_id?: string | null
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error('Brak połączenia z USOS. Sprawdź internet.')
  }
  if (!response.ok) throw new Error(`USOS odpowiedział błędem ${response.status}.`)
  return (await response.json()) as T
}

// Wykonuje zadania po kilka naraz, zgłaszając postęp.
async function runLimited<T>(tasks: (() => Promise<T>)[], onDone: () => void): Promise<T[]> {
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

function parseUsosTime(value: string): Date {
  const [date, time] = value.split(' ')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

// "1030-ETI" -> "EiTI" (skróty jak przy planie z iCal)
function shortBuildingId(id: string | null | undefined): string | null {
  if (!id) return null
  if (id.endsWith('-ETI')) return 'EiTI'
  if (id.endsWith('-MCH')) return 'Mechatronika'
  return id
}

export interface GroupsProgress {
  done: number
  total: number
}

// Buduje "sloty" (przedmiot + typ zajęć z planu użytkownika) ze wszystkimi grupami do wyboru.
export async function fetchSlots(meetings: Meeting[], onProgress: (p: GroupsProgress) => void): Promise<Slot[]> {
  // Zajęcia z USOS (własne i bez identyfikatora pomijamy).
  const units = new Map<string, { groupNumber: number | null; courseName: string; meetings: Meeting[] }>()
  for (const m of meetings) {
    if (!m.unitId) continue
    const u = units.get(m.unitId) ?? { groupNumber: m.groupNumber, courseName: m.courseName, meetings: [] }
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
        `${API}/courses/unit?unit_id=${unitId}&fields=course_id|term_id|classtype_id`,
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
        `${API}/tt/course_edition?course_id=${encodeURIComponent(courseId)}&term_id=${termId}` +
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
      // Wszystkie grupy jednego typu zajęć mają ten sam unit_id - obecna to ta z numerem z planu.
      const currentIndex = options.findIndex((o) => units.get(o.unitId)?.groupNumber === o.groupNumber)
      return { ...slot, options, currentIndex: currentIndex >= 0 ? currentIndex : null }
    })
    .filter((s) => s.options.length > 0)
    .sort((a, b) => a.courseName.localeCompare(b.courseName, 'pl') || a.classType.localeCompare(b.classType))
}

// ---------- Pamięć podręczna (w przeglądarce) ----------

interface StoredSlots {
  key: string // zestaw zajęć użytkownika - inny plan = nieaktualne dane
  fetchedAt: number
  slots: (Omit<Slot, 'options'> & {
    options: (Omit<GroupOption, 'meetings'> & { meetings: (Omit<OptMeeting, 'start' | 'end'> & { start: number; end: number })[] })[]
  })[]
}

export function slotsCacheKey(meetings: Meeting[]): string {
  return [...new Set(meetings.flatMap((m) => (m.unitId ? [`${m.unitId}:${m.groupNumber}`] : [])))].sort().join(',')
}

export function loadCachedSlots(key: string): { slots: Slot[]; fetchedAt: number } | null {
  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as StoredSlots | null
    if (!stored || stored.key !== key) return null
    return {
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

export function saveCachedSlots(key: string, slots: Slot[], fetchedAt: number): void {
  const stored: StoredSlots = {
    key,
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
  } catch {
    // brak miejsca - dane pobiorą się ponownie przy następnym otwarciu
  }
}
