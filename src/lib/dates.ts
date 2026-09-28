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

const dayFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDayFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' })
const dayMonthFormat = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' })

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "Poniedziałek, 5 października"
export function formatDay(d: Date): string {
  return capitalize(dayFormat.format(d))
}

// "Pon., 5.10"
export function formatShortDay(d: Date): string {
  return capitalize(shortDayFormat.format(d))
}

// "5 – 11 października" albo "28 września – 4 października"
export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()} – ${dayMonthFormat.format(end)}`
  }
  return `${dayMonthFormat.format(weekStart)} – ${dayMonthFormat.format(end)}`
}

// "dziś 16:40", "wczoraj 9:05", "3.10 12:00"
export function formatUpdatedAt(d: Date, now: Date): string {
  if (isSameDay(d, now)) return `dziś ${formatTime(d)}`
  if (isSameDay(d, addDays(now, -1))) return `wczoraj ${formatTime(d)}`
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${formatTime(d)}`
}
