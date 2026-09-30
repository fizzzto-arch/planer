import { useEffect, useMemo, useRef, useState } from 'react'
import type { Cloud } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import { fetchCourseStaff, loadCachedStaff, saveCachedStaff, staffCacheKey, type CourseStaff } from '../lib/staff'
import type { Meeting } from '../lib/usos'
import type { PersonInfo } from '../lib/usosPeople'

type Status = { kind: 'loading' } | { kind: 'ready' } | { kind: 'none' } | { kind: 'error'; message: string }

// Koordynatorzy i prowadzący grup użytkownika (API USOS) + tytuły z bazy (people/{id}).
// client = null (bez logowania): same nazwiska, bez tytułów.
export function useCourseStaff(meetings: Pick<Meeting, 'unitId' | 'groupNumber' | 'type'>[], client: Cloud | null) {
  const key = staffCacheKey(meetings)
  const [data, setData] = useState<{ key: string; staff: CourseStaff | null } | null>(() => {
    const cached = loadCachedStaff(key)
    return cached ? { key, staff: cached } : null
  })
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const [people, setPeople] = useState<Record<string, PersonInfo>>({})
  const asked = useRef(new Set<string>())

  const current = data?.key === key ? data : null
  const meetingsRef = useRef(meetings)
  meetingsRef.current = meetings

  useEffect(() => {
    if (current || key === '') return
    let cancelled = false
    fetchCourseStaff(meetingsRef.current)
      .then((staff) => {
        if (cancelled) return
        if (staff) saveCachedStaff(key, staff)
        setData({ key, staff })
      })
      .catch((e) => {
        if (!cancelled) setError({ key, message: errorMessage(e) })
      })
    return () => {
      cancelled = true
    }
  }, [key, current])

  const staff = current?.staff ?? null
  const ids = useMemo(() => {
    if (!staff) return []
    return [...new Set([...staff.coordinators, ...staff.groups.flatMap((g) => g.lecturers)].map((p) => p.id))].sort()
  }, [staff])
  const idsKey = ids.join(',')

  useEffect(() => {
    if (!client || ids.length === 0) return
    return client.watchPeople(ids, (found, requested) => {
      setPeople(found)
      // Osoby, o które nikt jeszcze nie prosił - serwer doczyta ich tytuły (raz na sesję).
      const missing = ids.filter((id) => !requested.includes(id) && !asked.current.has(id))
      if (missing.length > 0) {
        missing.forEach((id) => asked.current.add(id))
        void client.requestPeople(missing)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ids zmienia się razem z idsKey
  }, [client, idsKey])

  let status: Status
  if (key === '') status = { kind: 'none' }
  else if (error?.key === key && !current) status = { kind: 'error', message: error.message }
  else if (!current) status = { kind: 'loading' }
  else if (!staff) status = { kind: 'none' }
  else status = { kind: 'ready' }

  return { staff, people, status }
}
