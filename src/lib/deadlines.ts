import { t } from './i18n'
import { daysBetween, parseDateKey } from './dates'
import type { Deadline } from './extras'

function sortKey(d: Deadline): string {
  return `${d.date} ${d.time ?? '99:99'}`
}

export function sortDeadlines(deadlines: Deadline[]): Deadline[] {
  return [...deadlines].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
}

// Niezrobione terminy od dziś do `days` dni naprzód, posortowane.
export function upcomingDeadlines(deadlines: Deadline[], now: Date, days: number): Deadline[] {
  return sortDeadlines(
    deadlines.filter((d) => {
      const date = parseDateKey(d.date)
      if (!date || d.done) return false
      const diff = daysBetween(now, date)
      return diff >= 0 && diff <= days
    }),
  )
}

// "dziś o 10:15", "jutro", "za 3 dni", "minął"
export function countdownLabel(d: Deadline, now: Date): string {
  const date = parseDateKey(d.date)
  if (!date) return ''
  const diff = daysBetween(now, date)
  if (diff < 0) return t('minął')
  if (diff === 0) return d.time ? t('dziś o {time}', { time: d.time }) : t('dziś')
  if (diff === 1) return d.time ? t('jutro o {time}', { time: d.time }) : t('jutro')
  return t('za {n} dni', { n: diff })
}

// Pilność do kolorowania: dziś/jutro = pilne, do tygodnia = wkrótce.
export function urgency(d: Deadline, now: Date): 'urgent' | 'soon' | 'later' | 'past' {
  const date = parseDateKey(d.date)
  if (!date) return 'later'
  const diff = daysBetween(now, date)
  if (diff < 0) return 'past'
  if (diff <= 1) return 'urgent'
  if (diff <= 7) return 'soon'
  return 'later'
}
