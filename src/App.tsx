import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AccessGate } from './components/AccessGate'
import { AuthForm } from './components/AuthForm'
import { CoursesView } from './components/CoursesView'
import { CourseView } from './components/CourseView'
import { CustomMeetingEditor } from './components/CustomMeetingEditor'
import { DeadlineEditor } from './components/DeadlineEditor'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HelpView } from './components/HelpView'
import { Welcome } from './components/Welcome'
import { MeetingEditor } from './components/MeetingEditor'
import { SwipeDebugOverlay } from './components/SwipeDebugOverlay'
import { UpdateBanner } from './components/UpdateBanner'
import { SourceForm } from './components/SourceForm'
import { Tabs, type TabsControl } from './components/Tabs'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import { PlanUiContext, type CustomMeetingDraft, type DeadlineDraft, type ExportSource, type PlanUi } from './hooks/planUi'
import { useCloud } from './hooks/useCloud'
import { useAccessRequests } from './hooks/useAccessRequests'
import { useExtras } from './hooks/useExtras'
import { isFling, slideElement, useHorizontalSwipe, type SwipeHandlers } from './hooks/useHorizontalSwipe'
import { useSharedMaterials } from './hooks/useSharedMaterials'
import { useTypeColors } from './hooks/useTypeColors'
import { usePrefs } from './hooks/usePrefs'
import { displayName } from './lib/prefs'
import { useNow } from './hooks/useNow'
import { usePlan, type PlanApi } from './hooks/usePlan'
import { formatUpdatedAt, toDateKey, toTimeKey } from './lib/dates'
import { applyEdits, customMeetingId, type PlanMeeting } from './lib/edits'
import { EMPTY_EXTRAS, type Deadline } from './lib/extras'

type View = 'today' | 'week' | 'courses' | 'settings'

// Eksport (rysowanie zdjęcia, PDF, Excel) ładuje się dopiero po wejściu w "Eksportuj plan".
const ExportView = lazy(() => import('./components/ExportView').then((m) => ({ default: m.ExportView })))
// Ustawienia i optymalizator też dopiero po wejściu - pierwsze otwarcie Planera jest lżejsze.
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })))
const OptimizerView = lazy(() => import('./components/OptimizerView').then((m) => ({ default: m.OptimizerView })))

const LOADING = (
  <p className="muted loading-line">
    <span className="spinner" aria-hidden="true" />
    Ładowanie…
  </p>
)

// Kolejność zakładek - przesunięcie palcem w lewo idzie do następnej.
const VIEW_ORDER: View[] = ['today', 'week', 'courses', 'settings']

// Pas przy krawędzi ekranu zostawiony gestom przeglądarki.
const EDGE_PX = 24

// Podgląd "jako zwykły użytkownik" zapamiętany w tej przeglądarce.
const VIEW_AS_USER_KEY = 'planer.view-as-user'
function loadViewAsUser(): boolean {
  try {
    return localStorage.getItem(VIEW_AS_USER_KEY) === '1'
  } catch {
    return false
  }
}
function saveViewAsUser(on: boolean): void {
  try {
    if (on) localStorage.setItem(VIEW_AS_USER_KEY, '1')
    else localStorage.removeItem(VIEW_AS_USER_KEY)
  } catch {
    // bez zapisu - podgląd do przeładowania
  }
}

const ENTER_CLASS = { rise: 'view-enter', left: 'view-enter-left', right: 'view-enter-right', none: undefined }

const DEADLINE_SLACK_MIN = 15

// Zębatka ustawień; kropka = ktoś czeka na zatwierdzenie konta (tylko administrator).
function GearIcon({ alert = false }: { alert?: boolean }) {
  return (
    <span className="tab-icon-wrap">
      <GearSvg />
      {alert && <span className="tab-alert" />}
    </span>
  )
}

function GearSvg() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

function tabs(settingsAlert: boolean): { id: View; label: string; icon?: ReactNode }[] {
  return [
    { id: 'today', label: 'Dziś' },
    { id: 'week', label: 'Tydzień' },
    { id: 'courses', label: 'Przedmioty' },
    {
      id: 'settings',
      label: settingsAlert ? 'Ustawienia (nowe konta czekają na zatwierdzenie)' : 'Ustawienia',
      icon: <GearIcon alert={settingsAlert} />,
    },
  ]
}

function SyncStatus({ plan, now, extrasError }: { plan: PlanApi; now: Date; extrasError: string | null }) {
  const { source, status, updatedAt } = plan
  if (source?.kind === 'file') {
    return <p className="sync">Plan z pliku {source.name}. Gdy zmieni się w USOS, wgraj nowy w ustawieniach.</p>
  }
  if (source?.kind !== 'url') return null

  let text: string
  if (status.kind === 'loading') text = 'Odświeżam plan…'
  else if (status.kind === 'error') text = `${status.message} Pokazuję zapisaną wersję.`
  else text = updatedAt ? `Zaktualizowano ${formatUpdatedAt(updatedAt, now)}` : ''

  return (
    <>
      <p className={`sync${status.kind === 'error' ? ' is-error' : ''}`}>
        {text}{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => void plan.refresh()}
          disabled={status.kind === 'loading'}
        >
          <svg
            className={`inline-icon refresh-icon${status.kind === 'loading' ? ' is-spinning' : ''}`}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
          </svg>
          Odśwież
        </button>
      </p>
      {extrasError && <p className="sync is-error">{extrasError}</p>}
    </>
  )
}

// Podstrony (przedmiot, optymalizator, eksport) to wpisy w historii przeglądarki,
// więc gest "wstecz" wraca do planu.
type Page =
  | { kind: 'course'; name: string }
  | { kind: 'optimizer' }
  | { kind: 'export'; weekStart: number } // tydzień, z którego otwarto eksport
  | { kind: 'help' }
  | null

function readPageFromHistory(): Page {
  const state = window.history.state as { course?: unknown; optimizer?: unknown; export?: unknown; help?: unknown } | null
  if (typeof state?.course === 'string') return { kind: 'course', name: state.course }
  if (state?.optimizer === true) return { kind: 'optimizer' }
  if (typeof state?.export === 'number') return { kind: 'export', weekStart: state.export }
  if (state?.help === true) return { kind: 'help' }
  return null
}

function App() {
  const plan = usePlan()
  const cloud = useCloud(plan)
  const extrasApi = useExtras(cloud.client, cloud.uid)
  const typeColors = useTypeColors(extrasApi)
  // Podgląd "jako zwykły użytkownik": administrator widzi Planera bez swoich dodatków (panel dostępu,
  // optymalizator). Tylko wygląd - uprawnienia w bazie się nie zmieniają.
  const [viewAsUser, setViewAsUser] = useState(loadViewAsUser)
  const adminView = cloud.isAdmin && !viewAsUser
  const canOptimize = adminView || (!cloud.isAdmin && cloud.optimizerAccess)
  const switchView = useCallback((asUser: boolean) => {
    setViewAsUser(asUser)
    saveViewAsUser(asUser)
    window.scrollTo({ top: 0 })
  }, [])
  const admin = useAccessRequests(adminView ? cloud.adminClient : null)
  const materials = useSharedMaterials(
    cloud.client,
    cloud.uid,
    cloud.state.kind === 'signedIn' ? cloud.state.user.email : null,
  )
  const prefsApi = usePrefs(extrasApi)
  const { prefs } = prefsApi
  const now = useNow()
  const [view, setView] = useState<View>(() => prefs.startView)
  const [page, setPage] = useState<Page>(readPageFromHistory)
  // Jak wchodzi nowy widok: 'rise' - z dołu, 'left'/'right' - z tej strony, w którą przesuwamy zakładki,
  // 'none' - po geście "wstecz" plan już widać.
  const [enter, setEnter] = useState<'rise' | 'left' | 'right' | 'none'>('rise')
  const course = page?.kind === 'course' ? page.name : null
  const [deadlineDraft, setDeadlineDraft] = useState<DeadlineDraft | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<PlanMeeting | null>(null)
  const [customDraft, setCustomDraft] = useState<CustomMeetingDraft | null>(null)

  const extras = extrasApi?.extras ?? EMPTY_EXTRAS
  const meetings = useMemo(() => applyEdits(plan.meetings, extras), [plan.meetings, extras])

  // Bieżąca podstrona dla obsługi historii (aktualizowana od razu, bez czekania na render).
  const pageNow = useRef(page)

  useEffect(() => {
    const onPopState = () => {
      // Gest "dalej" na pusty wpis (niżej) - wracamy, historia się nie rozrasta.
      if ((window.history.state as { spacer?: boolean } | null)?.spacer) {
        window.history.back()
        return
      }
      const next = readPageFromHistory()
      // Po wyjściu z podstrony zostaje w historii wpis "dalej" do niej, a iPhone pozwala do niego
      // wrócić gestem od prawej krawędzi - i nagle jesteśmy w dawno zamkniętym przedmiocie.
      // Nowy wpis kasuje "dalej", a cofnięcie na niego zostawia nas na planie (w "dalej" jest już tylko plan).
      const wasOnPage = pageNow.current !== null
      // Od razu, nie czekając na React - drugie "popstate" (z back() niżej) nie może zrobić tego samego.
      pageNow.current = next
      if (wasOnPage && next === null) {
        window.history.pushState({ spacer: true }, '')
        window.history.back()
      }
      setPage(next)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openCourse = useCallback((name: string) => {
    pageNow.current = { kind: 'course', name }
    window.history.pushState({ course: name }, '')
    setPage({ kind: 'course', name })
    setEnter('rise')
    window.scrollTo({ top: 0 })
  }, [])

  const openOptimizer = useCallback(() => {
    pageNow.current = { kind: 'optimizer' }
    window.history.pushState({ optimizer: true }, '')
    setPage({ kind: 'optimizer' })
    setEnter('rise')
    window.scrollTo({ top: 0 })
  }, [])

  const openHelp = useCallback(() => {
    pageNow.current = { kind: 'help' }
    window.history.pushState({ help: true }, '')
    setPage({ kind: 'help' })
    setEnter('rise')
    window.scrollTo({ top: 0 })
  }, [])

  // Eksport obecnego planu albo innego (propozycja z optymalizatora) - źródło trzymamy w pamięci.
  const [exportSource, setExportSource] = useState<ExportSource | null>(null)
  const openExport = useCallback((weekStart: Date, source?: ExportSource) => {
    setExportSource(source ?? null)
    pageNow.current = { kind: 'export', weekStart: weekStart.getTime() }
    window.history.pushState({ export: weekStart.getTime() }, '')
    setPage({ kind: 'export', weekStart: weekStart.getTime() })
    setEnter('rise')
    window.scrollTo({ top: 0 })
  }, [])

  const closePage = useCallback(() => {
    if (readPageFromHistory()) window.history.back()
    else {
      pageNow.current = null
      setPage(null)
    }
  }, [])

  // Zmiana zakładki: nowy widok wjeżdża z tej strony, w którą "idziemy".
  const changeView = useCallback(
    (next: View) => {
      if (next === view && !page) return
      if (page) closePage()
      const step = VIEW_ORDER.indexOf(next) - VIEW_ORDER.indexOf(view)
      setEnter(step > 0 ? 'right' : step < 0 ? 'left' : 'rise')
      setView(next)
    },
    [view, page, closePage],
  )

  // Gest "wstecz": przesunięcie w prawo na podstronie. Aplikacja z ekranu początkowego nie ma paska Safari,
  // więc i jego gestu - robimy własny: podstrona jedzie za palcem, a spod niej wyłania się plan.
  // Plan pod spodem jest wyrenderowany zawczasu (niewidoczny), żeby start gestu niczego nie przebudowywał.
  const pageRef = useRef<HTMLDivElement>(null)
  const underWrapRef = useRef<HTMLDivElement>(null)
  const underRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const scrollAfterBack = useRef<number | null>(null)

  const moveUnderlay = (progress: number, animate: boolean) => {
    const transition = animate ? 'transform 220ms ease-out, opacity 220ms ease-out' : 'none'
    if (underRef.current) {
      underRef.current.style.transition = transition
      underRef.current.style.transform = `translateX(${(progress - 1) * 30}%)`
    }
    if (dimRef.current) {
      dimRef.current.style.transition = transition
      dimRef.current.style.opacity = String(1 - progress)
    }
  }

  const endSwipe = (back: boolean) => {
    const width = window.innerWidth
    slideElement(pageRef.current, back ? width : 0, true)
    moveUnderlay(back ? 1 : 0, true)
    window.setTimeout(() => {
      pageRef.current?.classList.remove('is-swiping')
      if (!back) {
        underWrapRef.current?.classList.remove('is-active')
        return
      }
      setEnter('none')
      closePage()
    }, 220)
  }

  // Na planie przesunięcie w bok zmienia zakładkę: widok jedzie za palcem, a razem z nim niebieski suwak.
  const tabsControl = useRef<TabsControl>(null)
  const neighbourView = (dx: number) => VIEW_ORDER[VIEW_ORDER.indexOf(view) + (dx < 0 ? 1 : -1)]

  const tabSwipe: SwipeHandlers = {
    onMove: (dx) => {
      const width = window.innerWidth
      // Za ostatnią zakładką nie ma już nic - widok tylko lekko się wychyla.
      const offset = neighbourView(dx) ? dx : dx * 0.25
      slideElement(pageRef.current, offset, false, true)
      tabsControl.current?.preview(neighbourView(dx) ? -offset / width : 0)
    },
    onEnd: (dx, velocity) => {
      const next = neighbourView(dx)
      if (next && isFling(dx, velocity, window.innerWidth * 0.25)) {
        slideElement(pageRef.current, 0, false) // nowy widok wjeżdża własną animacją
        changeView(next)
      } else {
        slideElement(pageRef.current, 0, true)
        tabsControl.current?.settle()
      }
    },
    onCancel: () => {
      slideElement(pageRef.current, 0, true)
      tabsControl.current?.settle()
    },
  }

  const backSwipe: SwipeHandlers = {
    onStart: () => {
      const top = pageRef.current?.getBoundingClientRect().top ?? 0
      // Przewinięta podstrona: plan pod spodem pokazujemy od góry, więc po powrocie przewijamy do niego.
      scrollAfterBack.current = top < 0 ? top + window.scrollY : null
      pageRef.current?.classList.add('is-swiping')
      const under = underWrapRef.current
      if (under) {
        under.style.top = `${Math.max(0, top)}px`
        under.classList.add('is-active')
      }
    },
    onMove: (dx) => {
      const x = Math.max(0, dx)
      slideElement(pageRef.current, x, false)
      moveUnderlay(x / window.innerWidth, false)
    },
    onEnd: (dx, velocity) => endSwipe(dx > 0 && isFling(dx, velocity, window.innerWidth * 0.35)),
    onCancel: () => endSwipe(false),
  }

  // Przy samych krawędziach ekranu działa gest "wstecz / dalej" przeglądarki (także w aplikacji
  // z ekranu początkowego) - tam nasz gest się nie włącza.
  useHorizontalSwipe(pageRef, page ? backSwipe : tabSwipe, {
    name: page ? 'wstecz' : 'zakładki',
    enabled: true,
    onlyRight: page !== null,
    ignoreEdges: EDGE_PX,
  })

  useLayoutEffect(() => {
    if (page !== null || scrollAfterBack.current === null) return
    window.scrollTo({ top: scrollAfterBack.current })
    scrollAfterBack.current = null
  }, [page])

  // Terminy przypadające w dniu danych zajęć z tego samego przedmiotu.
  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, Deadline[]>()
    for (const d of extras.deadlines) {
      if (d.done || !d.courseName) continue
      const key = `${d.date}|${d.courseName}`
      map.set(key, [...(map.get(key) ?? []), d])
    }
    return map
  }, [extras.deadlines])

  const ui = useMemo<PlanUi>(
    () => ({
      extras: extrasApi,
      materials,
      openCourse,
      openOptimizer,
      openExport,
      openHelp,
      openSettings: () => changeView('settings'),
      isAdmin: adminView,
      canOptimize,
      editDeadline: setDeadlineDraft,
      editMeeting: (m: PlanMeeting) => {
        const customId = customMeetingId(m.id)
        // Własne zajęcia edytujemy w całości (wszystkie powtórzenia), zajęcia z USOS - przez zmianę.
        if (customId) setCustomDraft(extras.customMeetings.find((c) => c.id === customId) ?? null)
        else setEditingMeeting(m)
      },
      addCustomMeeting: setCustomDraft,
      deadlinesFor: (m: PlanMeeting) => {
        const sameDay = deadlinesByDay.get(`${toDateKey(m.start)}|${m.courseName}`) ?? []
        // Termin z godziną należy tylko do zajęć, które wtedy trwają (np. kolokwium na ćwiczeniach,
        // nie na wykładzie). 15 minut zapasu na wpisanie "12:00" zamiast "12:15".
        const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
        const start = toMin(toTimeKey(m.start)) - DEADLINE_SLACK_MIN
        const end = toMin(toTimeKey(m.end))
        return sameDay.filter((d) => !d.time || (toMin(d.time) >= start && toMin(d.time) < end))
      },
      prefs,
      displayName: (name: string) => displayName(name, prefs),
    }),
    [extrasApi, materials, openCourse, openOptimizer, openExport, openHelp, changeView, adminView, canOptimize, deadlinesByDay, extras.customMeetings, prefs],
  )

  const courseNames = useMemo(
    () => [...new Set(meetings.map((m) => m.courseName))].sort((a, b) => a.localeCompare(b, 'pl')),
    [meetings],
  )

  // Zalogowane konto bez dostępu: potwierdzenie e-maila / czeka na zatwierdzenie / odrzucone.
  const gated = cloud.state.kind === 'signedIn' && cloud.access !== 'approved'

  // Pomoc otwarta z ekranu logowania albo oczekiwania na dostęp - bez zakładek planu.
  if (page?.kind === 'help' && (gated || !plan.source)) {
    return (
      <main className="app">
        <header className="topbar">
          <h1 className="brand">Planer</h1>
        </header>
        <div className="view-enter">
          <HelpView onBack={closePage} />
        </div>
      </main>
    )
  }

  if (gated) {
    return (
      <>
        <AccessGate cloud={cloud} onHelp={openHelp} />
        <UpdateBanner />
      </>
    )
  }

  if (!plan.source) {
    const signedOut = cloud.state.kind === 'signedOut'
    return (
      <main className="app landing">
        <Welcome />
        {cloud.isAdopting && !cloud.syncError ? (
          <section className="panel view-enter">
            <p className="muted loading-line">
              <span className="spinner" aria-hidden="true" />
              Pobieram plan z Twojego konta…
            </p>
          </section>
        ) : (
          <>
            {cloud.syncError && (
              <p className="error panel error-panel view-enter" role="alert">
                {cloud.syncError}
              </p>
            )}
            {cloud.state.kind === 'signedIn' && (
              <p className="account-line view-enter">
                Zalogowano jako <strong>{cloud.state.user.email}</strong> ·{' '}
                <button type="button" className="link-button" onClick={() => void cloud.signOut()}>
                  Wyloguj
                </button>
              </p>
            )}
            {/* Karta konta jest od razu - w trakcie łączenia z kręciołkiem, żeby nic nie skakało. */}
            {(signedOut || cloud.state.kind === 'loading') && (
              <section className="panel view-enter">
                <h2 className="day-title">Konto w Planerze</h2>
                <p className="muted">
                  Zaloguj się albo załóż konto, a plan będzie na wszystkich Twoich urządzeniach.
                </p>
                {signedOut ? (
                  <AuthForm cloud={cloud} />
                ) : (
                  <p className="muted loading-line auth-loading">
                    <span className="spinner" aria-hidden="true" />
                    Łączenie…
                  </p>
                )}
              </section>
            )}
            <section className="panel view-enter">
              <h2 className="day-title">{signedOut ? 'Albo dodaj plan bez konta' : 'Dodaj swój plan z USOS'}</h2>
              <p className="muted">
                Wystarczy raz wkleić link. Potem plan będzie aktualizował się sam, także w kolejnych
                semestrach.
                {cloud.state.kind === 'signedIn' && ' Zapiszemy go też na Twoim koncie.'}
              </p>
              <SourceForm plan={plan} onDone={() => setView('today')} />
            </section>
          </>
        )}
        <p className="gate-footer view-enter">
          <button type="button" className="link-button" onClick={openHelp}>
            Pomoc i prywatność
          </button>
        </p>
        <UpdateBanner />
      </main>
    )
  }

  const mainView = (
    <>
      {view === 'today' && <TodayView meetings={meetings} now={now} />}
      {view === 'week' && <WeekView meetings={meetings} now={now} />}
      {view === 'courses' && <CoursesView meetings={meetings} now={now} />}
      {view === 'settings' && (
        <SettingsView
          plan={plan}
          cloud={cloud}
          extras={extrasApi}
          typeColors={typeColors}
          prefsApi={prefsApi}
          courseNames={courseNames}
          admin={admin}
          now={now}
          onSourceChanged={() => setView('today')}
          onViewAsUser={() => switchView(true)}
        />
      )}
    </>
  )

  return (
    <PlanUiContext.Provider value={ui}>
      <main className="app" style={typeColors.style}>
        {cloud.isAdmin && viewAsUser && (
          <div className="view-as-user-bar" role="status">
            <span>Widok zwykłego użytkownika</span>
            <button type="button" className="link-button" onClick={() => switchView(false)}>
              Wróć do administratora
            </button>
          </div>
        )}
        <header className="topbar">
          <h1 className="brand">Planer</h1>
          <Tabs
            tabs={tabs((admin?.pendingCount ?? 0) > 0)}
            value={view}
            onChange={changeView}
            controlRef={tabsControl}
          />
        </header>
        <SyncStatus plan={plan} now={now} extrasError={extrasApi?.error ?? null} />

        {/* Stały element (bez key) - na nim nasłuchujemy gestów i to on jedzie za palcem. */}
        <div ref={pageRef} className={page ? 'swipe-page' : undefined}>
          {/* key = nowy widok montuje się od nowa i odpala animację wejścia */}
          <div
            key={page ? (page.kind === 'course' ? `course:${page.name}` : page.kind) : view}
            className={ENTER_CLASS[enter]}
          >
            <ErrorBoundary>
              <Suspense fallback={LOADING}>
                {/* Optymalizator tylko dla administratora i osób, którym go przyznał - inni nie wejdą nawet z historii. */}
                {page?.kind === 'optimizer' && canOptimize ? (
                  <OptimizerView planMeetings={plan.meetings} meetings={meetings} now={now} onBack={closePage} />
                ) : page?.kind === 'help' ? (
                  <HelpView onBack={closePage} />
                ) : page?.kind === 'export' ? (
                  <ExportView
                    meetings={exportSource?.meetings ?? meetings}
                    source={exportSource?.title ?? null}
                    now={now}
                    initialWeek={new Date(page.weekStart)}
                    colors={typeColors.colors}
                    onBack={closePage}
                  />
                ) : course ? (
                  <CourseView courseName={course} meetings={meetings} now={now} onBack={closePage} />
                ) : (
                  mainView
                )}
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

        {/* Plan, do którego wraca gest "wstecz" - niewidoczny, dopóki gest się nie zacznie. */}
        {page && (
          <div ref={underWrapRef} className="swipe-under" aria-hidden="true">
            <div ref={underRef} className="swipe-under-inner">
              <Suspense fallback={null}>{mainView}</Suspense>
            </div>
            <div ref={dimRef} className="swipe-dim" />
          </div>
        )}
        <SwipeDebugOverlay />
        <UpdateBanner />

        {deadlineDraft && extrasApi && (
          <DeadlineEditor
            draft={deadlineDraft}
            courseNames={courseNames}
            onSave={extrasApi.saveDeadline}
            onDelete={extrasApi.deleteDeadline}
            onClose={() => setDeadlineDraft(null)}
          />
        )}
        {editingMeeting && extrasApi && (
          <MeetingEditor meeting={editingMeeting} extras={extrasApi} onClose={() => setEditingMeeting(null)} />
        )}
        {customDraft && extrasApi && (
          <CustomMeetingEditor
            draft={customDraft}
            courseNames={courseNames}
            extras={extrasApi}
            onClose={() => setCustomDraft(null)}
          />
        )}
      </main>
    </PlanUiContext.Provider>
  )
}

export default App
