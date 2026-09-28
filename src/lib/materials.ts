// Wspólne materiały przedmiotu (np. wykłady w PDF) zapisane w bazie Firestore.
// Darmowy plan Firebase nie ma magazynu plików, a dokument w bazie mieści ok. 1 MB,
// więc plik dzielimy na kawałki i zapisujemy jako osobne dokumenty.

export const CHUNK_BYTES = 900 * 1024 // zapas poniżej limitu 1 MiB na dokument
export const MAX_FILE_BYTES = 20 * 1024 * 1024
// Cała darmowa baza ma 1 GiB - zostawiamy miejsce na notatki, terminy itd.
export const QUOTA_BYTES = 900 * 1024 * 1024

export interface MaterialMeta {
  id: string
  courseKey: string
  courseName: string
  name: string
  size: number
  type: string
  chunkCount: number
  uploadedBy: string // uid
  uploaderName: string // część e-maila przed @
  createdAt: number
  complete: boolean // false = wysyłanie przerwane w połowie
}

export type NewMaterial = Omit<MaterialMeta, 'id' | 'createdAt' | 'complete' | 'chunkCount'>

export function splitIntoChunks(bytes: Uint8Array, chunkSize = CHUNK_BYTES): Uint8Array[] {
  const chunks: Uint8Array[] = []
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    chunks.push(bytes.subarray(offset, offset + chunkSize))
  }
  return chunks.length > 0 ? chunks : [new Uint8Array(0)]
}

export function joinChunks(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// Id kawałka: "0000", "0001"... - kolejność alfabetyczna = kolejność w pliku.
export function chunkId(index: number): string {
  return String(index).padStart(4, '0')
}

export function uploaderNameFromEmail(email: string | null): string {
  return email?.split('@')[0] || 'ktoś'
}

// Powód odrzucenia pliku albo null, gdy można go wysłać.
export function checkUpload(size: number, usedBytes: number): string | null {
  if (size > MAX_FILE_BYTES) return `Plik jest za duży (limit ${MAX_FILE_BYTES / 1024 / 1024} MB na plik).`
  if (usedBytes + size > QUOTA_BYTES) return 'Brak miejsca na wspólne materiały - usuńcie niepotrzebne pliki.'
  return null
}

export function parseMaterial(id: string, raw: Record<string, unknown>): MaterialMeta | null {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const size = num(raw.size)
  const chunkCount = num(raw.chunkCount)
  if (size === null || chunkCount === null || !str(raw.courseKey) || !str(raw.uploadedBy)) return null
  // createdAt z serwera to Timestamp (ma toMillis), lokalnie jeszcze przed zapisem - brak
  const created = raw.createdAt as { toMillis?: () => number } | undefined
  return {
    id,
    courseKey: str(raw.courseKey),
    courseName: str(raw.courseName),
    name: str(raw.name) || 'plik',
    size,
    type: str(raw.type) || 'application/octet-stream',
    chunkCount,
    uploadedBy: str(raw.uploadedBy),
    uploaderName: str(raw.uploaderName) || 'ktoś',
    createdAt: typeof created?.toMillis === 'function' ? created.toMillis() : (num(raw.createdAt) ?? Date.now()),
    complete: raw.complete === true,
  }
}
