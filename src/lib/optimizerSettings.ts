// Ustawienia optymalizatora (kryteria, blokady godzin, przypięte grupy) - w tej przeglądarce.
import { isTimeKey } from './dates'
import { DEFAULT_OPTIMIZER_SETTINGS, type BlockedTime, type GroupOption, type OptimizerSettings } from './optimizer'

const STORAGE_KEY = 'planer.optimizer.v1'

const weight = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 3 ? v : fallback

export function parseOptimizerSettings(raw: unknown): OptimizerSettings {
  const d = DEFAULT_OPTIMIZER_SETTINGS
  if (typeof raw !== 'object' || raw === null) return d
  const r = raw as Record<string, unknown>
  const w = (typeof r.weights === 'object' && r.weights !== null ? r.weights : {}) as Record<string, unknown>
  const blocked = Array.isArray(r.blocked)
    ? r.blocked.filter(
        (b): b is BlockedTime =>
          typeof b === 'object' && b !== null &&
          typeof b.id === 'string' && Number.isInteger(b.weekday) && b.weekday >= 1 && b.weekday <= 7 &&
          typeof b.from === 'string' && isTimeKey(b.from) && typeof b.to === 'string' && isTimeKey(b.to),
      )
    : []
  const pinned: Record<string, number> = {}
  if (typeof r.pinned === 'object' && r.pinned !== null) {
    for (const [slot, group] of Object.entries(r.pinned as Record<string, unknown>)) {
      if (typeof group === 'number') pinned[slot] = group
    }
  }
  return {
    weights: {
      gaps: weight(w.gaps, d.weights.gaps),
      days: weight(w.days, d.weights.days),
      early: weight(w.early, d.weights.early),
      late: weight(w.late, d.weights.late),
    },
    startAfter: typeof r.startAfter === 'string' && isTimeKey(r.startAfter) ? r.startAfter : d.startAfter,
    endBefore: typeof r.endBefore === 'string' && isTimeKey(r.endBefore) ? r.endBefore : d.endBefore,
    blocked,
    pinned,
  }
}

export function loadOptimizerSettings(): OptimizerSettings {
  try {
    return parseOptimizerSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return DEFAULT_OPTIMIZER_SETTINGS
  }
}

export function saveOptimizerSettings(settings: OptimizerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // bez zapisu - ustawienia zostaną do przeładowania
  }
}

export const WEEKDAYS = ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.']

// Krótki opis terminu grupy: "pt. 14:15", "śr. 8:15, co 2 tyg.", "pon. 10:15 / czw. 12:15".
export function describeOption(option: GroupOption): string {
  if (option.meetings.length === 0) return 'brak terminów'
  const counts = new Map<string, number>()
  for (const m of option.meetings) {
    const key = `${WEEKDAYS[(m.start.getDay() + 6) % 7]} ${m.start.getHours()}:${String(m.start.getMinutes()).padStart(2, '0')}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const main = sorted.slice(0, 2).map(([k]) => k).join(' / ')
  // Co drugi tydzień: między pierwszym a ostatnim terminem jest ~2 razy więcej tygodni niż terminów.
  const first = option.meetings[0].start.getTime()
  const last = option.meetings[option.meetings.length - 1].start.getTime()
  const spanWeeks = Math.round((last - first) / (7 * 24 * 3600 * 1000)) + 1
  const biweekly = option.meetings.length >= 3 && spanWeeks >= option.meetings.length * 1.7
  return biweekly ? `${main}, co 2 tyg.` : main
}
