import { useState } from 'react'
import { AuthForm } from './components/AuthForm'
import { SettingsView } from './components/SettingsView'
import { SourceForm } from './components/SourceForm'
import { Tabs } from './components/Tabs'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import { useCloud } from './hooks/useCloud'
import { useNow } from './hooks/useNow'
import { usePlan, type PlanApi } from './hooks/usePlan'
import { formatUpdatedAt } from './lib/dates'

type View = 'today' | 'week' | 'settings'

const TABS: { id: View; label: string }[] = [
  { id: 'today', label: 'Dziś' },
  { id: 'week', label: 'Tydzień' },
  { id: 'settings', label: 'Ustawienia' },
]

function SyncStatus({ plan, now }: { plan: PlanApi; now: Date }) {
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
  )
}

function App() {
  const plan = usePlan()
  const cloud = useCloud(plan)
  const now = useNow()
  const [view, setView] = useState<View>('today')

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
              <p className="error panel view-enter" role="alert">
                {cloud.syncError}
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
    <main className="app">
      <header className="topbar">
        <h1 className="brand">Planer</h1>
        <Tabs tabs={TABS} value={view} onChange={setView} />
      </header>
      <SyncStatus plan={plan} now={now} />

      {/* key = nowy widok montuje się od nowa i odpala animację wejścia */}
      <div key={view} className="view-enter">
        {view === 'today' && <TodayView meetings={plan.meetings} now={now} />}
        {view === 'week' && <WeekView meetings={plan.meetings} now={now} />}
        {view === 'settings' && (
          <SettingsView plan={plan} cloud={cloud} now={now} onSourceChanged={() => setView('today')} />
        )}
      </div>
    </main>
  )
}

export default App
