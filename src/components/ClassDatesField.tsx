import { t } from '../lib/i18n'
import { useState } from 'react'
import { MAX_DATES, draftWeeks, nthWeeklyDate, weeklyCount, type DatesDraft, type DatesMode, type WeekOf } from '../lib/classDates'
import { formatShortDay, parseDateKey } from '../lib/dates'

interface Props {
  draft: DatesDraft
  onChange: (draft: DatesDraft) => void
  allLabel: string // "Wszystkie z USOS" (grupa z USOS) albo "Jednorazowo" (własne zajęcia)
  choices?: string[] // grupa z USOS: jej terminy do odznaczania; brak - dni wybiera się z kalendarza
  weekOf: WeekOf // numer tygodnia semestru - podpowiedź parzysty/nieparzysty przy dniach
}

// Kiedy zajęcia się odbywają: wszystkie terminy (albo jednorazowo), co tydzień od-do (z tygodniami
// parzystymi/nieparzystymi) albo wybrane dni.
export function ClassDatesField({ draft, onChange, allLabel, choices, weekOf }: Props) {
  const [picked, setPicked] = useState('')
  // Liczba zajęć w trakcie wpisywania (puste pole nie może od razu wrócić do wyliczonej liczby).
  const [countText, setCountText] = useState<string | null>(null)
  const set = (patch: Partial<DatesDraft>) => {
    const next = { ...draft, ...patch }
    // Wpisana liczba zajęć: koniec liczy się od nowa po zmianie początku albo tygodni.
    const to = next.count ? nthWeeklyDate(next.from, next.count, draftWeeks(next), weekOf) : null
    onChange(to ? { ...next, to } : next)
  }
  const count = weeklyCount(draft.from, draft.to, draftWeeks(draft), weekOf)
  const modes: { id: DatesMode; label: string }[] = [
    { id: 'all', label: allLabel },
    { id: 'range', label: t('Co tydzień od–do') },
    { id: 'dates', label: t('Wybrane dni') },
  ]
  const dayLabel = (key: string) => {
    const day = parseDateKey(key)
    if (!day) return key
    const week = weekOf(day)
    return week === null ? formatShortDay(day) : `${formatShortDay(day)} · ${t('tydzień {n}', { n: week })}`
  }

  return (
    <div className="field class-dates">
      <span className="field-label">{t('Kiedy się odbywają')}</span>
      <div className="segmented class-dates-modes" role="radiogroup" aria-label={t('Kiedy się odbywają')}>
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={draft.mode === m.id}
            className={`segment${draft.mode === m.id ? ' is-active' : ''}`}
            onClick={() => set({ mode: m.id, dates: m.id === 'dates' && choices && draft.dates.length === 0 ? choices : draft.dates })}
          >
            {m.label}
          </button>
        ))}
      </div>

      {draft.mode === 'range' && (
        <>
          <div className="field-row">
            <label className="field">
              <span className="field-label">{t('Od dnia')}</span>
              <input className="text-input" type="date" value={draft.from} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">{t('Do dnia (włącznie)')}</span>
              <input className="text-input" type="date" value={draft.to} onChange={(e) => set({ to: e.target.value, count: null })} />
            </label>
          </div>
          <label className="field class-dates-count">
            <span className="field-label">
              {t('Liczba zajęć')} <span className="label-note">{t('(koniec policzy się sam)')}</span>
            </span>
            <input
              className="text-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_DATES}
              value={countText ?? (count > 0 ? String(count) : '')}
              onChange={(e) => {
                setCountText(e.target.value)
                const n = Number(e.target.value)
                if (Number.isInteger(n) && n >= 1 && n <= MAX_DATES) set({ count: n })
              }}
              onBlur={() => setCountText(null)}
            />
          </label>
          <div className="class-dates-parity">
            <label className="check-field">
              <input type="checkbox" checked={draft.odd} onChange={(e) => set({ odd: e.target.checked })} />
              {t('Tygodnie nieparzyste')}
            </label>
            <label className="check-field">
              <input type="checkbox" checked={draft.even} onChange={(e) => set({ even: e.target.checked })} />
              {t('Tygodnie parzyste')}
            </label>
          </div>
        </>
      )}

      {draft.mode === 'dates' && choices && (
        // Grupa z USOS: odznacz terminy, na które nie chodzisz.
        <ul className="class-dates-list">
          {choices.map((key) => (
            <li key={key}>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={draft.dates.includes(key)}
                  onChange={(e) =>
                    set({ dates: e.target.checked ? [...draft.dates, key].sort() : draft.dates.filter((d) => d !== key) })
                  }
                />
                {dayLabel(key)}
              </label>
            </li>
          ))}
        </ul>
      )}

      {draft.mode === 'dates' && !choices && (
        // Własne zajęcia: dni z kalendarza.
        <>
          <div className="class-dates-add">
            <input
              className="text-input"
              type="date"
              aria-label={t('Dzień zajęć')}
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
            />
            <button
              type="button"
              className="button small secondary"
              disabled={!parseDateKey(picked) || draft.dates.includes(picked) || draft.dates.length >= MAX_DATES}
              onClick={() => {
                set({ dates: [...draft.dates, picked].sort() })
                setPicked('')
              }}
            >
              {t('Dodaj dzień')}
            </button>
          </div>
          {draft.dates.length > 0 && (
            <ul className="class-dates-chips">
              {draft.dates.map((key) => (
                <li key={key}>
                  {dayLabel(key)}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={t('Usuń dzień {day}', { day: dayLabel(key) })}
                    onClick={() => set({ dates: draft.dates.filter((d) => d !== key) })}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

