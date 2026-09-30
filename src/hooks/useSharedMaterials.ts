import { t } from '../lib/i18n'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Cloud, CloudDoc } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import {
  checkUpload,
  joinChunks,
  parseMaterial,
  splitIntoChunks,
  uploaderNameFromEmail,
  type MaterialMeta,
} from '../lib/materials'
import { safeBlobType } from '../lib/safeBlob'
import { RETRY_AFTER_MS } from './useCloud'

export interface UploadProgress {
  courseKey: string
  name: string
  done: number
  total: number
}

// Wspólne materiały przedmiotów - dostępne dla wszystkich zalogowanych z listy dostępu.
export function useSharedMaterials(client: Cloud | null, uid: string | null, email: string | null) {
  const [raw, setRaw] = useState<{ uid: string; docs: CloudDoc[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [uploading, setUploading] = useState<UploadProgress | null>(null)
  const [downloading, setDownloading] = useState<Record<string, number>>({}) // id -> postęp 0..1
  const [urls, setUrls] = useState<Record<string, string>>({}) // id -> adres pobranego pliku
  const blobs = useRef(new Map<string, Blob>())

  useEffect(() => {
    if (!client || !uid) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = client.watchMaterials(
      (docs) => {
        setRaw({ uid, docs })
        setError(null)
      },
      (message) => {
        setError(message)
        retryTimer = setTimeout(() => setRetry((n) => n + 1), RETRY_AFTER_MS)
      },
    )
    return () => {
      clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [client, uid, retry])

  const all = useMemo(
    () => (raw && raw.uid === uid ? raw.docs.flatMap((d) => parseMaterial(d.id, d.data) ?? []) : []),
    [raw, uid],
  )
  const usedBytes = useMemo(() => all.reduce((sum, m) => sum + m.size, 0), [all])

  // Niedokończone wysyłanie widzi tylko jego autor (żeby mógł je usunąć).
  const forCourse = useCallback(
    (courseKey: string) =>
      all
        .filter((m) => m.courseKey === courseKey && (m.complete || m.uploadedBy === uid))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true })),
    [all, uid],
  )

  const upload = useCallback(
    async (courseKey: string, courseName: string, file: File): Promise<boolean> => {
      if (!client || !uid) return false
      const problem = checkUpload(file.size, usedBytes)
      if (problem) {
        setError(problem)
        return false
      }
      setError(null)
      try {
        const chunks = splitIntoChunks(new Uint8Array(await file.arrayBuffer()))
        setUploading({ courseKey, name: file.name, done: 0, total: chunks.length })
        await client.uploadMaterial(
          {
            courseKey,
            courseName,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            uploadedBy: uid,
            uploaderName: uploaderNameFromEmail(email),
          },
          chunks,
          (done) => setUploading((u) => u && { ...u, done }),
        )
        return true
      } catch (e) {
        setError(t('Nie udało się wysłać „{name}”: {error}', { name: file.name, error: errorMessage(e) }))
        return false
      } finally {
        setUploading(null)
      }
    },
    [client, uid, email, usedBytes],
  )

  // Pobiera plik i zwraca jego adres; kolejne otwarcia korzystają z pobranej kopii.
  const download = useCallback(
    async (meta: MaterialMeta): Promise<string | null> => {
      if (urls[meta.id]) return urls[meta.id]
      if (!client) return null
      setDownloading((d) => ({ ...d, [meta.id]: 0 }))
      try {
        const chunks = await client.downloadMaterial(meta.id, meta.chunkCount, (done) =>
          setDownloading((d) => ({ ...d, [meta.id]: done / meta.chunkCount })),
        )
        // Typ z bazy wpisał autor pliku - otwieramy tylko bezpieczne (PDF, zdjęcia), resztę pobieramy.
        const blob = new Blob([joinChunks(chunks)], { type: safeBlobType(meta.type) })
        const url = URL.createObjectURL(blob)
        blobs.current.set(meta.id, blob)
        setUrls((u) => ({ ...u, [meta.id]: url }))
        return url
      } catch (e) {
        setError(t('Nie udało się pobrać „{name}”: {error}', { name: meta.name, error: errorMessage(e) }))
        return null
      } finally {
        setDownloading(({ [meta.id]: _done, ...rest }) => rest)
      }
    },
    [client, urls],
  )

  // Otwiera od razu, jeśli przeglądarka pozwoli; jeśli nie - nazwa pliku staje się linkiem.
  const open = useCallback(
    async (meta: MaterialMeta) => {
      const url = await download(meta)
      if (url) window.open(url, '_blank', 'noopener')
    },
    [download],
  )

  const share = useCallback(async (meta: MaterialMeta) => {
    const blob = blobs.current.get(meta.id)
    if (!blob) return
    try {
      await navigator.share({ files: [new File([blob], meta.name, { type: meta.type })], title: meta.name })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(errorMessage(e))
    }
  }, [])

  const remove = useCallback(
    async (meta: MaterialMeta) => {
      if (!client) return
      try {
        await client.deleteMaterial(meta.id, meta.chunkCount)
        const url = urls[meta.id]
        if (url) URL.revokeObjectURL(url)
        blobs.current.delete(meta.id)
      } catch (e) {
        setError(t('Nie udało się usunąć „{name}”: {error}', { name: meta.name, error: errorMessage(e) }))
      }
    },
    [client, urls],
  )

  if (!client || !uid) return null

  return { forCourse, usedBytes, uploading, downloading, urls, error, uid, upload, open, share, remove }
}

export type SharedMaterialsApi = NonNullable<ReturnType<typeof useSharedMaterials>>
