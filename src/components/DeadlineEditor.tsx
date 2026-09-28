import { useState, type FormEvent } from 'react'
import type { DeadlineDraft } from '../hooks/planUi'
import { parseDateKey } from '../lib/dates'
import { DEADLINE_KINDS, deadlineKindLabel, type Deadline, type DeadlineKind } from '../lib/extras'
import { Dialog } from './Dialog'

interface Props {
  draft: DeadlineDraft
  courseNames: string[]
  onSave: (deadline: Omit<Deadline, 'id'> & { id?: string }) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function DeadlineEditor({ draft, courseNames, onSave, onDelete, onClose }: Props) {
  const isNew = !draft.id
  const [kind, setKind] = useState<DeadlineKind>(draft.kind ?? 'kolokwium')
  const [title, setTitle] = useState(draft.title ?? '')
  const [courseName, setCourseName] = useState(draft.courseName ?? '')
  const [date, setDate] = useState(draft.date ?? '')
  const [time, setTime] = useState(draft.time ?? '')
  const [note, setNote] = useState(draft.note ?? '')
  const [done, setDone] = useState(draft.done ?? false)
  const [error, setError] = useState<string | null>(null)

  // Przedmiot spoza obecnego planu (np. z poprzedniego semestru) też zostaje na liście.
  const options = courseName && !courseNames.includes(courseName) ? [courseName, ...courseNames] : courseNames

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!parseDateKey(date)) {
      setError('Wybierz datę.')
      return
    }
    onSave({
      id: draft.id,
      kind,
      title: title.trim(),
      courseName: courseName || null,
      date,
      time: time || null,
      note: note.trim(),
      done,
    })
    onClose()
  }

  return (
    <Dialog title={isNew ? 'Nowy termin' : 'Edytuj termin'} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="segmented" role="radiogroup" aria-label="Rodzaj">
          {DEADLINE_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              className={`segment${kind === k.id ? ' is-active' : ''}`}
              onClick={() => setKind(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span className="field-label">Tytuł</span>
          <input
            className="text-input"
            value={title}
            placeholder={`np. ${deadlineKindLabel(kind)} 1`}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Przedmiot</span>
          <select className="text-input" value={courseName} onChange={(e) => setCourseName(e.target.value)}>
            <option value="">— bez przedmiotu —</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field-label">Data</span>
            <input className="text-input" type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">
              Godzina <span className="label-note">(opcjonalnie)</span>
            </span>
            <input className="text-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Notatka</span>
          <textarea
            className="text-input note-input"
            rows={3}
            value={note}
            placeholder="np. zakres materiału, sala, co przynieść"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {!isNew && (
          <label className="check-field">
            <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
            Zrobione / zaliczone
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
                if (window.confirm('Usunąć ten termin?')) {
                  onDelete(draft.id!)
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
