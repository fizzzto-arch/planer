// Diagnostyka gestów (tylko administrator, włączana w ustawieniach): ostatnie zdarzenia dotyku
// na ekranie. Pozwala sprawdzić na telefonie, co przeglądarka faktycznie wysyła.
const STORAGE_KEY = 'planer.debug-gestures'
const MAX_LINES = 8

let enabled = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
})()
let lines: string[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function swipeLog(message: string): void {
  if (!enabled) return
  const time = new Date().toTimeString().slice(3, 8)
  lines = [...lines.slice(-(MAX_LINES - 1)), `${time} ${message}`]
  notify()
}

export function setSwipeDebug(on: boolean): void {
  enabled = on
  lines = []
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // bez zapisu - działa do przeładowania
  }
  notify()
}

export const swipeDebugStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  enabled: () => enabled,
  lines: () => lines,
}
