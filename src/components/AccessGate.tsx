import { tx } from '../lib/i18nReact'
import { t } from '../lib/i18n'
import { useEffect, useState } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { errorMessage } from '../lib/errors'

interface Props {
  cloud: CloudApi
  onHelp: () => void
}

// Co ile sprawdzamy, czy użytkownik kliknął już link w mailu.
const VERIFY_POLL_MS = 5_000
// Ile trzeba odczekać, zanim da się wysłać link ponownie.
const RESEND_COOLDOWN_S = 60

function VerifyEmail({ cloud, email }: Pick<Props, 'cloud'> & { email: string }) {
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const { refreshUser, sendVerificationEmail } = cloud

  // Strona sama wykrywa kliknięcie linku: co kilka sekund i po powrocie do karty.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'visible') refreshUser().catch(() => {})
    }
    const id = setInterval(check, VERIFY_POLL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [refreshUser])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function checkNow() {
    setChecking(true)
    setMessage(null)
    try {
      await refreshUser()
      // Jeśli potwierdzenie przyszło, ten ekran zniknie sam; jeśli nie - podpowiadamy.
      setMessage({ ok: false, text: t('Jeszcze nie widzimy potwierdzenia. Kliknij link w mailu i spróbuj ponownie.') })
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    } finally {
      setChecking(false)
    }
  }

  async function resend() {
    setMessage(null)
    try {
      await sendVerificationEmail()
      setCooldown(RESEND_COOLDOWN_S)
      setMessage({ ok: true, text: t('Wysłaliśmy nowy link na {email}.', { email }) })
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    }
  }

  return (
    <>
      <div className="gate-icon" aria-hidden="true">
        ✉️
      </div>
      <h2 className="gate-title">{t('Potwierdź swój e-mail')}</h2>
      <p>
        {tx('Wysłaliśmy link na {email}. Otwórz maila i kliknij link - ta strona sama to wykryje.', { email: <strong>{email}</strong> })}
      </p>
      <p className="hint">
        {t('Nie widzisz maila? Zajrzyj do spamu. Nadawca to noreply@planer-9feb3.firebaseapp.com.')}
      </p>
      <div className="button-row gate-actions">
        <button type="button" className="button" disabled={checking} onClick={() => void checkNow()}>
          {checking ? t('Sprawdzam…') : t('Już kliknąłem')}
        </button>
        <button type="button" className="button secondary" disabled={cooldown > 0} onClick={() => void resend()}>
          {cooldown > 0 ? t('Wyślij ponownie ({cooldown} s)', { cooldown }) : t('Wyślij link ponownie')}
        </button>
      </div>
      {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}
    </>
  )
}

// Ekran dla zalogowanego konta bez dostępu (niepotwierdzony e-mail, czeka na zatwierdzenie, odrzucone).
export function AccessGate({ cloud, onHelp }: Props) {
  const email = cloud.state.kind === 'signedIn' ? (cloud.state.user.email ?? '') : ''

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="brand">Planer</h1>
      </header>
      <section className="panel gate view-enter">
        {cloud.access === 'unverified' && <VerifyEmail cloud={cloud} email={email} />}

        {cloud.access === 'checking' && (
          <p className="muted loading-line">
            <span className="spinner" aria-hidden="true" />
            {t('Sprawdzam dostęp…')}
          </p>
        )}

        {cloud.access === 'pending' && (
          <>
            <div className="gate-icon" aria-hidden="true">
              ⏳
            </div>
            <h2 className="gate-title">{t('Konto utworzone ✓')}</h2>
            <p>
              {tx('E-mail {email} jest potwierdzony. Konto czeka teraz na zatwierdzenie przez administratora Planera.', { email: <strong>{email}</strong> })}
            </p>
            {cloud.accessRequestError ? (
              <p className="hint">
                {t('Nie udało się jeszcze wysłać prośby do administratora ({error}). Ponawiam automatycznie - możesz też odświeżyć stronę.', { error: cloud.accessRequestError })}
              </p>
            ) : (
              <p className="hint">{t('Gdy tylko je zatwierdzi, ta strona odświeży się sama - nie musisz nic robić.')}</p>
            )}
          </>
        )}

        {cloud.access === 'rejected' && (
          <>
            <div className="gate-icon" aria-hidden="true">
              🚫
            </div>
            <h2 className="gate-title">{t('Brak dostępu')}</h2>
            <p>
              {tx('Administrator nie zatwierdził konta {email}. Jeśli to pomyłka, odezwij się do niego bezpośrednio.', { email: <strong>{email}</strong> })}
            </p>
          </>
        )}

        {/* Błąd pokazujemy tylko, gdy utknęło sprawdzanie dostępu - na ekranie oczekiwania
            czerwony tekst sugerowałby problem, choć wszystko przebiega normalnie. */}
        {cloud.syncError && cloud.access === 'checking' && (
          <p className="hint">{t('Nie udało się sprawdzić dostępu - spróbuję ponownie za chwilę.')}</p>
        )}

        <p className="gate-footer">
          {t('Zalogowano jako')} <strong>{email}</strong> ·{' '}
          <button type="button" className="link-button" onClick={() => void cloud.signOut()}>
            {t('Wyloguj')}
          </button>{' '}
          ·{' '}
          <button type="button" className="link-button" onClick={onHelp}>
            {t('Pomoc i prywatność')}
          </button>
        </p>
      </section>
    </main>
  )
}
