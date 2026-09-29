import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Cloud, CloudDoc } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import { parseFeedback, type Feedback, type FeedbackFile, type FeedbackStatus, type NewFeedback } from '../lib/feedback'
import { joinChunks } from '../lib/materials'

const toList = (docs: CloudDoc[]) =>
  docs
    .flatMap((d) => parseFeedback(d.id, d.data) ?? [])
    .sort((a, b) => (b.createdAt ?? Infinity) - (a.createdAt ?? Infinity))

// Zgłoszenia: własne (każdy) i wszystkie (administrator).
export function useFeedback(client: Cloud | null, uid: string | null, email: string | null, admin: boolean) {
  const [own, setOwn] = useState<{ uid: string; list: Feedback[] } | null>(null)
  const [all, setAll] = useState<Feedback[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client || !uid) return
    return client.watchFeedback(uid, (docs) => setOwn({ uid, list: toList(docs) }), setError)
  }, [client, uid])

  useEffect(() => {
    if (!client || !admin) return
    return client.watchFeedback(null, (docs) => setAll(toList(docs)), setError)
  }, [client, admin])

  const submit = useCallback(
    async (feedback: NewFeedback, files: FeedbackFile[], onProgress: (done: number, total: number) => void) => {
      if (!client || !uid) throw new Error('Zaloguj się, żeby wysłać zgłoszenie.')
      await client.submitFeedback(uid, email ?? '', feedback, files, onProgress)
    },
    [client, uid, email],
  )

  const update = useCallback(
    (id: string, patch: { status?: FeedbackStatus; reply?: string }) => {
      client?.updateFeedback(id, patch).catch((e) => setError(errorMessage(e)))
    },
    [client],
  )

  const remove = useCallback(
    (f: Feedback) => {
      client?.deleteFeedback(f.id, f.attachments).catch((e) => setError(errorMessage(e)))
    },
    [client],
  )

  const download = useCallback(
    async (f: Feedback, index: number): Promise<Blob> => {
      if (!client) throw new Error('Brak połączenia.')
      const a = f.attachments[index]
      const chunks = await client.downloadFeedbackFile(f.id, index, a.chunkCount)
      return new Blob([joinChunks(chunks)], { type: a.type })
    },
    [client],
  )

  const ownList = useMemo(() => (own && own.uid === uid ? own.list : []), [own, uid])
  // Administrator widzi tylko dokończone zgłoszenia (przerwane wysyłanie nie ma wszystkich załączników).
  const allList = useMemo(() => (all ?? []).filter((f) => f.complete), [all])

  return {
    own: ownList,
    all: allList,
    newCount: allList.filter((f) => f.status === 'new').length,
    error,
    submit,
    update,
    remove,
    download,
  }
}

export type FeedbackApi = ReturnType<typeof useFeedback>

// Zdjęcie do zgłoszenia: najwyżej 1920 px, JPEG - z kilku MB robi się kilkaset kB.
// Nagrania i pliki, których przeglądarka nie odczyta jako obraz, idą bez zmian.
export async function prepareAttachment(file: File): Promise<FeedbackFile> {
  const original = async (): Promise<FeedbackFile> => ({
    name: file.name,
    type: file.type || 'application/octet-stream',
    bytes: new Uint8Array(await file.arrayBuffer()),
  })
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return original()
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return original()
    return {
      name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
      type: 'image/jpeg',
      bytes: new Uint8Array(await blob.arrayBuffer()),
    }
  } catch {
    return original()
  }
}
