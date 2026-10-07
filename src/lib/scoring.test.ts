import { describe, expect, it } from 'vitest'
import { ASSESSMENTS } from './programs/ibAssessment'
import {
  customScoring,
  formatGrade,
  missingTo,
  parseCourseScores,
  parsePoints,
  scoreResult,
  DEFAULT_CUSTOM_SCALE,
  type Points,
  type Scoring,
} from './scoring'
import { average, programAverages } from './grades'
import type { StudyProgram } from './studyProgram'

const scoring = (name: string): Scoring => {
  const s = ASSESSMENTS[name]?.scoring
  if (!s) throw new Error(`brak punktacji: ${name}`)
  return s
}
const lab = (prefix: string, values: number[]): Points => Object.fromEntries(values.map((v, i) => [`${prefix}${i + 1}`, v]))

describe('kalkulator punktów', () => {
  it('Grafika: suma punktów, ocena i ile do kolejnej', () => {
    const r = scoreResult(scoring('Grafika komputerowa'), { kol: 16, ...lab('lab', [5, 5, 5, 5, 5]) })
    expect(r).toMatchObject({ unit: 'pkt', value: 41, max: 50, grade: 4.5, forecast: null, filled: 6, total: 6 })
    expect(r.next).toEqual({ grade: 5, missing: 4, reachable: false })
  })

  it('w trakcie semestru: prognoza z dotychczasowego procentu, do 3 brakuje', () => {
    const r = scoreResult(scoring('Grafika komputerowa'), { kol: 16 })
    expect(r.value).toBe(16)
    expect(r.potential).toBe(46)
    expect(r.grade).toBe(2)
    expect(r.forecast).toBe(4.5) // 80% z 50 pkt = 40
    expect(r.next).toEqual({ grade: 3, missing: 9, reachable: true })
  })

  it('nic nie wpisane - bez prognozy', () => {
    const r = scoreResult(scoring('Grafika komputerowa'), {})
    expect(r).toMatchObject({ value: 0, filled: 0, forecast: null, grade: 2 })
  })

  it('Automatyka: niezaliczone ćwiczenie liczy się 0, trzeba zaliczyć 6 z 7; aktywność ponad maksimum', () => {
    const s = scoring('Podstawy Automatyki')
    const failed = scoreResult(s, { egz: 50, akt: 8, ...lab('cw', [5, 5, 5, 5, 5, 2, 0]) })
    const cw = failed.parts.find((p) => p.part.id === 'cw')!
    expect(cw.got).toBe(25)
    expect(cw.items).toEqual({ passed: 5, need: 6 })
    expect(failed.conditionsMet).toBe(false)
    expect(failed.grade).toBe(2)

    const passed = scoreResult(s, { egz: 40, akt: 8, ...lab('cw', [5, 5, 5, 5, 5, 3, 0]) })
    expect(passed.max).toBe(90)
    expect(passed.value).toBe(76)
    expect(passed.grade).toBe(4.5) // ponad 72
  })

  it('"ponad" - trzeba przekroczyć próg', () => {
    expect(missingTo(45, { from: 45, above: true }, 0.5)).toBe(0.5)
    expect(missingTo(45.5, { from: 45, above: true }, 0.5)).toBe(0)
    expect(missingTo(20, { from: 25 }, 0.5)).toBe(5)
  })

  it('Radiologia: średnia ważona procentów, osobne progi egzaminu i laboratorium', () => {
    const s = scoring('Radiologia')
    const ok = scoreResult(s, { egz: 24, ...lab('lab', [6, 6, 6, 7, 7]) })
    expect(ok).toMatchObject({ unit: '%', value: 80, max: 100, grade: 4 })
    expect(ok.next).toMatchObject({ grade: 4.5, missing: 1 })

    const exam = scoreResult(s, { egz: 15, ...lab('lab', [8, 8, 8, 8, 8]) })
    expect(exam.grade).toBe(2)
    // Egzamin już wpisany - brakującego punktu nie da się dobrać (zostaje poprawka).
    expect(exam.parts[0].pass).toEqual({ ok: false, missing: 1, reachable: false })
    expect(scoreResult(s, lab('lab', [8, 8, 8, 8, 8])).parts[0].pass).toEqual({ ok: false, missing: 16, reachable: true })
  })

  it('WKPI: wyniki w procentach, każda część ponad 50%', () => {
    const r = scoreResult(scoring('Wspomagane komputerowo projektowanie inżynierskie'), { kol1: 60, kol2: 70, lab: 80, pro: 40 })
    const project = r.parts.find((p) => p.part.id === 'pro')!
    expect(project.pass).toEqual({ ok: false, missing: 10.1, reachable: false })
    expect(r.grade).toBe(2)
    expect(r.value).toBe(62.5) // 0,5 × 65 + 0,25 × 80 + 0,25 × 40
  })

  it('RPiS: zwolnienie z egzaminu i ile do niego brakuje', () => {
    const s = scoring('Matematyka - Rachunek prawdopodobieństwa i statystyka')
    expect(scoreResult(s, { kol1: 13, kol2: 14, akt: 7 }).exemption).toEqual({ ok: true, grade: 4.5, missing: 0, reachable: true })
    expect(scoreResult(s, { kol1: 15, kol2: 16, akt: 8 }).exemption?.grade).toBe(5)
    // Kolokwium 1 poniżej 12 (brakuje 1), z ćwiczeń 32 - trzeba ponad 32.
    expect(scoreResult(s, { kol1: 11, kol2: 14, akt: 7 }).exemption).toMatchObject({ ok: false, missing: 1, reachable: false })
    // Po pierwszym kolokwium: zwolnienie jeszcze możliwe.
    expect(scoreResult(s, { kol1: 13 }).exemption).toMatchObject({ ok: false, missing: 19.5, reachable: true })
    // Egzamin: ponad 30 i suma ponad 50.
    const exam = scoreResult(s, { kol1: 10, kol2: 10, akt: 2, egz: 40 })
    expect(exam).toMatchObject({ value: 62, grade: 3.5 })
  })

  it('własna rozpiska: progi w procentach maksimum (domyślnie jak w Regulaminie Studiów PW)', () => {
    const s = customScoring({
      items: [
        { id: 'a', label: 'Kolokwium 1', max: 25 },
        { id: 'b', label: 'Kolokwium 2', max: 25 },
      ],
      scale: DEFAULT_CUSTOM_SCALE,
    })
    expect(s.scale.map((x) => x.from)).toEqual([25.5, 30.5, 35.5, 40.5, 45.5])
    expect(scoreResult(s, { a: 15, b: 15 })).toMatchObject({ value: 30, grade: 3 })
  })
})

describe('zapis punktów', () => {
  it('odczyt z konta pomija błędne dane', () => {
    expect(parseCourseScores({ name: '' })).toBeNull()
    expect(
      parseCourseScores({
        name: 'Radiologia',
        points: { egz: 20, zle: 'x', minus: -1 },
        custom: { items: [{ id: 'a', label: 'A', max: 10 }, { id: 'b', label: 'B', max: 0 }], scale: [1, 2] },
      }),
    ).toEqual({ name: 'Radiologia', points: { egz: 20 }, custom: { items: [{ id: 'a', label: 'A', max: 10 }], scale: DEFAULT_CUSTOM_SCALE } })
  })

  it('wpisany tekst: przecinek albo kropka', () => {
    expect(parsePoints('12,5')).toBe(12.5)
    expect(parsePoints(' 7 ')).toBe(7)
    expect(parsePoints('')).toBeNull()
    expect(parsePoints('-1')).toBeNull()
    expect(parsePoints('abc')).toBeNull()
  })

  it('oceny po polsku', () => {
    expect(formatGrade(3.5)).toBe('3,5')
    expect(formatGrade(4)).toBe('4')
    expect(formatGrade(4.2133)).toBe('4,21')
  })

  it('każdy przedmiot z punktacją ma ją z regulaminu i sensowną skalę', () => {
    const withScoring = Object.entries(ASSESSMENTS).filter(([, a]) => a.scoring)
    expect(withScoring.map(([name]) => name).sort()).toEqual(
      [
        'Grafika komputerowa',
        'Matematyka - Rachunek prawdopodobieństwa i statystyka',
        'Podstawy Automatyki',
        'Podstawy elementów i układów elektronicznych',
        'Radiologia',
        'Wspomagane komputerowo projektowanie inżynierskie',
      ].sort(),
    )
    for (const [, a] of withScoring) {
      expect(a.source.kind).toBe('regulamin')
      const froms = a.scoring!.scale.map((s) => s.from)
      expect(froms).toEqual([...froms].sort((x, y) => x - y))
      expect(a.scoring!.scale.map((s) => s.grade)).toEqual([3, 3.5, 4, 4.5, 5])
    }
  })
})

describe('średnia', () => {
  it('ważona punktami ECTS i zwykła', () => {
    const avg = average([
      { grade: 5, ects: 6 },
      { grade: 3, ects: 2 },
    ])
    expect(avg.weighted).toBe(4.5)
    expect(avg.plain).toBe(4)
    expect(average([]).weighted).toBeNull()
  })

  it('w programie: po semestrach i ze wszystkich; pula obieralnych bez oceny', () => {
    const course = (name: string, ects: number, group = 'Obowiązkowe') => ({ name, block: '', group, ects })
    const program: StudyProgram = {
      id: 1,
      name: 'Test',
      faculty: '',
      degree: 'inż',
      mode: 'stacjonarne',
      year: '2021/2022',
      url: '',
      semesters: [
        { number: 1, courses: [course('A', 4), course('B', 2)] },
        { number: 2, courses: [course('C', 6), course('Przedmioty obieralne sem. 2', 4, 'Obieralne')] },
      ],
    }
    const { semesters, total } = programAverages(
      program,
      new Map([
        ['A', 5],
        ['B', 3],
        ['C', 4],
        ['Przedmioty obieralne sem. 2', 5],
      ] as const),
    )
    expect(semesters.get(1)?.weighted).toBeCloseTo(13 / 3)
    expect(semesters.get(2)).toMatchObject({ weighted: 4, count: 1 })
    expect(total).toMatchObject({ count: 3, plain: 4 })
    expect(total.weighted).toBeCloseTo(50 / 12)
  })
})
