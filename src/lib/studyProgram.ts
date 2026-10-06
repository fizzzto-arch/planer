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
  described?: boolean // sylabus ma opis (cel, treści) - pokazujemy zredagowany (CourseSummary), pełny pod linkiem
  assessment?: string
  literature?: string
}

// Zredagowany, krótki opis przedmiotu (zamiast ściany tekstu z sylabusa).
export interface CourseSummary {
  about: string // jedno-dwa zdania: o czym jest przedmiot
  topics?: string[] // główne tematy, po kilka słów
  needs?: string // co trzeba umieć wcześniej
  requires?: string[] // przedmioty z programu, na których się opiera (według wymagań z sylabusa)
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

export const courseHours = (c: ProgramCourse) => Object.values(c.hours ?? {}).reduce((sum, h) => sum + h, 0)

// Jaka część zajęć się odbyła: skończone liczą się w całości, trwające - w części, która minęła.
export function meetingsDone(meetings: { start: Date; end: Date; cancelled?: boolean }[], now: Date): number {
  const held = meetings.filter((m) => !m.cancelled)
  if (held.length === 0) return 0
  const time = now.getTime()
  const done = held.reduce((sum, m) => {
    const length = m.end.getTime() - m.start.getTime()
    return sum + (length > 0 ? Math.min(1, Math.max(0, (time - m.start.getTime()) / length)) : time >= m.end.getTime() ? 1 : 0)
  }, 0)
  return done / held.length
}

export interface HoursProgress {
  total: number
  done: number
  semesters: { number: number; hours: number; done: number }[]
}

// Godziny zajęć całego programu (bez przedmiotów do wyboru - ich godzin nie znamy) i ile z nich za Tobą:
// wcześniejsze semestry w całości, obecny według odbytych zajęć (fraction: przedmiot z programu -> 0..1).
export function hoursProgress(program: StudyProgram, current: number | null, fraction: (name: string) => number): HoursProgress {
  const semesters = program.semesters.map((s) => {
    const counted = s.courses.filter((c) => !isElective(c))
    const hours = counted.reduce((sum, c) => sum + courseHours(c), 0)
    let done = 0
    if (current !== null && s.number < current) done = hours
    else if (s.number === current) done = counted.reduce((sum, c) => sum + courseHours(c) * fraction(c.name), 0)
    return { number: s.number, hours, done }
  })
  return {
    total: semesters.reduce((sum, s) => sum + s.hours, 0),
    done: semesters.reduce((sum, s) => sum + s.done, 0),
    semesters,
  }
}

// Przedmioty w semestrze (bez puli obieralnych) i ile z nich kończy się egzaminem.
export function semesterLoad(courses: ProgramCourse[]): { courses: number; exams: number } {
  const counted = courses.filter((c) => !isElective(c) && !isElectivePool(c))
  return { courses: counted.length, exams: counted.filter((c) => c.exam).length }
}

// "Przyda się w": przedmiot -> późniejsze przedmioty, które go wymagają (odwrotność CourseSummary.requires).
export function dependents(
  program: StudyProgram,
  summaries: Record<string, CourseSummary>,
): Map<string, { name: string; semester: number }[]> {
  const result = new Map<string, { name: string; semester: number }[]>()
  for (const s of program.semesters) {
    for (const c of s.courses) {
      for (const required of summaries[c.name]?.requires ?? []) {
        result.set(required, [...(result.get(required) ?? []), { name: c.name, semester: s.number }])
      }
    }
  }
  return result
}
