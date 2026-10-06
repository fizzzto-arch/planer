import { describe, expect, it } from 'vitest'
import { assessmentLine, nextDeadlineTitle } from './assessment'
import { programAssessments } from './courseAssessment'
import { PROGRAM } from './programs/ib'
import { ASSESSMENTS } from './programs/ibAssessment'

describe('zaliczenie przedmiotu', () => {
  it('jedna linijka na liście przedmiotów', () => {
    expect(assessmentLine(ASSESSMENTS['Podstawy Automatyki'])).toBe('ćwiczenia – kolokwia · egzamin końcowy')
    expect(assessmentLine(ASSESSMENTS.Radiologia)).toBe('wykład – egzamin · laboratorium – sprawdziany i sprawozdania')
  })

  it('kolejne terminy numerowane, pojedynczy bez numeru', () => {
    expect(nextDeadlineTitle({ kind: 'kolokwium', title: 'Kolokwium', count: 3 }, 1)).toBe('Kolokwium 2')
    expect(nextDeadlineTitle({ kind: 'kolokwium', title: 'Kolokwium' }, 0)).toBe('Kolokwium 1')
    expect(nextDeadlineTitle({ kind: 'egzamin', title: 'Egzamin', count: 1 }, 0)).toBe('Egzamin')
  })

  it('każdy przedmiot z zasadami zaliczenia w sylabusie ma rozpiskę, a rozpiski - przedmiot', () => {
    const courses = PROGRAM.semesters.flatMap((s) => s.courses)
    expect(courses.filter((c) => c.assessment && !ASSESSMENTS[c.name]).map((c) => c.name)).toEqual([])
    const names = new Set(courses.map((c) => c.name))
    expect(Object.keys(ASSESSMENTS).filter((name) => !names.has(name))).toEqual([])
  })

  it('tylko dla planu z tego kierunku - przedmiot o tej samej nazwie gdzie indziej nie dostaje cudzych zasad', () => {
    const now = new Date(2026, 9, 14)
    const plan = (names: string[]) => names.map((courseName) => ({ courseName, start: new Date(2026, 9, 15) }))
    const ib = programAssessments(plan(['Radiologia', 'Grafika komputerowa', 'Podstawy automatyki']), now)
    expect(ib?.('Podstawy automatyki')?.rows[1].text).toBe('egzamin końcowy')
    expect(ib?.('Wychowanie fizyczne')).toBeNull()
    expect(programAssessments(plan(['Grafika komputerowa', 'Analiza matematyczna', 'Fizyka']), now)).toBeNull()
  })
})
