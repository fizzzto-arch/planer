import { t } from '../lib/i18n'
import { useState, type FormEvent } from 'react'
import { CUSTOM_ITEMS_MAX, DEFAULT_CUSTOM_SCALE, formatGrade, formatNumber, parsePoints, type CustomScoring } from '../lib/scoring'
import { Dialog } from './Dialog'

interface Props {
  initial: CustomScoring | null // null - nowa rozpiska
  onSave: (custom: CustomScoring) => void
  onDelete?: () => void
  onClose: () => void
}

interface Row {
  id: string
  label: string
  max: string
}

const GRADE_STEPS = [3, 3.5, 4, 4.5, 5]
const newId = () => Math.random().toString(36).slice(2, 8)

// Własna rozpiska zaliczenia: pozycje (np. "Kolokwium 1", maks. 20 pkt) i progi ocen w % punktów.
export function ScoringEditor({ initial, onSave, onDelete, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial
      ? initial.items.map((i) => ({ id: i.id, label: i.label, max: formatNumber(i.max) }))
      : [
          { id: newId(), label: t('Kolokwium 1'), max: '' },
          { id: newId(), label: t('Kolokwium 2'), max: '' },
        ],
  )
  const [scale, setScale] = useState<string[]>(() => (initial?.scale ?? DEFAULT_CUSTOM_SCALE).map(String))
  const [error, setError] = useState<string | null>(null)

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const filled = rows.filter((r) => r.label.trim() || r.max.trim())
    const items = filled.map((r) => ({ id: r.id, label: r.label.trim().slice(0, 60), max: parsePoints(r.max) }))
    if (items.length === 0) return setError(t('Dodaj co najmniej jedną pozycję.'))
    if (items.some((i) => !i.label || i.max === null || i.max <= 0))
      return setError(t('Każda pozycja potrzebuje nazwy i maksymalnej liczby punktów.'))
    const steps = scale.map((s) => parsePoints(s))
    if (steps.some((s, i) => s === null || s > 100 || (i > 0 && s <= steps[i - 1]!)))
      return setError(t('Progi ocen: liczby od 0 do 100, każdy wyższy od poprzedniego.'))
    onSave({ items: items.map((i) => ({ ...i, max: i.max! })), scale: steps.map((s) => s!) })
    onClose()
  }

  return (
    <Dialog title={initial ? t('Zmień rozpiskę') : t('Rozpiska zaliczenia')} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field-label">{t('Za co są punkty')}</span>
          <ul className="scoring-rows">
            {rows.map((row, i) => (
              <li key={row.id}>
                <input
                  className="text-input"
                  aria-label={t('Nazwa pozycji {n}', { n: i + 1 })}
                  placeholder={t('np. Laboratorium')}
                  value={row.label}
                  maxLength={60}
                  onChange={(e) => update(row.id, { label: e.target.value })}
                />
                <input
                  className="text-input scoring-max"
                  inputMode="decimal"
                  aria-label={t('Maksimum punktów, pozycja {n}', { n: i + 1 })}
                  placeholder={t('maks.')}
                  value={row.max}
                  onChange={(e) => update(row.id, { max: e.target.value })}
                />
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={t('Usuń pozycję {n}', { n: i + 1 })}
                  onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          {rows.length < CUSTOM_ITEMS_MAX && (
            <button
              type="button"
              className="button small secondary scoring-add"
              onClick={() => setRows((rs) => [...rs, { id: newId(), label: '', max: '' }])}
            >
              {t('+ Dodaj pozycję')}
            </button>
          )}
        </div>

        <div className="field">
          <span className="field-label">
            {t('Progi ocen')} <span className="label-note">{t('(% wszystkich punktów)')}</span>
          </span>
          <div className="scoring-scale">
            {GRADE_STEPS.map((grade, i) => (
              <label key={grade}>
                <span>{formatGrade(grade)}</span>
                <input
                  className="text-input"
                  inputMode="decimal"
                  aria-label={t('Próg na ocenę {grade}', { grade: formatGrade(grade) })}
                  value={scale[i]}
                  onChange={(e) => setScale((s) => s.map((v, k) => (k === i ? e.target.value : v)))}
                />
              </label>
            ))}
          </div>
          <p className="muted scoring-hint">{t('Domyślnie jak w Regulaminie Studiów PW: 3 od 51%, każda kolejna ocena co 10%.')}</p>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          {onDelete && (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                if (window.confirm(t('Usunąć rozpiskę i wpisane punkty?'))) {
                  onDelete()
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
