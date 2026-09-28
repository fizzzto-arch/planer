import { useCallback, useEffect, useRef, useState } from 'react'
import { MINUTE_MS } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { EMPTY_PLAN, clearPlan, loadPlan, savePlan, type SavedPlan } from '../lib/storage'
import { mergeWithHistory, parseUsosCalendar } from '../lib/usos'

export type RefreshStatus = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string }

// Po powrocie do karty odświeżamy plan, jeśli jest starszy niż tyle minut.
const STALE_AFTER_MIN = 30

async function downloadCalendar(url: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch {
    throw new Error('Nie udało się połączyć z USOS. Sprawdź internet.')
  }
  if (!response.ok) {
    throw new Error(`USOS odpowiedział błędem ${response.status}. Sprawdź, czy link jest aktualny.`)
  }
  return response.text()
}

export function usePlan() {
  const [plan, setPlan] = useState<SavedPlan>(loadPlan)
  const [status, setStatus] = useState<RefreshStatus>({ kind: 'idle' })
  // Aktualny plan dla funkcji asynchronicznych (żeby nie czytały starej wersji).
  const planRef = useRef(plan)

  const commit = useCallback((next: SavedPlan) => {
    planRef.current = next
    setPlan(next)
    savePlan(next)
  }, [])

  const refresh = useCallback(async () => {
    const source = planRef.current.source
    if (source?.kind !== 'url') return
    setStatus({ kind: 'loading' })
    try {
      const fresh = parseUsosCalendar(await downloadCalendar(source.url))
      const current = planRef.current
      // W trakcie pobierania ktoś mógł podmienić źródło - wtedy wynik jest nieaktualny.
      if (current.source?.kind !== 'url' || current.source.url !== source.url) return
      const now = new Date()
      commit({ source, meetings: mergeWithHistory(current.meetings, fresh, now), updatedAt: now })
      setStatus({ kind: 'idle' })
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }, [commit])

  // Nowe źródło zastępuje cały plan (bez łączenia z historią poprzedniego).
  const connectUrl = useCallback(
    async (url: string) => {
      const meetings = parseUsosCalendar(await downloadCalendar(url))
      commit({ source: { kind: 'url', url }, meetings, updatedAt: new Date() })
      setStatus({ kind: 'idle' })
    },
    [commit],
  )

  const importFile = useCallback(
    async (file: File) => {
      const meetings = parseUsosCalendar(await file.text())
      commit({ source: { kind: 'file', name: file.name }, meetings, updatedAt: new Date() })
      setStatus({ kind: 'idle' })
    },
    [commit],
  )

  const reset = useCallback(() => {
    clearPlan()
    planRef.current = EMPTY_PLAN
    setPlan(EMPTY_PLAN)
    setStatus({ kind: 'idle' })
  }, [])

  useEffect(() => {
    void refresh()
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const updated = planRef.current.updatedAt
      if (!updated || Date.now() - updated.getTime() > STALE_AFTER_MIN * MINUTE_MS) void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  return { ...plan, status, refresh, connectUrl, importFile, reset }
}

export type PlanApi = ReturnType<typeof usePlan>
