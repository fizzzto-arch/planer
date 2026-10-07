import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cloud } from '../lib/cloudTypes'
import { parseNotification, sortNotifications, unreadCount, type PlanerNotification } from '../lib/notifications'

// Tyle najnowszych powiadomień czyta zakładka - starsze i tak nikt nie przewija, a każde to odczyt z bazy.
const NOTIFICATIONS_SHOWN = 50
// Po otwarciu archiwum - cała historia z 60 dni (więcej i tak nie ma - starsze usuwa serwer).
const NOTIFICATIONS_ALL = 400

const seenKey = (uid: string) => `planer.notifications-seen.${uid}`

function loadSeen(uid: string | null): number {
  if (!uid) return 0
  try {
    return Number(localStorage.getItem(seenKey(uid)) ?? 0) || 0
  } catch {
    return 0
  }
}

// Historia powiadomień z konta (zapisuje ją serwer przypomnień) i znacznik "przeczytane"
// (na tym urządzeniu - kropka przy dzwonku znika po otwarciu zakładki).
export function useNotifications(client: Cloud | null, uid: string | null) {
  const [data, setData] = useState<{ uid: string; list: PlanerNotification[] } | null>(null)
  const [seen, setSeen] = useState<{ uid: string | null; at: number }>(() => ({ uid, at: loadSeen(uid) }))
  const [all, setAll] = useState(false) // archiwum otwarte - czytamy całą historię

  useEffect(() => {
    if (!client || !uid) return
    return client.watchNotifications(
      uid,
      all ? NOTIFICATIONS_ALL : NOTIFICATIONS_SHOWN,
      (docs) => setData({ uid, list: sortNotifications(docs.flatMap((d) => parseNotification(d.id, d.data) ?? [])) }),
      () => {
        // bez historii (np. brak sieci) - zakładka pokaże pustą listę, powiadomienia działają dalej
      },
    )
  }, [client, uid, all])

  const list = useMemo(() => (data && data.uid === uid ? data.list : []), [data, uid])
  const seenAt = seen.uid === uid ? seen.at : loadSeen(uid)

  const markSeen = useCallback(() => {
    if (!uid) return
    const at = Date.now()
    setSeen({ uid, at })
    try {
      localStorage.setItem(seenKey(uid), String(at))
    } catch {
      // bez zapisu kropka wróci po przeładowaniu - nic groźnego
    }
  }, [uid])

  const loadAll = useCallback(() => setAll(true), [])

  return { list, seenAt, unread: unreadCount(list, seenAt), markSeen, loadAll, signedIn: uid !== null }
}

export type NotificationsApi = ReturnType<typeof useNotifications>
