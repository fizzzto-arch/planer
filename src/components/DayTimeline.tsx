import { Fragment } from 'react'
import { formatDuration, isSameDay, minutesBetween } from '../lib/dates'
import { shortBuilding, type Meeting } from '../lib/usos'
import { MeetingCard } from './MeetingCard'

// Przerwa krótsza niż to jest zwykłym przejściem między salami, a nie okienkiem.
const MIN_GAP_MIN = 30

interface Props {
  meetings: Meeting[] // zajęcia jednego dnia, posortowane
  now: Date
}

function transitionNote(prev: Meeting, next: Meeting): string | null {
  const gap = minutesBetween(prev.end, next.start)
  const notes: string[] = []
  if (gap < 0) notes.push('Zajęcia nakładają się!')
  else if (gap >= MIN_GAP_MIN) notes.push(`Okienko ${formatDuration(gap)}`)

  const from = shortBuilding(prev.building)
  const to = shortBuilding(next.building)
  if (from && to && from !== to) notes.push(`zmiana budynku → ${to}`)

  if (notes.length === 0) return null
  const text = notes.join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function DayTimeline({ meetings, now }: Props) {
  const nextId = meetings.find((m) => m.start > now && isSameDay(m.start, now) && !m.cancelled)?.id

  return (
    <ol className="timeline">
      {meetings.map((m, i) => {
        const note = i > 0 ? transitionNote(meetings[i - 1], m) : null
        return (
          <Fragment key={m.id}>
            {note && <li className="gap-note">{note}</li>}
            <li>
              <MeetingCard meeting={m} now={now} isNext={m.id === nextId} />
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
