import { useEffect, useRef, useState } from 'react'

interface Props {
  id: string
  value: string // treść zapisana na koncie
  onSave: (text: string) => void
  placeholder: string
  rows?: number
  label?: string
}

const SAVE_DELAY_MS = 600

// Pole notatki zapisujące się samo chwilę po skończeniu pisania.
export function NoteField({ id, value, onSave, placeholder, rows = 3, label }: Props) {
  // null = brak lokalnych zmian, pokazujemy wersję z konta (np. zmienioną na innym urządzeniu)
  const [draft, setDraft] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<string | null>(null)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  // Konto potwierdziło naszą treść, a pole nie jest edytowane - wracamy do wersji z konta.
  if (draft !== null && !focused && draft === value) setDraft(null)

  function flush() {
    clearTimeout(timer.current)
    if (pending.current === null) return
    onSaveRef.current(pending.current)
    pending.current = null
    setStatus('saved')
  }

  // Zamknięcie karty lub przejście gdzie indziej w trakcie pisania - zapisujemy od razu.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (pending.current !== null) onSaveRef.current(pending.current)
    },
    [],
  )

  return (
    <div className="note-field">
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="text-input note-input"
        rows={rows}
        placeholder={placeholder}
        value={draft ?? value}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          flush()
        }}
        onChange={(e) => {
          const text = e.target.value
          setDraft(text)
          setStatus('saving')
          pending.current = text
          clearTimeout(timer.current)
          timer.current = setTimeout(flush, SAVE_DELAY_MS)
        }}
      />
      <span className={`note-status${status === 'saved' ? ' is-saved' : ''}`} aria-live="polite">
        {status === 'saving' ? 'Zapisywanie…' : status === 'saved' ? 'Zapisano ✓' : ''}
      </span>
    </div>
  )
}
