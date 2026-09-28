// Numer tygodnia semestru liczony z planu: liczą się tylko tygodnie, w których są zajęcia,
// więc przerwy (np. święta) nie przesuwają numeracji. Przerwa dłuższa niż 4 tygodnie
// oznacza nowy semestr.
import { startOfWeek } from './dates'
import type { Meeting } from './usos'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const NEW_SEMESTER_GAP_WEEKS = 4

export interface SemesterWeek {
  number: number
  odd: boolean
}

export function semesterWeek(weekStart: Date, meetings: Pick<Meeting, 'start' | 'cancelled'>[]): SemesterWeek | null {
  // Tygodnie (początki, w ms) z przynajmniej jednymi nieodwołanymi zajęciami, rosnąco.
  const weeks = [
    ...new Set(meetings.filter((m) => !m.cancelled).map((m) => startOfWeek(m.start).getTime())),
  ].sort((a, b) => a - b)

  const target = startOfWeek(weekStart).getTime()
  if (!weeks.includes(target)) return null

  let number = 0
  for (let i = 0; i < weeks.length && weeks[i] <= target; i++) {
    const gapWeeks = i > 0 ? Math.round((weeks[i] - weeks[i - 1]) / WEEK_MS) : Infinity
    number = gapWeeks > NEW_SEMESTER_GAP_WEEKS ? 1 : number + 1
  }
  return { number, odd: number % 2 === 1 }
}
