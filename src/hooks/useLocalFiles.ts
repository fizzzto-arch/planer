import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { addFile, deleteFile, listFiles, type LocalFileInfo, type StoredFile } from '../lib/localFiles'

export interface LocalFileView extends LocalFileInfo {
  url: string // adres do otwarcia pliku zwykłym linkiem (ważny, dopóki lista jest na ekranie)
}

export function useLocalFiles(courseKey: string) {
  const [stored, setStored] = useState<StoredFile[]>([])
  const [files, setFiles] = useState<LocalFileView[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    let urls: string[] = []
    listFiles(courseKey)
      .then((list) => {
        if (cancelled) return
        urls = list.map((f) => URL.createObjectURL(f.blob))
        setStored(list)
        setFiles(list.map(({ blob: _blob, ...info }, i) => ({ ...info, url: urls[i] })))
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [courseKey, version])

  const add = useCallback(
    async (fileList: FileList) => {
      setBusy(true)
      setError(null)
      try {
        for (const file of Array.from(fileList)) await addFile(courseKey, file)
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setBusy(false)
        setVersion((v) => v + 1)
      }
    },
    [courseKey],
  )

  const remove = useCallback(async (id: string) => {
    try {
      await deleteFile(id)
    } catch (e) {
      setError(errorMessage(e))
    }
    setVersion((v) => v + 1)
  }, [])

  // Na telefonie: arkusz "Udostępnij" (podgląd, zapis w Plikach, otwarcie w innej aplikacji).
  const share = useCallback(
    async (id: string) => {
      const file = stored.find((f) => f.id === id)
      if (!file) return
      try {
        const shared = new File([file.blob], file.name, { type: file.type })
        await navigator.share({ files: [shared], title: file.name })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return // użytkownik zamknął arkusz
        setError(errorMessage(e))
      }
    },
    [stored],
  )

  const canShare =
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([''], 'test.pdf', { type: 'application/pdf' })] })

  return { files, busy, error, add, remove, share, canShare }
}
