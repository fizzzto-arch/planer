import { useState, type FormEvent } from 'react'
import type { CustomMeetingDraft } from '../hooks/planUi'
import type { ExtrasApi } from '../hooks/useExtras'
import { parseDateKey } from '../lib/dates'
import { MEETING_TYPES } from '../lib/usos'
import { Dialog } from './Dialog'

interface Props {
  draft: CustomMeetingDraft
  courseNames: string[]
  extras: ExtrasApi
  onClose: () => void
}

const NEW_COURSE = '__nowy__'

export function CustomMeetingEditor({ draft, courseNames, extras, onClose }: Props) {
  const isNew = !draft.id
  const knownCourse = draft.courseName && courseNames.includes(draft.courseName)
  const [courseChoice, setCourseChoice] = useState(
    knownCourse ? draft.courseName! : draft.courseName ? NEW_COURSE : (courseNames[0] ?? NEW_COURSE),
  )
  const [newCourse, setNewCourse] = useState(knownCourse ? '' : (draft.courseName ?? ''))
  const [type, setType] = useState(draft.type ?? 'CWI')
  const [date, setDate] = useState(draft.date ?? '')
  const [startTime, setStartTime] = useState(draft.startTime ?? '')
  const [endTime, setEndTime] = useState(draft.endTime ?? '')
  const [room, setRoom] = useState(draft.room ?? '')
  const [repeat, setRepeat] = useState(!!draft.repeatWeeklyUntil)
  const [until, setUntil] = useState(draft.repeatWeeklyUntil ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const courseName = (courseChoice === NEW_COURSE ? newCourse : courseChoice).trim()
    if (!courseName) return setError('Podaj nazwę przedmiotu.')
    if (!parseDateKey(date)) return setError('Wybierz datę.')
    if (!startTime || !endTime || endTime <= startTime) return setError('Podaj godziny: koniec musi być po początku.')
    if (repeat && (!parseDateKey(until) || until < date)) {
      return setError('Data końca powtarzania musi być po pierwszych zajęciach.')
    }
    extras.saveCustomMeeting({
      id: draft.id,
      courseName,
      type,
      date,
      startTime,
      endTime,
      room: room.trim() || null,
      repeatWeeklyUntil: repeat ? until : null,
    })
    onClose()
  }

  return (
    <Dialog title={isNew ? 'Dodaj własne zajęcia' : 'Edytuj własne zajęcia'} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="hint">Np. odrabianie, dodatkowe laboratorium albo zajęcia, których nie ma w USOS.</p>

        <label className="field">
          <span className="field-label">Przedmiot</span>
          <select className="text-input" value={courseChoice} onChange={(e) => setCourseChoice(e.target.value)}>
            {courseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={NEW_COURSE}>+ Inny przedmiot…</option>
          </select>
        </label>
        {courseChoice === NEW_COURSE && (
          <label className="field">
            <span className="field-label">Nazwa przedmiotu</span>
            <input
              className="text-input"
              value={newCourse}
              placeholder="np. Lektorat angielski"
              onChange={(e) => setNewCourse(e.target.value)}
            />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">Rodzaj</span>
            <select className="text-input" value={type} onChange={(e) => setType(e.target.value)}>
              {MEETING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">
              Sala <span className="label-note">(opcjonalnie)</span>
            </span>
            <input className="text-input" value={room} placeholder="np. 161" onChange={(e) => setRoom(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Data</span>
          <input className="text-input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Od</span>
            <input className="text-input" type="time" value={startTime} required onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Do</span>
            <input className="text-input" type="time" value={endTime} required onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="check-field">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          Powtarzaj co tydzień
        </label>
        {repeat && (
          <label className="field">
            <span className="field-label">Do kiedy (włącznie)</span>
            <input className="text-input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          {!isNew && draft.id && (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                const question = draft.repeatWeeklyUntil
                  ? 'Usunąć te zajęcia ze wszystkich tygodni?'
                  : 'Usunąć te zajęcia?'
                if (window.confirm(question)) {
                  extras.deleteCustomMeeting(draft.id!)
                  onClose()
                }
              }}
            >
              Usuń
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
