import { useEffect, useMemo, useRef, useState } from 'react'
import type { Cloud } from '../lib/cloudTypes'
import { startOfDay } from '../lib/dates'
import { busyFromMeetings, flattenBusy, parseSharedBusy, type SharedBusy } from '../lib/freeWindows'

// Raz na sesję przy wyłączonej opcji usuwamy swój wpis - także gdy włączono ją na innym urządzeniu.
let cleanedThisSession = false

// Wspólne okienka: przy włączonej opcji publikuje moje godziny zajęć (i odświeża je, gdy zmieni się
// plan albo minie doba), po wyłączeniu je usuwa. Cudze godziny widać dopiero po opublikowaniu
// własnych (wzajemność pilnowana regułami bazy) - dlatego najpierw zapis, potem nasłuch.
export function useSharedBusy(
  client: Cloud | null,
  uid: string | null,
  email: string | null,
  meetings: { start: Date; end: Date; cancelled: boolean }[],
  share: boolean,
  shareName: string,
  now: Date,
) {
  const [data, setData] = useState<{ uid: string; list: SharedBusy[] } | null>(null)
  // Zwiększane po pierwszym zapisie - nasłuch rusza ponownie, już z prawem odczytu.
  const [readyToRead, setReadyToRead] = useState(0)
  const lastPayload = useRef<string | null>(null)
  const lastPublished = useRef<string | null>(null) // null = w tej sesji jeszcze nic nie zapisano

  const dayKey = startOfDay(now).getTime()
  const myBusy = useMemo(() => busyFromMeetings(meetings, new Date(dayKey)), [meetings, dayKey])
  const name = shareName.trim() || email?.split('@')[0] || 'Znajomy'

  useEffect(() => {
    if (!client || !uid) return
    if (!share) {
      lastPayload.current = null
      if (!cleanedThisSession) {
        cleanedThisSession = true
        void client.deleteSharedBusy(uid).catch(() => undefined)
      }
      return
    }
    const flat = flattenBusy(myBusy)
    const payload = JSON.stringify([name, flat])
    if (payload === lastPayload.current) return
    lastPayload.current = payload
    cleanedThisSession = false // po ponownym wyłączeniu trzeba znów usunąć
    const first = lastPublished.current === null
    client
      .saveSharedBusy(uid, name, flat)
      .then(() => {
        lastPublished.current = payload
        if (first) setReadyToRead((n) => n + 1)
      })
      .catch(() => {
        lastPayload.current = null // spróbujemy przy następnej zmianie
      })
  }, [client, uid, share, name, myBusy])

  useEffect(() => {
    if (!client || !uid || !share) return
    return client.watchSharedBusy(
      (docs) => setData({ uid, list: docs.map((d) => parseSharedBusy(d.id, d.data)) }),
      () => undefined, // brak prawa odczytu (jeszcze nic nie opublikowano) albo brak sieci
    )
  }, [client, uid, share, readyToRead])

  const list = share && data && data.uid === uid ? data.list : []
  return {
    available: client !== null && uid !== null,
    sharing: share,
    myBusy,
    friends: list.filter((p) => p.uid !== uid),
  }
}

export type SharedBusyApi = ReturnType<typeof useSharedBusy>
