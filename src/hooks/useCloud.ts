import { useCallback, useEffect, useRef, useState } from 'react'
import type { Cloud, CloudUser } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import { firebaseConfig } from '../lib/firebaseConfig'
import { decideSync, type SyncSnapshot } from '../lib/sync'
import type { PlanApi } from './usePlan'

export const RETRY_AFTER_MS = 15_000

// Tryb testowy: udawana chmura zamiast Firebase. Tylko w wersji deweloperskiej -
// w wersji na GitHub Pages ten kod w ogóle nie trafia do paczki.
const useMock = import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock')

function loadCloud(): Promise<Cloud> | null {
  if (useMock) return import('../lib/cloudMock').then((m) => m.getMockCloud())
  const config = firebaseConfig
  if (!config) return null
  return import('../lib/cloud').then((m) => m.getCloud(config))
}

export type CloudState =
  | { kind: 'disabled' } // brak konfiguracji Firebase
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; user: CloudUser }

export function useCloud(plan: PlanApi) {
  const [cloud, setCloud] = useState<Cloud | null>(null)
  const [state, setState] = useState<CloudState>(
    firebaseConfig || useMock ? { kind: 'loading' } : { kind: 'disabled' },
  )
  // Dane konta zapamiętane razem z uid - po wylogowaniu same przestają pasować.
  const [cloudData, setCloudData] = useState<{ uid: string; icalUrl: string | null } | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // 1. Ładujemy Firebase w tle i słuchamy, kto jest zalogowany.
  useEffect(() => {
    const loading = loadCloud()
    if (!loading) return
    let unsubscribe = () => {}
    let cancelled = false
    loading
      .then((c) => {
        if (cancelled) return
        setCloud(c)
        unsubscribe = c.watchUser((user) => setState(user ? { kind: 'signedIn', user } : { kind: 'signedOut' }))
      })
      .catch(() => {
        if (cancelled) return
        setState({ kind: 'signedOut' })
        setSyncError('Nie udało się załadować logowania. Sprawdź internet.')
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // 2. Po zalogowaniu na bieżąco śledzimy dane konta (zmiany z innych urządzeń).
  // Po błędzie Firebase kończy nasłuch - zwiększenie tego licznika zakłada go od nowa.
  const [retry, setRetry] = useState(0)
  const uid = state.kind === 'signedIn' ? state.user.uid : null
  useEffect(() => {
    if (!cloud || !uid) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = cloud.watchData(
      uid,
      (data) => {
        setCloudData({ uid, icalUrl: data.icalUrl })
        setSyncError(null)
      },
      (message) => {
        setSyncError(message)
        // Np. reguły dostępu właśnie się zmieniają - spróbujemy ponownie za chwilę.
        retryTimer = setTimeout(() => setRetry((n) => n + 1), RETRY_AFTER_MS)
      },
    )
    return () => {
      clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [cloud, uid, retry])
  const cloudUrl = uid && cloudData?.uid === uid ? cloudData.icalUrl : undefined

  // 3. Uzgadniamy link w tej przeglądarce z linkiem na koncie.
  const localUrl = plan.source?.kind === 'url' ? plan.source.url : null
  const { connectUrl } = plan
  const previous = useRef<SyncSnapshot>({ cloudUrl: undefined, localUrl })
  useEffect(() => {
    const next: SyncSnapshot = { cloudUrl, localUrl }
    const action = cloud && uid ? decideSync(previous.current, next) : { kind: 'none' as const }
    previous.current = next
    if (!cloud || !uid) return

    if (action.kind === 'adopt') {
      connectUrl(action.url).catch((e) => setSyncError(`Nie udało się pobrać planu z konta: ${errorMessage(e)}`))
    } else if (action.kind === 'upload') {
      cloud.saveIcalUrl(uid, action.url).catch((e) => setSyncError(errorMessage(e)))
    }
  }, [cloud, uid, cloudUrl, localUrl, connectUrl])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!cloud) throw new Error('Logowanie jeszcze się ładuje, spróbuj za chwilę.')
      await cloud.signIn(email, password)
    },
    [cloud],
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!cloud) throw new Error('Logowanie jeszcze się ładuje, spróbuj za chwilę.')
      await cloud.signUp(email, password)
    },
    [cloud],
  )

  const resetPassword = useCallback(
    async (email: string) => {
      if (!cloud) throw new Error('Logowanie jeszcze się ładuje, spróbuj za chwilę.')
      await cloud.resetPassword(email)
    },
    [cloud],
  )

  const signOut = useCallback(async () => {
    await cloud?.signOut()
  }, [cloud])

  return {
    state,
    // Połączenie i konto dla dodatków (useExtras); null, gdy nikt nie jest zalogowany.
    client: uid ? cloud : null,
    uid,
    syncError,
    // Na koncie jest plan, którego ta przeglądarka jeszcze nie ma (trwa pobieranie).
    isAdopting: state.kind === 'signedIn' && !!cloudUrl && cloudUrl !== localUrl,
    signIn,
    signUp,
    resetPassword,
    signOut,
  }
}

export type CloudApi = ReturnType<typeof useCloud>
