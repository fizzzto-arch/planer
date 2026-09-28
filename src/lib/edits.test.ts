import { describe, expect, it } from 'vitest'
import { applyEdits, buildOverride, buildSeriesEdit, customMeetingId, seriesBase } from './edits'
import { EMPTY_EXTRAS, type Extras } from './extras'
import type { Meeting } from './usos'

const lab = (id: string, day: number): Meeting => ({
  id,
  courseName: 'Grafika komputerowa',
  type: 'LAB',
  start: new Date(2026, 9, day, 14, 15),
  end: new Date(2026, 9, day, 17, 0),
  room: '416',
  building: 'EiTI',
  address: null,
  groupNumber: 102,
  unitId: '543976',
  usosUrl: null,
  cancelled: false,
})

const extras = (patch: Partial<Extras>): Extras => ({ ...EMPTY_EXTRAS, ...patch })

describe('applyEdits', () => {
  it('bez zmian zwraca plan z USOS', () => {
    const [m] = applyEdits([lab('a', 9)], EMPTY_EXTRAS)
    expect(m.edited).toBe(false)
    expect(m.custom).toBe(false)
    expect(m.note).toBe('')
    expect(m.original).toBeNull()
    expect(m.room).toBe('416')
  })

  it('zmiana pojedynczych zajęć: sala, godzina i data, z zachowaniem oryginału', () => {
    const edits = extras({
      meetingEdits: new Map([['a', { id: 'a', note: '', override: { room: '161', startTime: '15:00', date: '2026-10-10' } }]]),
    })
    const [m] = applyEdits([lab('a', 9)], edits)
    expect(m.edited).toBe(true)
    expect(m.room).toBe('161')
    expect(m.start).toEqual(new Date(2026, 9, 10, 15, 0))
    expect(m.end).toEqual(new Date(2026, 9, 10, 17, 0)) // koniec bez zmian, ale w nowym dniu
    expect(m.original?.room).toBe('416')
  })

  it('zmiana serii obejmuje wszystkie zajęcia grupy, a pojedyncza zmiana ma pierwszeństwo', () => {
    const edits = extras({
      seriesEdits: new Map([['543976-102', { id: '543976-102', room: '200', startTime: null, endTime: '16:45' }]]),
      meetingEdits: new Map([['b', { id: 'b', note: '', override: { room: '300' } }]]),
    })
    const [a, b] = applyEdits([lab('a', 9), lab('b', 16)], edits)
    expect(a.room).toBe('200')
    expect(a.end.getHours()).toBe(16)
    expect(a.end.getMinutes()).toBe(45)
    expect(b.room).toBe('300')
    expect(b.end.getMinutes()).toBe(45) // seria nadal działa pod spodem
  })

  it('odwołanie zajęć', () => {
    const edits = extras({ meetingEdits: new Map([['a', { id: 'a', note: '', override: { cancelled: true } }]]) })
    expect(applyEdits([lab('a', 9)], edits)[0].cancelled).toBe(true)
  })

  it('sama notatka nie oznacza zajęć jako zmienionych', () => {
    const edits = extras({ meetingEdits: new Map([['a', { id: 'a', note: 'kalkulator!', override: null }]]) })
    const [m] = applyEdits([lab('a', 9)], edits)
    expect(m.note).toBe('kalkulator!')
    expect(m.edited).toBe(false)
  })

  it('własne zajęcia cotygodniowe rozwijają się do daty końcowej i sortują z resztą', () => {
    const edits = extras({
      customMeetings: [
        {
          id: 'x1',
          courseName: 'Odrabianie',
          type: 'LAB',
          date: '2026-10-05',
          startTime: '08:15',
          endTime: '10:00',
          room: null,
          repeatWeeklyUntil: '2026-10-19',
        },
      ],
    })
    const result = applyEdits([lab('a', 9)], edits)
    expect(result.map((m) => m.id)).toEqual([
      'custom:x1:2026-10-05',
      'a',
      'custom:x1:2026-10-12',
      'custom:x1:2026-10-19',
    ])
    expect(result[0].custom).toBe(true)
    expect(result[0].edited).toBe(false)
    expect(customMeetingId(result[0].id)).toBe('x1')
    expect(customMeetingId('a')).toBeNull()
  })

  it('jednorazowe własne zajęcia to jeden termin', () => {
    const edits = extras({
      customMeetings: [
        { id: 'y', courseName: 'X', type: 'CWI', date: '2026-10-05', startTime: '10:15', endTime: '12:00', room: '1', repeatWeeklyUntil: null },
      ],
    })
    expect(applyEdits([], edits)).toHaveLength(1)
  })
})

describe('budowanie zmian z formularza', () => {
  const values = (m: Meeting) => ({
    date: '2026-10-09',
    startTime: '14:15',
    endTime: '17:00',
    room: m.room ?? '',
    cancelled: false,
  })

  it('bez zmian w formularzu nie zapisuje niczego', () => {
    const m = lab('a', 9)
    expect(buildOverride(m, values(m))).toBeNull()
  })

  it('zapisuje tylko zmienione pola', () => {
    const m = lab('a', 9)
    expect(buildOverride(m, { ...values(m), room: '161', cancelled: true })).toEqual({ room: '161', cancelled: true })
    expect(buildOverride(m, { ...values(m), date: '2026-10-10' })).toEqual({ date: '2026-10-10' })
  })

  it('punktem odniesienia dla pojedynczej zmiany jest plan po zmianie serii', () => {
    const m = lab('a', 9)
    const seriesEdits = new Map([['543976-102', { id: '543976-102', room: '200', startTime: null, endTime: null }]])
    const base = seriesBase(m, { seriesEdits })
    expect(base.room).toBe('200')
    // Powrót do sali z USOS w jednych zajęciach mimo zmiany serii - trzeba to zapisać.
    expect(buildOverride(base, { ...values(m), room: '416' })).toEqual({ room: '416' })
  })

  it('zmiana serii zapisuje różnice względem USOS', () => {
    const m = lab('a', 9)
    expect(buildSeriesEdit('k', m, { startTime: '14:15', endTime: '16:45', room: '416' })).toEqual({
      id: 'k',
      room: null,
      startTime: null,
      endTime: '16:45',
    })
  })
})
