// Powitanie na ekranie startowym (przed dodaniem planu): czym jest Planer, w trzech zdaniach.
import { t } from '../lib/i18n'

const FEATURES = () => ([
  {
    title: t('Plan sam się aktualizuje'),
    text: t('Raz wklejasz link z USOSweb albo kod grupy WAT - zmiany w planie pojawiają się same.'),
    icon: 'M7 3v3M17 3v3M4 8h16M5 5h14v15H5zM9 13h2M13 13h2M9 16h2',
  },
  {
    title: t('Kolokwia i przypomnienia'),
    text: t('Notatki, terminy i powiadomienia na telefonie przed kolokwium.'),
    icon: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  },
  {
    title: t('Twoje dane są Twoje'),
    text: t('Bez reklam i śledzenia. Notatki i plan widzisz tylko Ty.'),
    icon: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z',
  },
])

export function Welcome() {
  return (
    <header className="welcome view-enter">
      <img className="welcome-icon" src="icons/icon-192.png" alt="" width="64" height="64" />
      <h1 className="welcome-title">Planer</h1>
      <p className="welcome-lead">{t('Czytelny plan zajęć dla PW i WAT - w telefonie i na komputerze.')}</p>
      <ul className="welcome-features">
        {FEATURES().map((f) => (
          <li key={f.title}>
            <span className="help-fact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d={f.icon} />
              </svg>
            </span>
            <span>
              <strong>{f.title}</strong>
              <span className="muted">{f.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </header>
  )
}
