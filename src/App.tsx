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
import { LanguageSwitch } from './components/LanguageSwitch'
import { LanguageToggle } from './components/LanguageToggle'
import { ShareAppButton } from './components/ShareAppButton'
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
import { useFeedback } from './hooks/useFeedback'
import { useNotifications } from './hooks/useNotifications'
import { useSharedBusy } from './hooks/useSharedBusy'
import { useAcademicCalendar } from './hooks/useAcademicCalendar'
import { NotificationsView } from './components/NotificationsView'
import { setErrorSender } from './lib/errorReport'
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
import { withLanguageClasses } from './lib/usos'
import { locale, setLanguage, t } from './lib/i18n'

type View = 'today' | 'week' | 'courses' | 'notifications' | 'report' | 'settings'

// Eksport (rysowanie zdjęcia, PDF, Excel) ładuje się dopiero po wejściu w "Eksportuj plan".
const ExportView = lazy(() => import('./components/ExportView').then((m) => ({ default: m.ExportView })))
// Ustawienia i optymalizator też dopiero po wejściu - pierwsze otwarcie Planera jest lżejsze.
const SettingsView = lazy(() => import('./components/SettingsView').then((m) => ({ default: m.SettingsView })))
const OptimizerView = lazy(() => import('./components/OptimizerView').then((m) => ({ default: m.OptimizerView })))
const FeedbackView = lazy(() => import('./components/FeedbackView').then((m) => ({ default: m.FeedbackView })))

// Funkcja, nie stała - tekst w bieżącym języku.
const loading = () => (
  <p className="muted loading-line">
    <span className="spinner" aria-hidden="true" />
    {t('Ładowanie…')}
  </p>
)

// Kolejność zakładek - przesunięcie palcem w lewo idzie do następnej.
const VIEW_ORDER: View[] = ['today', 'week', 'courses', 'notifications', 'report', 'settings']

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

// Po tylu minutach w tle aplikacja wraca w zakładce Tydzień do bieżącego tygodnia (jak nowe otwarcie).
const WEEK_RESET_AFTER_MS = 10 * 60_000

// Ikony paska: pełne (nie kontury), żeby były czytelne w małym rozmiarze.
// Zębatka ustawień; kropka = ktoś czeka na zatwierdzenie konta (tylko administrator).
function GearIcon({ alert = false }: { alert?: boolean }) {
  return (
    <span className="tab-icon-wrap">
      <svg className="tab-icon tab-icon-filled" viewBox="0 0 24 24" aria-hidden="true">
        {/* Zębatka z ikon Material Design (Google, licencja Apache 2.0). */}
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
      </svg>
      {alert && <span className="tab-alert" />}
    </span>
  )
}

// Powiadomienia: dzwonek; nieprzeczytane - czerwona plakietka z liczbą.
function BellIcon({ unread }: { unread: number }) {
  return (
    <span className="tab-icon-wrap">
      <svg className="tab-icon tab-icon-filled" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="3.4" r="1.4" />
        <path d="M12 4.6c-3.5 0-6 2.8-6 6.4v3.6l-1.7 2.2c-.45.58-.04 1.4.7 1.4h14c.74 0 1.15-.82.7-1.4L18 14.6V11c0-3.6-2.5-6.4-6-6.4zM9.5 19.4a2.5 2.5 0 0 0 5 0z" />
      </svg>
      {unread > 0 && <span className="tab-badge">{unread > 9 ? '9+' : unread}</span>}
    </span>
  )
}

// Zgłoszenia: żółty trójkąt ostrzegawczy z ciemnym wykrzyknikiem; kropka - nowe zgłoszenia (administrator).
function ReportIcon({ alert = false }: { alert?: boolean }) {
  return (
    <span className="tab-icon-wrap">
      <svg className="tab-icon tab-icon-warning" viewBox="0 0 24 24" aria-hidden="true">
        <path className="warning-sign" d="M10.27 3.5 1.9 18a2 2 0 0 0 1.73 3h16.74a2 2 0 0 0 1.73-3L13.73 3.5a2 2 0 0 0-3.46 0z" />
        <path className="warning-mark" d="M12 9v5" />
        <circle className="warning-dot" cx="12" cy="17.3" r="1.25" />
      </svg>
      {alert && <span className="tab-alert" />}
    </span>
  )
}

function tabs(
  settingsAlert: boolean,
  unread: number,
  newReports: number,
): { id: View; label: string; icon?: ReactNode }[] {
  return [
    { id: 'today', label: t('Dziś') },
    { id: 'week', label: t('Tydzień') },
    { id: 'courses', label: t('Przedmioty') },
    {
      id: 'notifications',
      label: unread > 0 ? t('Powiadomienia (nowe: {n})', { n: unread }) : t('Powiadomienia'),
      icon: <BellIcon unread={unread} />,
    },
    {
      id: 'report',
      label: newReports > 0 ? t('Zgłoszenia (nowe: {n})', { n: newReports }) : t('Zgłoś problem'),
      icon: <ReportIcon alert={newReports > 0} />,
    },
    {
      id: 'settings',
      label: settingsAlert ? t('Ustawienia (nowe konta czekają na zatwierdzenie)') : t('Ustawienia'),
      icon: <GearIcon alert={settingsAlert} />,
    },
  ]
}

function SyncStatus({ plan, now, extrasError }: { plan: PlanApi; now: Date; extrasError: string | null }) {
  const { source, status, updatedAt } = plan
  if (source?.kind === 'file') {
    return <p className="sync">{t('Plan z pliku {name}. Gdy zmieni się w USOS, wgraj nowy w ustawieniach.', { name: source.name })}</p>
  }
  if (source?.kind !== 'url') return null

  let text: string
  if (status.kind === 'loading') text = t('Odświeżam plan…')
  else if (status.kind === 'error') text = t('{error} Pokazuję zapisaną wersję.', { error: status.message })
  else text = updatedAt ? t('Zaktualizowano {when}', { when: formatUpdatedAt(updatedAt, now) }) : ''

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
          {t('Odśwież')}
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
  | { kind: 'feedback' } // uwagi i pomysły (administrator: skrzynka zgłoszeń)
  | null

function readPageFromHistory(): Page {
  const state = window.history.state as {
    course?: unknown
    optimizer?: unknown
    export?: unknown
    help?: unknown
    feedback?: unknown
  } | null
  if (typeof state?.course === 'string') return { kind: 'course', name: state.course }
  if (state?.optimizer === true) return { kind: 'optimizer' }
  if (typeof state?.export === 'number') return { kind: 'export', weekStart: state.export }
  if (state?.help === true) return { kind: 'help' }
  if (state?.feedback === true) return { kind: 'feedback' }
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
  const notifications = useNotifications(cloud.client, cloud.uid)
  const feedback = useFeedback(
    cloud.access === 'approved' ? cloud.client : null,
    cloud.uid,
    cloud.state.kind === 'signedIn' ? cloud.state.user.email : null,
    adminView,
  )
  // Automatyczne zgłoszenia błędów wysyła zalogowane konto z dostępem (reguły bazy wymagają dostępu).
  const submitFeedback = feedback.submit
  const canReport = cloud.uid !== null
  useEffect(() => {
    setErrorSender(canReport ? (report) => submitFeedback(report, [], () => {}) : null)
    return () => setErrorSender(null)
  }, [canReport, submitFeedback])
  const materials = useSharedMaterials(
    cloud.client,
    cloud.uid,
    cloud.state.kind === 'signedIn' ? cloud.state.user.email : null,
  )
  const prefsApi = usePrefs(extrasApi)
  const { prefs } = prefsApi
  // Język przed narysowaniem czegokolwiek - teksty (t()) czytają go w trakcie renderowania.
  setLanguage(prefs.language)
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
  // Tydzień wybrany w zakładce Tydzień (null = bieżący). Zostaje po wejściu w przedmiot i powrocie;
  // wraca do bieżącego po zmianie zakładki i po powrocie do aplikacji po dłuższej przerwie.
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null)
  useEffect(() => {
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt !== null && Date.now() - hiddenAt > WEEK_RESET_AFTER_MS) setSelectedWeek(null)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const extras = extrasApi?.extras ?? EMPTY_EXTRAS
  // Lektoraty (w USOS: ćwiczenia) jako osobny typ z własnym kolorem.
  const meetings = useMemo(() => applyEdits(withLanguageClasses(plan.meetings), extras), [plan.meetings, extras])
  // Wspólne okienka: publikacja moich godzin zajęć (gdy włączone w ustawieniach) i znajomi.
  // Kalendarz akademicki (dni wolne, sesja) - etykiety przy dniach.
  const calendarEvents = useAcademicCalendar()
  const sharedBusy = useSharedBusy(
    cloud.uid ? cloud.client : null,
    cloud.uid,
    cloud.state.kind === 'signedIn' ? cloud.state.user.email : null,
    meetings,
    prefs.shareBusy,
    prefs.shareName,
    now,
  )

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

  const openFeedback = useCallback(() => {
    pageNow.current = { kind: 'feedback' }
    window.history.pushState({ feedback: true }, '')
    setPage({ kind: 'feedback' })
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
      if (next !== view) setSelectedWeek(null)
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
      openFeedback,
      feedbackNew: feedback.newCount,
      openSettings: () => changeView('settings'),
      isAdmin: adminView,
      canOptimize,
      cloud: cloud.uid ? cloud.client : null,
      sharedBusy,
      calendarEvents,
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
        const toMin = (item: string) => Number(item.slice(0, 2)) * 60 + Number(item.slice(3, 5))
        const start = toMin(toTimeKey(m.start)) - DEADLINE_SLACK_MIN
        const end = toMin(toTimeKey(m.end))
        return sameDay.filter((d) => !d.time || (toMin(d.time) >= start && toMin(d.time) < end))
      },
      prefs,
      displayName: (name: string) => displayName(name, prefs),
    }),
    [
      extrasApi,
      materials,
      openCourse,
      openOptimizer,
      openExport,
      openHelp,
      openFeedback,
      feedback.newCount,
      changeView,
      adminView,
      canOptimize,
      cloud.uid,
      cloud.client,
      sharedBusy,
      calendarEvents,
      deadlinesByDay,
      extras.customMeetings,
      prefs,
    ],
  )

  const courseNames = useMemo(
    () => [...new Set(meetings.map((m) => m.courseName))].sort((a, b) => a.localeCompare(b, locale())),
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
              {t('Pobieram plan z Twojego konta…')}
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
                {t('Zalogowano jako')} <strong>{cloud.state.user.email}</strong> ·{' '}
                <button type="button" className="link-button" onClick={() => void cloud.signOut()}>
                  {t('Wyloguj')}
                </button>
              </p>
            )}
            {/* Karta konta jest od razu - w trakcie łączenia z kręciołkiem, żeby nic nie skakało. */}
            {(signedOut || cloud.state.kind === 'loading') && (
              <section className="panel view-enter">
                <h2 className="day-title">{t('Konto w Planerze')}</h2>
                <p className="muted">
                  {t('Zaloguj się albo załóż konto, a plan będzie na wszystkich Twoich urządzeniach.')}
                </p>
                {signedOut ? (
                  <AuthForm cloud={cloud} />
                ) : (
                  <p className="muted loading-line auth-loading">
                    <span className="spinner" aria-hidden="true" />
                    {t('Łączenie…')}
                  </p>
                )}
              </section>
            )}
            <section className="panel view-enter">
              <h2 className="day-title">{signedOut ? t('Albo dodaj plan bez konta') : t('Dodaj swój plan')}</h2>
              <p className="muted">
                {t('Wystarczy raz wkleić link (albo kod grupy WAT). Potem plan będzie aktualizował się sam, także w kolejnych semestrach.')}
                {cloud.state.kind === 'signedIn' && ' ' + t('Zapiszemy go też na Twoim koncie.')}
              </p>
              <SourceForm plan={plan} onDone={() => setView('today')} />
            </section>
          </>
        )}
        <p className="gate-footer view-enter">
          <button type="button" className="link-button" onClick={openHelp}>
            {t('Pomoc i prywatność')}
          </button>
          {' · '}
          <LanguageSwitch value={prefs.language} onChange={(language) => prefsApi.update({ language })} />
        </p>
        <UpdateBanner />
      </main>
    )
  }

  const mainView = (
    <>
      {view === 'today' && <TodayView meetings={meetings} now={now} />}
      {view === 'week' && (
        <WeekView meetings={meetings} now={now} selectedWeek={selectedWeek} onSelectWeek={setSelectedWeek} />
      )}
      {view === 'courses' && <CoursesView meetings={meetings} now={now} />}
      {view === 'notifications' && <NotificationsView notifications={notifications} now={now} />}
      {view === 'report' &&
        (cloud.uid ? (
          <FeedbackView feedback={feedback} admin={adminView} />
        ) : (
          <p className="empty-state">{t('Zaloguj się, żeby zgłosić problem albo pomysł.')}</p>
        ))}
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
            <span>{t('Widok zwykłego użytkownika')}</span>
            <button type="button" className="link-button" onClick={() => switchView(false)}>
              {t('Wróć do administratora')}
            </button>
          </div>
        )}
        <header className="topbar">
          <div className="brand-row">
            <h1 className="brand">Planer</h1>
            <div className="brand-actions">
              <ShareAppButton />
              <LanguageToggle value={prefs.language} onChange={(language) => prefsApi.update({ language })} />
            </div>
          </div>
          <Tabs
            tabs={tabs((admin?.pendingCount ?? 0) > 0, notifications.unread, feedback.newCount)}
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
            // Język w kluczu: zmiana języka rysuje widok od nowa (także teksty zapamiętane w useMemo),
            // a element z gestami (wyżej) zostaje ten sam - inaczej przesuwanie palcem by się odpięło.
            key={`${prefs.language}:${page ? (page.kind === 'course' ? `course:${page.name}` : page.kind) : view}`}
            className={ENTER_CLASS[enter]}
          >
            <ErrorBoundary>
              <Suspense fallback={loading()}>
                {/* Optymalizator tylko dla administratora i osób, którym go przyznał - inni nie wejdą nawet z historii. */}
                {page?.kind === 'optimizer' && canOptimize ? (
                  <OptimizerView planMeetings={plan.meetings} meetings={meetings} now={now} onBack={closePage} />
                ) : page?.kind === 'help' ? (
                  <HelpView onBack={closePage} onFeedback={cloud.uid ? openFeedback : undefined} />
                ) : page?.kind === 'feedback' && cloud.uid ? (
                  <FeedbackView feedback={feedback} admin={adminView} onBack={closePage} />
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
              <Suspense key={prefs.language} fallback={null}>
                {mainView}
              </Suspense>
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
