import { useState, type FormEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import type { OptimizerSettingsApi } from '../hooks/useOptimizerSettings'
import type { Slot, Weights } from '../lib/optimizer'
import { WEEKDAYS, describeOption } from '../lib/optimizerSettings'
import { plural } from '../lib/plural'
import { typeLabel } from '../lib/usos'
import { ChoiceSetting } from './SettingControls'

const WEIGHT_OPTIONS = [
  { value: 0, label: 'Nieważne' },
  { value: 1, label: 'Trochę' },
  { value: 2, label: 'Ważne' },
  { value: 3, label: 'Bardzo' },
]

interface Props {
  api: OptimizerSettingsApi
  slots: Slot[]
}

function BlockedTimes({ api }: Pick<Props, 'api'>) {
  const { settings, update } = api
  const [weekday, setWeekday] = useState(1)
  const [from, setFrom] = useState('15:00')
  const [to, setTo] = useState('20:00')
  const [error, setError] = useState<string | null>(null)

  function add(e: FormEvent) {
    e.preventDefault()
    if (!from || !to || to <= from) {
      setError('Koniec musi być po początku.')
      return
    }
    setError(null)
    const id = Math.random().toString(36).slice(2, 10)
    update({ blocked: [...settings.blocked, { id, weekday, from, to }] })
  }

  return (
    <div className="opt-block">
      <h4 className="material-heading">Zablokowane godziny</h4>
      <p className="setting-hint">Np. praca albo trening - plany z zajęciami w tym czasie nie będą proponowane.</p>
      {settings.blocked.length > 0 && (
        <ul className="chip-list">
          {settings.blocked.map((b) => (
            <li key={b.id} className="chip">
              {WEEKDAYS[b.weekday - 1]} {b.from}–{b.to}
              <button
                type="button"
                className="chip-remove"
                aria-label="Usuń blokadę"
                onClick={() => update({ blocked: settings.blocked.filter((x) => x.id !== b.id) })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 7l10 10M17 7 7 17" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="blocked-form" onSubmit={add}>
        <select className="text-input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} aria-label="Dzień">
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </select>
        <input className="text-input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Od" />
        <input className="text-input" type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Do" />
        <button type="submit" className="button small secondary">
          Dodaj
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

function PinnedGroups({ api, slots }: Props) {
  const { settings, update } = api
  const { displayName } = usePlanUi()
  const choosable = slots.filter((s) => s.options.length > 1 && s.currentIndex !== null)

  function togglePin(slot: Slot) {
    const pinned = { ...settings.pinned }
    if (pinned[slot.id] !== undefined) delete pinned[slot.id]
    else pinned[slot.id] = slot.options[slot.currentIndex!].groupNumber
    update({ pinned })
  }

  return (
    <div className="opt-block">
      <h4 className="material-heading">Zajęcia z wyborem grup</h4>
      <p className="setting-hint">Przypnij grupę, której nie chcesz zmieniać (np. jesteś w niej ze znajomymi).</p>
      <ul className="pin-list">
        {choosable.map((slot) => {
          const current = slot.options[slot.currentIndex!]
          const isPinned = settings.pinned[slot.id] !== undefined
          return (
            <li key={slot.id} className="pin-row">
              <span className="pin-main">
                <span className="pin-name">
                  {displayName(slot.courseName)} · {typeLabel(slot.classType)}
                </span>
                <span className="setting-hint">
                  teraz gr. {current.groupNumber} ({describeOption(current)}) · {slot.options.length}{' '}
                  {plural(slot.options.length, 'grupa', 'grupy', 'grup')} do wyboru
                </span>
              </span>
              <button
                type="button"
                className={`button small ${isPinned ? '' : 'secondary'}`}
                aria-pressed={isPinned}
                onClick={() => togglePin(slot)}
              >
                {isPinned ? 'Przypięta' : 'Przypnij'}
              </button>
            </li>
          )
        })}
        {choosable.length === 0 && <li className="muted small">Żadne zajęcia nie mają kilku grup do wyboru.</li>}
      </ul>
    </div>
  )
}

export function OptimizerSettingsPanel({ api, slots }: Props) {
  const { settings, update } = api
  const setWeight = (key: keyof Weights, value: number) => update({ weights: { ...settings.weights, [key]: value } })

  return (
    <div className="panel">
      <h3 className="panel-title">Co jest dla Ciebie ważne</h3>
      <ChoiceSetting
        label="Mało okienek"
        value={settings.weights.gaps}
        options={WEIGHT_OPTIONS}
        onChange={(v) => setWeight('gaps', v)}
      />
      <ChoiceSetting
        label="Mniej dni na uczelni"
        value={settings.weights.days}
        options={WEIGHT_OPTIONS}
        onChange={(v) => setWeight('days', v)}
      />
      <ChoiceSetting
        label="Bez zajęć wcześnie rano"
        hint={
          <label className="inline-time">
            przed{' '}
            <input
              type="time"
              className="text-input"
              value={settings.startAfter}
              onChange={(e) => e.target.value && update({ startAfter: e.target.value })}
            />
          </label>
        }
        value={settings.weights.early}
        options={WEIGHT_OPTIONS}
        onChange={(v) => setWeight('early', v)}
      />
      <ChoiceSetting
        label="Bez zajęć późno"
        hint={
          <label className="inline-time">
            po{' '}
            <input
              type="time"
              className="text-input"
              value={settings.endBefore}
              onChange={(e) => e.target.value && update({ endBefore: e.target.value })}
            />
          </label>
        }
        value={settings.weights.late}
        options={WEIGHT_OPTIONS}
        onChange={(v) => setWeight('late', v)}
      />
      <BlockedTimes api={api} />
      <PinnedGroups api={api} slots={slots} />
    </div>
  )
}
