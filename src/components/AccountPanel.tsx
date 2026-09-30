import { t } from '../lib/i18n'
import { useState } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { errorMessage } from '../lib/errors'
import { AuthForm } from './AuthForm'
import { DeleteAccountDialog } from './DeleteAccountDialog'

interface Props {
  cloud: CloudApi
}

export function AccountPanel({ cloud }: Props) {
  const { state, syncError } = cloud
  const [deleting, setDeleting] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null)
  if (state.kind === 'disabled') return null

  return (
    <div className="panel">
      <h3 className="panel-title">{t('Konto i synchronizacja')}</h3>
      {state.kind === 'loading' && <p className="muted">{t('Łączenie…')}</p>}

      {state.kind === 'signedOut' && (
        <>
          <p className="hint">
            {t('Zaloguj się albo załóż konto, żeby ten sam plan był na telefonie i komputerze.')}
          </p>
          <AuthForm cloud={cloud} />
        </>
      )}

      {state.kind === 'signedIn' && (
        <>
          <p>
            {t('Zalogowano jako')} <strong>{state.user.email}</strong>
          </p>
          <p className={`sync-badge${syncError ? ' is-error' : ''}`}>
            <span className="sync-dot" aria-hidden="true" />
            {syncError ?? t('Plan synchronizuje się między Twoimi urządzeniami.')}
          </p>
          <div className="account-actions">
            <button type="button" className="button secondary" onClick={() => void cloud.signOut()}>
              {t('Wyloguj się')}
            </button>
            {/* Nowe hasło przez link w mailu - tak samo jak "Nie pamiętam hasła", bez podawania starego. */}
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const email = state.user.email
                if (!email) return
                cloud
                  .resetPassword(email)
                  .then(() =>
                    setPasswordMessage({
                      ok: true,
                      text: t('Wysłaliśmy na {email} link do ustawienia nowego hasła. Nie widzisz maila? Zajrzyj do spamu.', { email }),
                    }),
                  )
                  .catch((e) => setPasswordMessage({ ok: false, text: errorMessage(e) }))
              }}
            >
              {t('Zmień hasło')}
            </button>
            <button type="button" className="link-button danger-link" onClick={() => setDeleting(true)}>
              {t('Usuń konto')}
            </button>
          </div>
          {passwordMessage && (
            <p className={passwordMessage.ok ? 'success' : 'error'} role="status">
              {passwordMessage.text}
            </p>
          )}
          {deleting && <DeleteAccountDialog cloud={cloud} onClose={() => setDeleting(false)} />}
        </>
      )}
    </div>
  )
}
