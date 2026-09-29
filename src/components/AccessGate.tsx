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
      setMessage({ ok: false, text: 'Jeszcze nie widzimy potwierdzenia. Kliknij link w mailu i spróbuj ponownie.' })
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
      setMessage({ ok: true, text: `Wysłaliśmy nowy link na ${email}.` })
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    }
  }

  return (
    <>
      <div className="gate-icon" aria-hidden="true">
        ✉️
      </div>
      <h2 className="gate-title">Potwierdź swój e-mail</h2>
      <p>
        Wysłaliśmy link na <strong>{email}</strong>. Otwórz maila i kliknij link - ta strona sama to wykryje.
      </p>
      <p className="hint">
        Nie widzisz maila? Zajrzyj do spamu. Nadawca to noreply@planer-9feb3.firebaseapp.com.
      </p>
      <div className="button-row gate-actions">
        <button type="button" className="button" disabled={checking} onClick={() => void checkNow()}>
          {checking ? 'Sprawdzam…' : 'Już kliknąłem'}
        </button>
        <button type="button" className="button secondary" disabled={cooldown > 0} onClick={() => void resend()}>
          {cooldown > 0 ? `Wyślij ponownie (${cooldown} s)` : 'Wyślij link ponownie'}
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
            Sprawdzam dostęp…
          </p>
        )}

        {cloud.access === 'pending' && (
          <>
            <div className="gate-icon" aria-hidden="true">
              ⏳
            </div>
            <h2 className="gate-title">Konto utworzone ✓</h2>
            <p>
              E-mail <strong>{email}</strong> jest potwierdzony. Konto czeka teraz na zatwierdzenie przez
              administratora Planera.
            </p>
            <p className="hint">Gdy tylko je zatwierdzi, ta strona odświeży się sama - nie musisz nic robić.</p>
          </>
        )}

        {cloud.access === 'rejected' && (
          <>
            <div className="gate-icon" aria-hidden="true">
              🚫
            </div>
            <h2 className="gate-title">Brak dostępu</h2>
            <p>
              Administrator nie zatwierdził konta <strong>{email}</strong>. Jeśli to pomyłka, odezwij się do niego
              bezpośrednio.
            </p>
          </>
        )}

        {/* Błąd pokazujemy tylko, gdy utknęło sprawdzanie dostępu - na ekranie oczekiwania
            czerwony tekst sugerowałby problem, choć wszystko przebiega normalnie. */}
        {cloud.syncError && cloud.access === 'checking' && (
          <p className="hint">Nie udało się sprawdzić dostępu - spróbuję ponownie za chwilę.</p>
        )}

        <p className="gate-footer">
          Zalogowano jako <strong>{email}</strong> ·{' '}
          <button type="button" className="link-button" onClick={() => void cloud.signOut()}>
            Wyloguj
          </button>{' '}
          ·{' '}
          <button type="button" className="link-button" onClick={onHelp}>
            Pomoc i prywatność
          </button>
        </p>
      </section>
    </main>
  )
}
