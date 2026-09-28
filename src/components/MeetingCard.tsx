import { usePlanUi } from '../hooks/planUi'
import { formatDuration, formatTime, minutesBetween, toDateKey, toTimeKey } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { deadlineKindLabel } from '../lib/extras'
import { shortBuilding, typeLabel, typeSlug } from '../lib/usos'
import { NoteField } from './NoteField'

interface Props {
  meeting: PlanMeeting
  now: Date
  // Czy to najbliższe zajęcia dzisiaj (pokazujemy wtedy "za 25 min").
  isNext?: boolean
  // Na stronie przedmiotu link do niego samego jest zbędny.
  showCourseLink?: boolean
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function NoteIcon() {
  return (
    <svg className="badge-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5" />
    </svg>
  )
}

export function MeetingCard({ meeting: m, now, isNext = false, showCourseLink = true }: Props) {
  const { extras, openCourse, editDeadline, deadlinesFor } = usePlanUi()
  const isPast = m.end <= now
  const isNow = m.start <= now && now < m.end
  const building = shortBuilding(m.building)
  const deadlines = deadlinesFor(m)

  let hint: string | null = null
  if (m.cancelled) hint = 'Odwołane'
  else if (isNow) hint = `Trwa · zostało ${formatDuration(minutesBetween(now, m.end))}`
  else if (isNext) hint = `Za ${formatDuration(minutesBetween(now, m.start))}`

  const classes = ['card', `type-${typeSlug(m.type)}`]
  if (isPast) classes.push('is-past')
  if (isNow) classes.push('is-now')
  if (m.cancelled) classes.push('is-cancelled')
  if (m.custom) classes.push('is-custom')

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
          {(deadlines.length > 0 || m.note || m.edited || m.custom) && (
            <div className="card-badges">
              {deadlines.map((d) => (
                <span key={d.id} className={`badge badge-deadline kind-${d.kind}`}>
                  {d.title || deadlineKindLabel(d.kind)}
                </span>
              ))}
              {m.edited && <span className="badge">zmienione</span>}
              {m.custom && <span className="badge">własne</span>}
              {m.note && (
                <span className="badge badge-note" title="Ma notatkę">
                  <NoteIcon />
                  notatka
                </span>
              )}
            </div>
          )}
          {hint && <div className="card-hint">{hint}</div>}
        </div>
        <svg className="card-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
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

        {extras && (
          <NoteField
            id={`meeting-note-${m.id}`}
            value={m.note}
            rows={2}
            placeholder="Notatka do tych zajęć, np. przynieść kalkulator"
            onSave={(text) => extras.saveMeetingEdit(m.id, { note: text })}
          />
        )}

        <div className="card-actions">
          {extras && (
            <button
              type="button"
              className="button small secondary"
              onClick={() =>
                editDeadline({ courseName: m.courseName, date: toDateKey(m.start), time: toTimeKey(m.start) })
              }
            >
              + Kolokwium / termin
            </button>
          )}
          {showCourseLink && (
            <button type="button" className="button small secondary" onClick={() => openCourse(m.courseName)}>
              Przedmiot →
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
