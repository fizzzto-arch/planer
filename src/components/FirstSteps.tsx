import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { isIos, isStandalone } from '../lib/push'

const HIDDEN_KEY = 'planer.first-steps-hidden'

function loadHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

interface Step {
  id: string
  title: string
  hint: string
  done: boolean
  action?: { label: string; run: () => void }
}

// "Pierwsze kroki" na ekranie Dziś - dla nowej osoby, żeby nie została z pustą aplikacją.
// Kroki odhaczają się same; karta znika, gdy wszystko zrobione albo po "Ukryj".
export function FirstSteps() {
  const { extras, editDeadline, openSettings } = usePlanUi()
  const [hidden, setHidden] = useState(loadHidden)
  if (!extras || hidden) return null

  const phone = window.matchMedia('(pointer: coarse)').matches
  const notificationsOn = 'Notification' in window && Notification.permission === 'granted'
  const steps: Step[] = [
    { id: 'plan', title: 'Plan z USOS', hint: 'Gotowe - będzie aktualizował się sam.', done: true },
    ...(phone
      ? [
          {
            id: 'home',
            title: 'Planer na ekranie telefonu',
            hint: isIos()
              ? 'W Safari: Udostępnij → „Do ekranu początkowego”. Otwiera się wtedy jak aplikacja.'
              : 'W Chrome: menu ⋮ → „Zainstaluj aplikację”.',
            done: isStandalone(),
          },
        ]
      : []),
    {
      id: 'reminders',
      title: 'Przypomnienia o kolokwiach',
      hint: 'Powiadomienie tydzień i dzień przed terminem.',
      done: notificationsOn,
      action: { label: 'Włącz', run: openSettings },
    },
    {
      id: 'deadline',
      title: 'Pierwszy termin',
      hint: 'Dodaj kolokwium, egzamin albo oddanie projektu.',
      done: extras.extras.deadlines.length > 0,
      action: { label: 'Dodaj', run: () => editDeadline({}) },
    },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return null

  const hide = () => {
    setHidden(true)
    try {
      localStorage.setItem(HIDDEN_KEY, '1')
    } catch {
      // bez zapisu - karta wróci po odświeżeniu
    }
  }

  return (
    <div className="panel first-steps">
      <div className="section-head">
        <h3 className="panel-title">
          Pierwsze kroki{' '}
          <span className="muted first-steps-count">
            {doneCount} z {steps.length}
          </span>
        </h3>
        <button type="button" className="link-button" onClick={hide}>
          Ukryj
        </button>
      </div>
      <ol className="first-steps-list">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? 'is-done' : undefined}>
            <span className="first-steps-check" aria-hidden="true">
              {s.done && (
                <svg viewBox="0 0 24 24">
                  <path d="m6 12 4 4 8-8" />
                </svg>
              )}
            </span>
            <span className="first-steps-text">
              <strong>{s.title}</strong>
              {!s.done && <span className="muted">{s.hint}</span>}
            </span>
            {!s.done && s.action && (
              <button type="button" className="button small secondary" onClick={s.action.run}>
                {s.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
