import { t } from '../lib/i18n'
import { useState, type FormEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import type { OptimizerSettingsApi } from '../hooks/useOptimizerSettings'
import type { DayStyle, Slot, Weights } from '../lib/optimizer'
import { describeOption, weekdayShort } from '../lib/optimizerSettings'
import { plural } from '../lib/plural'
import { typeLabel } from '../lib/usos'
import { ChoiceSetting } from './SettingControls'

const WEIGHT_OPTIONS = () => ([
  { value: 0, label: t('Nieważne') },
  { value: 1, label: t('Trochę') },
  { value: 2, label: t('Ważne') },
  { value: 3, label: t('Bardzo') },
])

const DAY_STYLE_OPTIONS = (): { value: DayStyle; label: string }[] => ([
  { value: 'window', label: t('W wybranych godzinach') },
  { value: 'early', label: t('Jak najwcześniej') },
])

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
      setError(t('Koniec musi być po początku.'))
      return
    }
    setError(null)
    const id = Math.random().toString(36).slice(2, 10)
    update({ blocked: [...settings.blocked, { id, weekday, from, to }] })
  }

  return (
    <div className="opt-block">
      <h4 className="material-heading">{t('Zablokowane godziny')}</h4>
      <p className="setting-hint">{t('Np. praca albo trening - plany z zajęciami w tym czasie nie będą proponowane.')}</p>
      {settings.blocked.length > 0 && (
        <ul className="chip-list">
          {settings.blocked.map((b) => (
            <li key={b.id} className="chip">
              {weekdayShort(b.weekday - 1)} {b.from}–{b.to}
              <button
                type="button"
                className="chip-remove"
                aria-label={t('Usuń blokadę')}
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
        <select className="text-input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} aria-label={t('Dzień')}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <option key={i} value={i + 1}>
              {weekdayShort(i)}
            </option>
          ))}
        </select>
        <input className="text-input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('Od')} />
        <input className="text-input" type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('Do')} />
        <button type="submit" className="button small secondary">
          {t('Dodaj')}
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
      <h4 className="material-heading">{t('Zajęcia z wyborem grup')}</h4>
      <p className="setting-hint">{t('Przypnij grupę, której nie chcesz zmieniać (np. jesteś w niej ze znajomymi).')}</p>
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
                  {t('teraz gr. {n} ({when})', { n: current.groupNumber, when: describeOption(current) })} ·{' '}
                  {t('{count} {groups} do wyboru', {
                    count: slot.options.length,
                    groups: plural(slot.options.length, 'grupa', 'grupy', 'grup'),
                  })}
                </span>
              </span>
              <button
                type="button"
                className={`button small ${isPinned ? '' : 'secondary'}`}
                aria-pressed={isPinned}
                onClick={() => togglePin(slot)}
              >
                {isPinned ? t('Przypięta') : t('Przypnij')}
              </button>
            </li>
          )
        })}
        {choosable.length === 0 && <li className="muted small">{t('Żadne zajęcia nie mają kilku grup do wyboru.')}</li>}
      </ul>
    </div>
  )
}

export function OptimizerSettingsPanel({ api, slots }: Props) {
  const { settings, update } = api
  const setWeight = (key: keyof Weights, value: number) => update({ weights: { ...settings.weights, [key]: value } })

  return (
    <div className="panel">
      <h3 className="panel-title">{t('Co jest dla Ciebie ważne')}</h3>
      <ChoiceSetting
        label={t('Mało okienek')}
        value={settings.weights.gaps}
        options={WEIGHT_OPTIONS()}
        onChange={(v) => setWeight('gaps', v)}
      />
      <ChoiceSetting
        label={t('Mniej dni na uczelni')}
        value={settings.weights.days}
        options={WEIGHT_OPTIONS()}
        onChange={(v) => setWeight('days', v)}
      />
      <ChoiceSetting
        label={t('Pora zajęć')}
        hint={
          settings.dayStyle === 'early'
            ? t('Wcześniej zaczynam, wcześniej kończę - zajęcia rano, wolne popołudnia.')
            : t('Późniejszy start i wczesny koniec - granice ustawiasz niżej.')
        }
        value={settings.dayStyle}
        options={DAY_STYLE_OPTIONS()}
        onChange={(dayStyle) => update({ dayStyle })}
      />
      {settings.dayStyle === 'early' ? (
        <ChoiceSetting
          label={t('Kończyć jak najwcześniej')}
          hint={t('Liczy się, o której kończysz każdego dnia.')}
          value={settings.weights.finish}
          options={WEIGHT_OPTIONS()}
          onChange={(v) => setWeight('finish', v)}
        />
      ) : (
        <>
          <ChoiceSetting
            label={t('Bez zajęć wcześnie rano')}
            hint={
              <label className="inline-time">
                {t('przed')}{' '}
                <input
                  type="time"
                  className="text-input"
                  value={settings.startAfter}
                  onChange={(e) => e.target.value && update({ startAfter: e.target.value })}
                />
              </label>
            }
            value={settings.weights.early}
            options={WEIGHT_OPTIONS()}
            onChange={(v) => setWeight('early', v)}
          />
          <ChoiceSetting
            label={t('Bez zajęć późno')}
            hint={
              <label className="inline-time">
                {t('po')}{' '}
                <input
                  type="time"
                  className="text-input"
                  value={settings.endBefore}
                  onChange={(e) => e.target.value && update({ endBefore: e.target.value })}
                />
              </label>
            }
            value={settings.weights.late}
            options={WEIGHT_OPTIONS()}
            onChange={(v) => setWeight('late', v)}
          />
        </>
      )}
      <BlockedTimes api={api} />
      <PinnedGroups api={api} slots={slots} />
    </div>
  )
}
