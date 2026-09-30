import { t } from '../lib/i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccessStatus, Cloud, CloudUser } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import { ADMIN_EMAILS, firebaseConfig } from '../lib/firebaseConfig'
import { isEphemeralDevice, setRememberDevice, wipeLocalData } from '../lib/deviceMemory'
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

function isAdminEmail(email: string | null): boolean {
  if (!email) return false
  const normalized = email.toLowerCase()
  return ADMIN_EMAILS.includes(normalized) || (useMock && normalized === 'test@planer.local')
}

export type CloudState =
  | { kind: 'disabled' } // brak konfiguracji Firebase
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; user: CloudUser }

// Droga nowego konta: potwierdzenie e-maila -> prośba o dostęp -> zatwierdzenie przez administratora.
export type AccessState = 'none' | 'unverified' | 'checking' | 'pending' | 'rejected' | 'approved'

export function useCloud(plan: PlanApi) {
  const [cloud, setCloud] = useState<Cloud | null>(null)
  const [state, setState] = useState<CloudState>(
    firebaseConfig || useMock ? { kind: 'loading' } : { kind: 'disabled' },
  )
  // Dane konta zapamiętane razem z uid - po wylogowaniu same przestają pasować.
  const [cloudData, setCloudData] = useState<{ uid: string; icalUrl: string | null } | null>(null)
  const [accessData, setAccessData] = useState<{ uid: string; status: AccessStatus | null; optimizer: boolean } | null>(null)
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
        setSyncError(t('Nie udało się załadować logowania. Sprawdź internet.'))
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const user = state.kind === 'signedIn' ? state.user : null
  const userUid = user?.uid ?? null
  const userEmail = user?.email ?? null
  const emailVerified = user?.emailVerified ?? false
  const isAdmin = isAdminEmail(userEmail)

  // 2. Status dostępu (tylko dla potwierdzonych e-maili; administrator ma dostęp zawsze).
  const [accessRetry, setAccessRetry] = useState(0)
  useEffect(() => {
    if (!cloud || !userUid || isAdmin || !emailVerified) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = cloud.watchAccess(
      userUid,
      (info) => setAccessData({ uid: userUid, ...info }),
      (message) => {
        setSyncError(message)
        retryTimer = setTimeout(() => setAccessRetry((n) => n + 1), RETRY_AFTER_MS)
      },
    )
    return () => {
      clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [cloud, userUid, isAdmin, emailVerified, accessRetry])

  const accessStatus = accessData && accessData.uid === userUid ? accessData.status : undefined
  // Dostęp do optymalizatora (wersja testowa) - nadaje administrator; on sam ma go zawsze.
  const optimizerAccess = isAdmin || (accessData?.uid === userUid && accessData.optimizer)

  // Brak prośby o dostęp (świeżo potwierdzony e-mail) - wysyłamy ją sami.
  // Nieudaną wysyłkę ponawiamy - inaczej konto wisiałoby na "czeka na zatwierdzenie",
  // a administrator w ogóle nie widziałby prośby.
  const [requestError, setRequestError] = useState<{ uid: string; message: string } | null>(null)
  const [requestRetry, setRequestRetry] = useState(0)
  useEffect(() => {
    if (!cloud || !userUid || !userEmail || isAdmin || !emailVerified || accessStatus !== null) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false
    cloud
      .requestAccess(userUid, userEmail)
      .then(() => {
        if (!cancelled) setRequestError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setRequestError({ uid: userUid, message: errorMessage(e) })
        retryTimer = setTimeout(() => setRequestRetry((n) => n + 1), RETRY_AFTER_MS)
      })
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
    }
  }, [cloud, userUid, userEmail, isAdmin, emailVerified, accessStatus, requestRetry])
  // Prośba nie dotarła do administratora (błąd dotyczy tylko konta bez zapisanej prośby).
  const accessRequestError =
    requestError && requestError.uid === userUid && accessStatus === null ? requestError.message : null

  let access: AccessState
  if (!user) access = 'none'
  else if (isAdmin) access = 'approved'
  else if (!emailVerified) access = 'unverified'
  else if (accessStatus === undefined) access = 'checking'
  else access = accessStatus ?? 'pending'

  // Synchronizacja i dodatki tylko dla zatwierdzonych kont.
  const uid = access === 'approved' ? userUid : null

  // 3. Na bieżąco śledzimy dane konta (zmiany z innych urządzeń).
  // Po błędzie Firebase kończy nasłuch - zwiększenie tego licznika zakłada go od nowa.
  const [retry, setRetry] = useState(0)
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

  // 4. Uzgadniamy link w tej przeglądarce z linkiem na koncie.
  const localUrl = plan.source?.kind === 'url' ? plan.source.url : null
  const { connectUrl } = plan
  const previous = useRef<SyncSnapshot>({ cloudUrl: undefined, localUrl })
  useEffect(() => {
    const next: SyncSnapshot = { cloudUrl, localUrl }
    const action = cloud && uid ? decideSync(previous.current, next) : { kind: 'none' as const }
    previous.current = next
    if (!cloud || !uid) return

    if (action.kind === 'adopt') {
      connectUrl(action.url).catch((e) => setSyncError(t('Nie udało się pobrać planu z konta: {error}', { error: errorMessage(e) })))
    } else if (action.kind === 'upload') {
      cloud.saveIcalUrl(uid, action.url).catch((e) => setSyncError(errorMessage(e)))
    }
  }, [cloud, uid, cloudUrl, localUrl, connectUrl])

  const requireCloud = useCallback(() => {
    if (!cloud) throw new Error(t('Logowanie jeszcze się ładuje, spróbuj za chwilę.'))
    return cloud
  }, [cloud])

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      await requireCloud().signIn(email, password, remember)
      setRememberDevice(remember)
    },
    [requireCloud],
  )
  const signUp = useCallback(
    async (email: string, password: string, remember: boolean) => {
      await requireCloud().signUp(email, password, remember)
      setRememberDevice(remember)
    },
    [requireCloud],
  )
  const resetPassword = useCallback((email: string) => requireCloud().resetPassword(email), [requireCloud])
  const sendVerificationEmail = useCallback(() => requireCloud().sendVerificationEmail(), [requireCloud])
  const refreshUser = useCallback(() => requireCloud().refreshUser(), [requireCloud])

  // Urządzenie "bez zapamiętania": wylogowanie od razu kasuje wszystko, co Planer tu zostawił.
  const signOut = useCallback(async () => {
    await cloud?.signOut()
    if (isEphemeralDevice()) {
      await wipeLocalData()
      window.location.reload()
    }
  }, [cloud])

  // Po usunięciu konta czyścimy też to urządzenie - nic po koncie nie zostaje.
  const deleteAccount = useCallback(
    async (password: string) => {
      await requireCloud().deleteAccount(password)
      await wipeLocalData()
      window.location.reload()
    },
    [requireCloud],
  )

  return {
    state,
    access,
    isAdmin,
    optimizerAccess,
    // Połączenie i konto dla dodatków (useExtras); null, dopóki konto nie ma dostępu.
    client: uid ? cloud : null,
    uid,
    // Panel zatwierdzania kont - tylko dla administratora.
    adminClient: isAdmin ? cloud : null,
    syncError,
    accessRequestError,
    // Na koncie jest plan, którego ta przeglądarka jeszcze nie ma (trwa pobieranie).
    isAdopting: !!uid && !!cloudUrl && cloudUrl !== localUrl,
    signIn,
    signUp,
    resetPassword,
    sendVerificationEmail,
    refreshUser,
    signOut,
    deleteAccount,
  }
}

export type CloudApi = ReturnType<typeof useCloud>
