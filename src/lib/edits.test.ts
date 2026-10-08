import { describe, expect, it } from 'vitest'
import { applyEdits, buildOverride, buildSeriesEdit, customMeetingId, seriesBase } from './edits'
import { EMPTY_EXTRAS, seriesKey, type Extras } from './extras'
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

  it('zmiana serii zapisuje różnice względem USOS i dzień, którego dotyczy', () => {
    const m = lab('a', 9) // piątek
    expect(buildSeriesEdit('k', m, { startTime: '14:15', endTime: '16:45', room: '416', weekday: 5 })).toEqual({
      id: 'k',
      room: null,
      startTime: null,
      endTime: '16:45',
      weekday: null,
      fromWeekday: 5,
      online: null,
    })
    expect(buildSeriesEdit('k', m, { startTime: '11:15', endTime: '13:00', room: '416', weekday: 4 }).weekday).toBe(4)
  })

  it('online: cała grupa albo jedne zajęcia - bez sali i budynku, sala z USOS zostaje w oryginale', () => {
    const m = lab('a', 9)
    // Grupa online: sala z formularza się nie liczy.
    const series = buildSeriesEdit(seriesKey(m)!, m, { startTime: '14:15', endTime: '16:00', room: '200', weekday: 5, online: true })
    expect(series).toMatchObject({ room: null, online: true })
    const [moved] = applyEdits([m], { meetingEdits: new Map(), seriesEdits: new Map([[series.id, series]]), customMeetings: [] })
    expect(moved).toMatchObject({ online: true, room: null, building: null, edited: true })
    expect(moved.original?.room).toBe(m.room)
    // Jedne zajęcia z powrotem stacjonarnie mimo grupy online.
    expect(buildOverride(moved, { date: '2026-10-09', startTime: '14:15', endTime: '16:00', room: '', cancelled: false, online: false })).toEqual({ online: false })
  })

  it('stała zmiana dnia: piątkowe zajęcia grupy co tydzień w czwartek, inne dni grupy bez zmian', () => {
    // Ta sama grupa: piątki 9.10 i 16.10 oraz poniedziałek 12.10.
    const plan = [lab('fri1', 9), lab('mon', 12), lab('fri2', 16)]
    const edit = buildSeriesEdit('543976-102', plan[0], { startTime: '11:15', endTime: '13:00', room: '416', weekday: 4 })
    const result = applyEdits(plan, extras({ seriesEdits: new Map([[edit.id, edit]]) }))
    const byId = new Map(result.map((m) => [m.id, m]))
    expect(byId.get('fri1')!.start).toEqual(new Date(2026, 9, 8, 11, 15)) // czwartek tego samego tygodnia
    expect(byId.get('fri2')!.start).toEqual(new Date(2026, 9, 15, 11, 15))
    expect(byId.get('fri2')!.end).toEqual(new Date(2026, 9, 15, 13, 0))
    expect(byId.get('fri2')!.original?.start).toEqual(new Date(2026, 9, 16, 14, 15))
    expect(byId.get('mon')!.edited).toBe(false)
  })

  it('starsze zmiany grupy (bez dnia) dalej dotyczą wszystkich zajęć grupy', () => {
    const plan = [lab('fri', 9), lab('mon', 12)]
    const seriesEdits = new Map([['543976-102', { id: '543976-102', room: '200', startTime: null, endTime: null }]])
    expect(applyEdits(plan, extras({ seriesEdits })).every((m) => m.room === '200')).toBe(true)
  })
})

describe('kiedy zajęcia naprawdę są (grupa z USOS i własne zajęcia)', () => {
  // Laboratorium w piątki: 9.10 (tydz. 1, nieparzysty), 16.10 (2), 23.10 (3), 30.10 (4), 6.11 (5).
  const fridays = [9, 16, 23, 30, 37].map((day, i) => lab(`f${i}`, day))
  const days = (list: { start: Date }[]) => list.map((m) => m.start.getDate())

  it('grupa z USOS tylko w nieparzyste tygodnie z zakresu', () => {
    const edits = extras({
      seriesEdits: new Map([
        ['543976-102', { id: '543976-102', room: null, startTime: null, endTime: null, fromWeekday: 5, dates: { kind: 'range', from: '2026-10-01', to: '2026-10-31', weeks: 'odd' } }],
      ]),
    })
    expect(days(applyEdits(fridays, edits))).toEqual([9, 23])
  })

  it('co tydzień od–do: także tygodnie, w których USOS zajęć nie ma (np. laboratorium w USOS dopiero od listopada)', () => {
    // W USOS piątki od 6.11 do 4.12; naprawdę od teraz (8.10) do 6.11.
    const usos = [37, 44, 51, 58, 65].map((day, i) => lab(`n${i}`, day))
    const edits = extras({
      seriesEdits: new Map([
        ['543976-102', { id: '543976-102', room: null, startTime: null, endTime: null, fromWeekday: 5, dates: { kind: 'range', from: '2026-10-08', to: '2026-11-06', weeks: 'all' } }],
      ]),
      meetingEdits: new Map([['n0', { id: 'n0', note: 'sprawozdanie', override: null }]]),
    })
    const held = applyEdits(usos, edits)
    expect(days(held)).toEqual([9, 16, 23, 30, 6])
    // Dorobione na wzór grupy (godziny, sala); termin z USOS 6.11 zostaje z notatką.
    expect(held[0]).toMatchObject({ id: 'series:543976-102:2026-10-09', room: '416', edited: true, original: null })
    expect(held[0].start.getHours()).toBe(14)
    expect(held[4]).toMatchObject({ id: 'n0', note: 'sprawozdanie' })
    // Bez żadnych zajęć tej grupy w planie (np. zmiana grupy w USOS) - nic się nie dorabia.
    expect(applyEdits([], edits)).toEqual([])
  })

  it('grupa z USOS tylko w wybrane dni; zajęcia z innego dnia tygodnia bez zmian', () => {
    const monday = lab('pon', 12)
    const edits = extras({
      seriesEdits: new Map([
        ['543976-102', { id: '543976-102', room: null, startTime: null, endTime: null, fromWeekday: 5, dates: { kind: 'dates', dates: ['2026-10-16', '2026-10-30'] } }],
      ]),
    })
    expect(days(applyEdits([...fridays, monday], edits))).toEqual([12, 16, 30])
  })

  it('własne zajęcia: co tydzień tylko w parzyste tygodnie albo w wybrane dni', () => {
    const base = { courseName: 'Odrabianie', type: 'LAB', startTime: '08:15', endTime: '10:00', room: null }
    const even = extras({
      customMeetings: [{ ...base, id: 'x', date: '2026-10-05', repeatWeeklyUntil: '2026-11-02', weeks: 'even' }],
    })
    // Tygodnie liczone z planu z USOS (pierwszy tydzień zajęć = 5.10).
    expect(days(applyEdits(fridays, even).filter((m) => m.custom))).toEqual([12, 26])
    const picked = extras({
      customMeetings: [{ ...base, id: 'y', date: '2026-10-07', repeatWeeklyUntil: null, dates: ['2026-10-07', '2026-10-21'] }],
    })
    expect(days(applyEdits(fridays, picked).filter((m) => m.custom))).toEqual([7, 21])
  })
})

describe('formularz dat', () => {
  it('od-do z tygodniami, wybrane dni, błędy', async () => {
    const { datesFromDraft, draftFromDates, parseClassDates } = await import('./classDates')
    const draft = draftFromDates(null, { from: '2026-10-01', to: '2026-12-31' })
    expect(datesFromDraft(draft)).toEqual({ dates: null })
    expect(datesFromDraft({ ...draft, mode: 'range', even: false })).toEqual({
      dates: { kind: 'range', from: '2026-10-01', to: '2026-12-31', weeks: 'odd' },
    })
    expect(datesFromDraft({ ...draft, mode: 'range', odd: false, even: false })).toEqual({ error: 'parity' })
    expect(datesFromDraft({ ...draft, mode: 'range', to: '2026-09-01' })).toEqual({ error: 'range' })
    expect(datesFromDraft({ ...draft, mode: 'dates' })).toEqual({ error: 'empty' })
    expect(parseClassDates({ kind: 'dates', dates: ['2026-10-16', 'zle', '2026-10-09'] })).toEqual({ kind: 'dates', dates: ['2026-10-09', '2026-10-16'] })
    expect(parseClassDates({ kind: 'range', from: '2026-10-01' })).toBeNull()
  })
})
