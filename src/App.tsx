import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthForm } from './components/AuthForm'
import { CoursesView } from './components/CoursesView'
import { CourseView } from './components/CourseView'
import { CustomMeetingEditor } from './components/CustomMeetingEditor'
import { DeadlineEditor } from './components/DeadlineEditor'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MeetingEditor } from './components/MeetingEditor'
import { SettingsView } from './components/SettingsView'
import { SourceForm } from './components/SourceForm'
import { Tabs } from './components/Tabs'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import { PlanUiContext, type CustomMeetingDraft, type DeadlineDraft, type PlanUi } from './hooks/planUi'
import { useCloud } from './hooks/useCloud'
import { useExtras } from './hooks/useExtras'
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

const DEADLINE_SLACK_MIN = 15

function GearIcon() {
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

const TABS: { id: View; label: string; icon?: ReactNode }[] = [
  { id: 'today', label: 'Dziś' },
  { id: 'week', label: 'Tydzień' },
  { id: 'courses', label: 'Przedmioty' },
  { id: 'settings', label: 'Ustawienia', icon: <GearIcon /> },
]

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

// Strona przedmiotu jest wpisem w historii przeglądarki, więc gest "wstecz" wraca do planu.
function readCourseFromHistory(): string | null {
  const state = window.history.state as { course?: unknown } | null
  return typeof state?.course === 'string' ? state.course : null
}

function App() {
  const plan = usePlan()
  const cloud = useCloud(plan)
  const extrasApi = useExtras(cloud.client, cloud.uid)
  const typeColors = useTypeColors(extrasApi)
  const materials = useSharedMaterials(
    cloud.client,
    cloud.uid,
    cloud.state.kind === 'signedIn' ? cloud.state.user.email : null,
  )
  const prefsApi = usePrefs(extrasApi)
  const { prefs } = prefsApi
  const now = useNow()
  const [view, setView] = useState<View>(() => prefs.startView)
  const [course, setCourse] = useState<string | null>(readCourseFromHistory)
  const [deadlineDraft, setDeadlineDraft] = useState<DeadlineDraft | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<PlanMeeting | null>(null)
  const [customDraft, setCustomDraft] = useState<CustomMeetingDraft | null>(null)

  const extras = extrasApi?.extras ?? EMPTY_EXTRAS
  const meetings = useMemo(() => applyEdits(plan.meetings, extras), [plan.meetings, extras])

  useEffect(() => {
    const onPopState = () => setCourse(readCourseFromHistory())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const openCourse = useCallback((name: string) => {
    window.history.pushState({ course: name }, '')
    setCourse(name)
    window.scrollTo({ top: 0 })
  }, [])

  const closeCourse = useCallback(() => {
    if (readCourseFromHistory()) window.history.back()
    else setCourse(null)
  }, [])

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
    [extrasApi, materials, openCourse, deadlinesByDay, extras.customMeetings, prefs],
  )

  const courseNames = useMemo(
    () => [...new Set(meetings.map((m) => m.courseName))].sort((a, b) => a.localeCompare(b, 'pl')),
    [meetings],
  )

  if (!plan.source) {
    const signedOut = cloud.state.kind === 'signedOut'
    return (
      <main className="app">
        <header className="topbar">
          <h1 className="brand">Planer</h1>
        </header>
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
            {signedOut && (
              <section className="panel view-enter">
                <h2 className="day-title">Konto w Planerze</h2>
                <p className="muted">
                  Zaloguj się albo załóż konto, a plan będzie na wszystkich Twoich urządzeniach.
                </p>
                <AuthForm cloud={cloud} />
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
      </main>
    )
  }

  return (
    <PlanUiContext.Provider value={ui}>
      <main className="app" style={typeColors.style}>
        <header className="topbar">
          <h1 className="brand">Planer</h1>
          <Tabs
            tabs={TABS}
            value={view}
            onChange={(next) => {
              if (course) closeCourse()
              setView(next)
            }}
          />
        </header>
        <SyncStatus plan={plan} now={now} extrasError={extrasApi?.error ?? null} />

        {/* key = nowy widok montuje się od nowa i odpala animację wejścia */}
        <div key={course ? `course:${course}` : view} className="view-enter">
          <ErrorBoundary>
            {course ? (
              <CourseView courseName={course} meetings={meetings} now={now} onBack={closeCourse} />
            ) : (
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
                    now={now}
                    onSourceChanged={() => setView('today')}
                  />
                )}
              </>
            )}
          </ErrorBoundary>
        </div>

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
