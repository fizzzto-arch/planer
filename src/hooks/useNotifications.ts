import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cloud } from '../lib/cloudTypes'
import { parseNotification, sortNotifications, unreadCount, type PlanerNotification } from '../lib/notifications'

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

  useEffect(() => {
    if (!client || !uid) return
    return client.watchCollection(
      uid,
      'notifications',
      (docs) => setData({ uid, list: sortNotifications(docs.flatMap((d) => parseNotification(d.id, d.data) ?? [])) }),
      () => {
        // bez historii (np. brak sieci) - zakładka pokaże pustą listę, powiadomienia działają dalej
      },
    )
  }, [client, uid])

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

  return { list, seenAt, unread: unreadCount(list, seenAt), markSeen, signedIn: uid !== null }
}

export type NotificationsApi = ReturnType<typeof useNotifications>
