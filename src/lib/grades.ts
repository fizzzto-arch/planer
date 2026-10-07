// Oceny końcowe z przedmiotów programu studiów i średnie: zwykła i ważona punktami ECTS.
// Zapis na koncie: users/{uid}/grades/{courseKey(nazwa w programie)} = { name, grade }.
import { GRADES, type Grade } from './scoring'
import { isElectivePool, type ProgramCourse, type StudyProgram } from './studyProgram'

export interface Average {
  weighted: number | null // ważona punktami ECTS (null - brak ocen z punktami)
  plain: number | null
  count: number
}

export function average(entries: { grade: number; ects: number }[]): Average {
  const ects = entries.reduce((sum, e) => sum + e.ects, 0)
  return {
    weighted: ects > 0 ? entries.reduce((sum, e) => sum + e.grade * e.ects, 0) / ects : null,
    plain: entries.length > 0 ? entries.reduce((sum, e) => sum + e.grade, 0) / entries.length : null,
    count: entries.length,
  }
}

// Ocenę wpisuje się przy przedmiocie, nie przy puli punktów za obieralne ("Przedmioty obieralne sem. 6").
export const canGrade = (course: ProgramCourse) => !isElectivePool(course)

export function programAverages(program: StudyProgram, grades: Map<string, Grade>) {
  const semesters = new Map<number, Average>()
  const all: { grade: number; ects: number }[] = []
  for (const semester of program.semesters) {
    const entries = semester.courses.flatMap((c) => {
      const grade = grades.get(c.name)
      return grade !== undefined && canGrade(c) ? [{ grade, ects: c.ects }] : []
    })
    semesters.set(semester.number, average(entries))
    all.push(...entries)
  }
  return { semesters, total: average(all) }
}

export function parseFinalGrade(raw: Record<string, unknown>): { name: string; grade: Grade } | null {
  const grade = GRADES.find((g) => g === raw.grade)
  return typeof raw.name === 'string' && raw.name && grade !== undefined ? { name: raw.name, grade } : null
}
