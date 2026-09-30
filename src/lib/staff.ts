// Kto uczy: koordynatorzy przedmiotu i prowadzący grup użytkownika - z publicznego API USOS PW.
// Tytuły dochodzą osobno (people/{id} w bazie, uzupełnia je serwer - lib/usosPeople.ts).
import { t } from './i18n'
import { getJson, USOS_API } from './usosGroups'
import { typeLabel, type Meeting } from './usos'

export interface StaffPerson {
  id: string // numer osoby w USOS (os_id)
  name: string // "Lidia Łukasiak"
}

export interface StaffGroup {
  type: string // WYK, CWI, LAB...
  groupNumber: number | null
  lecturers: StaffPerson[]
}

export interface CourseStaff {
  coordinators: StaffPerson[]
  groups: StaffGroup[] // tylko grupy użytkownika, po jednej na typ zajęć
}

interface ApiPerson {
  id: string | number
  first_name: string
  last_name: string
}

const person = (p: ApiPerson): StaffPerson => ({ id: String(p.id), name: `${p.first_name} ${p.last_name}`.trim() })

// Grupy użytkownika w przedmiocie: zajęcia z USOS (z numerem zajęć), po jednej na typ i grupę.
export function staffUnits(meetings: Pick<Meeting, 'unitId' | 'groupNumber' | 'type'>[]) {
  const units = new Map<string, { unitId: string; groupNumber: number | null; type: string }>()
  for (const m of meetings) {
    if (!m.unitId) continue
    units.set(`${m.unitId}|${m.groupNumber}`, { unitId: m.unitId, groupNumber: m.groupNumber, type: m.type })
  }
  return [...units.values()]
}

const TYPE_ORDER = ['WYK', 'CWI', 'LAB', 'PRO', 'SEM', 'LEK', 'WF']

export async function fetchCourseStaff(meetings: Pick<Meeting, 'unitId' | 'groupNumber' | 'type'>[]): Promise<CourseStaff | null> {
  const units = staffUnits(meetings)
  if (units.length === 0) return null
  const info = await getJson<{ course_id: string; term_id: string }>(
    `${USOS_API}/courses/unit?unit_id=${units[0].unitId}&fields=course_id|term_id`,
  )
  const edition = await getJson<{ coordinators?: ApiPerson[]; lecturers?: ApiPerson[] }>(
    `${USOS_API}/courses/course_edition?course_id=${encodeURIComponent(info.course_id)}&term_id=${encodeURIComponent(info.term_id)}&fields=coordinators|lecturers`,
  )
  const known = new Map<string, StaffPerson>()
  for (const p of [...(edition.coordinators ?? []), ...(edition.lecturers ?? [])]) known.set(String(p.id), person(p))

  const groups = await Promise.all(
    units.map(async (u): Promise<StaffGroup> => {
      if (u.groupNumber === null) return { type: u.type, groupNumber: null, lecturers: [] }
      const dates = await getJson<{ lecturer_ids?: (string | number)[] }[]>(
        `${USOS_API}/tt/classgroup_dates2?unit_id=${u.unitId}&group_number=${u.groupNumber}&fields=lecturer_ids`,
      )
      const ids = [...new Set(dates.flatMap((d) => (d.lecturer_ids ?? []).map(String)))]
      // Osoba spoza listy prowadzących przedmiotu (rzadkie) - bez nazwiska nie pokazujemy.
      return { type: u.type, groupNumber: u.groupNumber, lecturers: ids.flatMap((id) => known.get(id) ?? []) }
    }),
  )
  const rank = (item: string) => (TYPE_ORDER.includes(item) ? TYPE_ORDER.indexOf(item) : TYPE_ORDER.length)
  return {
    coordinators: (edition.coordinators ?? []).map(person),
    groups: groups.sort((a, b) => rank(a.type) - rank(b.type) || (a.groupNumber ?? 0) - (b.groupNumber ?? 0)),
  }
}

// Każda osoba raz, z rolami: najpierw prowadzący Twoich grup, potem sami koordynatorzy.
export function staffPeople(staff: CourseStaff): { person: StaffPerson; roles: string[] }[] {
  const byId = new Map<string, { person: StaffPerson; roles: string[]; teaches: boolean }>()
  const entry = (p: StaffPerson) => {
    const e = byId.get(p.id) ?? { person: p, roles: [], teaches: false }
    byId.set(p.id, e)
    return e
  }
  for (const p of staff.coordinators) entry(p).roles.push(t('Koordynator przedmiotu'))
  for (const g of staff.groups) {
    for (const p of g.lecturers) {
      const e = entry(p)
      e.roles.push(`${typeLabel(g.type)}${g.groupNumber !== null ? t(' gr. {n}', { n: g.groupNumber }) : ''}`)
      e.teaches = true
    }
  }
  return [...byId.values()].sort((a, b) => Number(b.teaches) - Number(a.teaches)).map(({ person, roles }) => ({ person, roles }))
}

// Pamięć w przeglądarce - skład prowadzących zmienia się rzadko.
const CACHE_KEY = 'planer.staff.v1'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const staffCacheKey = (meetings: Pick<Meeting, 'unitId' | 'groupNumber' | 'type'>[]) =>
  staffUnits(meetings)
    .map((u) => `${u.unitId}:${u.groupNumber}`)
    .sort()
    .join(',')

export function loadCachedStaff(key: string, now = Date.now()): CourseStaff | null {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, { at: number; staff: CourseStaff }>
    const hit = all[key]
    return hit && now - hit.at < CACHE_MAX_AGE_MS ? hit.staff : null
  } catch {
    return null
  }
}

export function saveCachedStaff(key: string, staff: CourseStaff, now = Date.now()): void {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, { at: number; staff: CourseStaff }>
    all[key] = { at: now, staff }
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch {
    // bez pamięci - pobierze się ponownie przy następnym otwarciu
  }
}
