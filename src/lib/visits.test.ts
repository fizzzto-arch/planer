import { describe, expect, it } from 'vitest'
import { isNewVisit, parseVisits, staleVisitDays, visitSummary } from './visits'

const now = new Date(2026, 9, 15, 14, 5) // czwartek 15.10.2026

describe('licznik otwarć', () => {
  it('odczyt pomija złe dni i liczby', () => {
    expect(parseVisits({ '2026-10-15': 3, '2026-10-14': 0, zly: 2, '2026-10-13': 1.5, '2026-10-12': '4' })).toEqual({ '2026-10-15': 3 })
    expect(parseVisits(null)).toEqual({})
  })

  it('ostatnie 7 dni: dziś i 6 dni wstecz', () => {
    const visits = { '2026-10-15': 2, '2026-10-09': 1, '2026-10-08': 5, '2026-09-30': 1 }
    expect(visitSummary(visits, now)).toEqual({ opens: 3, days: 2 })
    expect(staleVisitDays(visits, now).sort()).toEqual(['2026-09-30', '2026-10-08'])
  })

  it('nowe otwarcie po co najmniej 30 minutach przerwy', () => {
    const t = now.getTime()
    expect(isNewVisit(null, t)).toBe(true)
    expect(isNewVisit(t - 29 * 60_000, t)).toBe(false)
    expect(isNewVisit(t - 30 * 60_000, t)).toBe(true)
  })
})
