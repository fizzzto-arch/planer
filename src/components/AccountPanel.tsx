import { t } from '../lib/i18n'
import { useState } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { AuthForm } from './AuthForm'
import { DeleteAccountDialog } from './DeleteAccountDialog'

interface Props {
  cloud: CloudApi
}

export function AccountPanel({ cloud }: Props) {
  const { state, syncError } = cloud
  const [deleting, setDeleting] = useState(false)
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
            <button type="button" className="link-button danger-link" onClick={() => setDeleting(true)}>
              {t('Usuń konto')}
            </button>
          </div>
          {deleting && <DeleteAccountDialog cloud={cloud} onClose={() => setDeleting(false)} />}
        </>
      )}
    </div>
  )
}
