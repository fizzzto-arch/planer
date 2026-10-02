import { describe, expect, it } from 'vitest'
import { candidateMeetings, extraGroupsSlot, extraSlotId } from './candidatePlan'
import type { ExtraGroup } from './extraCourses'

// Plan: poniedziałki 5.10-26.10.2026 (1.-4. tydzień semestru) - z niego tygodnie i parzystość.
const plan = [0, 7, 14, 21].map((d) => ({ start: new Date(2026, 9, 5 + d, 10, 15), cancelled: false }))
const group = (groupNumber: number, parity: ExtraGroup['parity'], courseId = '6420-ANG-B2'): ExtraGroup => ({
  id: `${courseId}|LEK|${groupNumber}`,
  courseId,
  courseName: `Język angielski B2 (${courseId})`,
  classType: 'LEK',
  groupNumber,
  meetings: [{ weekday: 2, start: 12 * 60 + 15, end: 14 * 60 }],
  parity,
  place: '',
})

describe('grupy spoza planu jako zajęcia do wyboru', () => {
  it('rozpisuje grupy na tygodnie planu od bieżącego, z parzystością', () => {
    const slot = extraGroupsSlot([group(1, 'weekly'), group(2, 'odd')], plan, new Date(2026, 9, 13))
    expect(slot?.extra).toBe(true)
    expect(slot?.currentIndex).toBeNull()
    // Od tygodnia 12.10 (2. tydzień): wtorki 13, 20, 27.10; nieparzyste tylko 20.10 (3. tydzień).
    expect(slot?.options[0].meetings.map((m) => m.start.getDate())).toEqual([13, 20, 27])
    expect(slot?.options[1].meetings.map((m) => m.start.getDate())).toEqual([20])
    expect(slot?.options[1].meetings[0].start.getHours()).toBe(12)
  })

  it('kilka przedmiotów w jednym wyborze, grupy bez terminów pominięte', () => {
    const empty = { ...group(3, 'weekly', 'A'), meetings: [] }
    const slot = extraGroupsSlot([group(1, 'weekly', 'B'), group(5, 'weekly', 'A'), empty], plan, new Date(2026, 9, 5))
    expect(slot?.options.map((o) => [o.courseId, o.groupNumber])).toEqual([['B', 1], ['A', 5]])
    expect(slot?.id).toBe(extraSlotId([group(9, 'weekly', 'A'), group(9, 'weekly', 'B')]))
    expect(extraGroupsSlot([empty], plan, new Date(2026, 9, 5))).toBeNull()
  })

  it('w planie propozycji zajęcia spoza planu są wyróżnione, z nazwą swojego przedmiotu', () => {
    const slot = extraGroupsSlot([group(1, 'weekly', 'B'), group(5, 'weekly', 'A')], plan, new Date(2026, 9, 5))!
    const { meetings, changedIds } = candidateMeetings({ choice: [1], changes: 0, metrics: {} as never }, [slot], [])
    expect(meetings).toHaveLength(4)
    expect(meetings.every((m) => m.courseName === 'Język angielski B2 (A)' && m.groupNumber === 5)).toBe(true)
    expect(changedIds.size).toBe(4)
  })
})

describe('stałe zmiany grup w optymalizatorze', () => {
  it('przeniesiona na stałe grupa ma nowe terminy, inne grupy bez zmian', async () => {
    const { withSeriesEdits } = await import('./candidatePlan')
    const at = (day: number, h: number) => new Date(2026, 9, day, h, 15)
    const option = (unitId: string, groupNumber: number, day: number) => ({
      unitId,
      groupNumber,
      meetings: [day, day + 7].map((d) => ({ start: at(d, 10), end: at(d, 12), room: '121', building: null })),
    })
    // Piątki 9.10 i 16.10: moja grupa 101 i druga 102 o tej samej porze.
    const slot = { id: 'AN|CWI', courseName: 'Analiza', classType: 'CWI', currentIndex: 0, options: [option('U1', 101, 9), option('U1', 102, 9)] }
    const edit = { id: 'U1-101', room: '200', startTime: '11:15', endTime: '13:00', weekday: 4, fromWeekday: 5 }
    const [changed] = withSeriesEdits([slot], new Map([[edit.id, edit]]))
    expect(changed.options[0].meetings.map((m) => [m.start.getDate(), m.start.getHours(), m.room])).toEqual([
      [8, 11, '200'],
      [15, 11, '200'],
    ])
    expect(changed.options[1]).toBe(slot.options[1])
    expect(withSeriesEdits([slot], new Map())[0]).toBe(slot)
  })
})
