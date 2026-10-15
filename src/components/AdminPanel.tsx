import { t, tk } from '../lib/i18n'
import { useSyncExternalStore } from 'react'
import type { AccessRequestsApi } from '../hooks/useAccessRequests'
import type { AccessRequest } from '../lib/cloudTypes'
import { addDays, formatUpdatedAt, startOfDay, toDateKey } from '../lib/dates'
import { plural } from '../lib/plural'
import { VISIT_DAYS, visitSummary } from '../lib/visits'
import { tasksFor } from '../lib/testerTasks'
import { setSwipeDebug, swipeDebugStore } from '../lib/swipeDebug'
import { SwitchSetting } from './SettingControls'

interface Props {
  admin: AccessRequestsApi
  now: Date
  onViewAsUser: () => void // podgląd Planera oczami zwykłego użytkownika
}

const STATUS_ORDER = { pending: 0, approved: 1, rejected: 2 } as const

// Ostatnie 7 dni jako kratki (od najstarszego do dziś) - od razu widać, kto zagląda regularnie.
function VisitDays({ visits, now }: { visits: AccessRequest['visits']; now: Date }) {
  const days = Array.from({ length: VISIT_DAYS }, (_, i) => toDateKey(addDays(startOfDay(now), i - (VISIT_DAYS - 1))))
  return (
    <span className="visit-days" aria-hidden="true">
      {days.map((day) => (
        <i key={day} className={visits[day] ? 'is-on' : undefined} title={`${day}: ${visits[day] ?? 0}`} />
      ))}
    </span>
  )
}

// "ostatnie 7 dni: 5 otwarć (3 dni) · ostatnio dziś 14:05"
function visitsText(request: AccessRequest, now: Date): string {
  const { opens, days } = visitSummary(request.visits, now)
  const last = request.lastSeenAt ? ' · ' + t('ostatnio {when}', { when: formatUpdatedAt(new Date(request.lastSeenAt), now) }) : ''
  if (opens === 0) return t('brak otwarć w ostatnich 7 dniach') + last
  return (
    t('ostatnie 7 dni: {opens} {openWord} ({days} {dayWord})', {
      opens,
      openWord: plural(opens, 'otwarcie', 'otwarcia', 'otwarć'),
      days,
      dayWord: plural(days, 'dzień', 'dni', 'dni'),
    }) + last
  )
}

function RequestRow({ request, admin, now }: { request: AccessRequest } & Omit<Props, 'onViewAsUser'>) {
  const { uid, email, status, requestedAt, optimizer } = request
  // Postęp w zadaniach dla testerów (lista zależy od tego, czy ma optymalizator).
  const tasks = tasksFor(optimizer)
  const tasksDone = tasks.filter((t) => request.testerTasks.includes(t.id))
  return (
    <li className={`access-row is-${status}`}>
      <span className="access-main">
        <span className="access-email">{email}</span>
        <span className="access-meta">
          {status === 'pending' ? t('czeka na zatwierdzenie') : status === 'approved' ? t('ma dostęp') : t('odrzucone')}
          {status === 'approved' && optimizer && ' · ' + t('optymalizator')}
          {requestedAt && ' · ' + t('zgłoszenie {when}', { when: formatUpdatedAt(new Date(requestedAt), now) })}
        </span>
        {status === 'approved' && (
          <span
            className="access-meta"
            title={tasksDone.length > 0 ? t('Zrobione: {tasks}', { tasks: tasksDone.map((task) => tk(task.title)).join(', ') }) : undefined}
          >
            {t('zadania testera: {done}/{total}', { done: tasksDone.length, total: tasks.length })}
            {tasksDone.length === tasks.length && ' ✓'}
          </span>
        )}
        {status === 'approved' && (
          <span className="access-meta access-visits">
            <VisitDays visits={request.visits} now={now} />
            {visitsText(request, now)}
          </span>
        )}
      </span>
      <span className="access-actions">
        {/* Optymalizator (wersja testowa) dla wybranych osób - tylko przy zatwierdzonych kontach. */}
        {status === 'approved' && (
          <button
            type="button"
            className={`button small ${optimizer ? '' : 'secondary'}`}
            aria-pressed={optimizer}
            title={t('Dostęp do optymalizatora (wersja testowa)')}
            onClick={() => admin.setOptimizer(uid, !optimizer)}
          >
            {optimizer ? t('Optymalizator ✓') : t('Optymalizator')}
          </button>
        )}
        {status !== 'approved' && (
          <button type="button" className="button small" onClick={() => admin.setStatus(uid, 'approved')}>
            {t('Zatwierdź')}
          </button>
        )}
        {status === 'pending' && (
          <button type="button" className="button small secondary" onClick={() => admin.setStatus(uid, 'rejected')}>
            {t('Odrzuć')}
          </button>
        )}
        {status === 'approved' && (
          <button
            type="button"
            className="button small danger"
            onClick={() => {
              if (window.confirm(t('Cofnąć dostęp dla {email}? Straci synchronizację i wspólne materiały.', { email }))) {
                admin.setStatus(uid, 'rejected')
              }
            }}
          >
            {t('Cofnij dostęp')}
          </button>
        )}
      </span>
    </li>
  )
}

// Zatwierdzanie nowych kont - widoczne tylko dla administratora.
export function AdminPanel({ admin, now, onViewAsUser }: Props) {
  const debugGestures = useSyncExternalStore(swipeDebugStore.subscribe, swipeDebugStore.enabled)
  // Zatwierdzone: najpierw ci, którzy byli ostatnio - na dole ci, którzy nie zaglądają.
  const sorted = [...admin.requests].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.status === 'approved' ? (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0) : 0) ||
      a.email.localeCompare(b.email),
  )
  const approved = admin.requests.filter((r) => r.status === 'approved')
  const active = approved.filter((r) => visitSummary(r.visits, now).opens > 0).length

  return (
    <div className="panel">
      <h3 className="panel-title">
        {t('Dostęp do Planera')}
        {admin.pendingCount > 0 && <span className="count-pill">{admin.pendingCount}</span>}
      </h3>
      <p className="hint">
        {t('Nowe konta pojawiają się tu po potwierdzeniu e-maila. Konta z mailem uczelnianym (PW, WAT) mają dostęp od razu, pozostałe czekają na Twoje zatwierdzenie. „Optymalizator” daje wybranej osobie wersję testową „Dobierz grupy”. Licznik otwarć liczy start Planera i powrót do niego po co najmniej 30 minutach.')}
      </p>
      {approved.length > 0 && (
        <p className="access-summary">
          {t('Korzystało w ostatnich 7 dniach: {active} z {total} kont z dostępem.', { active, total: approved.length })}
        </p>
      )}
      <button type="button" className="button small secondary view-as-user" onClick={onViewAsUser}>
        {t('Zobacz Planera jako zwykły użytkownik')}
      </button>
      {admin.error ? (
        <p className="error">{admin.error}</p>
      ) : !admin.loaded ? (
        <p className="muted loading-line">
          <span className="spinner" aria-hidden="true" />
          {t('Ładowanie…')}
        </p>
      ) : sorted.length === 0 ? (
        <p className="muted">{t('Nikt jeszcze nie prosił o dostęp.')}</p>
      ) : (
        <ul className="access-list">
          {sorted.map((r) => (
            <RequestRow key={r.uid} request={r} admin={admin} now={now} />
          ))}
        </ul>
      )}
      <SwitchSetting
        label={t('Diagnostyka gestów')}
        hint={t('Pokazuje na dole ekranu, co telefon wysyła przy przesuwaniu palcem. Tylko na tym urządzeniu.')}
        checked={debugGestures}
        onChange={setSwipeDebug}
      />
    </div>
  )
}
