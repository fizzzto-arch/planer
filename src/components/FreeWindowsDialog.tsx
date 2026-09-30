import { t } from '../lib/i18n'
import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { addDays, formatDay, formatDuration, formatTime } from '../lib/dates'
import { commonWindows, SHARE_DAYS, type BusyBlock } from '../lib/freeWindows'
import { Dialog } from './Dialog'

interface Props {
  weekStart: Date
  now: Date
  onClose: () => void
}

const SELECTED_KEY = 'planer.free-friends'

function loadSelected(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SELECTED_KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const range = (b: BusyBlock) => `${formatTime(new Date(b.start))}–${formatTime(new Date(b.end))}`

// Kiedy Ty i wybrani znajomi jesteście jednocześnie na uczelni i wolni (w oglądanym tygodniu).
export function FreeWindowsDialog({ weekStart, now, onClose }: Props) {
  const { sharedBusy, openSettings, prefs } = usePlanUi()
  const [selected, setSelected] = useState<string[]>(loadSelected)
  const { friends, myBusy, sharing, available } = sharedBusy

  const toggle = (uid: string) => {
    const next = selected.includes(uid) ? selected.filter((x) => x !== uid) : [...selected, uid]
    setSelected(next)
    try {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(next))
    } catch {
      // wybór nie zostanie zapamiętany - nic groźnego
    }
  }

  const chosen = friends.filter((f) => selected.includes(f.uid))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const people = [myBusy, ...chosen.map((f) => f.busy)]
  const beyondShared = addDays(weekStart, 0).getTime() >= addDays(now, SHARE_DAYS).getTime()

  let body
  if (!available) {
    body = <p className="empty-state">{t('Zaloguj się, żeby szukać wspólnych okienek ze znajomymi.')}</p>
  } else if (!sharing) {
    body = (
      <div className="empty-state">
        <p>
          {t('Włącz „Pokazuj znajomym, kiedy mam zajęcia” - wtedy zobaczysz godziny znajomych, którzy też to włączyli. Udostępniane są tylko godziny, bez nazw przedmiotów i sal.')}
        </p>
        <button
          type="button"
          className="button small"
          onClick={() => {
            onClose()
            openSettings()
          }}
        >
          {t('Przejdź do ustawień')}
        </button>
      </div>
    )
  } else if (friends.length === 0) {
    body = <p className="empty-state">{t('Nikt ze znajomych jeszcze nie udostępnia godzin zajęć. Daj im znać o tej opcji.')}</p>
  } else {
    body = (
      <>
        <div className="friend-chips" role="group" aria-label={t('Znajomi')}>
          {friends.map((f) => (
            <button
              key={f.uid}
              type="button"
              className={`chip${selected.includes(f.uid) ? ' is-active' : ''}`}
              aria-pressed={selected.includes(f.uid)}
              onClick={() => toggle(f.uid)}
            >
              {f.name}
            </button>
          ))}
        </div>
        {chosen.length === 0 ? (
          <p className="hint">{t('Wybierz znajomych, z którymi chcesz się spotkać.')}</p>
        ) : beyondShared ? (
          <p className="hint">{t('Znajomi udostępniają godziny na {n} dni do przodu - ten tydzień jest dalej.', { n: SHARE_DAYS })}</p>
        ) : (
          <ul className="free-days">
            {days.map((day) => {
              const result = commonWindows(people, day, prefs.gapMinutes)
              const anyone = people.some((busy) => commonWindows([busy], day, 0).everyonePresent)
              if (!anyone) return null
              const absent = [
                ...(commonWindows([myBusy], day, 0).everyonePresent ? [] : [t('Ty')]),
                ...chosen.filter((f) => !commonWindows([f.busy], day, 0).everyonePresent).map((f) => f.name),
              ]
              return (
                <li key={day.getTime()}>
                  <strong>{formatDay(day)}</strong>
                  {!result.everyonePresent ? (
                    <span className="muted">{t('Nie wszyscy są na uczelni ({names} - bez zajęć)', { names: absent.join(', ') })}</span>
                  ) : (
                    <>
                      {result.windows.length === 0 ? (
                        <span className="muted">{t('Brak wspólnych okienek')}</span>
                      ) : (
                        result.windows.map((w) => (
                          <span key={w.start} className="free-window">
                            {range(w)} <span className="muted">({formatDuration((w.end - w.start) / 60_000)})</span>
                          </span>
                        ))
                      )}
                      {result.allFreeFrom && (
                        <span className="muted">{t('Wszyscy wolni od {time}', { time: formatTime(new Date(result.allFreeFrom)) })}</span>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </>
    )
  }

  return (
    <Dialog title={t('Wspólne okienka')} onClose={onClose}>
      <div className="free-windows">
        <p className="muted small">
          {t('Chwile, gdy wszyscy jesteście na uczelni i nikt nie ma zajęć (od {n} min). Tylko godziny - bez nazw przedmiotów.', { n: prefs.gapMinutes })}
        </p>
        {body}
      </div>
    </Dialog>
  )
}
