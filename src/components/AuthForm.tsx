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
    void run(() => (isRegister ? cloud.signUp(address, password) : cloud.signIn(address, password)))
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

      <p className="auth-switch">
        {isRegister ? 'Masz już konto? ' : 'Nie masz konta? '}
        <button
          type="button"
          className="link-button"
          onClick={() => switchMode(isRegister ? 'login' : 'register')}
          disabled={busy}
        >
          {isRegister ? 'Zaloguj się' : 'Zarejestruj się'}
        </button>
      </p>
    </form>
  )
}
