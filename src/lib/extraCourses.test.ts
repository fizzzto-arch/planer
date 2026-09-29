import { describe, expect, it } from 'vitest'
import { rankExtraGroups, type ExtraGroup } from './extraCourses'
import { DEFAULT_OPTIMIZER_SETTINGS } from './optimizer'
import type { TimetableEntry } from './timetable'

const h = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const entry = (weekday: number, from: string, to: string, over: Partial<TimetableEntry> = {}): TimetableEntry => ({
  id: `${weekday}-${from}`,
  weekday,
  start: h(from),
  end: h(to),
  courseName: 'Analiza',
  type: 'WYK',
  groupNumber: 1,
  room: null,
  building: null,
  recurrence: 'weekly',
  range: null,
  only: null,
  date: null,
  ...over,
})
const group = (n: number, weekday: number, from: string, to: string, parity: ExtraGroup['parity'] = 'weekly'): ExtraGroup => ({
  id: `wf-${n}`,
  courseId: 'WF',
  courseName: 'Wychowanie fizyczne - Siatkówka',
  classType: 'FIZ',
  groupNumber: n,
  meetings: [{ weekday, start: h(from), end: h(to) }],
  parity,
  place: 'Riwiera',
})

describe('dobór grupy spoza planu (np. WF)', () => {
  // Poniedziałek 8:15-12:00, wtorek 10:15-14:00 w tygodnie nieparzyste; środa wolna.
  const plan = [entry(1, '08:15', '10:00'), entry(1, '10:15', '12:00'), entry(2, '10:15', '14:00', { recurrence: 'odd' })]
  const settings = { ...DEFAULT_OPTIMIZER_SETTINGS, weights: { gaps: 3, days: 2, early: 0, late: 0, finish: 0 } }

  it('najlepsza grupa dokleja się do zajęć bez okienka i bez nowego dnia', () => {
    const { fits } = rankExtraGroups(
      [group(1, 3, '10:00', '11:30'), group(2, 1, '12:15', '13:45'), group(3, 1, '16:00', '17:30')],
      plan,
      settings,
      30,
    )
    // Przy wagach okienka 3 / dni 2 cztery godziny okienka są gorsze niż dodatkowy dzień.
    expect(fits.map((f) => f.group.groupNumber)).toEqual([2, 1, 3])
    expect(fits[0]).toMatchObject({ newDay: false, gapMinutes: 0, dayEnd: h('13:45') })
    expect(fits[1].newDay).toBe(true)
    expect(fits[2].gapMinutes).toBe(240) // 12:00-16:00
  })

  it('odrzuca grupy kolidujące z planem, z uwzględnieniem parzystości', () => {
    const r = rankExtraGroups(
      [group(1, 1, '09:00', '10:30'), group(2, 2, '11:00', '12:30', 'odd'), group(3, 2, '11:00', '12:30', 'even')],
      plan,
      settings,
      30,
    )
    expect(r.conflicts).toBe(2) // poniedziałek w trakcie wykładu; wtorek nieparzysty
    expect(r.fits.map((f) => f.group.groupNumber)).toEqual([3]) // wtorek parzysty jest wolny
  })
})
