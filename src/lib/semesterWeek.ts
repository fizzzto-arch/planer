// Numer tygodnia semestru liczony z planu. Tygodnie idą po kolei w kalendarzu od pierwszego
// tygodnia z zajęciami - także przez przerwy (np. świąteczną), bo tak USOS układa zajęcia
// "co dwa tygodnie": laboratorium w tygodnie nieparzyste zostaje w nieparzystych po przerwie.
// Przerwa dłuższa niż 4 tygodnie oznacza nowy semestr.
import { startOfWeek } from './dates'
import type { Meeting } from './usos'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const NEW_SEMESTER_GAP_WEEKS = 4

export interface SemesterWeek {
  number: number
  odd: boolean
}

export interface Semester {
  firstWeek: Date // poniedziałek pierwszego tygodnia z zajęciami
  lastWeek: Date // poniedziałek ostatniego tygodnia z zajęciami
}

// Semestry z planu (rosnąco): ciągi tygodni z zajęciami bez przerwy dłuższej niż 4 tygodnie.
export function semesters(meetings: Pick<Meeting, 'start' | 'cancelled'>[]): Semester[] {
  const weeks = [
    ...new Set(meetings.filter((m) => !m.cancelled).map((m) => startOfWeek(m.start).getTime())),
  ].sort((a, b) => a - b)
  const result: Semester[] = []
  for (let i = 0; i < weeks.length; i++) {
    const gapWeeks = i > 0 ? Math.round((weeks[i] - weeks[i - 1]) / WEEK_MS) : Infinity
    if (gapWeeks > NEW_SEMESTER_GAP_WEEKS) result.push({ firstWeek: new Date(weeks[i]), lastWeek: new Date(weeks[i]) })
    else result[result.length - 1].lastWeek = new Date(weeks[i])
  }
  return result
}

// Semestr, do którego należy dany dzień (także w przerwie w trakcie semestru).
export function semesterAt(date: Date, list: Semester[]): Semester | null {
  const week = startOfWeek(date).getTime()
  return list.find((s) => s.firstWeek.getTime() <= week && week <= s.lastWeek.getTime()) ?? null
}

// Numer tygodnia w semestrze: 1 = tydzień pierwszych zajęć.
export function weekIndex(date: Date, semester: Semester): number {
  return Math.round((startOfWeek(date).getTime() - semester.firstWeek.getTime()) / WEEK_MS) + 1
}

// Numer i parzystość tygodnia - tylko dla tygodni z zajęciami (w przerwie nie ma czego oznaczać).
export function semesterWeek(weekStart: Date, meetings: Pick<Meeting, 'start' | 'cancelled'>[]): SemesterWeek | null {
  const target = startOfWeek(weekStart)
  const hasClasses = meetings.some((m) => !m.cancelled && startOfWeek(m.start).getTime() === target.getTime())
  const semester = hasClasses ? semesterAt(target, semesters(meetings)) : null
  if (!semester) return null
  const number = weekIndex(target, semester)
  return { number, odd: number % 2 === 1 }
}
