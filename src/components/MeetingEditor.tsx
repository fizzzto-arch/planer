import { midSentence, t } from '../lib/i18n'
import { useState, type FormEvent } from 'react'
import type { ExtrasApi } from '../hooks/useExtras'
import { formatDay, formatTime, toDateKey, toTimeKey } from '../lib/dates'
import { buildOverride, buildSeriesEdit, seriesBase, weekdayOf, type PlanMeeting } from '../lib/edits'
import { weekdayName } from '../lib/timetable'
import { seriesKey } from '../lib/extras'
import { typeLabel } from '../lib/usos'
import { Dialog } from './Dialog'
import { ClassDatesField } from './ClassDatesField'
import { datesError, datesFromDraft, draftFromDates, type WeekOf } from '../lib/classDates'

interface Props {
  meeting: PlanMeeting // zajęcia z USOS (dla własnych jest CustomMeetingEditor)
  extras: ExtrasApi
  seriesDates: string[] // wszystkie terminy tej grupy w USOS (z tego dnia tygodnia) - do wyboru, kiedy naprawdę są
  weekOf: WeekOf
  onClose: () => void
}

type Scope = 'single' | 'series'

export function MeetingEditor({ meeting, extras, seriesDates, weekOf, onClose }: Props) {
  const original = meeting.original ?? meeting
  const key = seriesKey(original)
  const [scope, setScope] = useState<Scope>('single')
  const [date, setDate] = useState(toDateKey(meeting.start))
  const [startTime, setStartTime] = useState(toTimeKey(meeting.start))
  const [endTime, setEndTime] = useState(toTimeKey(meeting.end))
  const [room, setRoom] = useState(meeting.room ?? '')
  const [online, setOnline] = useState(meeting.online ?? false)
  const [cancelled, setCancelled] = useState(meeting.cancelled)
  const [weekday, setWeekday] = useState(weekdayOf(meeting.start)) // tylko dla całej grupy
  const [error, setError] = useState<string | null>(null)
  // Cała grupa: kiedy zajęcia faktycznie są (np. laboratorium tylko w tyg. 10-14) - pozostałe znikają z planu.
  const [dates, setDates] = useState(() =>
    draftFromDates(key ? (extras.extras.seriesEdits.get(key)?.dates ?? null) : null, {
      from: seriesDates[0] ?? toDateKey(original.start),
      to: seriesDates.at(-1) ?? toDateKey(original.start),
    }),
  )

  const hasSingle = !!extras.extras.meetingEdits.get(meeting.id)?.override
  const hasSeries = key ? extras.extras.seriesEdits.has(key) : false

  // Każdy zakres ma swój punkt wyjścia: te zajęcia (z ich zmianą) albo grupa (bez zmian pojedynczych).
  function changeScope(next: Scope) {
    const source = next === 'series' ? seriesBase(original, extras.extras) : meeting
    setScope(next)
    setStartTime(toTimeKey(source.start))
    setEndTime(toTimeKey(source.end))
    setRoom(source.room ?? '')
    setOnline(source.online ?? false)
    setWeekday(weekdayOf(source.start))
    setError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (endTime <= startTime) {
      setError(t('Koniec zajęć musi być po początku.'))
      return
    }
    if (scope === 'series' && key) {
      const held = datesFromDraft(dates)
      if ('error' in held) {
        setError(datesError(held.error))
        return
      }
      extras.saveSeriesEdit({ ...buildSeriesEdit(key, original, { startTime, endTime, room, weekday, online }), dates: held.dates })
    } else {
      const base = seriesBase(original, extras.extras)
      extras.saveMeetingEdit(meeting.id, {
        override: buildOverride(base, { date, startTime, endTime, room, cancelled, online }),
      })
    }
    onClose()
  }

  return (
    <Dialog title={t('Zmień zajęcia')} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="dialog-subtitle">
          {meeting.courseName} · {typeLabel(meeting.type)}
          {meeting.groupNumber !== null && ' ' + t('gr. {n}', { n: meeting.groupNumber })}
        </p>

        {key && (
          <div className="segmented" role="radiogroup" aria-label={t('Zakres zmiany')}>
            <button
              type="button"
              role="radio"
              aria-checked={scope === 'single'}
              className={`segment${scope === 'single' ? ' is-active' : ''}`}
              onClick={() => changeScope('single')}
            >
              {t('Tylko te zajęcia')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={scope === 'series'}
              className={`segment${scope === 'series' ? ' is-active' : ''}`}
              onClick={() => changeScope('series')}
            >
              {t('Cała grupa')}
            </button>
          </div>
        )}
        <p className="hint">
          {scope === 'single'
            ? t('Zmiana tylko zajęć z dnia {day}.', { day: midSentence(formatDay(meeting.start)) })
            : t('Stała zmiana tych zajęć grupy (w USOS: {day}): dzień, godziny, sala albo w które dni naprawdę się odbywają - np. laboratorium tylko w tygodniach 10–14.', {
                day: midSentence(weekdayName(weekdayOf(original.start))),
              })}
        </p>

        {scope === 'series' && (
          <label className="field">
            <span className="field-label">{t('Dzień tygodnia')}</span>
            <select className="text-input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d)}
                </option>
              ))}
            </select>
          </label>
        )}

        {scope === 'single' && (
          <label className="field">
            <span className="field-label">{t('Data')}</span>
            <input className="text-input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span className="field-label">{t('Od')}</span>
            <input
              className="text-input"
              type="time"
              value={startTime}
              required
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('Do')}</span>
            <input className="text-input" type="time" value={endTime} required onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <label className="check-field">
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          {t('Zajęcia online')}
        </label>
        {!online && (
          <label className="field">
            <span className="field-label">{t('Sala')}</span>
            <input className="text-input" value={room} placeholder={t('np. 161')} onChange={(e) => setRoom(e.target.value)} />
          </label>
        )}

        {scope === 'series' && (
          <ClassDatesField draft={dates} onChange={setDates} allLabel={t('Wszystkie z USOS')} choices={seriesDates} weekOf={weekOf} />
        )}

        {scope === 'single' && (
          <label className="check-field">
            <input type="checkbox" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />
            {t('Zajęcia odwołane')}
          </label>
        )}

        <p className="hint">
          {t('W USOS:')} {scope === 'series' ? midSentence(weekdayName(weekdayOf(original.start))) + ' ' : ''}
          {formatTime(original.start)}–{formatTime(original.end)}
          {original.room && ', ' + t('s. {room}', { room: original.room })}
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
              {t('Przywróć z USOS')}
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
              {t('Przywróć grupę z USOS')}
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
