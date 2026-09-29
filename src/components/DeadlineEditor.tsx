import { useState, type FormEvent } from 'react'
import type { DeadlineDraft } from '../hooks/planUi'
import { parseDateKey } from '../lib/dates'
import { CHECKLIST_MAX, DEADLINE_KINDS, deadlineKindLabel, type ChecklistItem, type Deadline, type DeadlineKind } from '../lib/extras'
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
  const [checklist, setChecklist] = useState<ChecklistItem[]>(draft.checklist ?? [])
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    const text = newItem.trim()
    if (!text || checklist.length >= CHECKLIST_MAX) return
    setChecklist([...checklist, { text, done: false }])
    setNewItem('')
  }
  const [error, setError] = useState<string | null>(null)

  // Przedmiot spoza obecnego planu (np. z poprzedniego semestru) też zostaje na liście.
  const options = courseName && !courseNames.includes(courseName) ? [courseName, ...courseNames] : courseNames

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!parseDateKey(date)) {
      setError('Wybierz datę.')
      return
    }
    if (!time) {
      setError('Wybierz godzinę.')
      return
    }
    onSave({
      id: draft.id,
      kind,
      title: title.trim(),
      courseName: courseName || null,
      date,
      time,
      note: note.trim(),
      done,
      checklist,
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
          <span className="field-label">
            Tytuł <span className="label-note">(opcjonalnie)</span>
          </span>
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
            <span className="field-label">Godzina</span>
            <input className="text-input" type="time" value={time} required onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">
            Notatka <span className="label-note">(opcjonalnie)</span>
          </span>
          <textarea
            className="text-input note-input"
            rows={3}
            value={note}
            placeholder="np. zakres materiału, sala, co przynieść"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field-label">
            Do przygotowania <span className="label-note">(opcjonalnie)</span>
          </span>
          {checklist.length > 0 && (
            <ul className="checklist">
              {checklist.map((item, i) => (
                <li key={i}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) =>
                        setChecklist(checklist.map((x, k) => (k === i ? { ...x, done: e.target.checked } : x)))
                      }
                    />
                    <span className={item.done ? 'is-done' : undefined}>{item.text}</span>
                  </label>
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`Usuń „${item.text}”`}
                    onClick={() => setChecklist(checklist.filter((_, k) => k !== i))}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 7l10 10M17 7 7 17" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="checklist-add">
            <input
              className="text-input"
              value={newItem}
              maxLength={200}
              placeholder="np. rozdział 3, zadania z listy 2"
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                // Enter dodaje punkt, zamiast wysyłać cały formularz.
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addItem()
                }
              }}
            />
            <button type="button" className="button small secondary" onClick={addItem} disabled={!newItem.trim()}>
              Dodaj
            </button>
          </div>
        </div>

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
