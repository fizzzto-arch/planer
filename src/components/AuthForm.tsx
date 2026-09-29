import { useState, type FormEvent } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { errorMessage } from '../lib/errors'
import { PasswordField } from './PasswordField'

interface Props {
  cloud: CloudApi
}

type Mode = 'login' | 'register'

const MIN_PASSWORD_LENGTH = 6

export function AuthForm({ cloud }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isRegister = mode === 'register'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await task()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`)
      return
    }
    void run(() => (isRegister ? cloud.signUp(address, password, remember) : cloud.signIn(address, password, remember)))
  }

  function handleReset() {
    if (!email.trim()) {
      setError('Wpisz najpierw swój e-mail, wyślemy na niego link do ustawienia hasła.')
      return
    }
    void run(async () => {
      await cloud.resetPassword(email.trim())
      setInfo('Jeśli to konto istnieje, na podany e-mail przyszedł link do ustawienia nowego hasła.')
    })
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {/* Logowanie / rejestracja jak przełącznik w iOS - od razu widać, że są dwie drogi. */}
      <div className="segmented auth-mode" role="tablist" aria-label="Logowanie albo rejestracja">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`segment${mode === m ? ' is-active' : ''}`}
            onClick={() => switchMode(m)}
            disabled={busy}
          >
            {m === 'login' ? 'Logowanie' : 'Nowe konto'}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="auth-email">
        E-mail
      </label>
      <input
        id="auth-email"
        className="text-input"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className="field-label" htmlFor="auth-password">
        Hasło
        {isRegister && <span className="label-note"> (min. {MIN_PASSWORD_LENGTH} znaków)</span>}
      </label>
      <PasswordField
        id="auth-password"
        value={password}
        onChange={setPassword}
        autoComplete={isRegister ? 'new-password' : 'current-password'}
      />

      <label className="check-row remember-row">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>
          Zapamiętaj mnie na tym urządzeniu
          <span className="setting-hint">
            {remember
              ? 'Zostaniesz zalogowany także po zamknięciu przeglądarki.'
              : 'Na cudzym komputerze: po zamknięciu przeglądarki Planer wyloguje Cię i usunie stąd Twoje dane.'}
          </span>
        </span>
      </label>

      {isRegister && (
        <p className="hint">
          Po rejestracji potwierdzisz e-mail linkiem, a administrator Planera zatwierdzi konto.
        </p>
      )}

      <div className="button-row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Chwila…' : isRegister ? 'Załóż konto' : 'Zaloguj się'}
        </button>
        {!isRegister && (
          <button type="button" className="link-button" onClick={handleReset} disabled={busy}>
            Nie pamiętam hasła
          </button>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {info && <p className="success">{info}</p>}

    </form>
  )
}
