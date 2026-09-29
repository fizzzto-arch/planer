import { useSyncExternalStore } from 'react'
import type { AccessRequestsApi } from '../hooks/useAccessRequests'
import type { AccessRequest } from '../lib/cloudTypes'
import { formatUpdatedAt } from '../lib/dates'
import { setSwipeDebug, swipeDebugStore } from '../lib/swipeDebug'
import { SwitchSetting } from './SettingControls'

interface Props {
  admin: AccessRequestsApi
  now: Date
}

const STATUS_ORDER = { pending: 0, approved: 1, rejected: 2 } as const

function RequestRow({ request, admin, now }: { request: AccessRequest } & Props) {
  const { uid, email, status, requestedAt } = request
  return (
    <li className={`access-row is-${status}`}>
      <span className="access-main">
        <span className="access-email">{email}</span>
        <span className="access-meta">
          {status === 'pending' ? 'czeka na zatwierdzenie' : status === 'approved' ? 'ma dostęp' : 'odrzucone'}
          {requestedAt && ` · zgłoszenie ${formatUpdatedAt(new Date(requestedAt), now)}`}
        </span>
      </span>
      <span className="access-actions">
        {status !== 'approved' && (
          <button type="button" className="button small" onClick={() => admin.setStatus(uid, 'approved')}>
            Zatwierdź
          </button>
        )}
        {status === 'pending' && (
          <button type="button" className="button small secondary" onClick={() => admin.setStatus(uid, 'rejected')}>
            Odrzuć
          </button>
        )}
        {status === 'approved' && (
          <button
            type="button"
            className="button small danger"
            onClick={() => {
              if (window.confirm(`Cofnąć dostęp dla ${email}? Straci synchronizację i wspólne materiały.`)) {
                admin.setStatus(uid, 'rejected')
              }
            }}
          >
            Cofnij dostęp
          </button>
        )}
      </span>
    </li>
  )
}

// Zatwierdzanie nowych kont - widoczne tylko dla administratora.
export function AdminPanel({ admin, now }: Props) {
  const debugGestures = useSyncExternalStore(swipeDebugStore.subscribe, swipeDebugStore.enabled)
  const sorted = [...admin.requests].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.email.localeCompare(b.email),
  )

  return (
    <div className="panel">
      <h3 className="panel-title">
        Dostęp do Planera
        {admin.pendingCount > 0 && <span className="count-pill">{admin.pendingCount}</span>}
      </h3>
      <p className="hint">
        Nowe konta pojawiają się tu po potwierdzeniu e-maila. Dostęp do synchronizacji i wspólnych materiałów mają
        tylko zatwierdzone.
      </p>
      {admin.error ? (
        <p className="error">{admin.error}</p>
      ) : !admin.loaded ? (
        <p className="muted loading-line">
          <span className="spinner" aria-hidden="true" />
          Ładowanie…
        </p>
      ) : sorted.length === 0 ? (
        <p className="muted">Nikt jeszcze nie prosił o dostęp.</p>
      ) : (
        <ul className="access-list">
          {sorted.map((r) => (
            <RequestRow key={r.uid} request={r} admin={admin} now={now} />
          ))}
        </ul>
      )}
      <SwitchSetting
        label="Diagnostyka gestów"
        hint="Pokazuje na dole ekranu, co telefon wysyła przy przesuwaniu palcem. Tylko na tym urządzeniu."
        checked={debugGestures}
        onChange={setSwipeDebug}
      />
    </div>
  )
}
