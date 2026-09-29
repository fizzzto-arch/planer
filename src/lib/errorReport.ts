// Automatyczne zgłaszanie błędów: gdy Planer się wywróci, administrator dostaje zgłoszenie
// z komunikatem, miejscem w kodzie i wersją - bez notatek, planu ani innych danych użytkownika.
// Idzie tą samą drogą co zgłoszenia ręczne (skrzynka + push), z limitem, żeby nie zasypać bazy.
import { diagnostics } from './diagnostics'
import { AUTO_PREFIX, type NewFeedback } from './feedback'


const LOG_KEY = 'planer.error-reports'
const MAX_PER_DAY = 3
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_STACK = 1500

export interface ReportLog {
  at: number
  signature: string
}

// Ten sam błąd (komunikat + pierwsza linia miejsca) zgłaszamy raz na dobę, wszystkich najwyżej 3 na dobę.
export function shouldReport(signature: string, log: ReportLog[], now: number): boolean {
  const recent = log.filter((r) => now - r.at < DAY_MS)
  return recent.length < MAX_PER_DAY && !recent.some((r) => r.signature === signature)
}

export function errorSignature(error: Error): string {
  const frame = (error.stack ?? '').split('\n').find((l) => /\.(tsx?|js)\b/.test(l)) ?? ''
  // Bez numerów wersji plików (?t=..., -Ab12Cd.js) - ten sam błąd po wdrożeniu to ten sam błąd.
  return `${error.name}: ${error.message} @ ${frame.replace(/[?-][\w-]{6,}(?=\.js|:)/g, '').trim()}`.slice(0, 300)
}

// Stara wersja strony po wdrożeniu nowej: pliki podstron (eksport, ustawienia...) mają już inne nazwy.
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload CSS/i.test(
    message,
  )
}

// Błędy, których nie naprawimy w kodzie: sieć, wtyczki przeglądarki, znane fałszywe alarmy.
export function isNoise(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message} ${error.stack ?? ''}` : String(error)
  return (
    isStaleChunkError(error) ||
    /ResizeObserver loop|Failed to fetch|Load failed|NetworkError|network error|AbortError|chrome-extension:|moz-extension:|safari-web-extension:|QuotaExceeded|offline/i.test(
      message,
    )
  )
}

export function buildReport(error: Error, where: string, componentStack?: string): NewFeedback {
  const stack = [error.stack ?? '', componentStack ? `Komponenty:${componentStack}` : '']
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_STACK)
  return {
    kind: 'bug',
    good: '',
    bad: '',
    missing: '',
    text: `${AUTO_PREFIX} (${where})\n${error.name}: ${error.message}\n\n${stack}`.slice(0, 3000),
    diagnostics: diagnostics(),
  }
}

type Sender = (report: NewFeedback) => Promise<void>
let sender: Sender | null = null

// App ustawia wysyłanie po zalogowaniu (zgłoszenia może wysłać tylko konto z dostępem).
export function setErrorSender(next: Sender | null) {
  sender = next
}

function readLog(): ReportLog[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? (raw as ReportLog[]) : []
  } catch {
    return []
  }
}

export function reportError(error: unknown, where: string, componentStack?: string) {
  // W wersji deweloperskiej tylko z udawaną chmurą (?mock) - nie zaśmiecamy prawdziwej bazy.
  const devWithoutMock = import.meta.env.DEV && !new URLSearchParams(window.location.search).has('mock')
  if (!(error instanceof Error) || isNoise(error) || !sender || devWithoutMock) return
  const signature = errorSignature(error)
  const now = Date.now()
  const log = readLog()
  if (!shouldReport(signature, log, now)) return
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify([...log.filter((r) => now - r.at < DAY_MS), { at: now, signature }]))
  } catch {
    // bez zapisu limitu - trudno, najwyżej jedno zgłoszenie więcej
  }
  // Zgłoszenie błędu nie może wywołać kolejnego błędu.
  sender(buildReport(error, where, componentStack)).catch(() => undefined)
}

// Błędy spoza Reacta: wyjątki w obsłudze zdarzeń i odrzucone obietnice z błędem programisty
// (TypeError, ReferenceError). Odrzucenia z sieci i Firebase to nie błędy kodu - pomijamy.
export function listenForErrors() {
  window.addEventListener('error', (e) => reportError(e.error, 'strona'))
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason instanceof TypeError || e.reason instanceof ReferenceError) reportError(e.reason, 'obietnica')
  })
}

// Po wdrożeniu nowej wersji: przeładowanie raz (nie w kółko, gdyby plik naprawdę zniknął).
const RELOAD_KEY = 'planer.stale-reload'
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
