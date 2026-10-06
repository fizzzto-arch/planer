import { describe, expect, it } from 'vitest'
import { PROGRAM } from './programs/ib'
import { PROGRAM_NAMES } from './programs/ibNames'
import {
  currentCourseNames,
  dependents,
  hoursProgress,
  meetingsDone,
  matchesProgram,
  programCourseKey,
  programPosition,
  semesterEcts,
  semesterLoad,
} from './studyProgram'

// Przedmioty 3. semestru Inżynierii Biomedycznej tak, jak nazywa je USOS (plan z iCal).
const SEMESTER_3 = [
  'Grafika komputerowa',
  'Laboratorium elektrotechniki',
  'Podstawy automatyki',
  'Podstawy elementów i układów elektronicznych',
  'Rachunek prawdopodobieństwa i statystyka',
  'Radiologia',
  'Wspomagane komputerowo projektowanie inżynierskie',
]

describe('program studiów', () => {
  it('nazwy z USOS pasują do programu mimo wielkości liter i przedrostka "Matematyka -"', () => {
    expect(programCourseKey(PROGRAM_NAMES, 'Podstawy automatyki')).toBe('Podstawy Automatyki')
    expect(programCourseKey(PROGRAM_NAMES, 'Rachunek prawdopodobieństwa i statystyka')).toBe(
      'Matematyka - Rachunek prawdopodobieństwa i statystyka',
    )
    expect(programCourseKey(PROGRAM_NAMES, 'Analiza matematyczna')).toBeNull()
  })

  it('kierunek rozpoznany po przedmiotach z planu; inny plan - nie', () => {
    expect(matchesProgram(PROGRAM_NAMES, [...SEMESTER_3, 'Wychowanie fizyczne', 'Język angielski - poziom B2'])).toBe(true)
    expect(matchesProgram(PROGRAM_NAMES, ['Analiza matematyczna', 'Fizyka', 'Programowanie', 'Grafika komputerowa'])).toBe(false)
    expect(matchesProgram(PROGRAM_NAMES, [])).toBe(false)
  })

  it('obecny semestr i przedmioty w planie', () => {
    const position = programPosition(PROGRAM, SEMESTER_3)
    expect(position.semester).toBe(3)
    expect(position.inPlan.size).toBe(7)
    expect(position.inPlan.get('Podstawy Automatyki')).toBe('Podstawy automatyki')
  })

  it('punkty semestru bez przedmiotów do wyboru, z pulą obieralnych', () => {
    const ects = (n: number) => semesterEcts(PROGRAM.semesters.find((s) => s.number === n)!.courses)
    expect(ects(1)).toBe(30)
    expect(ects(3)).toBe(26)
    expect(ects(5)).toBe(20) // specjalność + obowiązkowe; obieralne osobno
    expect(ects(6)).toBe(25) // w tym "Przedmioty obieralne sem. 6" (14 ECTS)
  })

  it('każdy opisany w katalogu przedmiot ma zredagowany opis (i żaden opis nie wisi bez przedmiotu)', async () => {
    const { SUMMARIES } = await import('./programs/ibSummaries')
    const courses = PROGRAM.semesters.flatMap((s) => s.courses)
    const missing = courses.filter((c) => c.described && !SUMMARIES[c.name]).map((c) => c.name)
    expect(missing).toEqual([])
    const names = new Set(courses.map((c) => c.name))
    expect(Object.keys(SUMMARIES).filter((name) => !names.has(name))).toEqual([])
    // Krótko: zdanie-dwa i tematy po kilka słów.
    for (const [name, s] of Object.entries(SUMMARIES)) {
      expect(s.about.length, name).toBeLessThan(200)
      for (const topic of s.topics ?? []) expect(topic.length, `${name}: ${topic}`).toBeLessThan(65)
    }
  })

  it('"Przyda się w": wymagane przedmioty istnieją i są wcześniej (albo równolegle)', async () => {
    const { SUMMARIES } = await import('./programs/ibSummaries')
    const semesterOf = new Map(PROGRAM.semesters.flatMap((s) => s.courses.map((c) => [c.name, s.number] as const)))
    for (const [name, s] of Object.entries(SUMMARIES)) {
      for (const required of s.requires ?? []) {
        expect(semesterOf.has(required), `${name} -> ${required}`).toBe(true)
        expect(semesterOf.get(required)!, `${name} -> ${required}`).toBeLessThanOrEqual(semesterOf.get(name)!)
      }
    }
    const usedIn = dependents(PROGRAM, SUMMARIES)
    expect(usedIn.get('Radiologia')).toEqual([
      { name: 'Podstawy obrazowania medycznego', semester: 4 },
      { name: 'Kontrola Jakości Radiologicznych Urządzeń Diagnostycznych', semester: 5 },
    ])
  })

  it('obciążenie semestru: przedmioty i egzaminy', () => {
    const semester = (n: number) => PROGRAM.semesters.find((s) => s.number === n)!.courses
    expect(semesterLoad(semester(3))).toEqual({ courses: 7, exams: 4 })
    expect(semesterLoad(semester(5)).courses).toBe(5) // bez listy obieralnych
  })

  it('postęp w godzinach: wcześniejsze semestry w całości, obecny według odbytych zajęć', () => {
    const none = hoursProgress(PROGRAM, 3, () => 0)
    expect(none.total).toBe(1740) // bez przedmiotów obieralnych
    expect(none.done).toBe(780) // semestry 1 i 2
    // Radiologia (45 h) w połowie - 22,5 h więcej.
    const half = hoursProgress(PROGRAM, 3, (name) => (name === 'Radiologia' ? 0.5 : 0))
    expect(half.done).toBe(802.5)
    expect(half.semesters.find((s) => s.number === 3)).toEqual({ number: 3, hours: 300, done: 22.5 })
    expect(hoursProgress(PROGRAM, null, () => 1).done).toBe(0)
  })

  it('odbyte zajęcia: skończone w całości, trwające w części, odwołane się nie liczą', () => {
    const at = (day: number, hour: number) => ({ start: new Date(2026, 9, day, hour), end: new Date(2026, 9, day, hour + 2) })
    const now = new Date(2026, 9, 14, 11) // w połowie zajęć 14.10 10:00-12:00
    const meetings = [at(7, 10), at(14, 10), at(21, 10), { ...at(28, 10), cancelled: true }]
    expect(meetingsDone(meetings, now)).toBeCloseTo(1.5 / 3)
    expect(meetingsDone([], now)).toBe(0)
  })

  it('obecne przedmioty: zajęcia z ostatnich dwóch tygodni, bez historii poprzedniego semestru', () => {
    const now = new Date(2026, 9, 14)
    const at = (courseName: string, month: number, day: number) => ({ courseName, start: new Date(2026, month, day) })
    const meetings = [at('Fizyka 2', 5, 10), at('Radiologia', 9, 6), at('Radiologia', 9, 20), at('Grafika komputerowa', 9, 16)]
    expect(currentCourseNames(meetings, now).sort()).toEqual(['Grafika komputerowa', 'Radiologia'])
    // W sesji (brak nadchodzących zajęć) - ostatni semestr.
    expect(currentCourseNames([at('Fizyka 2', 5, 10)], now)).toEqual(['Fizyka 2'])
  })
})
