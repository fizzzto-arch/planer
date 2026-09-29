// Ustawienia użytkownika. Zapisywane w przeglądarce, a po zalogowaniu także na koncie.
import { DEFAULT_REMINDERS, parseReminderKinds, type ReminderKind } from './reminders'

export type AnimationsMode = 'on' | 'off' | 'system'
export type ThemeMode = 'system' | 'light' | 'dark'
export type TextSize = 'small' | 'normal' | 'large'
export type StartView = 'today' | 'week' | 'courses'

export interface Prefs {
  animations: AnimationsMode
  theme: ThemeMode
  compact: boolean
  textSizePhone: TextSize // rozmiar tekstu osobno na telefonie i komputerze
  textSizeDesktop: TextSize
  startView: StartView
  showWeekNumber: boolean
  gapMinutes: number // od ilu minut przerwa to "okienko"
  alwaysWeekend: boolean // siatka tygodnia zawsze z sobotą i niedzielą
  upcomingDays: number // zasięg paska "Nadchodzące terminy"
  courseAliases: Record<string, string> // pełna nazwa przedmiotu -> skrót
  useAliases: boolean // pokazuj skróty zamiast pełnych nazw (skróty zostają zapisane)
  reminders: ReminderKind[] // kiedy przypominać o terminach (czyta to też skrypt wysyłający)
  planChanges: boolean // powiadomienie o zmianie w planie z USOS
  morningSummary: boolean // plan dnia rano (7:00)
  beforeFirstClass: boolean // przypomnienie 30 min przed pierwszymi zajęciami dnia
}

export const DEFAULT_PREFS: Prefs = {
  animations: 'on',
  theme: 'system',
  compact: false,
  textSizePhone: 'normal',
  textSizeDesktop: 'normal',
  startView: 'today',
  showWeekNumber: true,
  gapMinutes: 30,
  alwaysWeekend: false,
  upcomingDays: 14,
  courseAliases: {},
  useAliases: true,
  reminders: DEFAULT_REMINDERS,
  planChanges: true,
  morningSummary: false,
  beforeFirstClass: false,
}

const SIZES: readonly TextSize[] = ['small', 'normal', 'large']

// Wąski ekran = telefon (ta sama granica w skrypcie startowym w index.html).
export const PHONE_QUERY = '(max-width: 700px)'

export const GAP_OPTIONS = [15, 30, 45, 60]
export const UPCOMING_OPTIONS = [7, 14, 30]

// Klucz czytany też przez skrypt w index.html (motyw przed pierwszym rysowaniem).
export const PREFS_STORAGE_KEY = 'planer.prefs'

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function numberFrom(value: unknown, allowed: number[], fallback: number): number {
  return typeof value === 'number' && allowed.includes(value) ? value : fallback
}

export function parsePrefs(raw: Record<string, unknown>): Prefs {
  const aliases: Record<string, string> = {}
  if (typeof raw.courseAliases === 'object' && raw.courseAliases !== null) {
    for (const [name, alias] of Object.entries(raw.courseAliases as Record<string, unknown>)) {
      // Bez przycinania spacji - inaczej wersja z konta różniłaby się od wpisywanej ("Grafika k").
      if (typeof alias === 'string' && alias.trim()) aliases[name] = alias.slice(0, 40)
    }
  }
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
  return {
    animations: oneOf(raw.animations, ['on', 'off', 'system'], DEFAULT_PREFS.animations),
    theme: oneOf(raw.theme, ['system', 'light', 'dark'], DEFAULT_PREFS.theme),
    compact: bool(raw.compact, DEFAULT_PREFS.compact),
    // Starsza wersja miała jeden rozmiar dla wszystkich urządzeń - służy za wartość startową.
    textSizePhone: oneOf(raw.textSizePhone ?? raw.textSize, SIZES, DEFAULT_PREFS.textSizePhone),
    textSizeDesktop: oneOf(raw.textSizeDesktop ?? raw.textSize, SIZES, DEFAULT_PREFS.textSizeDesktop),
    startView: oneOf(raw.startView, ['today', 'week', 'courses'], DEFAULT_PREFS.startView),
    showWeekNumber: bool(raw.showWeekNumber, DEFAULT_PREFS.showWeekNumber),
    gapMinutes: numberFrom(raw.gapMinutes, GAP_OPTIONS, DEFAULT_PREFS.gapMinutes),
    alwaysWeekend: bool(raw.alwaysWeekend, DEFAULT_PREFS.alwaysWeekend),
    upcomingDays: numberFrom(raw.upcomingDays, UPCOMING_OPTIONS, DEFAULT_PREFS.upcomingDays),
    courseAliases: aliases,
    useAliases: bool(raw.useAliases, DEFAULT_PREFS.useAliases),
    reminders: parseReminderKinds(raw.reminders),
    planChanges: bool(raw.planChanges, DEFAULT_PREFS.planChanges),
    morningSummary: bool(raw.morningSummary, DEFAULT_PREFS.morningSummary),
    beforeFirstClass: bool(raw.beforeFirstClass, DEFAULT_PREFS.beforeFirstClass),
  }
}

export function loadLocalPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    return raw ? parsePrefs(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveLocalPrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // bez zapisu - ustawienia zostaną do przeładowania
  }
}

// Kolory tła motywów (te same co --bg w index.css).
const THEME_BACKGROUND = { light: '#f4f4f6', dark: '#121215' } as const

export function resolveTheme(theme: ThemeMode, systemDark: boolean): 'light' | 'dark' {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

// Wygląd sterowany atrybutami na <html>, żeby CSS mógł z nich korzystać wszędzie
// (także w oknach dialogowych rysowanych nad stroną).
export function applyPrefsToDocument(prefs: Prefs, systemDark: boolean, isPhone: boolean): void {
  const root = document.documentElement
  const theme = resolveTheme(prefs.theme, systemDark)
  root.dataset.theme = theme
  // Tło paska stanu i "przeciągania" strony na iPhonie - kolor tła wybranego motywu.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BACKGROUND[theme])
  root.dataset.motion = prefs.animations
  root.dataset.textSize = isPhone ? prefs.textSizePhone : prefs.textSizeDesktop
  root.classList.toggle('compact', prefs.compact)
}

export function displayName(courseName: string, prefs: Pick<Prefs, 'courseAliases' | 'useAliases'>): string {
  if (!prefs.useAliases) return courseName
  return prefs.courseAliases[courseName]?.trim() || courseName
}

// Podpowiedź skrótu: pierwsze litery słów dłuższych niż 2 znaki
// ("Podstawy elementów i układów elektronicznych" -> "PEUE"). Jedno słowo = bez skrótu.
export function suggestAlias(courseName: string): string {
  const words = courseName.split(/\s+/).filter((w) => w.length > 2)
  if (words.length < 2) return courseName
  return words.map((w) => w[0].toUpperCase()).join('')
}
