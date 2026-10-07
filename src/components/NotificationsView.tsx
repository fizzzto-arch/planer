import { locale, t } from '../lib/i18n'
import { useEffect, useState, type ReactNode } from 'react'
import type { NotificationsApi } from '../hooks/useNotifications'
import { usePlanUi } from '../hooks/planUi'
import { NOTIFICATION_KEEP_DAYS, splitCleared, type NotificationKind, type PlanerNotification } from '../lib/notifications'

interface Props {
  notifications: NotificationsApi
  now: Date
  clearedAt: number | null // "Wyczyść" - wcześniejsze są w archiwum (zapis w ustawieniach na koncie)
  onClear: () => void
}

const icon = (d: string): ReactNode => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
)

const KIND = (): Record<NotificationKind, { label: string; icon: ReactNode }> => ({
  deadline: { label: t('Termin'), icon: icon('M8 3v4M16 3v4M4 9h16M5 5h14v15H5z') },
  plan: { label: t('Zmiana w planie'), icon: icon('M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4') },
  day: { label: t('Plan dnia'), icon: icon('M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5 18 18M6 18l1.5-1.5M16.5 7.5 18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z') },
  first: { label: t('Przed zajęciami'), icon: icon('M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z') },
  access: { label: t('Nowe konto'), icon: icon('M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0') },
  feedback: { label: t('Zgłoszenie'), icon: icon('M4 5h16v11H9l-5 4z') },
  reply: { label: t('Odpowiedź'), icon: icon('M4 5h16v11H9l-5 4zM8 9h8M8 12h5') },
})

function dayLabel(ms: number, now: Date): string {
  const d = new Date(ms)
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  )
  if (days === 0) return t('Dziś')
  if (days === 1) return t('Wczoraj')
  return d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })

// Historia powiadomień: to samo, co przyszło na telefon, także gdy zniknęło z ekranu blokady.
export function NotificationsView({ notifications, now, clearedAt, onClear }: Props) {
  const { openSettings } = usePlanUi()
  const { list, seenAt, markSeen, loadAll, signedIn } = notifications
  // Co było nowe w chwili otwarcia - podświetlenie zostaje do wyjścia z zakładki.
  const [newSince] = useState(seenAt)
  useEffect(() => {
    markSeen()
  }, [markSeen, list.length])

  if (!signedIn) {
    return (
      <section>
        <h2 className="day-title">{t('Powiadomienia')}</h2>
        <p className="empty-state">{t('Zaloguj się, żeby dostawać przypomnienia i powiadomienia o zmianach w planie.')}</p>
      </section>
    )
  }

  const { current, archived } = splitCleared(list, clearedAt)
  const byDay = (items: PlanerNotification[]) => {
    const groups: { label: string; items: PlanerNotification[] }[] = []
    for (const n of items) {
      const label = n.createdAt === null ? t('Teraz') : dayLabel(n.createdAt, now)
      const last = groups[groups.length - 1]
      if (last?.label === label) last.items.push(n)
      else groups.push({ label, items: [n] })
    }
    return groups.map((g) => (
      <div key={g.label} className="notification-group">
        <h3 className="notification-day">{g.label}</h3>
        <ul className="notification-list">
          {g.items.map((n) => (
            <NotificationItem key={n.id} item={n} isNew={(n.createdAt ?? Infinity) > newSince} />
          ))}
        </ul>
      </div>
    ))
  }

  return (
    <section className="notifications">
      <div className="section-head">
        <h2 className="day-title">{t('Powiadomienia')}</h2>
        {current.length > 0 && (
          <button type="button" className="button small secondary" onClick={onClear}>
            {t('Wyczyść')}
          </button>
        )}
      </div>
      {current.length > 0 ? (
        byDay(current)
      ) : clearedAt !== null ? (
        <p className="empty-state">{t('Wszystko przeczytane i wyczyszczone. Wcześniejsze są w archiwum niżej.')}</p>
      ) : (
        <div className="empty-state">
          <p>{t('Tu pojawi się każde powiadomienie od Planera - przypomnienia o terminach, zmiany w planie, plan dnia.')}</p>
          <button type="button" className="link-button" onClick={openSettings}>
            {t('Ustaw przypomnienia')}
          </button>
        </div>
      )}

      {/* Archiwum: wyczyszczone (do usunięcia przez serwer po 60 dniach) - cała historia dopiero po otwarciu. */}
      {clearedAt !== null && (
        <details
          className="collapsible notification-archive"
          onToggle={(e) => {
            if (e.currentTarget.open) loadAll()
          }}
        >
          <summary>{t('Archiwum')}</summary>
          {archived.length > 0 ? byDay(archived) : <p className="muted">{t('Pusto.')}</p>}
          <p className="hint">{t('Wyczyszczone powiadomienia z ostatnich {n} dni - starsze znikają same.', { n: NOTIFICATION_KEEP_DAYS })}</p>
        </details>
      )}
      {clearedAt === null && current.length > 0 && (
        <p className="hint">{t('Ostatnie powiadomienia z {n} dni.', { n: NOTIFICATION_KEEP_DAYS })}</p>
      )}
    </section>
  )
}

function NotificationItem({ item, isNew }: { item: PlanerNotification; isNew: boolean }) {
  const kind = KIND()[item.kind]
  // Pełna lista, gdy powiadomienie jej nie mieściło (np. 5 zmian w planie, w powiadomieniu 3).
  const lines = item.details.length > 0 ? item.details : item.body.split('\n')
  return (
    <li className={`notification kind-${item.kind}${isNew ? ' is-new' : ''}`}>
      <span className="notification-icon">{kind.icon}</span>
      <div className="notification-text">
        <div className="notification-head">
          <strong>{item.title}</strong>
          <span className="muted small">{item.createdAt ? clock(item.createdAt) : ''}</span>
        </div>
        {lines.length > 1 ? (
          <ul className="notification-lines">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ) : (
          <p>{lines[0]}</p>
        )}
        <span className="notification-kind">{kind.label}</span>
      </div>
    </li>
  )
}
