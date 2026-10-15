import { t } from '../lib/i18n'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Cloud, CloudDoc } from '../lib/cloudTypes'
import { errorMessage } from '../lib/errors'
import { shrinkImage, thumbnail } from '../lib/images'
import { joinChunks, splitIntoChunks } from '../lib/materials'
import { checkOwnUpload, parseOwnFile, type OwnFile } from '../lib/ownFiles'
import { safeBlobType } from '../lib/safeBlob'
import { RETRY_AFTER_MS } from './useCloud'
import type { UploadProgress } from './useSharedMaterials'

// Własne zdjęcia i pliki przedmiotów - tylko dla zalogowanego, na każdym jego urządzeniu.
export function useOwnFiles(client: Cloud | null, uid: string | null) {
  const [raw, setRaw] = useState<{ uid: string; docs: CloudDoc[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [uploading, setUploading] = useState<UploadProgress | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({}) // id -> adres pobranego pliku
  const blobs = useRef(new Map<string, Blob>())

  useEffect(() => {
    if (!client || !uid) return
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = client.watchCollection(
      uid,
      'files',
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
    () => (raw && raw.uid === uid ? raw.docs.flatMap((d) => parseOwnFile(d.id, d.data) ?? []) : []),
    [raw, uid],
  )
  const usedBytes = useMemo(() => all.reduce((sum, f) => sum + f.size, 0), [all])

  // Najnowsze na początku - zdjęcie z ostatnich zajęć jest pod ręką.
  const forCourse = useCallback(
    (courseKey: string) => all.filter((f) => f.courseKey === courseKey).sort((a, b) => b.createdAt - a.createdAt),
    [all],
  )

  const upload = useCallback(
    async (courseKey: string, courseName: string, files: FileList | File[]) => {
      if (!client || !uid) return
      let used = usedBytes
      for (const file of [...files]) {
        // Zdjęcie zmniejszone (najwyżej 1920 px) - mieści się zwykle w jednym kawałku.
        const prepared = await shrinkImage(file)
        const problem = checkOwnUpload(prepared.bytes.length, used)
        if (problem) {
          setError(problem)
          return
        }
        setError(null)
        try {
          const chunks = splitIntoChunks(prepared.bytes)
          setUploading({ courseKey, name: prepared.name, done: 0, total: chunks.length })
          await client.uploadOwnFile(
            uid,
            { courseKey, courseName, name: prepared.name, size: prepared.bytes.length, type: prepared.type, thumb: await thumbnail(file) },
            chunks,
            (done) => setUploading((u) => u && { ...u, done }),
          )
          used += prepared.bytes.length
        } catch (e) {
          setError(t('Nie udało się wysłać „{name}”: {error}', { name: file.name, error: errorMessage(e) }))
          return
        } finally {
          setUploading(null)
        }
      }
    },
    [client, uid, usedBytes],
  )

  // Pobiera plik i zwraca jego adres; kolejne otwarcia korzystają z pobranej kopii.
  const download = useCallback(
    async (file: OwnFile): Promise<string | null> => {
      if (urls[file.id]) return urls[file.id]
      if (!client || !uid) return null
      try {
        const chunks = await client.downloadOwnFile(uid, file.id, file.chunkCount, () => {})
        const blob = new Blob([joinChunks(chunks)], { type: safeBlobType(file.type) })
        const url = URL.createObjectURL(blob)
        blobs.current.set(file.id, blob)
        setUrls((u) => ({ ...u, [file.id]: url }))
        return url
      } catch (e) {
        setError(t('Nie udało się pobrać „{name}”: {error}', { name: file.name, error: errorMessage(e) }))
        return null
      }
    },
    [client, uid, urls],
  )

  const share = useCallback(async (file: OwnFile) => {
    const blob = blobs.current.get(file.id)
    if (!blob) return
    try {
      await navigator.share({ files: [new File([blob], file.name, { type: file.type })], title: file.name })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(errorMessage(e))
    }
  }, [])

  const remove = useCallback(
    async (file: OwnFile) => {
      if (!client || !uid) return
      try {
        await client.deleteOwnFile(uid, file.id, file.chunkCount)
        const url = urls[file.id]
        if (url) URL.revokeObjectURL(url)
        blobs.current.delete(file.id)
      } catch (e) {
        setError(t('Nie udało się usunąć „{name}”: {error}', { name: file.name, error: errorMessage(e) }))
      }
    },
    [client, uid, urls],
  )

  if (!client || !uid) return null

  return { forCourse, usedBytes, uploading, error, urls, upload, download, share, remove }
}

export type OwnFilesApi = NonNullable<ReturnType<typeof useOwnFiles>>
