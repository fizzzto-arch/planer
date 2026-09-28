import { useCallback, useEffect, useState } from 'react'
import type { AccessRequest, AccessStatus, Cloud } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import { RETRY_AFTER_MS } from './useCloud'

const LOAD_ERROR =
  'Nie udało się wczytać listy kont. Sprawdź, czy reguły w Firebase są aktualne - spróbuję ponownie za chwilę.'

// Prośby o dostęp do Planera - dla administratora (client = null dla pozostałych).
export function useAccessRequests(client: Cloud | null) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!client) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = client.watchAccessRequests(
      (list) => {
        setRequests(list)
        setError(null)
      },
      () => {
        // Firebase kończy nasłuch po błędzie (np. stare reguły) - zakładamy go ponownie.
        setError(LOAD_ERROR)
        retryTimer = setTimeout(() => setRetry((n) => n + 1), RETRY_AFTER_MS)
      },
    )
    return () => {
      clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [client, retry])

  const setStatus = useCallback(
    (uid: string, status: AccessStatus) => {
      client?.setAccessStatus(uid, status).catch((e) => setError(`Nie udało się zmienić dostępu: ${errorMessage(e)}`))
    },
    [client],
  )

  if (!client) return null
  const list = requests ?? []
  return {
    requests: list,
    loaded: requests !== null,
    pendingCount: list.filter((r) => r.status === 'pending').length,
    error,
    setStatus,
  }
}

export type AccessRequestsApi = NonNullable<ReturnType<typeof useAccessRequests>>
