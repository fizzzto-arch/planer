import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../lib/errors'
import type { Meeting } from '../lib/usos'
import {
  fetchSlots,
  loadCachedSlots,
  planUnits,
  saveCachedSlots,
  slotsCacheKey,
  slotsForPlan,
  type CachedSlots,
  type GroupsProgress,
} from '../lib/usosGroups'

// Plany wszystkich grup dla przedmiotów z planu (terminy od "from"). Zmieniają się rzadko, więc
// z USOS pobieramy je tylko na żądanie (refresh) albo gdy brakuje danych któregoś przedmiotu:
// przy pierwszym otwarciu i po dojściu nowego przedmiotu do planu.
export function useGroupOptions(meetings: Meeting[], from: number) {
  const [cached, setCached] = useState<CachedSlots | null>(loadCachedSlots)
  const [refreshing, setRefreshing] = useState(false) // "Odśwież" (bez niego pobieramy tylko brakujące dane)
  const [progress, setProgress] = useState<GroupsProgress | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const request = useRef(0) // numer ostatniego pobierania - wyniki wcześniejszych pomijamy

  // meetings zmienia tożsamość przy każdym odświeżeniu planu - liczy się tylko zestaw zajęć i grup.
  const key = slotsCacheKey(meetings)
  const slots = useMemo(() => (cached ? slotsForPlan(cached, meetings, from) : null), [cached, key, from]) // eslint-disable-line react-hooks/exhaustive-deps
  const missing = slots === null

  const load = (plan: Meeting[]) => {
    const id = ++request.current
    const planKey = slotsCacheKey(plan)
    fetchSlots(plan, (progress) => {
      if (request.current === id) setProgress(progress)
    })
      .then((slots) => {
        if (request.current !== id) return
        const fresh = { units: planUnits(plan), slots, fetchedAt: Date.now() }
        saveCachedSlots(fresh)
        setCached(fresh)
        setError(null)
        setProgress(null)
        setRefreshing(false)
      })
      .catch((e) => {
        if (request.current !== id) return
        setError({ key: planKey, message: errorMessage(e) })
        setProgress(null)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    if (missing) load(meetings)
  }, [key, missing]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    setError(null)
    setRefreshing(true)
    load(meetings)
  }

  // Po zamknięciu widoku spóźnione wyniki nie trafiają już do stanu.
  useEffect(
    () => () => {
      request.current++
    },
    [],
  )

  const currentError = error && error.key === key ? error.message : null
  return {
    slots,
    fetchedAt: slots ? (cached?.fetchedAt ?? null) : null,
    // Brakujące dane pobierają się same - dopóki nie przyjdą (albo nie przyjdzie błąd), trwa ładowanie.
    loading: refreshing || (missing && !currentError),
    progress,
    error: currentError,
    refresh,
  }
}
