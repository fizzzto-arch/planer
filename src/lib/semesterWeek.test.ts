import { describe, expect, it } from 'vitest'
import { semesterWeek, semesters } from './semesterWeek'

const m = (y: number, mo: number, d: number) => ({ start: new Date(y, mo - 1, d, 10, 15), cancelled: false })

// Zajęcia w każdy poniedziałek od from do to (włącznie).
const mondays = (from: Date, to: Date) => {
  const out = []
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 7)) out.push(m(d.getFullYear(), d.getMonth() + 1, d.getDate()))
  return out
}

describe('numer tygodnia semestru', () => {
  // Pierwsze zajęcia w piątek 2.10, potem co poniedziałek do 21.12; przerwa 28.12-3.01; od 5.01 znowu.
  const meetings = [m(2026, 10, 2), ...mondays(new Date(2026, 9, 5), new Date(2026, 11, 21)), m(2027, 1, 5), m(2027, 1, 12)]

  it('liczy od tygodnia pierwszych zajęć', () => {
    expect(semesterWeek(new Date(2026, 8, 28), meetings)).toEqual({ number: 1, odd: true })
    expect(semesterWeek(new Date(2026, 9, 5), meetings)).toEqual({ number: 2, odd: false })
  })

  it('przerwa świąteczna nie przesuwa parzystości (tak układa zajęcia USOS)', () => {
    expect(semesterWeek(new Date(2026, 11, 21), meetings)?.number).toBe(13)
    expect(semesterWeek(new Date(2026, 11, 28), meetings)).toBeNull() // przerwa - bez numeru
    expect(semesterWeek(new Date(2027, 0, 4), meetings)).toEqual({ number: 15, odd: true })
  })

  it('długa przerwa zaczyna nowy semestr', () => {
    const withSummer = [...meetings, m(2027, 2, 22), m(2027, 3, 1)]
    expect(semesters(withSummer)).toHaveLength(2)
    expect(semesterWeek(new Date(2027, 2, 1), withSummer)).toEqual({ number: 2, odd: false })
  })

  it('przełom semestrów PW 2026/27: zimowy do 29.01, sesja z egzaminem, letni od 22.02 od tygodnia 1', () => {
    // Zajęcia zimowe do czwartku 28.01, egzamin 5.02 (sesja 1-14.02), rejestracja 15-21.02, letni od 22.02.
    const year = [
      ...mondays(new Date(2026, 9, 5), new Date(2026, 11, 21)),
      m(2027, 1, 7),
      ...mondays(new Date(2027, 0, 11), new Date(2027, 0, 25)),
      m(2027, 1, 28),
      { ...m(2027, 2, 5), type: 'EGZ' },
      ...mondays(new Date(2027, 1, 22), new Date(2027, 5, 14)),
    ]
    expect(semesters(year)).toHaveLength(2)
    expect(semesterWeek(new Date(2027, 0, 25), year)).toEqual({ number: 17, odd: true })
    expect(semesterWeek(new Date(2027, 1, 1), year)).toBeNull() // tydzień z samym egzaminem
    expect(semesterWeek(new Date(2027, 1, 22), year)).toEqual({ number: 1, odd: true })
    expect(semesterWeek(new Date(2027, 2, 1), year)).toEqual({ number: 2, odd: false })
  })

  it('dwa tygodnie przerwy (święta) to jeszcze ten sam semestr', () => {
    const xmas = [...mondays(new Date(2029, 9, 1), new Date(2029, 11, 17)), ...mondays(new Date(2030, 0, 7), new Date(2030, 0, 28))]
    expect(semesters(xmas)).toHaveLength(1)
  })

  it('odwołane zajęcia nie tworzą tygodnia', () => {
    const only = [m(2026, 10, 5), { ...m(2026, 10, 12), cancelled: true }, m(2026, 10, 19)]
    expect(semesterWeek(new Date(2026, 9, 12), only)).toBeNull()
    expect(semesterWeek(new Date(2026, 9, 19), only)?.number).toBe(3)
  })
})
