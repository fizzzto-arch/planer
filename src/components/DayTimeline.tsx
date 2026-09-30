import { t } from '../lib/i18n'
import { Fragment, type CSSProperties } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { formatDuration, isSameDay, minutesBetween } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { shortBuilding } from '../lib/usos'
import { MeetingCard } from './MeetingCard'

interface Props {
  meetings: PlanMeeting[] // zajęcia jednego dnia, posortowane
  now: Date
}

// minGap: przerwa krótsza niż to jest zwykłym przejściem między salami, a nie okienkiem
// (ustawienie "próg okienka").
function transitionNote(prev: PlanMeeting, next: PlanMeeting, minGap: number): string | null {
  const gap = minutesBetween(prev.end, next.start)
  const notes: string[] = []
  if (gap < 0) notes.push(t('Zajęcia nakładają się!'))
  else if (gap >= minGap) notes.push(t('Okienko {duration}', { duration: formatDuration(gap) }))

  const from = shortBuilding(prev.building)
  const to = shortBuilding(next.building)
  if (from && to && from !== to) notes.push(t('zmiana budynku → {to}', { to }))

  if (notes.length === 0) return null
  const text = notes.join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function DayTimeline({ meetings, now }: Props) {
  const { prefs } = usePlanUi()
  const nextId = meetings.find((m) => m.start > now && isSameDay(m.start, now) && !m.cancelled)?.id

  // Kolejny numer elementu - karty pojawiają się kaskadowo, jedna po drugiej.
  let order = 0
  const stagger = () => ({ '--i': order++ }) as CSSProperties

  return (
    <ol className="timeline">
      {meetings.map((m, i) => {
        const note = i > 0 ? transitionNote(meetings[i - 1], m, prefs.gapMinutes) : null
        return (
          <Fragment key={m.id}>
            {note && (
              <li className="gap-note" style={stagger()}>
                {note}
              </li>
            )}
            <li style={stagger()}>
              <MeetingCard meeting={m} now={now} isNext={m.id === nextId} />
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
