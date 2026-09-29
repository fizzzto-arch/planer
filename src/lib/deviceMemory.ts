// "Zapamiętaj mnie na tym urządzeniu". Bez zapamiętania (np. komputer w bibliotece) logowanie trwa
// do zamknięcia przeglądarki, a przy następnym uruchomieniu kasujemy z urządzenia wszystko,
// co Planer zostawił: plan, ustawienia, kopię danych z konta i pliki PDF.

const EPHEMERAL_KEY = 'planer.ephemeral' // localStorage: to urządzenie ma nie pamiętać danych
const SESSION_KEY = 'planer.session' // sessionStorage: znika razem z zamknięciem przeglądarki

export function setRememberDevice(remember: boolean): void {
  try {
    if (remember) localStorage.removeItem(EPHEMERAL_KEY)
    else localStorage.setItem(EPHEMERAL_KEY, '1')
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // bez dostępu do pamięci przeglądarki nic nie zostaje zapisane i tak
  }
}

export function isEphemeralDevice(): boolean {
  try {
    return localStorage.getItem(EPHEMERAL_KEY) === '1'
  } catch {
    return false
  }
}

// Wszystkie dane Planera w tej przeglądarce: localStorage i bazy IndexedDB
// (Firebase: sesja i kopia danych konta, lokalne pliki PDF).
export async function wipeLocalData(): Promise<void> {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('planer.')) localStorage.removeItem(key)
    sessionStorage.clear()
  } catch {
    // brak dostępu - nie ma czego czyścić
  }
  const known = ['firebaseLocalStorageDb', 'planer-files']
  let names = known
  try {
    const dbs = await indexedDB.databases()
    names = [...new Set([...known, ...dbs.map((d) => d.name).filter((n): n is string => !!n)])]
  } catch {
    // starsze przeglądarki bez indexedDB.databases() - usuwamy znane bazy
  }
  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name)
          request.onsuccess = request.onerror = request.onblocked = () => resolve()
        }),
    ),
  )
}

// Przy starcie: poprzednia sesja "bez zapamiętania" się skończyła - czyścimy po niej.
export async function wipeIfSessionEnded(): Promise<void> {
  try {
    const ended = isEphemeralDevice() && sessionStorage.getItem(SESSION_KEY) !== '1'
    sessionStorage.setItem(SESSION_KEY, '1')
    if (ended) await wipeLocalData()
  } catch {
    // bez dostępu do pamięci przeglądarki nie ma czego czyścić
  }
}
