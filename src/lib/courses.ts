import type { PlanMeeting } from './edits'
import { semesterAt, semesters } from './semesterWeek'
import { typeLabel } from './usos'

export interface CourseSummary {
  name: string
  types: { type: string; groups: number[] }[]
  next: PlanMeeting | null // najbliższe nieodwołane zajęcia
  mainType: string // do koloru na liście
}

// Przedmioty z planu (także te tylko z własnych zajęć), alfabetycznie.
export function summarizeCourses(meetings: PlanMeeting[], now: Date): CourseSummary[] {
  const byName = new Map<string, { types: Map<string, Set<number>>; next: PlanMeeting | null }>()
  for (const m of meetings) {
    const entry = byName.get(m.courseName) ?? { types: new Map(), next: null }
    byName.set(m.courseName, entry)
    const groups = entry.types.get(m.type) ?? new Set<number>()
    entry.types.set(m.type, groups)
    if (m.groupNumber !== null) groups.add(m.groupNumber)
    if (!entry.next && m.start > now && !m.cancelled) entry.next = m // spotkania są posortowane
  }
  return [...byName.entries()]
    .map(([name, e]) => {
      const types = [...e.types.entries()].map(([type, groups]) => ({ type, groups: [...groups].sort((a, b) => a - b) }))
      return { name, types, next: e.next, mainType: types[0]?.type ?? 'INNE' }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

// Stała kolejność typów zajęć; nieznane na końcu.
const TYPE_ORDER = ['WYK', 'CWI', 'LAB', 'PRO', 'SEM', 'LEK', 'WF']
const typeRank = (type: string) => {
  const i = TYPE_ORDER.indexOf(type)
  return i === -1 ? TYPE_ORDER.length : i
}

// "Wykład gr. 1 · Laboratorium gr. 102"
export function formatTypes(types: CourseSummary['types']): string {
  return [...types]
    .sort((a, b) => typeRank(a.type) - typeRank(b.type))
    .map(({ type, groups }) => (groups.length ? `${typeLabel(type)} gr. ${groups.join(', ')}` : typeLabel(type)))
    .join(' · ')
}

// Przedmioty z poprzedniego semestru (plan trzyma jeszcze ich historię): wszystkie zajęcia przed
// początkiem obecnego semestru. Bez rozpoznanego semestru - wszystkie są obecne.
export function pastCourses(meetings: PlanMeeting[], now: Date): Set<string> {
  const list = semesters(meetings.filter((m) => !m.custom))
  const current = semesterAt(now, list) ?? [...list].reverse().find((s) => s.firstWeek <= now) ?? null
  if (!current) return new Set()
  const lastEnd = new Map<string, number>()
  for (const m of meetings) lastEnd.set(m.courseName, Math.max(lastEnd.get(m.courseName) ?? 0, m.end.getTime()))
  return new Set([...lastEnd].filter(([, end]) => end < current.firstWeek.getTime()).map(([name]) => name))
}

// Przedmioty do przechodzenia strzałkami na stronie przedmiotu: z tej samej części listy (obecne albo
// z poprzedniego semestru), w kolejności jak na liście Przedmioty.
export function siblingCourses(meetings: PlanMeeting[], now: Date, courseName: string): string[] {
  const past = pastCourses(meetings, now)
  return summarizeCourses(meetings, now)
    .map((c) => c.name)
    .filter((name) => past.has(name) === past.has(courseName))
}
