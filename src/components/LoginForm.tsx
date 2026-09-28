import { useState, type FormEvent } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { errorMessage } from '../lib/errors'

interface Props {
  cloud: CloudApi
}

export function LoginForm({ cloud }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

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
    void run(() => cloud.signIn(email.trim(), password))
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
      <label className="field-label" htmlFor="login-email">
        E-mail
      </label>
      <input
        id="login-email"
        className="text-input"
        type="email"
        autoComplete="username"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="field-label" htmlFor="login-password">
        Hasło
      </label>
      <input
        id="login-password"
        className="text-input"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="button-row">
        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Chwila…' : 'Zaloguj się'}
        </button>
        <button type="button" className="link-button" onClick={handleReset} disabled={busy}>
          Nie pamiętam hasła
        </button>
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
