import { useState, type FormEvent } from 'react'
import type { ExtrasApi } from '../hooks/useExtras'
import { formatDay, formatTime, toDateKey, toTimeKey } from '../lib/dates'
import { buildOverride, buildSeriesEdit, seriesBase, type PlanMeeting } from '../lib/edits'
import { seriesKey } from '../lib/extras'
import { typeLabel } from '../lib/usos'
import { Dialog } from './Dialog'

interface Props {
  meeting: PlanMeeting // zajęcia z USOS (dla własnych jest CustomMeetingEditor)
  extras: ExtrasApi
  onClose: () => void
}

type Scope = 'single' | 'series'

export function MeetingEditor({ meeting, extras, onClose }: Props) {
  const original = meeting.original ?? meeting
  const key = seriesKey(original)
  const [scope, setScope] = useState<Scope>('single')
  const [date, setDate] = useState(toDateKey(meeting.start))
  const [startTime, setStartTime] = useState(toTimeKey(meeting.start))
  const [endTime, setEndTime] = useState(toTimeKey(meeting.end))
  const [room, setRoom] = useState(meeting.room ?? '')
  const [cancelled, setCancelled] = useState(meeting.cancelled)
  const [error, setError] = useState<string | null>(null)

  const hasSingle = !!extras.extras.meetingEdits.get(meeting.id)?.override
  const hasSeries = key ? extras.extras.seriesEdits.has(key) : false

  // Każdy zakres ma swój punkt wyjścia: te zajęcia (z ich zmianą) albo grupa (bez zmian pojedynczych).
  function changeScope(next: Scope) {
    const source = next === 'series' ? seriesBase(original, extras.extras) : meeting
    setScope(next)
    setStartTime(toTimeKey(source.start))
    setEndTime(toTimeKey(source.end))
    setRoom(source.room ?? '')
    setError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (endTime <= startTime) {
      setError('Koniec zajęć musi być po początku.')
      return
    }
    if (scope === 'series' && key) {
      extras.saveSeriesEdit(buildSeriesEdit(key, original, { startTime, endTime, room }))
    } else {
      const base = seriesBase(original, extras.extras)
      extras.saveMeetingEdit(meeting.id, {
        override: buildOverride(base, { date, startTime, endTime, room, cancelled }),
      })
    }
    onClose()
  }

  return (
    <Dialog title="Zmień zajęcia" onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="dialog-subtitle">
          {meeting.courseName} · {typeLabel(meeting.type)}
          {meeting.groupNumber !== null && ` gr. ${meeting.groupNumber}`}
        </p>

        {key && (
          <div className="segmented" role="radiogroup" aria-label="Zakres zmiany">
            <button
              type="button"
              role="radio"
              aria-checked={scope === 'single'}
              className={`segment${scope === 'single' ? ' is-active' : ''}`}
              onClick={() => changeScope('single')}
            >
              Tylko te zajęcia
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={scope === 'series'}
              className={`segment${scope === 'series' ? ' is-active' : ''}`}
              onClick={() => changeScope('series')}
            >
              Cała grupa
            </button>
          </div>
        )}
        <p className="hint">
          {scope === 'single'
            ? `Zmiana tylko zajęć z dnia ${formatDay(meeting.start).toLowerCase()}.`
            : 'Stała zmiana sali lub godzin dla wszystkich zajęć tej grupy (np. przeniesiona sala).'}
        </p>

        {scope === 'single' && (
          <label className="field">
            <span className="field-label">Data</span>
            <input className="text-input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">Od</span>
            <input
              className="text-input"
              type="time"
              value={startTime}
              required
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Do</span>
            <input className="text-input" type="time" value={endTime} required onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Sala</span>
          <input className="text-input" value={room} placeholder="np. 161" onChange={(e) => setRoom(e.target.value)} />
        </label>

        {scope === 'single' && (
          <label className="check-field">
            <input type="checkbox" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />
            Zajęcia odwołane
          </label>
        )}

        <p className="hint">
          W USOS: {formatTime(original.start)}–{formatTime(original.end)}
          {original.room && `, s. ${original.room}`}
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          {scope === 'single' && hasSingle && (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                extras.saveMeetingEdit(meeting.id, { override: null })
                onClose()
              }}
            >
              Przywróć z USOS
            </button>
          )}
          {scope === 'series' && hasSeries && key && (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                extras.saveSeriesEdit({ id: key, room: null, startTime: null, endTime: null })
                onClose()
              }}
            >
              Przywróć grupę z USOS
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            Anuluj
          </button>
          <button type="submit" className="button">
            Zapisz
          </button>
        </div>
      </form>
    </Dialog>
  )
}
