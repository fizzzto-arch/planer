// Program studiów z Katalogu ECTS PW: semestry, przedmioty i ich sylabusy. Dane w src/lib/programs/
// (generuje je scripts/ects-program.ts). Kierunek i semestr rozpoznajemy po nazwach przedmiotów z planu.

export interface ProgramCourse {
  name: string
  block: string // np. "Kierunkowe", "Podstawowe", "Aparatura Medyczna" (specjalność)
  group: string // "Obowiązkowe", "Obieralne", "Specjalnościowe", "HES", "Szkolenia"
  ects: number
  hours?: Record<string, number> // W - wykład, C - ćwiczenia, L - laboratorium, P - projekt, K - lekcje komputerowe
  syllabusId?: number
  code?: string
  coordinator?: string
  exam?: boolean
  prerequisites?: string
  goal?: string
  content?: string
  assessment?: string
  literature?: string
}

export interface StudyProgram {
  id: number
  name: string
  faculty: string
  degree: string
  mode: string
  year: string // rok akademicki katalogu, np. "2021/2022"
  url: string
  semesters: { number: number; courses: ProgramCourse[] }[]
}

export const SYLLABUS_URL = 'https://ects.pw.edu.pl/menu3/view2/idPrzedmiot/'

// Nazwa do porównań: małe litery, bez interpunkcji. "Matematyka - Analiza 2" pasuje też do "Analiza 2".
export function normalizeCourseName(name: string): string {
  return name
    .toLocaleLowerCase('pl')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function nameVariants(name: string): string[] {
  const parts = name.split(/\s[-–]\s/)
  return [normalizeCourseName(name), ...(parts.length > 1 ? [normalizeCourseName(parts.slice(1).join(' '))] : [])]
}

// Przedmiot z programu o tej nazwie (np. z planu) - null, gdy go nie ma.
export function programCourseKey(programNames: string[], courseName: string): string | null {
  const wanted = nameVariants(courseName)
  for (const name of programNames) {
    if (nameVariants(name).some((v) => wanted.includes(v))) return name
  }
  return null
}

// Program pasuje do planu, gdy większość przedmiotów z planu (i co najmniej 3) w nim jest.
export function matchesProgram(programNames: string[], planCourseNames: string[]): boolean {
  const names = [...new Set(planCourseNames)]
  const found = names.filter((n) => programCourseKey(programNames, n) !== null).length
  return found >= Math.min(3, names.length) && found * 2 >= names.length && found > 0
}

// Przedmioty, które masz teraz: zajęcia od dwóch tygodni wstecz (w planie jest też historia
// poprzedniego semestru). Bez takich zajęć (np. w sesji) - ostatnie, jakie były.
const RECENT_DAYS = 14

export function currentCourseNames(meetings: { courseName: string; start: Date; custom?: boolean }[], now: Date): string[] {
  const usos = meetings.filter((m) => !m.custom)
  const since = now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000
  const recent = usos.filter((m) => m.start.getTime() >= since)
  if (recent.length > 0) return [...new Set(recent.map((m) => m.courseName))]
  const last = Math.max(...usos.map((m) => m.start.getTime()))
  return [...new Set(usos.filter((m) => m.start.getTime() >= last - 120 * 24 * 60 * 60 * 1000).map((m) => m.courseName))]
}

export interface ProgramPosition {
  semester: number | null // semestr, w którym jest najwięcej Twoich obecnych przedmiotów
  inPlan: Map<string, string> // nazwa w programie -> nazwa w planie
}

export function programPosition(program: StudyProgram, planCourseNames: string[]): ProgramPosition {
  const programNames = program.semesters.flatMap((s) => s.courses.map((c) => c.name))
  const inPlan = new Map<string, string>()
  for (const name of planCourseNames) {
    const key = programCourseKey(programNames, name)
    if (key && !inPlan.has(key)) inPlan.set(key, name)
  }
  let semester: number | null = null
  let best = 0
  for (const s of program.semesters) {
    const count = s.courses.filter((c) => inPlan.has(c.name)).length
    if (count > best) {
      best = count
      semester = s.number
    }
  }
  return { semester, inPlan }
}

// Wiersz "Przedmioty obieralne sem. 6" to wymagana pula punktów, a nie przedmiot do wyboru.
export const isElectivePool = (c: ProgramCourse) => /^przedmioty obieralne/i.test(c.name)
export const isElective = (c: ProgramCourse) => c.group === 'Obieralne' && !isElectivePool(c)

// Punkty semestru bez przedmiotów do wyboru (te liczą się dopiero po wyborze).
export function semesterEcts(courses: ProgramCourse[]): number {
  return courses.filter((c) => !isElective(c)).reduce((sum, c) => sum + c.ects, 0)
}
