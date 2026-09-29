// Udawana chmura do testów w przeglądarce (tylko wersja deweloperska, adres z "?mock").
// Zachowuje się jak zalogowane konto; dane trzyma w localStorage tej przeglądarki.
// Tryby: ?mock - administrator; ?mock=unverified - niepotwierdzony e-mail;
// ?mock=pending - konto czeka na zatwierdzenie.
import type { AccessRequest, AccessStatus, Cloud, CloudDoc, CloudUser, CollectionName } from './cloudTypes'

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
    ['u-kumpel', { uid: 'u-kumpel', email: 'kumpel@pw.edu.pl', status: 'pending', requestedAt: Date.now() - 3_600_000 }],
    ['u-ala', { uid: 'u-ala', email: 'ala@gmail.com', status: 'approved', requestedAt: Date.now() - 86_400_000 }],
  ])
  const accessListeners = new Set<() => void>()
  const emitAccess = () => setTimeout(() => accessListeners.forEach((cb) => cb()), 0)

  return {
    watchUser(onChange) {
      userListeners.add(onChange)
      setTimeout(() => onChange(user), 0)
      return () => userListeners.delete(onChange)
    },
    signIn: async () => setUser(MOCK_USER),
    signUp: async () => setUser(MOCK_USER),
    signOut: async () => setUser(null),
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

    watchAccess(uid, onStatus) {
      const emitOwn = () => onStatus(access.get(uid)?.status ?? null)
      accessListeners.add(emitOwn)
      setTimeout(emitOwn, 0)
      return () => accessListeners.delete(emitOwn)
    },
    async requestAccess(uid, email) {
      access.set(uid, { uid, email, status: 'pending', requestedAt: Date.now() })
      emitAccess()
    },
    watchAccessRequests(onRequests) {
      const emitAll = () => onRequests([...access.values()])
      accessListeners.add(emitAll)
      setTimeout(emitAll, 0)
      return () => accessListeners.delete(emitAll)
    },
    async setAccessStatus(uid, status: AccessStatus) {
      const current = access.get(uid)
      if (current) access.set(uid, { ...current, status })
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
