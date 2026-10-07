// Numer tygodnia semestru liczony z planu. Tygodnie idą po kolei w kalendarzu od pierwszego
// tygodnia z zajęciami - także przez przerwy (np. świąteczną), bo tak USOS układa zajęcia
// "co dwa tygodnie": laboratorium w tygodnie nieparzyste zostaje w nieparzystych po przerwie.
// Co najmniej 3 tygodnie bez zajęć oznaczają nowy semestr. Na PW między semestrami są dokładnie
// 3 takie tygodnie (2 tygodnie sesji i tydzień rejestracji), a przerwa świąteczna ma najwyżej 2.
// Egzaminy w sesji nie są zajęciami semestru - inaczej "skleiłyby" zimowy semestr z letnim.
import { startOfWeek } from './dates.ts'
import type { Meeting } from './usos.ts'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const NEW_SEMESTER_GAP_WEEKS = 3 // pełnych tygodni bez zajęć
const NOT_CLASSES = new Set(['EGZ']) // egzamin (typ z USOS)

type SemesterMeeting = Pick<Meeting, 'start' | 'cancelled'> & { type?: string }
const countsForSemester = (m: SemesterMeeting) => !m.cancelled && !(m.type && NOT_CLASSES.has(m.type))

export interface SemesterWeek {
  number: number
  odd: boolean
}

export interface Semester {
  firstWeek: Date // poniedziałek pierwszego tygodnia z zajęciami
  lastWeek: Date // poniedziałek ostatniego tygodnia z zajęciami
}

// Semestry z planu (rosnąco): ciągi tygodni z zajęciami bez przerwy dłuższej niż 4 tygodnie.
export function semesters(meetings: SemesterMeeting[]): Semester[] {
  const weeks = [...new Set(meetings.filter(countsForSemester).map((m) => startOfWeek(m.start).getTime()))].sort(
    (a, b) => a - b,
  )
  const result: Semester[] = []
  for (let i = 0; i < weeks.length; i++) {
    const emptyWeeks = i > 0 ? Math.round((weeks[i] - weeks[i - 1]) / WEEK_MS) - 1 : Infinity
    if (emptyWeeks >= NEW_SEMESTER_GAP_WEEKS) result.push({ firstWeek: new Date(weeks[i]), lastWeek: new Date(weeks[i]) })
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
export function semesterWeek(weekStart: Date, meetings: SemesterMeeting[]): SemesterWeek | null {
  const target = startOfWeek(weekStart)
  const hasClasses = meetings.some((m) => countsForSemester(m) && startOfWeek(m.start).getTime() === target.getTime())
  const semester = hasClasses ? semesterAt(target, semesters(meetings)) : null
  if (!semester) return null
  const number = weekIndex(target, semester)
  return { number, odd: number % 2 === 1 }
}
