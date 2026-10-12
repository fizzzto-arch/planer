import { t } from '../lib/i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MINUTE_MS } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { EMPTY_PLAN, clearPlan, loadPlan, savePlan, type SavedPlan } from '../lib/storage'
import { mergeWithHistory, parseUsosCalendar } from '../lib/usos'
import {
  watGroupFromUrl,
  watPlanFromSavedPage,
  watPlanUrl,
  watToIcs,
  watUpdatedFromIcs,
  type SharedWatPlan,
  type WatPlan,
} from '../lib/wat'

// Czy plan WAT "updatedAt" jest nowszy niż ten, który już mamy (brak daty - każdy jest nowszy).
const newerWat = (updatedAt: string | null, than: string | null | undefined) => !!updatedAt && (!than || updatedAt > than)

export type RefreshStatus = { kind: 'idle' } | { kind: 'loading' } | { kind: 'error'; message: string }

// Po powrocie do karty odświeżamy plan, jeśli jest starszy niż tyle minut.
const STALE_AFTER_MIN = 30

async function downloadCalendar(url: string): Promise<string> {
  // Plan WAT leży obok Planera (pobiera go nasz serwer) - komunikat nie może mówić o USOS.
  const wat = watGroupFromUrl(url)
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch {
    throw new Error(wat ? t('Nie udało się pobrać planu. Sprawdź internet.') : t('Nie udało się połączyć z USOS. Sprawdź internet.'))
  }
  if (!response.ok) {
    throw new Error(
      wat
        ? t('Nie mam planu grupy {group} (błąd {status}).', { group: wat, status: response.status })
        : t('USOS odpowiedział błędem {status}. Sprawdź, czy link jest aktualny.', { status: response.status }),
    )
  }
  return response.text()
}

export function usePlan() {
  const [plan, setPlan] = useState<SavedPlan>(loadPlan)
  const [status, setStatus] = useState<RefreshStatus>({ kind: 'idle' })
  // Aktualny plan dla funkcji asynchronicznych (żeby nie czytały starej wersji).
  const planRef = useRef(plan)
  // Ostatni plan WAT wgrany na tym urządzeniu - App zapisuje go na koncie.
  const [lastWatImport, setLastWatImport] = useState<SharedWatPlan | null>(null)

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
      const text = await downloadCalendar(source.url)
      const current = planRef.current
      // W trakcie pobierania ktoś mógł podmienić źródło - wtedy wynik jest nieaktualny.
      if (current.source?.kind !== 'url' || current.source.url !== source.url) return
      // Plan WAT starszy niż wgrany ręcznie (WAT blokuje nasze pobieranie) - zostaje wgrany.
      const watUpdatedAt = watUpdatedFromIcs(text)
      const keepImported = !!watGroupFromUrl(source.url) && !!current.watUpdatedAt && !newerWat(watUpdatedAt, current.watUpdatedAt)
      if (!keepImported) {
        const now = new Date()
        commit({ source, meetings: mergeWithHistory(current.meetings, parseUsosCalendar(text), now), updatedAt: now, watUpdatedAt })
      }
      setStatus({ kind: 'idle' })
    } catch (e) {
      setStatus({ kind: 'error', message: errorMessage(e) })
    }
  }, [commit])

  // Nowe źródło zastępuje cały plan (bez łączenia z historią poprzedniego).
  const connectUrl = useCallback(
    async (url: string) => {
      const text = await downloadCalendar(url)
      commit({ source: { kind: 'url', url }, meetings: parseUsosCalendar(text), updatedAt: new Date(), watUpdatedAt: watUpdatedFromIcs(text) })
      setStatus({ kind: 'idle' })
    },
    [commit],
  )

  // Plan WAT (ze strony zapisanej przez studenta albo z konta): źródłem zostaje plan grupy obok Planera,
  // więc gdy WAT znów wpuści nasze pobieranie, plan sam będzie się odświeżał.
  const applyWatPlan = useCallback(
    (group: string, ics: string, updatedAt: string | null) => {
      const url = watPlanUrl(group, document.baseURI)
      const current = planRef.current
      const same = current.source?.kind === 'url' && current.source.url === url
      const now = new Date()
      const meetings = parseUsosCalendar(ics)
      commit({ source: { kind: 'url', url }, meetings: same ? mergeWithHistory(current.meetings, meetings, now) : meetings, updatedAt: now, watUpdatedAt: updatedAt })
      setStatus({ kind: 'idle' })
    },
    [commit],
  )

  const importWat = useCallback(
    (wat: WatPlan) => {
      const ics = watToIcs(wat)
      applyWatPlan(wat.group, ics, wat.updatedAt)
      if (wat.updatedAt) setLastWatImport({ group: wat.group, updatedAt: wat.updatedAt, ics })
    },
    [applyWatPlan],
  )

  // Plik .ics albo zapisana strona planu grupy WAT.
  const importFile = useCallback(
    async (file: File) => {
      const text = await file.text()
      const wat = watPlanFromSavedPage(text)
      if (wat) return importWat(wat)
      commit({ source: { kind: 'file', name: file.name }, meetings: parseUsosCalendar(text), updatedAt: new Date() })
      setStatus({ kind: 'idle' })
    },
    [commit, importWat],
  )

  // Tylko strona planu WAT (przycisk przy planie WAT) - inny plik to błąd, plan zostaje.
  const importWatPage = useCallback(
    async (file: File) => {
      const wat = watPlanFromSavedPage(await file.text())
      if (!wat) {
        setStatus({
          kind: 'error',
          message: t('To nie jest zapisana strona planu grupy z planzajec.wcy.wat.edu.pl.'),
        })
        return
      }
      importWat(wat)
    },
    [importWat],
  )

  // Plan WAT z konta (wgrany na innym urządzeniu) - gdy to ta sama grupa i jest nowszy niż tutaj.
  const adoptWat = useCallback(
    (shared: SharedWatPlan) => {
      const current = planRef.current
      if (current.source?.kind !== 'url' || watGroupFromUrl(current.source.url) !== shared.group) return
      if (newerWat(shared.updatedAt, current.watUpdatedAt)) applyWatPlan(shared.group, shared.ics, shared.updatedAt)
    },
    [applyWatPlan],
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

  return { ...plan, status, refresh, connectUrl, importFile, importWatPage, adoptWat, lastWatImport, reset }
}

export type PlanApi = ReturnType<typeof usePlan>
