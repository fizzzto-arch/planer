import { useState } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import type { PlanApi } from '../hooks/usePlan'
import { formatShortDay, formatUpdatedAt } from '../lib/dates'
import { plural } from '../lib/plural'
import type { AccessRequestsApi } from '../hooks/useAccessRequests'
import type { ExtrasApi } from '../hooks/useExtras'
import type { PrefsApi } from '../hooks/usePrefs'
import type { TypeColorsApi } from '../hooks/useTypeColors'
import { AccountPanel } from './AccountPanel'
import { AdminPanel } from './AdminPanel'
import { BackupPanel } from './BackupPanel'
import { ColorsPanel } from './ColorsPanel'
import { AliasesPanel, AppearancePanel, PlanPrefsPanel } from './PreferencesPanels'
import { SourceForm } from './SourceForm'

interface Props {
  plan: PlanApi
  cloud: CloudApi
  extras: ExtrasApi | null
  typeColors: TypeColorsApi
  prefsApi: PrefsApi
  courseNames: string[]
  admin: AccessRequestsApi | null // panel zatwierdzania kont; null = nie-administrator
  now: Date
  onSourceChanged: () => void
}

export function SettingsView({
  plan,
  cloud,
  extras,
  typeColors,
  prefsApi,
  courseNames,
  admin,
  now,
  onSourceChanged,
}: Props) {
  const [changing, setChanging] = useState(false)
  const { source, meetings, updatedAt } = plan
  const courseCount = new Set(meetings.map((m) => m.courseName)).size
  const first = meetings[0]
  const last = meetings[meetings.length - 1]
  const signedIn = cloud.state.kind === 'signedIn'

  async function handleReset() {
    const question = signedIn
      ? 'Wylogować się i usunąć plan z tej przeglądarki? Plan zapisany na koncie zostaje.'
      : 'Usunąć plan i zapisany link z tej przeglądarki?'
    if (!window.confirm(question)) return
    // Najpierw wylogowanie - inaczej synchronizacja od razu pobrałaby plan z powrotem.
    if (signedIn) await cloud.signOut()
    plan.reset()
  }

  return (
    <section>
      <AccountPanel cloud={cloud} />
      {admin && <AdminPanel admin={admin} now={now} />}
      <AppearancePanel prefsApi={prefsApi} signedIn={signedIn} />
      <ColorsPanel typeColors={typeColors} signedIn={signedIn} />
      <PlanPrefsPanel prefsApi={prefsApi} />
      <AliasesPanel prefsApi={prefsApi} courseNames={courseNames} />

      <div className="panel">
        <h3 className="panel-title">Źródło planu</h3>
        <dl className="facts">
          <dt>Źródło</dt>
          <dd>{source?.kind === 'url' ? 'Link iCal z USOS (klucz ukryty)' : `Plik ${source?.name ?? ''}`}</dd>
          <dt>W planie</dt>
          <dd>
            {courseCount} {plural(courseCount, 'przedmiot', 'przedmioty', 'przedmiotów')},{' '}
            {meetings.length} {plural(meetings.length, 'termin', 'terminy', 'terminów')}
          </dd>
          {first && last && (
            <>
              <dt>Zakres</dt>
              <dd>
                {formatShortDay(first.start)} – {formatShortDay(last.start)}
              </dd>
            </>
          )}
          {updatedAt && (
            <>
              <dt>Aktualizacja</dt>
              <dd>{formatUpdatedAt(updatedAt, now)}</dd>
            </>
          )}
        </dl>

        {changing ? (
          <SourceForm
            plan={plan}
            onDone={() => {
              setChanging(false)
              onSourceChanged()
            }}
          />
        ) : (
          <div className="button-row">
            {source?.kind === 'url' && (
              <button
                type="button"
                className="button"
                onClick={() => void plan.refresh()}
                disabled={plan.status.kind === 'loading'}
              >
                Odśwież teraz
              </button>
            )}
            <button type="button" className="button secondary" onClick={() => setChanging(true)}>
              Zmień źródło planu
            </button>
          </div>
        )}
      </div>

      <BackupPanel extras={extras} />

      <div className="panel">
        <p className="hint">
          {signedIn
            ? 'Plan jest zapisany w tej przeglądarce i na Twoim koncie.'
            : 'Plan i link są zapisane tylko w tej przeglądarce.'}
        </p>
        <button type="button" className="button danger" onClick={() => void handleReset()}>
          {signedIn ? 'Wyloguj i usuń dane z tej przeglądarki' : 'Usuń dane z tej przeglądarki'}
        </button>
      </div>
    </section>
  )
}
