import { locale, t } from './i18n.ts'

export const MINUTE_MS = 60_000

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

// Tydzień zaczyna się w poniedziałek.
export function startOfWeek(d: Date): Date {
  const mondayOffset = (d.getDay() + 6) % 7
  return addDays(startOfDay(d), -mondayOffset)
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MINUTE_MS)
}

export function formatTime(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 45 -> "45 min", 60 -> "1 h", 75 -> "1 h 15 min"
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

// Formatery w języku interfejsu (tworzone raz na język).
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(name: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale()}|${name}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale(), options)
    formatters.set(key, f)
  }
  return f
}
const dayFormat = () => formatter('day', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDayFormat = () => formatter('short', { weekday: 'short', day: 'numeric', month: 'numeric' })
const dayMonthFormat = () => formatter('dayMonth', { day: 'numeric', month: 'long' })

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "Poniedziałek, 5 października"
export function formatDay(d: Date): string {
  return capitalize(dayFormat().format(d))
}

// "Pon., 5.10"
export function formatShortDay(d: Date): string {
  return capitalize(shortDayFormat().format(d))
}

// "5 – 11 października" albo "28 września – 4 października"
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()} – ${dayMonthFormat().format(end)}`
  }
  return `${dayMonthFormat().format(weekStart)} – ${dayMonthFormat().format(end)}`
}

// "dziś 16:40", "wczoraj 9:05", "3.10 12:00"
export function formatUpdatedAt(d: Date, now: Date): string {
  if (isSameDay(d, now)) return t('dziś {time}', { time: formatTime(d) })
  if (isSameDay(d, addDays(now, -1))) return t('wczoraj {time}', { time: formatTime(d) })
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${formatTime(d)}`
}

// ---------- Daty zapisywane w chmurze jako napisy lokalne ----------

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Date -> "2026-10-05"
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// "2026-10-05" -> Date (północ czasu lokalnego); null dla złego formatu
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}

// Date -> "08:15"
export function toTimeKey(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function isTimeKey(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

// Dzień z pierwszego argumentu + godzina "HH:MM"
export function withTime(day: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
}

// Liczba dni kalendarzowych od a do b (odporna na zmianę czasu letniego)
export function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86_400_000)
}
