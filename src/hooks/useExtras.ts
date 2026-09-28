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
import { parsePrefs, type Prefs } from '../lib/prefs'
import { parseTypeColors, type TypeColors } from '../lib/typeColors'
import { RETRY_AFTER_MS } from './useCloud'

const COLLECTIONS: CollectionName[] = ['courses', 'deadlines', 'meetingEdits', 'seriesEdits', 'customMeetings', 'settings']

// Dokumenty w kolekcji "settings": kolory typów zajęć i pozostałe ustawienia.
const COLORS_DOC = 'colors'
const PREFS_DOC = 'prefs'

export type RawCollections = Partial<Record<CollectionName, CloudDoc[]>>

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
  const prefsDoc = raw.settings?.find((d) => d.id === PREFS_DOC)
  return {
    courses,
    deadlines: (raw.deadlines ?? []).flatMap((d) => parseDeadline(d.id, d.data) ?? []),
    meetingEdits: new Map((raw.meetingEdits ?? []).map((d) => [d.id, parseMeetingEdit(d.id, d.data)])),
    seriesEdits: new Map((raw.seriesEdits ?? []).map((d) => [d.id, parseSeriesEdit(d.id, d.data)])),
    customMeetings: (raw.customMeetings ?? []).flatMap((d) => parseCustomMeeting(d.id, d.data) ?? []),
    typeColors: parseTypeColors(raw.settings?.find((d) => d.id === COLORS_DOC)?.data ?? {}),
    prefs: prefsDoc ? parsePrefs(prefsDoc.data) : null,
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

  const savePrefs = useCallback(
    (prefs: Prefs) => write((c, u) => c.setItem(u, 'settings', PREFS_DOC, { ...prefs })),
    [write],
  )

  // Kopia zapasowa: wszystkie dokumenty dodatków (bez znaczników czasu serwera).
  const exportBackup = useCallback((): BackupFile => {
    const data: Record<string, CloudDoc[]> = {}
    for (const name of COLLECTIONS) {
      data[name] = (collections?.[name] ?? []).map((d) => {
        const { updatedAt: _updatedAt, ...rest } = d.data
        return { id: d.id, data: rest }
      })
    }
    return { app: 'planer', version: 1, exportedAt: new Date().toISOString(), collections: data }
  }, [collections])

  // Przywraca dokumenty z kopii (nadpisuje te o tych samych id, reszty nie rusza).
  const importBackup = useCallback(
    async (backup: BackupFile): Promise<number> => {
      if (!client || !uid) return 0
      let count = 0
      for (const name of COLLECTIONS) {
        for (const d of backup.collections[name] ?? []) {
          await client.setItem(uid, name, d.id, d.data)
          count++
        }
      }
      return count
    },
    [client, uid],
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
    savePrefs,
    exportBackup,
    importBackup,
  }
}

export interface BackupFile {
  app: 'planer'
  version: 1
  exportedAt: string
  collections: Record<string, CloudDoc[]>
}

// Sprawdza, czy wczytany plik to kopia Planera; zwraca ją albo powód odrzucenia.
export function parseBackup(value: unknown): BackupFile | string {
  if (typeof value !== 'object' || value === null) return 'To nie jest plik kopii Planera.'
  const v = value as Record<string, unknown>
  if (v.app !== 'planer' || v.version !== 1) return 'To nie jest plik kopii Planera (albo pochodzi z nowszej wersji).'
  if (typeof v.collections !== 'object' || v.collections === null) return 'Plik kopii jest uszkodzony.'
  const collections: Record<string, CloudDoc[]> = {}
  for (const name of COLLECTIONS) {
    const docs = (v.collections as Record<string, unknown>)[name]
    if (docs === undefined) continue
    if (!Array.isArray(docs)) return 'Plik kopii jest uszkodzony.'
    collections[name] = docs.filter(
      (d): d is CloudDoc =>
        typeof d === 'object' && d !== null && typeof d.id === 'string' && d.id.length > 0 && !d.id.includes('/') &&
        typeof d.data === 'object' && d.data !== null,
    )
  }
  return { app: 'planer', version: 1, exportedAt: String(v.exportedAt ?? ''), collections }
}

export type ExtrasApi = NonNullable<ReturnType<typeof useExtras>>
