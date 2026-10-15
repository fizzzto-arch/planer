import { describe, expect, it } from 'vitest'
import { CACHE_MAX_MS, cacheRefresh, type CacheState } from './serverCache'

const now = 1_800_000_000_000
const day = '2027-02-24'
const fresh: CacheState = { cachedAt: now - 60_000, prefsAt: 5, deadlinesAt: 7, deadlinesDay: day, hasPrefs: true, hasDeadlines: true }

describe('pamięć serwera powiadomień', () => {
  it('bez zmian - nic nie czyta od nowa', () => {
    expect(cacheRefresh(fresh, { prefsAt: 5, deadlinesAt: 7 }, now, day)).toEqual({ full: false, prefs: false, deadlines: false })
  })

  it('pierwszy raz albo stara pamięć - wszystko', () => {
    expect(cacheRefresh({ hasPrefs: false, hasDeadlines: false }, { prefsAt: null, deadlinesAt: null }, now, day)).toEqual({
      full: true,
      prefs: true,
      deadlines: true,
    })
    expect(cacheRefresh({ ...fresh, cachedAt: now - CACHE_MAX_MS }, { prefsAt: 5, deadlinesAt: 7 }, now, day).full).toBe(true)
  })

  it('zmiana ustawień albo terminu - tylko to, co się zmieniło', () => {
    expect(cacheRefresh(fresh, { prefsAt: 6, deadlinesAt: 7 }, now, day)).toEqual({ full: false, prefs: true, deadlines: false })
    expect(cacheRefresh(fresh, { prefsAt: 5, deadlinesAt: 9 }, now, day)).toEqual({ full: false, prefs: false, deadlines: true })
  })

  it('nowy dzień - terminy od nowa (przesuwa się okno 8 dni)', () => {
    expect(cacheRefresh(fresh, { prefsAt: 5, deadlinesAt: 7 }, now, '2027-02-25').deadlines).toBe(true)
  })

  it('konto bez znaczników (nic jeszcze nie zmieniano) - pamięć działa', () => {
    const none: CacheState = { cachedAt: now - 60_000, deadlinesDay: day, hasPrefs: true, hasDeadlines: true }
    expect(cacheRefresh(none, { prefsAt: null, deadlinesAt: null }, now, day)).toEqual({ full: false, prefs: false, deadlines: false })
  })
})

describe('znaczniki zmian zapisywane przez Planer', () => {
  it('zmiany planu, terminy i ustawienia - tak; reszta (notatki, oceny) - bez znacznika', async () => {
    const { changeMarker } = await import('./cloudTypes')
    expect(changeMarker('seriesEdits', 'x')).toBe('planEditsAt')
    expect(changeMarker('deadlines', 'x')).toBe('deadlinesAt')
    expect(changeMarker('settings', 'prefs')).toBe('prefsAt')
    expect(changeMarker('settings', 'colors')).toBeNull()
    expect(changeMarker('courses', 'x')).toBeNull()
  })
})
