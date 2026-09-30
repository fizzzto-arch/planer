// Historia powiadomień: serwer przypomnień (scripts/send-reminders.ts) zapisuje każde wysłane
// powiadomienie w users/{uid}/notifications, a Planer pokazuje je w zakładce z dzwonkiem -
// także te, które zniknęły z telefonu albo nie doszły. Bez importów - czyta go też Node.

export type NotificationKind = 'deadline' | 'plan' | 'day' | 'first' | 'access' | 'feedback' | 'reply'

export const NOTIFICATION_KINDS: NotificationKind[] = ['deadline', 'plan', 'day', 'first', 'access', 'feedback', 'reply']

export interface PlanerNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  details: string[] // pełna lista (np. wszystkie zmiany w planie - w powiadomieniu mieszczą się 3)
  createdAt: number | null // null = zapis jeszcze w drodze
}

// Jak długo trzymamy historię - starsze serwer usuwa.
export const NOTIFICATION_KEEP_DAYS = 60

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

export function parseNotification(id: string, raw: Record<string, unknown>): PlanerNotification | null {
  const kind = raw.kind as NotificationKind
  if (!NOTIFICATION_KINDS.includes(kind) || typeof raw.title !== 'string') return null
  const created = raw.createdAt as { toMillis?: () => number } | number | undefined
  return {
    id,
    kind,
    title: str(raw.title, 200),
    body: str(raw.body, 1000),
    details: Array.isArray(raw.details) ? raw.details.filter((d): d is string => typeof d === 'string').slice(0, 100) : [],
    createdAt: typeof created === 'number' ? created : typeof created?.toMillis === 'function' ? created.toMillis() : null,
  }
}

// Nowsze wyżej; "w drodze" (bez daty) na samej górze.
export function sortNotifications(list: PlanerNotification[]): PlanerNotification[] {
  return [...list].sort((a, b) => (b.createdAt ?? Infinity) - (a.createdAt ?? Infinity))
}

// Ile nieprzeczytanych: nowszych niż ostatnie otwarcie zakładki.
export function unreadCount(list: PlanerNotification[], seenAt: number): number {
  return list.filter((n) => (n.createdAt ?? Infinity) > seenAt).length
}
