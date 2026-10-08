import { describe, expect, it } from 'vitest'
import { nthWeeklyDate, weeklyCount, type WeekOf } from './classDates'
import { startOfWeek } from './dates'

// Semestr od poniedziałku 5.10.2026: 5-11.10 to tydzień 1, 12-18.10 tydzień 2...
const weekOf: WeekOf = (day) =>
  Math.round((startOfWeek(day).getTime() - new Date(2026, 9, 5).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

describe('liczba zajęć zamiast daty końca', () => {
  it('co tydzień: piąte zajęcia cztery tygodnie po pierwszych', () => {
    expect(nthWeeklyDate('2026-10-21', 5, 'all', weekOf)).toBe('2026-11-18')
    expect(nthWeeklyDate('2026-10-21', 1, 'all', weekOf)).toBe('2026-10-21')
    expect(weeklyCount('2026-10-21', '2026-11-18', 'all', weekOf)).toBe(5)
  })

  it('tylko parzyste tygodnie: liczą się wyłącznie one', () => {
    // 21.10 to tydzień 3 (nieparzysty) - pierwsze zajęcia 28.10 (tydzień 4), potem 11.11 i 25.11.
    expect(nthWeeklyDate('2026-10-21', 3, 'even', weekOf)).toBe('2026-11-25')
    expect(weeklyCount('2026-10-21', '2026-11-25', 'even', weekOf)).toBe(3)
  })

  it('błędne dane - bez daty', () => {
    expect(nthWeeklyDate('', 3, 'all', weekOf)).toBeNull()
    expect(nthWeeklyDate('2026-10-21', 0, 'all', weekOf)).toBeNull()
    expect(nthWeeklyDate('2026-10-21', 2, 'odd', () => null)).toBeNull() // poza semestrem nie ma tygodni nieparzystych
    expect(weeklyCount('2026-11-25', '2026-10-21', 'all', weekOf)).toBe(0)
  })
})
