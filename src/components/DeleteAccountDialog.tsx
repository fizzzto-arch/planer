import { useState, type FormEvent } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { errorMessage } from '../lib/errors'
import { Dialog } from './Dialog'
import { PasswordField } from './PasswordField'

interface Props {
  cloud: CloudApi
  onClose: () => void
}

// Usunięcie konta: wyjaśnienie, co zniknie, i potwierdzenie hasłem.
export function DeleteAccountDialog({ cloud, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password) {
      setError('Wpisz hasło, żeby potwierdzić, że to Ty.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await cloud.deleteAccount(password) // po sukcesie strona sama się przeładuje
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dialog title="Usunąć konto?" onClose={busy ? () => undefined : onClose}>
      <form className="dialog-form" onSubmit={(e) => void handleSubmit(e)}>
        <p>Usuniemy na zawsze:</p>
        <ul className="plain-list">
          <li>konto i adres e-mail,</li>
          <li>notatki, terminy, zmiany w planie i własne zajęcia,</li>
          <li>ustawienia, kolory i przypomnienia,</li>
          <li>pliki, które udostępniłeś grupie (znikną też u innych),</li>
          <li>wszystko, co Planer zapisał na tym urządzeniu.</li>
        </ul>
        <p className="hint">
          Tego nie da się cofnąć. Jeśli chcesz coś zachować, najpierw pobierz kopię zapasową (Ustawienia → Kopia
          zapasowa). Plan w USOS nie zmienia się w żaden sposób.
        </p>
        <label className="field-label" htmlFor="delete-password">
          Hasło do Planera
        </label>
        <PasswordField id="delete-password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <button type="submit" className="button danger" disabled={busy}>
            {busy ? 'Usuwam…' : 'Usuń konto na zawsze'}
          </button>
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Anuluj
          </button>
        </div>
      </form>
    </Dialog>
  )
}
