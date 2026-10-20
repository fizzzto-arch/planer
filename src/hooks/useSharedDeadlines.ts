import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cloud, CloudDoc } from '../lib/cloudTypes'
import { toDateKey } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import type { Deadline } from '../lib/extras'
import { parseSharedDeadline, sharedByOther, sharedFromDeadline, type SharedDeadline } from '../lib/sharedDeadlines'
import { RETRY_AFTER_MS } from './useCloud'

// Wspólne terminy (kolokwia, egzaminy pokazane innym z przedmiotu) - tylko z kontem z dostępem.
// name - podpis autora: imię ze "Wspólnych okienek" albo początek e-maila.
export function useSharedDeadlines(client: Cloud | null, uid: string | null, name: string) {
  const [raw, setRaw] = useState<{ uid: string; docs: CloudDoc[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!client || !uid) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    // Tylko nadchodzące (od dziś) - minione nie są potrzebne, a każdy dokument to odczyt z darmowego limitu.
    const unsubscribe = client.watchSharedDeadlines(
      toDateKey(new Date()),
      (docs) => {
        setRaw({ uid, docs })
        setError(null)
      },
      (message) => {
        setError(message)
        retryTimer = setTimeout(() => setRetry((n) => n + 1), RETRY_AFTER_MS)
      },
    )
    return () => {
      clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [client, uid, retry])

  const list = useMemo(
    () => (raw && raw.uid === uid ? raw.docs.flatMap((d) => parseSharedDeadline(d.id, d.data) ?? []) : []),
    [raw, uid],
  )
  const mine = useMemo(() => new Set(list.filter((s) => s.sharedBy === uid).map((s) => s.id)), [list, uid])

  const isMine = useCallback((id: string) => mine.has(id), [mine])
  const byOther = useCallback((d: Omit<Deadline, 'id'>) => (uid ? sharedByOther(list, d, uid) : null), [list, uid])

  // Po zapisie terminu: pokazany innym (bez notatki) albo - gdy już nie - cofnięty. Ten sam termin
  // pokazany wcześniej przez kogoś innego drugi raz się nie pojawia.
  const setShared = useCallback(
    (deadline: Deadline, share: boolean) => {
      if (!client || !uid) return
      const data = share && !byOther(deadline) ? sharedFromDeadline(deadline, uid, name) : null
      const task = data ? client.shareDeadline(deadline.id, data) : mine.has(deadline.id) ? client.unshareDeadline(deadline.id) : null
      task?.catch((e) => setError(errorMessage(e)))
    },
    [client, uid, name, byOther, mine],
  )

  const unshare = useCallback(
    (id: string) => {
      if (client && mine.has(id)) client.unshareDeadline(id).catch((e) => setError(errorMessage(e)))
    },
    [client, mine],
  )

  if (!client || !uid) return null
  return { list, uid, name, error, isMine, byOther, setShared, unshare }
}

export type SharedDeadlinesApi = NonNullable<ReturnType<typeof useSharedDeadlines>>
export type { SharedDeadline }
