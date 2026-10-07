import { describe, expect, it } from 'vitest'
import { changesText, classesOn, daySummaryText, diffPlans, firstClassText, looksBroken, type WatchedMeeting } from './planWatch'

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

describe('powiadomienia a wybór dat grupy (np. laboratorium tylko w wybrane tygodnie)', () => {
  it('zapamiętany plan ma grupę i tydzień semestru', async () => {
    const { snapshotPlan } = await import('./planWatch')
    // Laboratorium w piątki od 9.10.2026 (tydz. 1); "teraz" 14.10 - zapamiętujemy 16.10 (tydz. 2) i 23.10 (tydz. 3).
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
    const plan = snapshotPlan([lab(9), lab(16), lab(23)], new Date(2026, 9, 14, 12, 0), 14)
    expect(plan.map((m) => [m.id, m.unitId, m.groupNumber, m.week])).toEqual([
      ['l16', '777', 102, 2],
      ['l23', '777', 102, 3],
    ])
  })

  it('terminy spoza wybranych dat nie są liczone; stary zapamiętany plan uzupełniany z nowego', async () => {
    const { heldPerSeriesDates, seriesDatesFrom, withGroups } = await import('./planWatch')
    const series = seriesDatesFrom([
      { id: '777-102', data: { fromWeekday: 2, dates: { kind: 'range', from: '2026-11-01', to: '2026-11-30', weeks: 'odd' } } },
      { id: 'inna-1', data: { room: '200' } }, // zmiana bez wyboru dat - pomijana
    ])
    expect([...series.keys()]).toEqual(['777-102'])
    // 10.11 i 17.11 to wtorki; tydzień 7 nieparzysty, 8 parzysty.
    const odd = lesson('x', 10, 12, { unitId: '777', groupNumber: 102, week: 7 })
    const even = lesson('y', 17, 12, { unitId: '777', groupNumber: 102, week: 8 })
    expect(heldPerSeriesDates(odd, series)).toBe(true)
    expect(heldPerSeriesDates(even, series)).toBe(false)
    expect(heldPerSeriesDates(lesson('z', 17, 12), series)).toBe(true) // bez danych grupy - jak zwykle

    // Stary plan (bez grupy) przed porównaniem dostaje grupę z nowego - bez fałszywego "odwołane".
    const old = [lesson('y', 17, 12)]
    const fresh = [even]
    const changes = diffPlans(
      withGroups(old, fresh).filter((m) => heldPerSeriesDates(m, series)),
      fresh.filter((m) => heldPerSeriesDates(m, series)),
      new Date(2026, 10, 9, 12, 0),
      at(30, 0),
    )
    expect(changes).toEqual([])
  })
})
