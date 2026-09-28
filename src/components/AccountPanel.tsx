import type { CloudApi } from '../hooks/useCloud'
import { LoginForm } from './LoginForm'

interface Props {
  cloud: CloudApi
}

export function AccountPanel({ cloud }: Props) {
  const { state, syncError } = cloud
  if (state.kind === 'disabled') return null

  return (
    <div className="panel">
      <h3 className="panel-title">Konto i synchronizacja</h3>
      {state.kind === 'loading' && <p className="muted">Łączenie…</p>}

      {state.kind === 'signedOut' && (
        <>
          <p className="hint">
            Zaloguj się, żeby ten sam plan był na telefonie i komputerze. Konto zakłada administrator
            Planera.
          </p>
          <LoginForm cloud={cloud} />
        </>
      )}

      {state.kind === 'signedIn' && (
        <>
          <p>
            Zalogowano jako <strong>{state.user.email}</strong>
          </p>
          <p className={`sync-badge${syncError ? ' is-error' : ''}`}>
            <span className="sync-dot" aria-hidden="true" />
            {syncError ?? 'Plan synchronizuje się między Twoimi urządzeniami.'}
          </p>
          <button type="button" className="button secondary" onClick={() => void cloud.signOut()}>
            Wyloguj się
          </button>
        </>
      )}
    </div>
  )
}
