import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, startOfWeek, toDateKey } from './dates'
import { classesOn, snapshotPlan } from './planWatch'
import { reminderTime, type ReminderDeadline } from './reminders'
import { semesterWeek } from './semesterWeek'
import { buildTimetable, weekEntries, type TimetableMeeting } from './timetable'

// Zmiana czasu z letniego na zimowy: niedziela 25.10.2026, 3:00 -> 2:00.
// Doba ma wtedy 25 godzin - wszystko, co liczy dni w milisekundach, przesuwa się o godzinę.

// Zajęcia co poniedziałek 8:15-10:00 od 5.10 do 30.11 (przez zmianę czasu).
const mondays: TimetableMeeting[] = Array.from({ length: 9 }, (_, i) => ({
  id: `m${i}`,
  courseName: 'Analiza',
  type: 'WYK',
  start: new Date(2026, 9, 5 + i * 7, 8, 15),
  end: new Date(2026, 9, 5 + i * 7, 10, 0),
  room: '1',
  building: null,
  groupNumber: 1,
  cancelled: false,
}))

describe('zmiana czasu 25.10.2026', () => {
  it('testy liczą w polskiej strefie (vite.config.ts: test.env.TZ)', () => {
    expect(new Date(2026, 6, 1).getTimezoneOffset()).toBe(-120) // lato: UTC+2
    expect(new Date(2026, 11, 1).getTimezoneOffset()).toBe(-60) // zima: UTC+1
    expect(new Date(2026, 9, 25, 12).getTime() - new Date(2026, 9, 25, 0).getTime()).toBe(13 * 3600_000)
  })

  it('dni i tygodnie przez zmianę czasu', () => {
    expect(daysBetween(new Date(2026, 9, 24, 23, 30), new Date(2026, 9, 26, 0, 30))).toBe(2)
    expect(daysBetween(new Date(2026, 9, 25, 0, 0), new Date(2026, 9, 25, 23, 59))).toBe(0)
    expect(toDateKey(addDays(new Date(2026, 9, 24), 1))).toBe('2026-10-25')
    expect(toDateKey(addDays(new Date(2026, 9, 25), 1))).toBe('2026-10-26')
    // Niedziela wieczorem to jeszcze tydzień od 19.10, poniedziałek rano - już nowy.
    expect(toDateKey(startOfWeek(new Date(2026, 9, 25, 23, 30)))).toBe('2026-10-19')
    expect(startOfWeek(new Date(2026, 9, 26, 8, 15))).toEqual(new Date(2026, 9, 26))
  })

  it('numer i parzystość tygodnia nie przeskakują', () => {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => semesterWeek(new Date(2026, 9, 5 + i * 7), mondays)?.number)
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(semesterWeek(new Date(2026, 9, 26), mondays)?.odd).toBe(false) // tydzień 4
    expect(semesterWeek(new Date(2026, 10, 2), mondays)?.odd).toBe(true) // tydzień 5
  })

  it('zajęcia zostają o 8:15 przed i po zmianie czasu', () => {
    const timetable = buildTimetable(mondays, new Date(2026, 9, 5))!
    // Jedna seria "co tydzień", a nie dwie (8:15 do zmiany i 7:15 po niej).
    expect(timetable.entries).toHaveLength(1)
    expect(timetable.entries[0]).toMatchObject({ weekday: 1, start: 8 * 60 + 15, end: 10 * 60, recurrence: 'weekly' })
    for (const week of [new Date(2026, 9, 19), new Date(2026, 9, 26)]) {
      const [entry] = weekEntries(mondays, week)
      expect(entry).toMatchObject({ weekday: 1, start: 8 * 60 + 15 })
    }
  })

  it('przypomnienia o 18:00 czasu polskiego - także w dniu zmiany', () => {
    const d: ReminderDeadline = {
      id: 'k',
      courseName: 'Analiza',
      kind: 'kolokwium',
      title: '',
      date: '2026-10-26',
      time: '08:15',
      done: false,
    }
    // "Dzień wcześniej" wypada w niedzielę zmiany czasu - 18:00 zimowego (17:00 UTC).
    expect(reminderTime(d, 'day')?.toISOString()).toBe('2026-10-25T17:00:00.000Z')
    // "Tydzień wcześniej" jeszcze w czasie letnim - 18:00 = 16:00 UTC.
    expect(reminderTime(d, 'week')?.toISOString()).toBe('2026-10-19T16:00:00.000Z')
    expect(reminderTime(d, 'hour')?.toISOString()).toBe('2026-10-26T06:15:00.000Z')
    expect(reminderTime({ ...d, date: '2026-10-25', time: '10:00' }, 'morning')?.toISOString()).toBe(
      '2026-10-25T06:30:00.000Z', // 7:30 zimowego
    )
  })

  it('serwer: zajęcia z dnia po zmianie czasu trafiają do właściwego dnia', () => {
    const full = mondays.map((m) => ({ ...m, address: null, unitId: null, usosUrl: null }))
    const plan = snapshotPlan(full, new Date(2026, 9, 20), 14)
    expect(classesOn(plan, new Date(2026, 9, 26, 6, 0)).map((m) => m.id)).toEqual(['m3'])
    expect(classesOn(plan, new Date(2026, 9, 25, 12, 0))).toEqual([])
  })
})
