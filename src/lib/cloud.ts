// Logowanie i synchronizacja przez Firebase. Moduł ładowany dynamicznie,
// żeby nie spowalniać pierwszego wyświetlenia planu.
import { FirebaseError, getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore'
import type { Cloud } from './cloudTypes'
import { chunkId } from './materials'

export type { Cloud, CloudUser, CloudData } from './cloudTypes'

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Nieprawidłowy e-mail lub hasło.',
  'auth/wrong-password': 'Nieprawidłowy e-mail lub hasło.',
  'auth/user-not-found': 'Nieprawidłowy e-mail lub hasło.',
  'auth/invalid-email': 'To nie wygląda na adres e-mail.',
  'auth/missing-email': 'Wpisz adres e-mail.',
  'auth/missing-password': 'Wpisz hasło.',
  'auth/user-disabled': 'To konto zostało zablokowane.',
  'auth/too-many-requests': 'Za dużo prób. Spróbuj ponownie za kilka minut.',
  'auth/network-request-failed': 'Brak połączenia z internetem.',
  'auth/operation-not-allowed': 'Logowanie e-mailem nie jest jeszcze włączone w Firebase.',
  'auth/configuration-not-found': 'Logowanie nie jest jeszcze skonfigurowane w Firebase.',
  'auth/email-already-in-use': 'Konto z tym e-mailem już istnieje. Zaloguj się.',
  'auth/weak-password': 'Hasło musi mieć co najmniej 6 znaków.',
  'auth/admin-restricted-operation': 'Rejestracja jest wyłączona. Poproś administratora Planera o konto.',
}

function describeError(e: unknown): string {
  if (e instanceof FirebaseError) {
    if (AUTH_ERRORS[e.code]) return AUTH_ERRORS[e.code]
    if (e.code === 'permission-denied') {
      return 'Twój e-mail nie jest jeszcze na liście osób z dostępem. Poproś administratora Planera o dopisanie. Do tego czasu plan działa tylko na tym urządzeniu.'
    }
    if (e.code === 'unavailable') return 'Brak połączenia z serwerem synchronizacji.'
    return `Błąd synchronizacji (${e.code}).`
  }
  return 'Coś poszło nie tak.'
}

async function wrap(task: () => Promise<unknown>): Promise<void> {
  try {
    await task()
  } catch (e) {
    throw new Error(describeError(e))
  }
}

// Pamięć podręczna na dysku: dodatki widać od razu, także offline, a zmiany
// zrobione bez internetu wysyłają się same po powrocie połączenia.
function openFirestore(app: ReturnType<typeof getApp>): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch {
    // np. przeglądarka bez IndexedDB albo baza już zainicjowana
    return getFirestore(app)
  }
}

function createCloud(config: FirebaseOptions): Cloud {
  // getApps() chroni przed podwójną inicjalizacją (React w trybie deweloperskim montuje dwa razy).
  const app = getApps().length > 0 ? getApp() : initializeApp(config)
  const auth = getAuth(app)
  auth.languageCode = 'pl' // maile (np. reset hasła) po polsku
  const db = openFirestore(app)

  return {
    watchUser(onChange) {
      return onAuthStateChanged(auth, (u) => onChange(u ? { uid: u.uid, email: u.email } : null))
    },

    signIn: (email, password) => wrap(() => signInWithEmailAndPassword(auth, email, password)),
    signUp: (email, password) => wrap(() => createUserWithEmailAndPassword(auth, email, password)),
    signOut: () => signOut(auth),
    resetPassword: (email) => wrap(() => sendPasswordResetEmail(auth, email)),

    watchData(uid, onData, onError) {
      return onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          const data = snap.data()
          onData({ icalUrl: typeof data?.icalUrl === 'string' ? data.icalUrl : null })
        },
        (e) => onError(describeError(e)),
      )
    },

    saveIcalUrl: (uid, url) =>
      wrap(() => setDoc(doc(db, 'users', uid), { icalUrl: url, updatedAt: serverTimestamp() }, { merge: true })),

    watchCollection(uid, name, onDocs, onError) {
      return onSnapshot(
        collection(db, 'users', uid, name),
        (snap) => onDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() }))),
        (e) => onError(describeError(e)),
      )
    },

    setItem: (uid, name, id, data) =>
      wrap(() => setDoc(doc(db, 'users', uid, name, id), { ...data, updatedAt: serverTimestamp() })),

    deleteItem: (uid, name, id) => wrap(() => deleteDoc(doc(db, 'users', uid, name, id))),

    newId: () => doc(collection(db, '_')).id,

    watchMaterials(onDocs, onError) {
      return onSnapshot(
        collection(db, 'materials'),
        (snap) => onDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() }))),
        (e) => onError(describeError(e)),
      )
    },

    // Kolejność ma znaczenie dla reguł: najpierw metadane (właściciel), potem kawałki,
    // na końcu znacznik "complete" - niedokończone wysyłanie nie pokaże się innym.
    uploadMaterial: (meta, chunks, onProgress) =>
      wrap(async () => {
        const ref = doc(collection(db, 'materials'))
        await setDoc(ref, { ...meta, chunkCount: chunks.length, complete: false, createdAt: serverTimestamp() })
        for (let i = 0; i < chunks.length; i++) {
          await setDoc(doc(db, 'materials', ref.id, 'chunks', chunkId(i)), { data: Bytes.fromUint8Array(chunks[i]) })
          onProgress(i + 1)
        }
        await setDoc(ref, { complete: true }, { merge: true })
      }),

    async downloadMaterial(id, chunkCount, onProgress) {
      const chunks: Uint8Array[] = []
      try {
        for (let i = 0; i < chunkCount; i++) {
          const snap = await getDoc(doc(db, 'materials', id, 'chunks', chunkId(i)))
          const data = snap.data()?.data
          if (!(data instanceof Bytes)) throw new Error('Plik jest niekompletny.')
          chunks.push(data.toUint8Array())
          onProgress(i + 1)
        }
      } catch (e) {
        throw new Error(e instanceof FirebaseError ? describeError(e) : errorText(e))
      }
      return chunks
    },

    // Kawałki przed metadanymi - reguły sprawdzają właściciela w metadanych.
    deleteMaterial: (id, chunkCount) =>
      wrap(async () => {
        for (let i = 0; i < chunkCount; i++) await deleteDoc(doc(db, 'materials', id, 'chunks', chunkId(i)))
        await deleteDoc(doc(db, 'materials', id))
      }),
  }
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Coś poszło nie tak.'
}

let instance: Cloud | null = null

export function getCloud(config: FirebaseOptions): Cloud {
  instance ??= createCloud(config)
  return instance
}
