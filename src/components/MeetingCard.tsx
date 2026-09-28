import { formatDuration, formatTime, minutesBetween } from '../lib/dates'
import { shortBuilding, typeLabel, typeSlug, type Meeting } from '../lib/usos'

interface Props {
  meeting: Meeting
  now: Date
  // Czy to najbliższe zajęcia dzisiaj (pokazujemy wtedy "za 25 min").
  isNext?: boolean
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function MeetingCard({ meeting: m, now, isNext = false }: Props) {
  const isPast = m.end <= now
  const isNow = m.start <= now && now < m.end
  const building = shortBuilding(m.building)

  let hint: string | null = null
  if (m.cancelled) hint = 'Odwołane'
  else if (isNow) hint = `Trwa · zostało ${formatDuration(minutesBetween(now, m.end))}`
  else if (isNext) hint = `Za ${formatDuration(minutesBetween(now, m.start))}`

  const classes = ['card', `type-${typeSlug(m.type)}`]
  if (isPast) classes.push('is-past')
  if (isNow) classes.push('is-now')
  if (m.cancelled) classes.push('is-cancelled')

  return (
    <details className={classes.join(' ')}>
      <summary>
        <div className="card-time">
          <span>{formatTime(m.start)}</span>
          <span className="card-time-end">{formatTime(m.end)}</span>
        </div>
        <div className="card-main">
          <div className="card-title">{m.courseName}</div>
          <div className="card-meta">
            <span className="type-badge">{typeLabel(m.type)}</span>
            {m.groupNumber !== null && <span>gr. {m.groupNumber}</span>}
            {m.room && <span>s. {m.room}</span>}
            {building && <span>{building}</span>}
          </div>
          {hint && <div className="card-hint">{hint}</div>}
        </div>
      </summary>
      <div className="card-details">
        {m.building && <div>{m.building}</div>}
        {m.address && (
          <a href={mapsUrl(m.address)} target="_blank" rel="noreferrer">
            {m.address} (mapa)
          </a>
        )}
        {m.usosUrl && (
          <a href={m.usosUrl} target="_blank" rel="noreferrer">
            Zobacz zajęcia w USOSweb
          </a>
        )}
      </div>
    </details>
  )
}
