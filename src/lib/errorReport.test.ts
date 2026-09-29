import { describe, expect, it } from 'vitest'
import { errorSignature, isNoise, isStaleChunkError, shouldReport } from './errorReport'
import { AUTO_PREFIX, isAutoReport } from './feedback'

describe('automatyczne zgłaszanie błędów', () => {
  const HOUR = 3600_000
  const now = 100 * 24 * HOUR

  it('limit: ten sam błąd raz na dobę, wszystkich najwyżej 3', () => {
    expect(shouldReport('a', [], now)).toBe(true)
    expect(shouldReport('a', [{ at: now - HOUR, signature: 'a' }], now)).toBe(false)
    expect(shouldReport('a', [{ at: now - 25 * HOUR, signature: 'a' }], now)).toBe(true)
    const three = ['x', 'y', 'z'].map((signature) => ({ at: now - HOUR, signature }))
    expect(shouldReport('a', three, now)).toBe(false)
  })

  it('stara wersja po wdrożeniu to nie błąd kodu', () => {
    const chrome = new TypeError('Failed to fetch dynamically imported module: https://x.github.io/planer/assets/ExportView-Ab12Cd.js')
    const safari = new TypeError('Importing a module script failed.')
    expect(isStaleChunkError(chrome)).toBe(true)
    expect(isStaleChunkError(safari)).toBe(true)
    expect(isNoise(chrome)).toBe(true)
    expect(isStaleChunkError(new TypeError("Cannot read properties of undefined (reading 'start')"))).toBe(false)
  })

  it('sieć i wtyczki pomijamy, błędy programisty zgłaszamy', () => {
    expect(isNoise(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNoise(new TypeError('Load failed'))).toBe(true) // Safari przy braku sieci
    expect(isNoise(new Error('ResizeObserver loop completed with undelivered notifications.'))).toBe(true)
    expect(isNoise(new ReferenceError('daysBetween is not defined'))).toBe(false)
    expect(isNoise(new TypeError("Cannot read properties of null (reading 'id')"))).toBe(false)
  })

  it('podpis błędu nie zależy od wersji plików', () => {
    const at = (file: string) => {
      const e = new ReferenceError('daysBetween is not defined')
      e.stack = `ReferenceError: daysBetween is not defined\n    at inHorizon (${file}:40:87)`
      return errorSignature(e)
    }
    expect(at('https://x.github.io/planer/assets/CoursesView-Ab12Cd34.js')).toBe(
      at('https://x.github.io/planer/assets/CoursesView-Zz99Yy88.js'),
    )
  })

  it('skrzynka rozpoznaje zgłoszenie automatyczne', () => {
    expect(isAutoReport({ text: `${AUTO_PREFIX} (widok)\nTypeError: x` })).toBe(true)
    expect(isAutoReport({ text: 'Nie działa eksport' })).toBe(false)
  })
})
