import { describe, expect, it } from 'vitest'
import { alternatingGroups } from './exportModel'
import type { TimetableEntry } from './timetable'

const h = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const entry = (id: string, from: string, to: string, over: Partial<TimetableEntry> = {}): TimetableEntry => ({
  id,
  weekday: 1,
  start: h(from),
  end: h(to),
  courseName: id,
  type: 'LAB',
  groupNumber: 201,
  room: null,
  building: null,
  recurrence: 'weekly',
  range: null,
  only: null,
  date: null,
  ...over,
})
const range = (from: string, to: string) => ({ from: new Date(from), to: new Date(to) })

describe('zajęcia na zmianę w typowym tygodniu', () => {
  it('laboratoria blokami w różnych okresach to jeden termin dzielony w pionie', () => {
    const groups = alternatingGroups([
      entry('WKPI', '11:15', '14:00', { range: range('2026-12-14', '2027-01-25') }),
      entry('Radiologia', '11:15', '14:00', { range: range('2026-10-19', '2026-11-16') }),
    ])
    // Wcześniejszy okres na górze.
    expect(groups.get('Radiologia')).toMatchObject({ index: 0, count: 2 })
    expect(groups.get('WKPI')).toMatchObject({ index: 1, count: 2 })
    expect(groups.get('Radiologia')!.key).toBe(groups.get('WKPI')!.key)
  })

  it('tygodnie nieparzyste i parzyste też są na zmianę', () => {
    const groups = alternatingGroups([
      entry('Projekt', '14:15', '16:00', { recurrence: 'even' }),
      entry('Lab', '14:15', '16:00', { recurrence: 'odd' }),
    ])
    expect(groups.get('Lab')?.index).toBe(0)
    expect(groups.get('Projekt')?.index).toBe(1)
  })

  it('zajęcia, które naprawdę się spotykają, zostają obok siebie', () => {
    expect(
      alternatingGroups([
        entry('A', '11:15', '14:00'),
        entry('B', '11:15', '14:00', { range: range('2026-10-19', '2026-11-16') }),
      ]).size,
    ).toBe(0)
    // Nakładające się okresy.
    expect(
      alternatingGroups([
        entry('A', '11:15', '14:00', { range: range('2026-10-19', '2026-11-30') }),
        entry('B', '11:15', '14:00', { range: range('2026-11-16', '2026-12-14') }),
      ]).size,
    ).toBe(0)
  })

  it('za krótkie na podział (45 min na dwie części) zostają obok siebie', () => {
    expect(
      alternatingGroups([
        entry('A', '11:15', '12:00', { recurrence: 'odd' }),
        entry('B', '11:15', '12:00', { recurrence: 'even' }),
      ]).size,
    ).toBe(0)
  })
})
