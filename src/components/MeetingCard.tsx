import { t } from '../lib/i18n'
import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { formatDay, formatDuration, formatTime, minutesBetween, toDateKey, toTimeKey } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { deadlineKindLabel, seriesKey } from '../lib/extras'
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

// iPhone/iPad/Mac: od razu aplikacja Mapy; reszta: Mapy Google.
const APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)

function mapsUrl(address: string): string {
  return APPLE
    ? `https://maps.apple.com/?q=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function NoteIcon() {
  return (
    <svg className="badge-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h5" />
    </svg>
  )
}

export function MeetingCard({ meeting: m, now, isNext = false, showCourseLink = true }: Props) {
  const { extras, openCourse, editDeadline, editMeeting, deadlinesFor, displayName } = usePlanUi()

  // Powrót do wersji z USOS prosto z karty: zmiana tych zajęć albo (po potwierdzeniu) całej grupy.
  const restoreFromUsos = (meeting: PlanMeeting) => {
    if (!extras || !meeting.original) return
    if (extras.extras.meetingEdits.get(meeting.id)?.override) {
      extras.saveMeetingEdit(meeting.id, { override: null })
      return
    }
    const key = seriesKey(meeting.original)
    if (key && window.confirm(t('To zmiana całej grupy. Przywrócić wersję z USOS dla wszystkich jej zajęć?'))) {
      extras.saveSeriesEdit({ id: key, room: null, startTime: null, endTime: null })
    }
  }
  const isPast = m.end <= now
  const isNow = m.start <= now && now < m.end
  const building = shortBuilding(m.building)
  const deadlines = deadlinesFor(m)
  const [noteOpen, setNoteOpen] = useState(false)

  let hint: string | null = null
  if (m.cancelled) hint = t('Odwołane')
  else if (isNow) hint = t('Trwa · zostało {duration}', { duration: formatDuration(minutesBetween(now, m.end)) })
  else if (isNext) hint = t('Za {duration}', { duration: formatDuration(minutesBetween(now, m.start)) })

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
          {showCourseLink ? (
            // Nazwa przedmiotu prowadzi prosto na jego stronę (bez rozwijania karty).
            <button
              type="button"
              className="card-title card-title-link"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openCourse(m.courseName)
              }}
            >
              {displayName(m.courseName)}
            </button>
          ) : (
            <div className="card-title">{displayName(m.courseName)}</div>
          )}
          <div className="card-meta">
            <span className="type-badge">{typeLabel(m.type)}</span>
            {m.groupNumber !== null && <span>{t('gr. {n}', { n: m.groupNumber })}</span>}
            {m.room && <span>{t('s. {room}', { room: m.room })}</span>}
            {building && <span>{building}</span>}
          </div>
          {(deadlines.length > 0 || m.note || m.edited || m.custom) && (
            <div className="card-badges">
              {deadlines.map((d) => (
                <span key={d.id} className={`badge badge-deadline kind-${d.kind}`}>
                  {d.title || deadlineKindLabel(d.kind)}
                </span>
              ))}
              {m.edited && <span className="badge">{t('zmienione')}</span>}
              {m.custom && <span className="badge">{t('własne')}</span>}
              {m.note && (
                <span className="badge badge-note" title={t('Ma notatkę')}>
                  <NoteIcon />
                  {t('notatka')}
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
            {m.address} {t('(mapa)')}
          </a>
        )}
        {m.usosUrl && (
          <a href={m.usosUrl} target="_blank" rel="noreferrer">
            {t('Zobacz zajęcia w USOSweb')}
          </a>
        )}

        {m.edited && m.original && (
          <div className="card-original">
            {t('W USOS:')} {formatDay(m.original.start)}, {formatTime(m.original.start)}–{formatTime(m.original.end)}
            {m.original.room && ', ' + t('s. {room}', { room: m.original.room })}
            {extras && (
              <button type="button" className="link-button card-restore" onClick={() => restoreFromUsos(m)}>
                {t('Przywróć z USOS')}
              </button>
            )}
          </div>
        )}

        {/* Notatka tylko, gdy coś w niej jest albo użytkownik chce ją dodać. Po wejściu w pole
            zostaje widoczna, nawet gdy ktoś wszystko skasuje (inaczej zniknęłaby w trakcie pisania). */}
        {extras && (m.note || noteOpen) && (
          <div onFocusCapture={() => setNoteOpen(true)}>
            <NoteField
              id={`meeting-note-${m.id}`}
              value={m.note}
              rows={2}
              autoFocus={noteOpen && !m.note}
              placeholder={t('np. przynieść kalkulator')}
              onSave={(text) => extras.saveMeetingEdit(m.id, { note: text })}
            />
          </div>
        )}

        <div className="card-actions">
          {extras && !m.note && !noteOpen && (
            <button type="button" className="button small secondary" onClick={() => setNoteOpen(true)}>
              {t('+ Notatka')}
            </button>
          )}
          {extras && (
            <button
              type="button"
              className="button small secondary"
              title={m.custom ? t('Edytuj własne zajęcia') : t('Zmień salę lub godzinę albo odwołaj zajęcia')}
              onClick={() => editMeeting(m)}
            >
              {m.custom ? t('Edytuj') : t('Zmień')}
            </button>
          )}
          {extras && (
            <button
              type="button"
              className="button small secondary"
              title={t('Dodaj kolokwium, egzamin albo inny termin na te zajęcia')}
              onClick={() =>
                editDeadline({ courseName: m.courseName, date: toDateKey(m.start), time: toTimeKey(m.start) })
              }
            >
              {t('+ Termin')}
            </button>
          )}
          {showCourseLink && (
            <button type="button" className="button small secondary" onClick={() => openCourse(m.courseName)}>
              {t('Przedmiot →')}
            </button>
          )}
        </div>
      </div>
    </details>
  )
}
