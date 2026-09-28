import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cloud, CloudDoc, CollectionName } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import {
  EMPTY_EXTRAS,
  courseKey,
  parseCourse,
  parseCustomMeeting,
  parseDeadline,
  parseMeetingEdit,
  parseSeriesEdit,
  type CourseExtra,
  type CourseLink,
  type CustomMeeting,
  type Deadline,
  type Extras,
  type MeetingOverride,
  type SeriesEdit,
} from '../lib/extras'
import { parseTypeColors, type TypeColors } from '../lib/typeColors'
import { RETRY_AFTER_MS } from './useCloud'

const COLLECTIONS: CollectionName[] = ['courses', 'deadlines', 'meetingEdits', 'seriesEdits', 'customMeetings', 'settings']

// Dokument w kolekcji "settings" z kolorami typów zajęć.
const COLORS_DOC = 'colors'

type RawCollections = Partial<Record<CollectionName, CloudDoc[]>>

// Firestore nie przyjmuje wartości undefined - usuwamy je przed zapisem.
function clean<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

function toExtras(raw: RawCollections): Extras {
  const courses = new Map<string, CourseExtra>()
  for (const d of raw.courses ?? []) {
    const course = parseCourse(d.data)
    if (course) courses.set(d.id, course)
  }
  return {
    courses,
    deadlines: (raw.deadlines ?? []).flatMap((d) => parseDeadline(d.id, d.data) ?? []),
    meetingEdits: new Map((raw.meetingEdits ?? []).map((d) => [d.id, parseMeetingEdit(d.id, d.data)])),
    seriesEdits: new Map((raw.seriesEdits ?? []).map((d) => [d.id, parseSeriesEdit(d.id, d.data)])),
    customMeetings: (raw.customMeetings ?? []).flatMap((d) => parseCustomMeeting(d.id, d.data) ?? []),
    typeColors: parseTypeColors(raw.settings?.find((d) => d.id === COLORS_DOC)?.data ?? {}),
  }
}

// Dodatki użytkownika (notatki, terminy, zmiany planu). Działają tylko po zalogowaniu.
export function useExtras(client: Cloud | null, uid: string | null) {
  // Dane zapamiętane razem z uid - po wylogowaniu same przestają pasować.
  const [raw, setRaw] = useState<{ uid: string; collections: RawCollections } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!client || !uid) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribers = COLLECTIONS.map((name) =>
      client.watchCollection(
        uid,
        name,
        (docs) => {
          setRaw((prev) => ({
            uid,
            collections: { ...(prev?.uid === uid ? prev.collections : {}), [name]: docs },
          }))
          setError(null)
        },
        (message) => {
          setError(message)
          clearTimeout(retryTimer)
          retryTimer = setTimeout(() => setRetry((n) => n + 1), RETRY_AFTER_MS)
        },
      ),
    )
    return () => {
      clearTimeout(retryTimer)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [client, uid, retry])

  const collections = raw && raw.uid === uid ? raw.collections : null
  const extras = useMemo(() => (collections ? toExtras(collections) : EMPTY_EXTRAS), [collections])

  // Zapisy nie czekają na serwer: Firestore pokazuje zmianę od razu, a wysyła ją,
  // gdy będzie internet. Tu łapiemy tylko błędy (np. brak dostępu).
  const write = useCallback(
    (task: (c: Cloud, u: string) => Promise<void>) => {
      if (!client || !uid) return
      task(client, uid).catch((e) => setError(errorMessage(e)))
    },
    [client, uid],
  )

  const saveCourseNote = useCallback(
    (courseName: string, note: string) => {
      const key = courseKey(courseName)
      const links = extras.courses.get(key)?.links ?? []
      write((c, u) => c.setItem(u, 'courses', key, { name: courseName, note, links }))
    },
    [extras, write],
  )

  const saveCourseLinks = useCallback(
    (courseName: string, links: CourseLink[]) => {
      const key = courseKey(courseName)
      const note = extras.courses.get(key)?.note ?? ''
      write((c, u) => c.setItem(u, 'courses', key, { name: courseName, note, links }))
    },
    [extras, write],
  )

  const saveDeadline = useCallback(
    (deadline: Omit<Deadline, 'id'> & { id?: string }) => {
      write((c, u) => {
        const { id, ...data } = deadline
        return c.setItem(u, 'deadlines', id || c.newId(), clean(data))
      })
    },
    [write],
  )

  const deleteDeadline = useCallback(
    (id: string) => write((c, u) => c.deleteItem(u, 'deadlines', id)),
    [write],
  )

  // Notatka i ręczna zmiana jednych zajęć żyją w jednym dokumencie.
  const saveMeetingEdit = useCallback(
    (meetingId: string, patch: { note?: string; override?: MeetingOverride | null }) => {
      const current = extras.meetingEdits.get(meetingId)
      const note = patch.note ?? current?.note ?? ''
      const override = patch.override !== undefined ? patch.override : (current?.override ?? null)
      write((c, u) =>
        !note && !override
          ? c.deleteItem(u, 'meetingEdits', meetingId)
          : c.setItem(u, 'meetingEdits', meetingId, { note, override: override ? clean(override) : null }),
      )
    },
    [extras, write],
  )

  const saveSeriesEdit = useCallback(
    (edit: SeriesEdit) => {
      const { id, ...data } = edit
      write((c, u) =>
        !data.room && !data.startTime && !data.endTime
          ? c.deleteItem(u, 'seriesEdits', id)
          : c.setItem(u, 'seriesEdits', id, data),
      )
    },
    [write],
  )

  const saveCustomMeeting = useCallback(
    (meeting: Omit<CustomMeeting, 'id'> & { id?: string }) => {
      write((c, u) => {
        const { id, ...data } = meeting
        return c.setItem(u, 'customMeetings', id || c.newId(), data)
      })
    },
    [write],
  )

  const deleteCustomMeeting = useCallback(
    (id: string) => write((c, u) => c.deleteItem(u, 'customMeetings', id)),
    [write],
  )

  const saveTypeColors = useCallback(
    (colors: TypeColors) =>
      write((c, u) =>
        Object.keys(colors).length === 0
          ? c.deleteItem(u, 'settings', COLORS_DOC)
          : c.setItem(u, 'settings', COLORS_DOC, colors),
      ),
    [write],
  )

  if (!client || !uid) return null

  return {
    ready: collections !== null && COLLECTIONS.every((name) => collections[name] !== undefined),
    extras,
    error,
    saveCourseNote,
    saveCourseLinks,
    saveDeadline,
    deleteDeadline,
    saveMeetingEdit,
    saveSeriesEdit,
    saveCustomMeeting,
    deleteCustomMeeting,
    saveTypeColors,
  }
}

export type ExtrasApi = NonNullable<ReturnType<typeof useExtras>>
