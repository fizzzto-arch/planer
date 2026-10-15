import { addDays } from './dates'
import type { PlanMeeting } from './edits'
import { semesterAt, semesters, type Semester } from './semesterWeek'
import { typeLabel } from './usos'

export interface CourseSummary {
  name: string
  types: { type: string; groups: number[] }[]
  next: PlanMeeting | null // najbliższe nieodwołane zajęcia
  mainType: string // do koloru na liście
}

// Semestr, który teraz się liczy: bieżący, a między semestrami (sesja, przerwa) - nadchodzący, jeśli plan
// już go ma (inaczej ostatni). inside - jesteśmy w trakcie semestru.
function currentSemester(meetings: PlanMeeting[], now: Date): { semester: Semester; inside: boolean } | null {
  const list = semesters(meetings.filter((m) => !m.custom))
  const inside = semesterAt(now, list)
  if (inside) return { semester: inside, inside: true }
  const semester = list.find((s) => s.firstWeek > now) ?? [...list].reverse().find((s) => s.firstWeek <= now) ?? null
  return semester && { semester, inside: false }
}

// Tygodnie semestru, który teraz się liczy (null - bez rozpoznanego semestru).
export function currentSemesterRange(meetings: PlanMeeting[], now: Date): { from: Date; to: Date } | null {
  const current = currentSemester(meetings, now)
  return current && { from: current.semester.firstWeek, to: addDays(current.semester.lastWeek, 7) }
}

// Przedmioty z planu (także te tylko z własnych zajęć), alfabetycznie. Typy i grupy z bieżącego semestru
// (range) - przedmiot z obu semestrów (np. WF) nie pokazuje starej grupy obok nowej.
export function summarizeCourses(
  meetings: PlanMeeting[],
  now: Date,
  range: { from: Date; to: Date } | null = currentSemesterRange(meetings, now),
): CourseSummary[] {
  const byName = new Map<string, { all: PlanMeeting[]; next: PlanMeeting | null }>()
  for (const m of meetings) {
    const entry = byName.get(m.courseName) ?? { all: [], next: null }
    byName.set(m.courseName, entry)
    entry.all.push(m)
    if (!entry.next && m.start > now && !m.cancelled) entry.next = m // spotkania są posortowane
  }
  return [...byName.entries()]
    .map(([name, e]) => {
      const recent = range ? e.all.filter((m) => m.start >= range.from && m.start < range.to) : []
      const byType = new Map<string, Set<number>>()
      for (const m of recent.length > 0 ? recent : e.all) {
        const groups = byType.get(m.type) ?? new Set<number>()
        byType.set(m.type, groups)
        if (m.groupNumber !== null) groups.add(m.groupNumber)
      }
      const types = [...byType.entries()].map(([type, groups]) => ({ type, groups: [...groups].sort((a, b) => a - b) }))
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
// początkiem obecnego semestru. Między semestrami (sesja, rejestracja) - przedmioty, które już się
// skończyły (razem z egzaminami), gdy plan ma już nadchodzący semestr. Bez rozpoznanego semestru - wszystkie są obecne.
export function pastCourses(meetings: PlanMeeting[], now: Date): Set<string> {
  const current = currentSemester(meetings, now)
  if (!current) return new Set()
  const start = current.semester.firstWeek.getTime()
  const cutoff = current.inside ? start : Math.min(start, now.getTime())
  const lastEnd = new Map<string, number>()
  for (const m of meetings) lastEnd.set(m.courseName, Math.max(lastEnd.get(m.courseName) ?? 0, m.end.getTime()))
  return new Set([...lastEnd].filter(([, end]) => end < cutoff).map(([name]) => name))
}

// Przedmioty do przechodzenia strzałkami na stronie przedmiotu: z tej samej części listy (obecne albo
// z poprzedniego semestru), w kolejności jak na liście Przedmioty.
export function siblingCourses(meetings: PlanMeeting[], now: Date, courseName: string): string[] {
  const past = pastCourses(meetings, now)
  return summarizeCourses(meetings, now)
    .map((c) => c.name)
    .filter((name) => past.has(name) === past.has(courseName))
}
