import { describe, expect, it } from 'vitest'
import { parsePlanEdits } from './extras'
import {
  changesText,
  classesOn,
  daySummaryText,
  diffPlans,
  firstClassText,
  looksBroken,
  withEdits,
  withGroups,
  withoutHidden,
  type WatchedMeeting,
} from './planWatch'

const at = (d: number, h: number, m = 15) => new Date(2026, 10, d, h, m).getTime() // listopad 2026
const lesson = (id: string, d: number, h: number, over: Partial<WatchedMeeting> = {}): WatchedMeeting => ({
  id,
  course: 'Radiologia',
  type: 'WYK',
  start: at(d, h),
  end: at(d, h + 1, 45),
  room: '014',
  cancelled: false,
  ...over,
})
const label = (c: string) => c

describe('zmiany w planie z USOS', () => {
  const now = new Date(2026, 10, 9, 12, 0) // pon. 9.11, 12:00
  const until = at(30, 0)
  const prev = [lesson('past', 9, 8), lesson('a', 10, 12), lesson('b', 12, 15), lesson('c', 13, 10), lesson('d', 17, 8)]

  it('wykrywa przeniesienie, zmianę sali, odwołanie i dodatkowe zajęcia', () => {
    const next = [
      lesson('a', 10, 14), // przeniesione 12:15 -> 14:15
      lesson('b', 12, 15, { room: '042' }), // zmiana sali
      lesson('c', 13, 10, { cancelled: true }), // odwołane w USOS
      // 'd' zniknęło - też odwołane
      lesson('e', 19, 9, { course: 'Analiza' }), // dodatkowe (inny przedmiot)
      lesson('far', 29, 9), // w zasięgu starego okna - dodatkowe
    ]
    const kinds = diffPlans(prev, next, now, until).map((c) => c.kind)
    expect(kinds).toEqual(['moved', 'room', 'cancelled', 'cancelled', 'added', 'added'])
  })

  it('nowy identyfikator przy przeniesieniu to dalej przeniesienie', () => {
    const next = [lesson('a2', 11, 12), lesson('b', 12, 15), lesson('c', 13, 10), lesson('d', 17, 8)]
    const changes = diffPlans(prev, next, now, until)
    expect(changes.map((c) => c.kind)).toEqual(['moved'])
    expect(changesText(changes, label).body).toBe('Radiologia (wt. 10.11 12:15) → śr. 11.11 12:15')
  })

  it('sam nowy identyfikator (te same godziny i sala) to żadna zmiana - bez fałszywego alarmu', () => {
    // USOS nadał wszystkim zajęciom nowe identyfikatory, nic więcej się nie zmieniło.
    const renamed = prev.map((m) => ({ ...m, id: `${m.id}-nowe` }))
    expect(diffPlans(prev, renamed, now, until)).toEqual([])
    // Nowy identyfikator i inna sala - tylko zmiana sali, nie "przeniesienie".
    const roomOnly = [lesson('a2', 10, 12, { room: '118' }), lesson('b', 12, 15), lesson('c', 13, 10), lesson('d', 17, 8)]
    const changes = diffPlans(prev, roomOnly, now, until)
    expect(changes.map((c) => c.kind)).toEqual(['room'])
    expect(changesText(changes, label).body).toBe('Radiologia (wt. 10.11): sala 014 → 118')
  })

  it('pusta albo niepełna odpowiedź USOS to nie "wszystko odwołane"', () => {
    expect(looksBroken(prev, [], now, until)).toBe(true)
    expect(looksBroken(prev, [lesson('a', 10, 12)], now, until)).toBe(true)
    expect(looksBroken(prev, prev, now, until)).toBe(false)
  })

  it('ignoruje zajęcia, które już się odbyły, i te za końcem starego okna', () => {
    const next = [lesson('a', 10, 12), lesson('b', 12, 15), lesson('c', 13, 10), lesson('d', 17, 8), lesson('late', 30, 10)]
    expect(diffPlans(prev, next, now, until)).toEqual([]) // 'past' zniknęło, bo minęło; 'late' po oknie
  })

  it('treść: do 3 zmian, reszta zbiorczo', () => {
    const next = [lesson('b', 12, 15, { room: '042' })]
    const changes = diffPlans(prev, next, now, until)
    const text = changesText(changes, label)
    expect(text.title).toBe(`Zmiany w planie (${changes.length})`)
    expect(text.body.split('\n')).toHaveLength(4)
    expect(text.body).toContain('Radiologia (wt. 10.11) 12:15 - odwołane')
    expect(changesText([changes.find((c) => c.kind === 'room')!], label)).toEqual({
      title: 'Zmiana w planie',
      body: 'Radiologia (czw. 12.11): sala 014 → 042',
      details: ['Radiologia (czw. 12.11): sala 014 → 042'],
    })
  })
})

describe('plan dnia i przed pierwszymi zajęciami', () => {
  it('liczy zajęcia dnia bez odwołanych i odmienia "zajęcia"', () => {
    const plan = [lesson('x', 10, 12), lesson('y', 10, 8, { course: 'Analiza', room: null }), lesson('z', 10, 16, { cancelled: true })]
    const today = classesOn(plan, new Date(2026, 10, 10))
    expect(today.map((m) => m.id)).toEqual(['y', 'x'])
    expect(daySummaryText(today, label)).toEqual({ title: 'Dziś 2 zajęcia, 8:15–13:45', body: 'Pierwsze: Analiza o 8:15' })
    expect(daySummaryText([today[0]], label).title).toBe('Dziś jedne zajęcia, 8:15–9:45')
    const five = Array.from({ length: 5 }, (_, i) => lesson(`f${i}`, 10, 8 + i))
    expect(daySummaryText(five, label).title).toMatch(/^Dziś 5 zajęć/)
  })

  it('przypomnienie liczy minuty w chwili wysyłki', () => {
    const first = lesson('x', 10, 12)
    expect(firstClassText(first, label, new Date(2026, 10, 10, 11, 57)).title).toBe('Za 18 min: Radiologia')
  })
})

describe('pełna lista zmian do historii powiadomień', () => {
  it('w powiadomieniu 3 zmiany, w historii wszystkie', () => {
    const now = new Date(2026, 10, 9, 12, 0)
    const prev = [10, 11, 12, 13, 16].map((d, i) => lesson(`x${i}`, d, 10))
    const changes = diffPlans(prev, [], now, at(30, 0)) // wszystko odwołane
    const text = changesText(changes, label)
    expect(text.body.split('\n')).toHaveLength(4)
    expect(text.details).toHaveLength(5)
  })
})

describe('powiadomienia jak plan w Planerze: ręczne zmiany, własne zajęcia, usunięte', () => {
  const lab = (day: number) => ({
    id: `l${day}`,
    courseName: 'Radiologia',
    type: 'LAB',
    start: new Date(2026, 9, day, 14, 15),
    end: new Date(2026, 9, day, 17, 0),
    room: '014',
    building: null,
    address: null,
    groupNumber: 102,
    unitId: '777',
    usosUrl: null,
    cancelled: false,
  })

  it('zapamiętany plan ma grupę i tydzień semestru; dzisiejsze zakończone zajęcia zostają', async () => {
    const { snapshotPlan } = await import('./planWatch')
    // Laboratorium w piątki od 9.10.2026 (tydz. 1); "teraz" 14.10 - zapamiętujemy 16.10 (tydz. 2) i 23.10 (tydz. 3).
    const plan = snapshotPlan([lab(9), lab(16), lab(23)], new Date(2026, 9, 14, 12, 0), 14)
    expect(plan.map((m) => [m.id, m.unitId, m.groupNumber, m.week])).toEqual([
      ['l16', '777', 102, 2],
      ['l23', '777', 102, 3],
    ])
    // Piątek 16.10 wieczorem: dzisiejsze laboratorium już się skończyło, ale dalej jest w planie dnia -
    // inaczej kolejne zajęcia wyglądałyby na pierwsze.
    const evening = snapshotPlan([lab(9), lab(16), lab(23)], new Date(2026, 9, 16, 18, 0), 14)
    expect(evening.map((m) => m.id)).toEqual(['l16', 'l23'])
  })

  // 10.11 i 17.11 to wtorki (tydz. 7 nieparzysty, 8 parzysty), 11.11 środa.
  const groupLab = (id: string, d: number, week: number) => lesson(id, d, 12, { type: 'LAB', unitId: '777', groupNumber: 102, week })
  const plan = [groupLab('x', 10, 7), lesson('w1', 11, 10, { week: 7 }), lesson('w2', 12, 10, { week: 7 }), groupLab('y', 17, 8)]
  const edits = parsePlanEdits({
    // Grupa laboratoryjna: sala 200 i tylko nieparzyste tygodnie listopada.
    seriesEdits: [
      {
        id: '777-102',
        data: { room: '200', fromWeekday: 2, dates: { kind: 'range', from: '2026-11-01', to: '2026-11-30', weeks: 'odd' } },
      },
    ],
    // Jeden wykład przeniesiony na 11:00 do sali 5, drugi odwołany ręcznie.
    meetingEdits: [
      { id: 'w1', data: { note: 'kolokwium', override: { startTime: '11:00', room: '5' } } },
      { id: 'w2', data: { note: '', override: { cancelled: true } } },
    ],
    // Własne konsultacje w czwartki parzystych tygodni (19.11 to tydz. 8).
    customMeetings: [
      {
        id: 'k',
        data: { courseName: 'Konsultacje', type: 'KON', date: '2026-11-12', startTime: '16:00', endTime: '17:00', room: '9', repeatWeeklyUntil: '2026-11-30', weeks: 'even' },
      },
    ],
  })

  it('nakłada zmiany grupy, pojedynczych zajęć i własne zajęcia (tydzień semestru z zapamiętanego planu)', () => {
    const seen = withEdits(plan, edits)
    const show = (m: WatchedMeeting) => [m.id, new Date(m.start).getDate(), new Date(m.start).getHours(), m.room, m.cancelled]
    expect(seen.map(show)).toEqual([
      ['x', 10, 12, '200', false],
      ['w1', 11, 11, '5', false],
      ['w2', 12, 10, '014', true],
      ['custom:k:2026-11-19', 19, 16, '9', false],
    ])
    // Plan dnia bez ręcznie odwołanych; przypomnienie z salą i godziną po zmianie.
    expect(classesOn(seen, new Date(2026, 10, 12, 7, 0))).toEqual([])
    expect(firstClassText(classesOn(seen, new Date(2026, 10, 11, 7, 0))[0], label, new Date(2026, 10, 11, 10, 30))).toEqual({
      title: 'Za 30 min: Radiologia',
      body: '11:00–11:45 · s. 5',
    })
  })

  it('zmiana w USOS tam, gdzie i tak jest ręczna zmiana - bez powiadomienia; reszta jak zwykle', () => {
    const now = new Date(2026, 10, 9, 12, 0)
    // USOS: inna sala wykładu w1 (u nas i tak sala 5) i inna godzina laboratorium x.
    const next = plan.map((m) =>
      m.id === 'w1' ? { ...m, room: '300' } : m.id === 'x' ? { ...m, start: m.start + 60 * 60 * 1000, end: m.end + 60 * 60 * 1000 } : m,
    )
    const changes = diffPlans(withEdits(plan, edits), withEdits(next, edits), now, at(30, 0))
    expect(changes.map((c) => [c.kind, 'after' in c ? c.after.id : c.before.id])).toEqual([['moved', 'x']])
    // Stary plan (bez grupy) przed porównaniem dostaje grupę z nowego - tydzień parzysty nie wraca jako odwołany.
    const old = plan.map(({ unitId: _u, groupNumber: _g, week: _w, ...m }) => m)
    expect(diffPlans(withEdits(withGroups(old, plan), edits), withEdits(plan, edits), now, at(30, 0))).toEqual([])
  })

  it('zajęcia online: w przypomnieniu i planie dnia "online" zamiast sali, zmiana na online to zmiana miejsca', () => {
    const online = parsePlanEdits({ meetingEdits: [{ id: 'w1', data: { note: '', override: { online: true } } }] })
    const [w1] = withEdits([lesson('w1', 11, 10)], online)
    expect(w1).toMatchObject({ online: true, room: null })
    expect(firstClassText(w1, label, new Date(2026, 10, 11, 9, 45)).body).toBe('10:15–11:45 · online')
    expect(daySummaryText([w1], label).body).toBe('Pierwsze: Radiologia, online o 10:15')
    const now = new Date(2026, 10, 9, 12, 0)
    const changes = diffPlans(withEdits([lesson('w1', 11, 10)], parsePlanEdits({})), [w1], now, at(30, 0))
    expect(changesText(changes, label).body).toBe('Radiologia (śr. 11.11): sala 014 → online')
  })

  it('usunięte z planu: zajęcia z USOS według typu z Planera, własne według swojego typu', () => {
    const seen = withEdits(plan, edits)
    expect(withoutHidden(seen, [{ course: 'Radiologia', type: 'LAB' }]).map((m) => m.id)).toEqual(['w1', 'w2', 'custom:k:2026-11-19'])
    expect(withoutHidden(seen, [{ course: 'Konsultacje', type: null }]).map((m) => m.id)).toEqual(['x', 'w1', 'w2'])
  })
})
