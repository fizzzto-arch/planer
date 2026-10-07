import { t } from '../lib/i18n'
import { useState, type FormEvent } from 'react'
import type { CustomMeetingDraft } from '../hooks/planUi'
import type { ExtrasApi } from '../hooks/useExtras'
import { parseDateKey } from '../lib/dates'
import { MEETING_TYPES, typeLabel } from '../lib/usos'
import { Dialog } from './Dialog'
import { ClassDatesField } from './ClassDatesField'
import { datesError, datesFromDraft, draftFromDates, type WeekOf } from '../lib/classDates'
import { customMeetingDays } from '../lib/edits'

interface Props {
  draft: CustomMeetingDraft
  courseNames: string[]
  extras: ExtrasApi
  weekOf: WeekOf
  onClose: () => void
}

const NEW_COURSE = '__nowy__'

export function CustomMeetingEditor({ draft, courseNames, extras, weekOf, onClose }: Props) {
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
  // Jednorazowo, co tydzień od-do (też tylko parzyste/nieparzyste tygodnie) albo wybrane dni.
  const [dates, setDates] = useState(() =>
    draftFromDates(
      draft.dates?.length
        ? { kind: 'dates', dates: draft.dates }
        : draft.repeatWeeklyUntil && draft.date
          ? { kind: 'range', from: draft.date, to: draft.repeatWeeklyUntil, weeks: draft.weeks ?? 'all' }
          : null,
      { from: draft.date ?? '', to: '' },
    ),
  )
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const courseName = (courseChoice === NEW_COURSE ? newCourse : courseChoice).trim()
    if (!courseName) return setError(t('Podaj nazwę przedmiotu.'))
    if (dates.mode === 'all' && !parseDateKey(date)) return setError(t('Wybierz datę.'))
    if (!startTime || !endTime || endTime <= startTime) return setError(t('Podaj godziny: koniec musi być po początku.'))
    const held = datesFromDraft(dates)
    if ('error' in held) return setError(datesError(held.error))
    const spec = held.dates
    const meeting = {
      id: draft.id,
      courseName,
      type,
      date: spec?.kind === 'range' ? spec.from : spec?.kind === 'dates' ? spec.dates[0] : date,
      startTime,
      endTime,
      room: room.trim() || null,
      repeatWeeklyUntil: spec?.kind === 'range' ? spec.to : null,
      weeks: spec?.kind === 'range' ? spec.weeks : ('all' as const),
      dates: spec?.kind === 'dates' ? spec.dates : null,
    }
    // Np. tylko parzyste tygodnie w zakresie, w którym ich nie ma.
    if (customMeetingDays({ ...meeting, id: draft.id ?? '' }, weekOf).length === 0) {
      return setError(t('W tym zakresie nie ma żadnego takiego tygodnia.'))
    }
    extras.saveCustomMeeting(meeting)
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

        <ClassDatesField draft={dates} onChange={setDates} allLabel={t('Jednorazowo')} weekOf={weekOf} />

        {dates.mode === 'all' && (
          <label className="field">
            <span className="field-label">{t('Data')}</span>
            <input className="text-input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
        )}

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
                const question = draft.repeatWeeklyUntil || draft.dates?.length
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
