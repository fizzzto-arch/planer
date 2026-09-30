import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import type { Slot } from '../lib/optimizer'
import type { Meeting } from '../lib/usos'
import {
  fetchSlots,
  loadCachedSlots,
  saveCachedSlots,
  slotsCacheKey,
  type GroupsProgress,
} from '../lib/usosGroups'

type Status =
  | { kind: 'loading'; progress: GroupsProgress | null }
  | { kind: 'ready' }
  | { kind: 'error'; message: string }

// Plany wszystkich grup dla przedmiotów z planu - z pamięci (młodsze niż maxAgeMs) albo świeżo z USOS.
export function useGroupOptions(meetings: Meeting[], maxAgeMs: number) {
  const key = slotsCacheKey(meetings)
  const [data, setData] = useState<{ key: string; slots: Slot[]; fetchedAt: number } | null>(() => {
    const cached = loadCachedSlots(key)
    return cached ? { key, ...cached } : null
  })
  const [progress, setProgress] = useState<GroupsProgress | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const [reload, setReload] = useState(0)

  const current = data && data.key === key ? data : null
  const fetchedAt = current?.fetchedAt ?? null

  useEffect(() => {
    // Dane z pamięci wystarczą, dopóki są świeże (chyba że użytkownik kliknął "Odśwież").
    if (reload === 0 && fetchedAt !== null && Date.now() - fetchedAt < maxAgeMs) return
    let cancelled = false
    fetchSlots(meetings, (p) => {
      if (!cancelled) setProgress(p)
    })
      .then((slots) => {
        if (cancelled) return
        const fetchedAt = Date.now()
        saveCachedSlots(key, slots, fetchedAt)
        setData({ key, slots, fetchedAt })
        setError(null)
        setProgress(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError({ key, message: errorMessage(e) })
        setProgress(null)
      })
    return () => {
      cancelled = true
    }
    // meetings zmienia tożsamość przy każdym odświeżeniu planu - liczy się tylko klucz (zestaw zajęć).
  }, [key, reload, fetchedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setError(null)
    setProgress({ done: 0, total: 1 })
    setReload((n) => n + 1)
  }, [])

  let status: Status
  if (error && error.key === key) status = { kind: 'error', message: error.message }
  else if (progress || !current) status = { kind: 'loading', progress }
  else status = { kind: 'ready' }

  return { slots: current?.slots ?? null, fetchedAt: current?.fetchedAt ?? null, status, refresh }
}
