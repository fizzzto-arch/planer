import { useState } from 'react'
import { t } from '../lib/i18n'

// Adres samej aplikacji (bez parametrów i podstron) - nic prywatnego nie wychodzi dalej.
function appUrl(): string {
  const base = new URL('./', window.location.href)
  return base.origin + base.pathname
}

// Udostępnianie Planera znajomym (albo sobie, np. na laptopa): na telefonie systemowe "Udostępnij",
// na komputerze - link do schowka.
export function ShareAppButton() {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = appUrl()
    const data = { title: 'Planer', text: t('Planer - czytelny plan zajęć z USOS PW i WAT'), url }
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data)
      } catch {
        // zamknięte okno udostępniania - nic się nie dzieje
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt(t('Skopiuj link do Planera:'), url)
    }
  }

  return (
    <button
      type="button"
      className={`share-app${copied ? ' is-copied' : ''}`}
      aria-label={copied ? t('Skopiowano link') : t('Udostępnij Planera')}
      title={copied ? t('Skopiowano link') : t('Udostępnij Planera')}
      onClick={() => void share()}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {/* Jak "Udostępnij" na iPhonie: strzałka w górę z kwadratu. */}
          <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16" />
        </svg>
      )}
    </button>
  )
}
