import { useCallback, useEffect, useState } from 'react'
import type { AccessRequest, AccessStatus, Cloud } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'

// Prośby o dostęp do Planera - dla administratora (client = null dla pozostałych).
export function useAccessRequests(client: Cloud | null) {
  const [requests, setRequests] = useState<AccessRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    return client.watchAccessRequests(
      (list) => {
        setRequests(list)
        setError(null)
      },
      setError,
    )
  }, [client])

  const setStatus = useCallback(
    (uid: string, status: AccessStatus) => {
      client?.setAccessStatus(uid, status).catch((e) => setError(errorMessage(e)))
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
