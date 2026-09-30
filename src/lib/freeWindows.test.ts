import { describe, expect, it } from 'vitest'
import { busyFromMeetings, commonWindows, flattenBusy, parseSharedBusy } from './freeWindows'

const at = (h: number, m = 0, d = 13) => new Date(2026, 9, d, h, m).getTime() // wt. 13.10.2026
const block = (h1: number, m1: number, h2: number, m2: number, d = 13) => ({ start: at(h1, m1, d), end: at(h2, m2, d) })

describe('wspólne okienka', () => {
  it('okienko, gdy obie osoby są na uczelni i wolne', () => {
    const ja = [block(8, 15, 10, 0), block(12, 15, 14, 0)]
    const ala = [block(10, 15, 12, 0), block(14, 15, 16, 0)]
    const result = commonWindows([ja, ala], new Date(2026, 9, 13), 15)
    // Obie na uczelni od 10:15 (Ala) do 14:00 (moje ostatnie zajęcia); wolne razem tylko 12:00-12:15.
    expect(result.everyonePresent).toBe(true)
    expect(result.windows).toEqual([block(12, 0, 12, 15)])
    expect(result.allFreeFrom).toBe(at(16, 0))
  })

  it('dłuższa wspólna przerwa i próg minimalnej długości', () => {
    const ja = [block(8, 15, 10, 0), block(13, 15, 15, 0)]
    const ala = [block(8, 15, 9, 45), block(12, 15, 15, 0)]
    expect(commonWindows([ja, ala], new Date(2026, 9, 13), 30).windows).toEqual([block(10, 0, 12, 15)])
    expect(commonWindows([ja, ala], new Date(2026, 9, 13), 180).windows).toEqual([])
  })

  it('ktoś nie ma tego dnia zajęć - nie wszyscy są na uczelni', () => {
    const result = commonWindows([[block(8, 15, 10, 0)], [block(8, 15, 10, 0, 14)]], new Date(2026, 9, 13), 15)
    expect(result).toMatchObject({ everyonePresent: false, windows: [], allFreeFrom: null })
  })

  it('zajęte godziny z planu: bez odwołanych, nakładające się połączone, 2 tygodnie od dziś', () => {
    const d = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)
    const busy = busyFromMeetings(
      [
        { start: d(13, 8, 15), end: d(13, 10), cancelled: false },
        { start: d(13, 9, 15), end: d(13, 11), cancelled: false }, // nakłada się
        { start: d(13, 12), end: d(13, 13), cancelled: true }, // odwołane
        { start: d(12, 8), end: d(12, 9), cancelled: false }, // wczoraj
        { start: d(28, 8), end: d(28, 9), cancelled: false }, // za 15 dni
      ],
      d(13, 7),
    )
    expect(busy).toEqual([{ start: d(13, 8, 15).getTime(), end: d(13, 11).getTime() }])
  })

  it('zapis i odczyt z bazy (płaska lista) odrzuca śmieci', () => {
    const busy = [block(8, 15, 10, 0)]
    expect(parseSharedBusy('u', { name: ' Ala ', busy: flattenBusy(busy) })).toMatchObject({ name: 'Ala', busy })
    expect(parseSharedBusy('u', { busy: [5, 3, 'x', 1] }).busy).toEqual([])
    expect(parseSharedBusy('u', {}).name).toBe('Znajomy')
  })
})
