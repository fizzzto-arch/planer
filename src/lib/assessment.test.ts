import { describe, expect, it } from 'vitest'
import { assessmentLine, nextDeadlineTitle } from './assessment'
import { programAssessments } from './courseAssessment'
import { PROGRAM } from './programs/ib'
import { ASSESSMENTS } from './programs/ibAssessment'

describe('zaliczenie przedmiotu', () => {
  it('jedna linijka na liście przedmiotów: skrót z regulaminu albo złożona z wierszy', () => {
    expect(assessmentLine(ASSESSMENTS['Podstawy Automatyki'])).toBe('egzamin (55 pkt) · 7 ćwiczeń lab. (35 pkt)')
    expect(assessmentLine(ASSESSMENTS['Mechanika i Wytrzymałość materiałów'])).toBe('ćwiczenia – kolokwia – 50% oceny · egzamin – 50% oceny')
  })

  it('semestr 3: zasady z regulaminów 2026/27 (poza Laboratorium elektrotechniki - bez regulaminu)', () => {
    const fromRegulations = Object.entries(ASSESSMENTS)
      .filter(([, a]) => a.source.kind === 'regulamin')
      .map(([name]) => name)
      .sort()
    expect(fromRegulations).toEqual([
      'Grafika komputerowa',
      'Matematyka - Rachunek prawdopodobieństwa i statystyka',
      'Podstawy Automatyki',
      'Podstawy elementów i układów elektronicznych',
      'Radiologia',
      'Wspomagane komputerowo projektowanie inżynierskie',
    ])
    // Regulamin poprawia sylabus: elektronika bez kolokwiów, rachunek - 2 kolokwia, nie 3.
    expect(ASSESSMENTS['Podstawy elementów i układów elektronicznych'].rows.some((r) => r.add?.kind === 'kolokwium')).toBe(false)
    expect(ASSESSMENTS['Matematyka - Rachunek prawdopodobieństwa i statystyka'].rows[0].add?.count).toBe(2)
    expect(ASSESSMENTS['Laboratorium elektrotechniki'].source.kind).toBe('sylabus')
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
    expect(ib?.('Podstawy automatyki')?.rows[0].text).toBe('egzamin pisemny – 55 pkt, zalicza 27,5 pkt')
    expect(ib?.('Wychowanie fizyczne')).toBeNull()
    expect(programAssessments(plan(['Grafika komputerowa', 'Analiza matematyczna', 'Fizyka']), now)).toBeNull()
  })
})
