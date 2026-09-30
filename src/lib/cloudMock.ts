// Udawana chmura do testów w przeglądarce (tylko wersja deweloperska, adres z "?mock").
// Zachowuje się jak zalogowane konto; dane trzyma w localStorage tej przeglądarki.
// Tryby: ?mock - administrator; ?mock=unverified - niepotwierdzony e-mail;
// ?mock=pending - konto czeka na zatwierdzenie.
import type { AccessRequest, AccessStatus, Cloud, CloudDoc, CloudUser, CollectionName } from './cloudTypes'
import type { PersonInfo } from './usosPeople'

const STORAGE_KEY = 'planer.mock-cloud'
const MOCK_ADMIN_EMAIL = 'test@planer.local' // useCloud traktuje go jako administratora

const mode = new URLSearchParams(window.location.search).get('mock')
const MOCK_USER: CloudUser =
  mode === 'unverified' || mode === 'pending'
    ? { uid: 'mock-student', email: 'student@planer.local', emailVerified: mode === 'pending' }
    : { uid: 'mock-user', email: MOCK_ADMIN_EMAIL, emailVerified: true }

type Store = Record<string, Record<string, Record<string, unknown>>> // kolekcja -> id -> dane

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Store
  } catch {
    return {}
  }
}

function createMockCloud(): Cloud {
  let store = load()
  let user: CloudUser | null = MOCK_USER
  const userListeners = new Set<(u: CloudUser | null) => void>()
  const collectionListeners = new Map<CollectionName, Set<(docs: CloudDoc[]) => void>>()

  const docsOf = (name: CollectionName): CloudDoc[] =>
    Object.entries(store[name] ?? {}).map(([id, data]) => ({ id, data }))

  function emit(name: CollectionName) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      // bez zapisu - dane zostaną tylko do przeładowania
    }
    // Jak Firestore: zmiana lokalna widoczna prawie od razu, ale asynchronicznie.
    setTimeout(() => collectionListeners.get(name)?.forEach((cb) => cb(docsOf(name))), 0)
  }

  const materials = new Map<string, { data: Record<string, unknown>; chunks: Uint8Array[] }>()
  const materialListeners = new Set<(docs: CloudDoc[]) => void>()
  const materialDocs = (): CloudDoc[] => [...materials.entries()].map(([id, m]) => ({ id, data: { ...m.data } }))
  const emitMaterials = () => setTimeout(() => materialListeners.forEach((cb) => cb(materialDocs())), 0)

  const setUser = (next: CloudUser | null) => {
    user = next
    userListeners.forEach((cb) => cb(user))
  }

  // Prośby o dostęp - przykładowe dane do panelu administratora (tylko w pamięci karty).
  const access = new Map<string, AccessRequest>([
    ['u-kumpel', { uid: 'u-kumpel', email: 'kumpel@pw.edu.pl', status: 'pending', requestedAt: Date.now() - 3_600_000, optimizer: false, testerTasks: [] }],
    ['u-ala', { uid: 'u-ala', email: 'ala@gmail.com', status: 'approved', requestedAt: Date.now() - 86_400_000, optimizer: false, testerTasks: ['plan', 'week', 'note'] }],
  ])
  const accessListeners = new Set<() => void>()
  const feedbackStore = new Map<string, { data: Record<string, unknown>; files: Uint8Array[] }>()
  const feedbackListeners = new Set<() => void>()
  const emitFeedback = () => setTimeout(() => feedbackListeners.forEach((cb) => cb()), 0)
  const emitAccess = () => setTimeout(() => accessListeners.forEach((cb) => cb()), 0)
  const peopleStore = new Map<string, PersonInfo>()
  const peopleRequested = new Set<string>()
  const peopleListeners = new Set<() => void>()
  const sharedBusy = new Map<string, Record<string, unknown>>()
  const sharedBusyListeners = new Set<() => void>()
  const mockFriendBusy = () => {
    const busy: number[] = []
    const today = new Date()
    for (let d = 0; d < 14; d++) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d)
      if (day.getDay() === 0 || day.getDay() === 6) continue
      for (const [h1, m1, h2, m2] of [[8, 15, 10, 0], [12, 15, 14, 0], [16, 15, 18, 0]]) {
        busy.push(new Date(day).setHours(h1, m1, 0, 0), new Date(day).setHours(h2, m2, 0, 0))
      }
    }
    return { name: 'Ala (przykład)', busy, updatedAt: Date.now() }
  }

  return {
    watchUser(onChange) {
      userListeners.add(onChange)
      setTimeout(() => onChange(user), 0)
      return () => userListeners.delete(onChange)
    },
    signIn: async () => setUser(MOCK_USER),
    signUp: async () => setUser(MOCK_USER),
    signOut: async () => setUser(null),
    // Zgłoszenia - w pamięci karty (załączniki razem z treścią).
    async submitFeedback(uid, email, feedback, files, onProgress) {
      const id = Math.random().toString(36).slice(2, 10)
      onProgress(0, files.length)
      feedbackStore.set(id, {
        data: {
          ...feedback,
          uid,
          email,
          status: 'new',
          reply: '',
          createdAt: Date.now(),
          complete: true,
          attachments: files.map((f) => ({ name: f.name, type: f.type, size: f.bytes.length, chunkCount: 1 })),
        },
        files: files.map((f) => f.bytes),
      })
      onProgress(files.length, files.length)
      emitFeedback()
    },
    watchFeedback(uid, onDocs) {
      const emit = () =>
        onDocs(
          [...feedbackStore.entries()]
            .filter(([, f]) => uid === null || f.data.uid === uid)
            .map(([id, f]) => ({ id, data: f.data })),
        )
      feedbackListeners.add(emit)
      setTimeout(emit, 0)
      return () => feedbackListeners.delete(emit)
    },
    async updateFeedback(id, patch) {
      const f = feedbackStore.get(id)
      if (f) f.data = { ...f.data, ...patch }
      emitFeedback()
    },
    async downloadFeedbackFile(id, attachment) {
      return [feedbackStore.get(id)?.files[attachment] ?? new Uint8Array(0)]
    },
    async deleteFeedback(id) {
      feedbackStore.delete(id)
      emitFeedback()
    },

    deleteAccount: async () => {
      store = {}
      localStorage.removeItem(STORAGE_KEY)
      setUser(null)
    },
    resetPassword: async () => {},
    sendVerificationEmail: async () => {},
    // Udajemy, że użytkownik kliknął link w mailu przy pierwszym sprawdzeniu.
    refreshUser: async () => {
      if (user && !user.emailVerified) setUser({ ...user, emailVerified: true })
    },

    watchAccess(uid, onAccess) {
      const emitOwn = () => onAccess({ status: access.get(uid)?.status ?? null, optimizer: access.get(uid)?.optimizer ?? false })
      accessListeners.add(emitOwn)
      setTimeout(emitOwn, 0)
      return () => accessListeners.delete(emitOwn)
    },
    async requestAccess(uid, email) {
      access.set(uid, { uid, email, status: 'pending', requestedAt: Date.now(), optimizer: false, testerTasks: [] })
      emitAccess()
    },
    watchAccessRequests(onRequests) {
      const emitAll = () => onRequests([...access.values()])
      accessListeners.add(emitAll)
      setTimeout(emitAll, 0)
      return () => accessListeners.delete(emitAll)
    },
    // Wspólne okienka: przykładowa znajoma (zajęcia 8:15-10:00, 12:15-14:00, 16:15-18:00 w dni robocze).
    // Jak reguły bazy: cudze godziny widać dopiero po udostępnieniu własnych.
    watchSharedBusy(onDocs) {
      const emit = () => {
        const mine = user ? sharedBusy.get(user.uid) : undefined
        const all = mine ? [...sharedBusy.entries(), ['u-ala', mockFriendBusy()] as const] : [...sharedBusy.entries()]
        onDocs(all.map(([id, data]) => ({ id, data: { ...data } })))
      }
      sharedBusyListeners.add(emit)
      setTimeout(emit, 0)
      return () => sharedBusyListeners.delete(emit)
    },
    async saveSharedBusy(uid, name, busy) {
      sharedBusy.set(uid, { name, busy, updatedAt: Date.now() })
      sharedBusyListeners.forEach((cb) => setTimeout(cb, 0))
    },
    async deleteSharedBusy(uid) {
      sharedBusy.delete(uid)
      sharedBusyListeners.forEach((cb) => setTimeout(cb, 0))
    },
    async setAccessStatus(uid, status: AccessStatus) {
      const current = access.get(uid)
      if (current) access.set(uid, { ...current, status })
      emitAccess()
    },
    // Tytuły prowadzących: "serwer" uzupełnia je chwilę po prośbie (jak prawdziwy co kwadrans).
    watchPeople(ids, onPeople) {
      const emit = () => {
        const people: Record<string, PersonInfo> = {}
        for (const id of ids) {
          const p = peopleStore.get(id)
          if (p) people[id] = p
        }
        onPeople(people, ids.filter((id) => peopleStore.has(id) || peopleRequested.has(id)))
      }
      peopleListeners.add(emit)
      setTimeout(emit, 0)
      return () => peopleListeners.delete(emit)
    },
    async requestPeople(ids) {
      for (const id of ids) peopleRequested.add(id)
      setTimeout(() => {
        for (const id of ids) peopleStore.set(id, { title: 'dr inż.', position: 'adiunkt', unit: 'Wydział testowy' })
        peopleListeners.forEach((cb) => cb())
      }, 300)
    },
    async saveTesterProgress(uid, done) {
      const current = access.get(uid)
      if (current) access.set(uid, { ...current, testerTasks: done })
      emitAccess()
    },
    async setOptimizerAccess(uid, on) {
      const current = access.get(uid)
      if (current) access.set(uid, { ...current, optimizer: on })
      emitAccess()
    },

    watchData(_uid, onData) {
      setTimeout(() => onData({ icalUrl: null }), 0)
      return () => {}
    },
    saveIcalUrl: async () => {},

    watchCollection(_uid, name, onDocs) {
      const listeners = collectionListeners.get(name) ?? new Set()
      collectionListeners.set(name, listeners)
      listeners.add(onDocs)
      setTimeout(() => onDocs(docsOf(name)), 0)
      return () => listeners.delete(onDocs)
    },
    async setItem(_uid, name, id, data) {
      store = { ...store, [name]: { ...store[name], [id]: data } }
      emit(name)
    },
    async deleteItem(_uid, name, id) {
      const rest = { ...store[name] }
      delete rest[id]
      store = { ...store, [name]: rest }
      emit(name)
    },
    newId: () => Math.random().toString(36).slice(2, 12),

    // Wspólne materiały - tylko w pamięci karty (pliki są za duże na localStorage).
    watchMaterials(onDocs) {
      materialListeners.add(onDocs)
      setTimeout(() => onDocs(materialDocs()), 0)
      return () => materialListeners.delete(onDocs)
    },
    async uploadMaterial(meta, chunks, onProgress) {
      const id = Math.random().toString(36).slice(2, 12)
      materials.set(id, { data: { ...meta, chunkCount: chunks.length, complete: false, createdAt: Date.now() }, chunks: [] })
      emitMaterials()
      for (let i = 0; i < chunks.length; i++) {
        await new Promise((r) => setTimeout(r, 150)) // udawany czas wysyłania
        materials.get(id)!.chunks.push(chunks[i].slice())
        onProgress(i + 1)
      }
      materials.get(id)!.data.complete = true
      emitMaterials()
    },
    async downloadMaterial(id, chunkCount, onProgress) {
      const entry = materials.get(id)
      if (!entry || entry.chunks.length < chunkCount) throw new Error('Plik jest niekompletny.')
      for (let i = 0; i < chunkCount; i++) {
        await new Promise((r) => setTimeout(r, 100))
        onProgress(i + 1)
      }
      return entry.chunks
    },
    async deleteMaterial(id) {
      materials.delete(id)
      emitMaterials()
    },
  }
}

let instance: Cloud | null = null

export function getMockCloud(): Cloud {
  instance ??= createMockCloud()
  return instance
}
