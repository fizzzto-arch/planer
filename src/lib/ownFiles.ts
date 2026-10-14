// Własne zdjęcia i pliki przedmiotu (np. zdjęcie tablicy albo strony podręcznika) - widzi je tylko
// właściciel, na każdym swoim urządzeniu. Zapisane na koncie (users/{uid}/files) w kawałkach, jak
// wspólne materiały (lib/materials.ts) - darmowy plan Firebase nie ma magazynu plików.
import { t } from './i18n'

export const OWN_MAX_FILE_BYTES = 10 * 1024 * 1024
// Na osobę - cała darmowa baza ma 1 GiB (zdjęcia przed wysłaniem są zmniejszane do kilkuset kB).
export const OWN_QUOTA_BYTES = 50 * 1024 * 1024

export interface OwnFile {
  id: string
  courseKey: string
  courseName: string
  name: string
  size: number
  type: string
  chunkCount: number
  thumb: string | null // miniatura zdjęcia (data URL JPEG)
  createdAt: number
  complete: boolean // false = wysyłanie przerwane w połowie
}

export type NewOwnFile = Omit<OwnFile, 'id' | 'createdAt' | 'complete' | 'chunkCount'>

export function parseOwnFile(id: string, raw: Record<string, unknown>): OwnFile | null {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const size = num(raw.size)
  const chunkCount = num(raw.chunkCount)
  if (size === null || chunkCount === null || !str(raw.courseKey)) return null
  const created = raw.createdAt as { toMillis?: () => number } | undefined
  const thumb = str(raw.thumb)
  return {
    id,
    courseKey: str(raw.courseKey),
    courseName: str(raw.courseName),
    name: str(raw.name) || 'plik',
    size,
    type: str(raw.type) || 'application/octet-stream',
    chunkCount,
    thumb: thumb.startsWith('data:image/jpeg;base64,') ? thumb : null,
    createdAt: typeof created?.toMillis === 'function' ? created.toMillis() : (num(raw.createdAt) ?? Date.now()),
    complete: raw.complete === true,
  }
}

// Powód odrzucenia pliku albo null, gdy można go wysłać.
export function checkOwnUpload(size: number, usedBytes: number): string | null {
  if (size > OWN_MAX_FILE_BYTES) return t('Plik jest za duży (limit {mb} MB na plik).', { mb: OWN_MAX_FILE_BYTES / 1024 / 1024 })
  if (usedBytes + size > OWN_QUOTA_BYTES) {
    return t('Brak miejsca na Twoje pliki ({mb} MB) - usuń niepotrzebne.', { mb: OWN_QUOTA_BYTES / 1024 / 1024 })
  }
  return null
}
