import { describe, expect, it } from 'vitest'
import type { PlanMeeting } from './edits'
import { formatTypes, pastCourses, summarizeCourses } from './courses'

// Zajęcia co tydzień od poniedziałku danego tygodnia (weekday 0 = poniedziałek).
function weekly(course: string, type: string, group: number, monday: Date, weeks: number, weekday = 0): PlanMeeting[] {
  return Array.from({ length: weeks }, (_, w) => {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + weekday, 10, 15)
    return {
      id: `${course}-${type}-${w}`,
      courseName: course,
      type,
      start,
      end: new Date(start.getTime() + 105 * 60_000),
      room: null,
      building: null,
      address: null,
      groupNumber: group,
      unitId: null,
      usosUrl: null,
      cancelled: false,
      edited: false,
      custom: false,
      note: '',
      original: null,
    }
  })
}

// Zimowy semestr od 5.10.2026 (17 tygodni, do końca stycznia), egzamin w sesji (3.02), letni od 22.02.2027.
const winter = new Date(2026, 9, 5)
const summer = new Date(2027, 1, 22)
const plan = [
  ...weekly('Analiza 1', 'WYK', 1, winter, 17),
  ...weekly('Analiza 1', 'EGZ', 1, new Date(2027, 1, 1), 1, 2),
  ...weekly('Fizyka 1', 'LAB', 102, winter, 17, 1),
  ...weekly('WF', 'CWI', 5, winter, 17, 3),
  ...weekly('Analiza 2', 'WYK', 1, summer, 15),
  ...weekly('WF', 'CWI', 7, summer, 15, 3),
].sort((a, b) => a.start.getTime() - b.start.getTime())

describe('przejście na nowy semestr', () => {
  it('w trakcie zimowego semestru nic nie jest "z poprzedniego"', () => {
    expect([...pastCourses(plan, new Date(2026, 11, 10))]).toEqual([])
  })

  it('w sesji: skończone przedmioty są poprzednie, a te z egzaminem przed sobą - jeszcze nie', () => {
    expect([...pastCourses(plan, new Date(2027, 1, 2, 12))].sort()).toEqual(['Fizyka 1'])
    // Po egzaminie także Analiza 1.
    expect([...pastCourses(plan, new Date(2027, 1, 17))].sort()).toEqual(['Analiza 1', 'Fizyka 1'])
  })

  it('w letnim semestrze zimowe przedmioty są poprzednie, a WF (oba semestry) - obecny', () => {
    expect([...pastCourses(plan, new Date(2027, 1, 24))].sort()).toEqual(['Analiza 1', 'Fizyka 1'])
  })

  it('bez letniego semestru w planie (USOS jeszcze go nie podaje) - w sesji wszystko obecne', () => {
    const onlyWinter = plan.filter((m) => m.start < summer)
    expect([...pastCourses(onlyWinter, new Date(2027, 1, 17))]).toEqual([])
  })

  it('przedmiot z obu semestrów: grupy z bieżącego (nie "gr. 5, 7")', () => {
    const wf = (now: Date) => summarizeCourses(plan, now).find((c) => c.name === 'WF')!
    expect(formatTypes(wf(new Date(2026, 11, 10)).types)).toBe('Ćwiczenia gr. 5')
    expect(formatTypes(wf(new Date(2027, 1, 24)).types)).toBe('Ćwiczenia gr. 7')
    // Przedmiot tylko z zimy dalej pokazuje swoje grupy (i egzamin).
    const analiza = summarizeCourses(plan, new Date(2027, 1, 24)).find((c) => c.name === 'Analiza 1')!
    expect(formatTypes(analiza.types)).toBe('Wykład gr. 1 · Egzamin gr. 1')
  })
})
