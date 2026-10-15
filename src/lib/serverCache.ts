// Serwer powiadomień pamięta ustawienia i nadchodzące terminy każdej osoby (w planWatch/{uid}) i czyta je
// od nowa tylko po zmianie - Planer zostawia wtedy znacznik w users/{uid} (prefsAt, deadlinesAt) - po zmianie
// dnia (okno terminów) albo co CACHE_MAX_MS (zapas na starsze wersje Planera bez znaczników).
// Dzięki temu co kwadrans na osobę idą dwa odczyty zamiast czterech i więcej (darmowy limit bazy).
// Używa go serwer (Node) - importy tylko z .ts.

export const CACHE_MAX_MS = 6 * 60 * 60 * 1000

export interface CacheState {
  cachedAt?: number // ostatnie pełne odświeżenie
  prefsAt?: number | null // znacznik, przy którym zapamiętano ustawienia
  deadlinesAt?: number | null
  deadlinesDay?: string // dzień ("YYYY-MM-DD"), od którego liczy się zapamiętane okno terminów
  hasPrefs: boolean
  hasDeadlines: boolean
}

export interface Markers {
  prefsAt: number | null
  deadlinesAt: number | null
}

// Co przeczytać od nowa: full - wszystko (stara pamięć), prefs / deadlines - tylko to, co się zmieniło.
export function cacheRefresh(
  cache: CacheState,
  markers: Markers,
  now: number,
  day: string,
): { full: boolean; prefs: boolean; deadlines: boolean } {
  const full = cache.cachedAt === undefined || now - cache.cachedAt >= CACHE_MAX_MS
  const prefs = full || !cache.hasPrefs || (cache.prefsAt ?? null) !== markers.prefsAt
  const deadlines =
    full || !cache.hasDeadlines || (cache.deadlinesAt ?? null) !== markers.deadlinesAt || cache.deadlinesDay !== day
  return { full, prefs, deadlines }
}
