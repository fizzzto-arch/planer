// Udawana chmura do testów w przeglądarce (tylko wersja deweloperska, adres z "?mock").
// Zachowuje się jak zalogowane konto; dane trzyma w localStorage tej przeglądarki.
import type { Cloud, CloudDoc, CloudUser, CollectionName } from './cloudTypes'

const STORAGE_KEY = 'planer.mock-cloud'
const MOCK_USER: CloudUser = { uid: 'mock-user', email: 'test@planer.local' }

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

  const setUser = (next: CloudUser | null) => {
    user = next
    userListeners.forEach((cb) => cb(user))
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
    resetPassword: async () => {},

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
  }
}

let instance: Cloud | null = null

export function getMockCloud(): Cloud {
  instance ??= createMockCloud()
  return instance
}
