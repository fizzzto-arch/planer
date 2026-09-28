// Pliki (np. wykłady w PDF) trzymane tylko na tym urządzeniu, w IndexedDB przeglądarki.
// Nie synchronizują się - przechowywanie plików w chmurze Firebase wymaga płatnego planu.

const DB_NAME = 'planer-files'
const STORE = 'files'
const DB_VERSION = 1

export interface LocalFileInfo {
  id: string
  courseKey: string
  name: string
  size: number
  type: string
  addedAt: number
}

export interface StoredFile extends LocalFileInfo {
  blob: Blob
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('courseKey', 'courseKey')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(new Error('Ta przeglądarka nie pozwala zapisywać plików (np. tryb prywatny).'))
    }
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = action(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = () => reject(describe(tx.error))
        tx.onabort = () => reject(describe(tx.error))
      }),
  )
}

function describe(error: DOMException | null): Error {
  if (error?.name === 'QuotaExceededError') return new Error('Brak miejsca na urządzeniu na ten plik.')
  return new Error('Nie udało się zapisać pliku na urządzeniu.')
}

function newId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

// Prosimy przeglądarkę, żeby nie kasowała plików przy braku miejsca (nie każda się zgadza).
function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {})
}

// Pliki przedmiotu posortowane naturalnie (Wykład 2 przed Wykład 10).
export async function listFiles(courseKey: string): Promise<StoredFile[]> {
  const files = await run<StoredFile[]>('readonly', (store) => store.index('courseKey').getAll(courseKey))
  return files.sort((a, b) => a.name.localeCompare(b.name, 'pl', { numeric: true }))
}

export async function addFile(courseKey: string, file: File): Promise<void> {
  requestPersistence()
  const stored: StoredFile = {
    id: newId(),
    courseKey,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    addedAt: Date.now(),
    blob: file,
  }
  await run('readwrite', (store) => store.put(stored))
}

export async function deleteFile(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id))
}

// "1,4 MB"
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
