import type { PlanMeeting } from './edits'
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
