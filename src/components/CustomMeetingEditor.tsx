import { t } from '../lib/i18n'
import { useState, type FormEvent } from 'react'
import type { CustomMeetingDraft } from '../hooks/planUi'
import type { ExtrasApi } from '../hooks/useExtras'
import { parseDateKey } from '../lib/dates'
import { MEETING_TYPES, typeLabel } from '../lib/usos'
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
    if (!courseName) return setError(t('Podaj nazwę przedmiotu.'))
    if (!parseDateKey(date)) return setError(t('Wybierz datę.'))
    if (!startTime || !endTime || endTime <= startTime) return setError(t('Podaj godziny: koniec musi być po początku.'))
    if (repeat && (!parseDateKey(until) || until < date)) {
      return setError(t('Data końca powtarzania musi być po pierwszych zajęciach.'))
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
    <Dialog title={isNew ? t('Dodaj własne zajęcia') : t('Edytuj własne zajęcia')} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="hint">{t('Np. odrabianie, dodatkowe laboratorium albo zajęcia, których nie ma w USOS.')}</p>

        <label className="field">
          <span className="field-label">{t('Przedmiot')}</span>
          <select className="text-input" value={courseChoice} onChange={(e) => setCourseChoice(e.target.value)}>
            {courseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={NEW_COURSE}>{t('+ Inny przedmiot…')}</option>
          </select>
        </label>
        {courseChoice === NEW_COURSE && (
          <label className="field">
            <span className="field-label">{t('Nazwa przedmiotu')}</span>
            <input
              className="text-input"
              value={newCourse}
              placeholder={t('np. Lektorat angielski')}
              onChange={(e) => setNewCourse(e.target.value)}
            />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">{t('Rodzaj')}</span>
            <select className="text-input" value={type} onChange={(e) => setType(e.target.value)}>
              {MEETING_TYPES.map((id) => (
                <option key={id} value={id}>
                  {typeLabel(id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">
              {t('Sala')} <span className="label-note">{t('(opcjonalnie)')}</span>
            </span>
            <input className="text-input" value={room} placeholder={t('np. 161')} onChange={(e) => setRoom(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">{t('Data')}</span>
          <input className="text-input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">{t('Od')}</span>
            <input className="text-input" type="time" value={startTime} required onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t('Do')}</span>
            <input className="text-input" type="time" value={endTime} required onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="check-field">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          {t('Powtarzaj co tydzień')}
        </label>
        {repeat && (
          <label className="field">
            <span className="field-label">{t('Do kiedy (włącznie)')}</span>
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
                  ? t('Usunąć te zajęcia ze wszystkich tygodni?')
                  : t('Usunąć te zajęcia?')
                if (window.confirm(question)) {
                  extras.deleteCustomMeeting(draft.id!)
                  onClose()
                }
              }}
            >
              {t('Usuń')}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            {t('Anuluj')}
          </button>
          <button type="submit" className="button">
            {t('Zapisz')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
