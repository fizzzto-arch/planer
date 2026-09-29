import { describe, expect, it } from 'vitest'
import { buildTimetable, filterByParity, noteLine, recurrenceLabel, semesterTitle, type TimetableMeeting } from './timetable'

let nextId = 0
const meeting = (date: Date, from: string, to: string, over: Partial<TimetableMeeting> = {}): TimetableMeeting => {
  const at = (t: string) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), +t.slice(0, 2), +t.slice(3, 5))
  return {
    id: `m${nextId++}`,
    courseName: 'Analiza',
    type: 'WYK',
    start: at(from),
    end: at(to),
    room: '170',
    building: null,
    groupNumber: 1,
    cancelled: false,
    ...over,
  }
}

// Semestr od poniedziałku 5.10.2026 (tydzień 1), 12 tygodni; dzień tygodnia 1 = pn.
const day = (week: number, weekday: number) => new Date(2026, 9, 5 + (week - 1) * 7 + (weekday - 1))
const series = (weeks: number[], weekday: number, from: string, to: string, over: Partial<TimetableMeeting> = {}) =>
  weeks.map((w) => meeting(day(w, weekday), from, to, over))
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step)

describe('typowy tydzień', () => {
  const plan = [
    // Wykład w środy, ale w tygodniu 6 środa to święto, a w piątek tego tygodnia jest "plan środy".
    ...series(range(1, 12).filter((w) => w !== 6), 3, '10:15', '12:00'),
    meeting(day(6, 5), '10:15', '12:00'),
    // Piątkowe ćwiczenia (w tygodniu 6 ich nie ma - piątek ma plan środy).
    ...series(range(1, 12).filter((w) => w !== 6), 5, '12:15', '14:00', { courseName: 'Fizyka', type: 'CWI', groupNumber: 101 }),
    // Laboratorium w tygodnie nieparzyste + dodatkowe w tygodniu 12.
    ...series([...range(1, 11, 2), 12], 2, '08:15', '11:00', { courseName: 'Elektro', type: 'LAB', groupNumber: 101 }),
    // Laboratorium tylko przez kilka tygodni.
    ...series(range(4, 7), 4, '15:15', '18:00', { courseName: 'Radio', type: 'LAB', groupNumber: 101 }),
    // Projekt w tygodnie parzyste, raz krócej.
    ...series(range(2, 10, 2), 1, '14:15', '16:00', { courseName: 'Projekt', type: 'PRO', groupNumber: 102 }),
    meeting(day(12, 1), '14:15', '15:00', { courseName: 'Projekt', type: 'PRO', groupNumber: 102 }),
  ]
  const t = buildTimetable(plan, day(1, 1))!

  it('każde zajęcia raz, z oznaczeniem tygodni', () => {
    const labels = Object.fromEntries(t.entries.map((e) => [`${e.courseName} ${e.type}`, recurrenceLabel(e)]))
    expect(labels).toEqual({
      'Analiza WYK': '',
      'Fizyka CWI': '',
      'Elektro LAB': 'tyg. nieparzyste',
      'Radio LAB': '29.10–19.11',
      'Projekt PRO': 'tyg. parzyste',
    })
  })

  it('wykrywa święto, zamianę dni, dodatkowe zajęcia i zmianę godzin', () => {
    expect(t.notes.map(noteLine)).toEqual([
      '11.11 (śr.) – brak zajęć',
      '13.11 (pt.) – zajęcia jak w środę',
      '21.12 (pn.) – Projekt – Projekt 14:15–15:00 (zamiast 14:15–16:00)',
      '22.12 (wt.) – Laboratorium – Elektro (dodatkowo)',
    ])
  })

  it('łączy wolne dni w przerwę i pokazuje odwołane w Planerze', () => {
    const withBreak = [
      ...series(range(1, 12).filter((w) => w !== 8 && w !== 9), 1, '08:15', '10:00'),
      ...series(range(1, 12).filter((w) => w !== 8), 3, '08:15', '10:00', { courseName: 'Fizyka' }),
      { ...meeting(day(3, 3), '08:15', '10:00', { courseName: 'Fizyka' }), cancelled: true },
    ]
    const lines = buildTimetable(withBreak, day(1, 1))!.notes.map(noteLine)
    expect(lines).toContain('23.11–30.11 – przerwa, brak zajęć')
    expect(lines).toContain('21.10 (śr.) – Wykład – Fizyka odwołane')
  })

  it('filtr tygodni zostawia zajęcia co tydzień i wybrany rodzaj', () => {
    const odd = filterByParity(t.entries, 'odd').map((e) => e.courseName)
    expect(odd).toContain('Elektro')
    expect(odd).not.toContain('Projekt')
    expect(filterByParity(t.entries, 'even').map((e) => e.courseName)).toContain('Projekt')
  })

  it('nazwa semestru', () => {
    expect(semesterTitle(t.semester)).toBe('Semestr zimowy 2026/27')
    expect(semesterTitle({ firstWeek: new Date(2027, 1, 22), lastWeek: new Date(2027, 5, 7) })).toBe('Semestr letni 2026/27')
  })
})
