import { t } from '../lib/i18n'
import { useState } from 'react'
import type { CloudApi } from '../hooks/useCloud'
import { usePlanUi } from '../hooks/planUi'
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
import { RemindersPanel } from './RemindersPanel'
import { SourceForm } from './SourceForm'
import { SharingPanel } from './SharingPanel'
import { watGroupFromUrl } from '../lib/wat'

interface Props {
  plan: PlanApi
  cloud: CloudApi
  extras: ExtrasApi | null
  typeColors: TypeColorsApi
  prefsApi: PrefsApi
  courseNames: string[]
  admin: AccessRequestsApi | null // panel zatwierdzania kont; null = nie-administrator
  onViewAsUser: () => void
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
  onViewAsUser,
  now,
  onSourceChanged,
}: Props) {
  const [changing, setChanging] = useState(false)
  const { openHelp, openFeedback, feedbackNew, isAdmin } = usePlanUi()
  const { source, meetings, updatedAt } = plan
  const courseCount = new Set(meetings.map((m) => m.courseName)).size
  const first = meetings[0]
  const last = meetings[meetings.length - 1]
  const signedIn = cloud.state.kind === 'signedIn'

  async function handleReset() {
    const question = signedIn
      ? t('Wylogować się i usunąć plan z tej przeglądarki? Plan zapisany na koncie zostaje.')
      : t('Usunąć plan i zapisany link z tej przeglądarki?')
    if (!window.confirm(question)) return
    // Najpierw wylogowanie - inaczej synchronizacja od razu pobrałaby plan z powrotem.
    if (signedIn) await cloud.signOut()
    plan.reset()
  }

  return (
    <section>
      <AccountPanel cloud={cloud} />
      {admin && <AdminPanel admin={admin} now={now} onViewAsUser={onViewAsUser} />}
      <RemindersPanel extras={extras} prefsApi={prefsApi} />
      {signedIn && <SharingPanel prefsApi={prefsApi} email={cloud.state.kind === 'signedIn' ? cloud.state.user.email : null} />}
      <AppearancePanel prefsApi={prefsApi} signedIn={signedIn} />
      <PlanPrefsPanel prefsApi={prefsApi} />
      <ColorsPanel typeColors={typeColors} signedIn={signedIn} />
      <AliasesPanel prefsApi={prefsApi} courseNames={courseNames} />

      <div className="panel">
        <h3 className="panel-title">{t('Źródło planu')}</h3>
        <dl className="facts">
          <dt>{t('Źródło')}</dt>
          <dd>
            {source?.kind === 'url'
              ? watGroupFromUrl(source.url)
                ? t('Plan grupy {group} (WAT, odświeżany co noc)', { group: watGroupFromUrl(source.url) ?? '' })
                : t('Link iCal z USOS (klucz ukryty)')
              : t('Plik {name}', { name: source?.name ?? '' })}
          </dd>
          <dt>{t('W planie')}</dt>
          <dd>
            {courseCount} {plural(courseCount, 'przedmiot', 'przedmioty', 'przedmiotów')},{' '}
            {meetings.length} {plural(meetings.length, 'termin zajęć', 'terminy zajęć', 'terminów zajęć')}
          </dd>
          {first && last && (
            <>
              <dt>{t('Zakres')}</dt>
              <dd>
                {formatShortDay(first.start)} – {formatShortDay(last.start)}
              </dd>
            </>
          )}
          {updatedAt && (
            <>
              <dt>{t('Aktualizacja')}</dt>
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
                {t('Odśwież teraz')}
              </button>
            )}
            <button type="button" className="button secondary" onClick={() => setChanging(true)}>
              {t('Zmień źródło planu')}
            </button>
          </div>
        )}
      </div>

      <BackupPanel extras={extras} />

      {signedIn && (
        <button type="button" className="panel help-entry" onClick={openFeedback}>
          <span className="help-entry-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 5h16v11H9l-5 4z" />
            </svg>
          </span>
          <span className="help-entry-text">
            <strong>
              {isAdmin ? t('Zgłoszenia od testerów') : t('Zgłoś uwagę lub pomysł')}
              {feedbackNew > 0 && <span className="feedback-count">{feedbackNew}</span>}
            </strong>
            <span>
              {isAdmin
                ? t('Co działa, co nie i czego brakuje - ze zdjęciami i nagraniami')
                : t('Zadania do przetestowania i zgłoszenia - co działa, co nie, czego brakuje')}
            </span>
          </span>
          <svg className="course-row-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}

      <button type="button" className="panel help-entry" onClick={openHelp}>
        <span className="help-entry-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z" />
          </svg>
        </span>
        <span className="help-entry-text">
          <strong>{t('Pomoc i prywatność')}</strong>
          <span>{t('Co Planer zapisuje, kto to widzi i najczęstsze pytania')}</span>
        </span>
        <svg className="course-row-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>

      <div className="panel">
        <p className="hint">
          {signedIn
            ? t('Plan jest zapisany w tej przeglądarce i na Twoim koncie.')
            : t('Plan i link są zapisane tylko w tej przeglądarce.')}
        </p>
        <button type="button" className="button danger" onClick={() => void handleReset()}>
          {signedIn ? t('Wyloguj i usuń dane z tej przeglądarki') : t('Usuń dane z tej przeglądarki')}
        </button>
      </div>

      <p className="app-version">
        {t('Planer · wersja {version}', { version: __APP_VERSION__ })}
        {/* Administrator widzi funkcje w wersji alpha (np. optymalizator) - tu widać, że to konto je ma. */}
        {admin && t(' · administrator')}
      </p>
    </section>
  )
}
