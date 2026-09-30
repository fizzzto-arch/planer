// Logowanie i synchronizacja przez Firebase. Moduł ładowany dynamicznie,
// żeby nie spowalniać pierwszego wyświetlenia planu.
import { FirebaseError, getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  EmailAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  Bytes,
  collection,
  deleteDoc,
  documentId,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import { COLLECTION_NAMES, type AccessStatus, type Cloud } from './cloudTypes'
import type { PersonInfo } from './usosPeople'

// Wszystkie prywatne kolekcje konta (users/{uid}/...) - do usunięcia razem z kontem.
const ACCOUNT_COLLECTIONS = COLLECTION_NAMES
import { chunkCountFor, feedbackChunkId } from './feedback'
import { chunkId, splitIntoChunks } from './materials'

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
      return 'Brak dostępu do danych konta. Jeśli konto czeka na zatwierdzenie, poczekaj na administratora Planera.'
    }
    if (e.code === 'unavailable') return 'Brak połączenia z serwerem synchronizacji.'
    return `Błąd synchronizacji (${e.code}).`
  }
  return 'Coś poszło nie tak.'
}

function parseAccessStatus(value: unknown): AccessStatus | null {
  return value === 'pending' || value === 'approved' || value === 'rejected' ? value : null
}

// Po kliknięciu linku w mailu Firebase pokazuje przycisk powrotu do Planera.
function verificationSettings() {
  return { url: window.location.origin + window.location.pathname }
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
    // onIdTokenChanged (a nie onAuthStateChanged) - odzywa się też po odświeżeniu tokenu,
    // czyli wtedy, gdy e-mail właśnie został potwierdzony.
    watchUser(onChange) {
      return onIdTokenChanged(auth, (u) =>
        onChange(u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null),
      )
    },

    signIn: (email, password, remember) =>
      wrap(async () => {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
        await signInWithEmailAndPassword(auth, email, password)
      }),
    // Po rejestracji od razu wysyłamy link potwierdzający e-mail.
    signUp: (email, password, remember) =>
      wrap(async () => {
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        await sendEmailVerification(user, verificationSettings())
      }),
    signOut: () => signOut(auth),
    resetPassword: (email) => wrap(() => sendPasswordResetEmail(auth, email)),

    sendVerificationEmail: () =>
      wrap(async () => {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser, verificationSettings())
      }),

    // Pobiera świeży stan konta i nowy token (w nim serwer zapisuje "e-mail potwierdzony").
    refreshUser: () =>
      wrap(async () => {
        const user = auth.currentUser
        if (!user) return
        await user.reload()
        await user.getIdToken(true)
      }),

    watchAccess(uid, onAccess, onError) {
      return onSnapshot(
        doc(db, 'access', uid),
        (snap) => onAccess({ status: parseAccessStatus(snap.data()?.status), optimizer: snap.data()?.optimizer === true }),
        (e) => onError(describeError(e)),
      )
    },

    // Reguły wymagają "e-mail potwierdzony" w tokenie. Zaraz po kliknięciu linku token bywa
    // jeszcze stary - bez odświeżenia zapis odbijał się od reguł i prośba nigdy nie powstawała.
    requestAccess: (uid, email) =>
      wrap(async () => {
        await auth.currentUser?.getIdToken(true)
        await setDoc(doc(db, 'access', uid), { email, status: 'pending', requestedAt: serverTimestamp() })
      }),

    watchAccessRequests(onRequests, onError) {
      return onSnapshot(
        collection(db, 'access'),
        (snap) =>
          onRequests(
            snap.docs.flatMap((d) => {
              const data = d.data()
              const status = parseAccessStatus(data.status)
              if (!status) return []
              const requested = data.requestedAt as { toMillis?: () => number } | undefined
              return [
                {
                  uid: d.id,
                  email: typeof data.email === 'string' ? data.email : '?',
                  status,
                  requestedAt: typeof requested?.toMillis === 'function' ? requested.toMillis() : null,
                  optimizer: data.optimizer === true,
                  testerTasks: Array.isArray(data.testerTasks) ? data.testerTasks.filter((t): t is string => typeof t === 'string') : [],
                },
              ]
            }),
          ),
        (e) => onError(describeError(e)),
      )
    },

    setAccessStatus: (uid, status) =>
      wrap(() => setDoc(doc(db, 'access', uid), { status, decidedAt: serverTimestamp() }, { merge: true })),

    setOptimizerAccess: (uid, on) => wrap(() => setDoc(doc(db, 'access', uid), { optimizer: on }, { merge: true })),
    saveTesterProgress: (uid, done) => wrap(() => setDoc(doc(db, 'access', uid), { testerTasks: done }, { merge: true })),

    watchSharedBusy(onDocs, onError) {
      return onSnapshot(
        collection(db, 'sharedBusy'),
        (snap) => onDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() }))),
        (e) => onError(describeError(e)),
      )
    },
    saveSharedBusy: (uid, name, busy) =>
      wrap(() => setDoc(doc(db, 'sharedBusy', uid), { name, busy, updatedAt: serverTimestamp() })),
    deleteSharedBusy: (uid) => wrap(() => deleteDoc(doc(db, 'sharedBusy', uid))),

    // Firestore: "in" przyjmuje najwyżej 30 wartości - dzielimy listę na paczki.
    watchPeople(ids, onPeople) {
      const chunks: string[][] = []
      for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30))
      const results = chunks.map(() => new Map<string, Record<string, unknown>>())
      const emit = () => {
        const people: Record<string, PersonInfo> = {}
        const requested: string[] = []
        for (const map of results) {
          for (const [id, data] of map) {
            requested.push(id)
            if (data.pending === true) continue
            const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
            people[id] = { title: str(data.title), position: str(data.position), unit: str(data.unit) }
          }
        }
        onPeople(people, requested)
      }
      const unsubscribers = chunks.map((chunk, i) =>
        onSnapshot(
          query(collection(db, 'people'), where(documentId(), 'in', chunk)),
          (snap) => {
            results[i] = new Map(snap.docs.map((d) => [d.id, d.data()]))
            emit()
          },
          () => undefined, // bez tytułów - same nazwiska też wystarczą
        ),
      )
      return () => unsubscribers.forEach((u) => u())
    },

    async requestPeople(ids) {
      await Promise.all(
        ids.map((id) =>
          setDoc(doc(db, 'people', id), { pending: true, requestedAt: serverTimestamp() }).catch(() => undefined),
        ),
      )
    },

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

    // Zgłoszenie: najpierw treść (reguły sprawdzają autora), potem kawałki załączników,
    // na końcu "complete" - administrator widzi tylko dokończone.
    submitFeedback: (uid, email, feedback, files, onProgress) =>
      wrap(async () => {
        const ref = doc(collection(db, 'feedback'))
        const attachments = files.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.bytes.length,
          chunkCount: chunkCountFor(f.bytes.length),
        }))
        await setDoc(ref, {
          ...feedback,
          uid,
          email,
          status: 'new',
          reply: '',
          attachments,
          size: attachments.reduce((s, a) => s + a.size, 0),
          complete: false,
          createdAt: serverTimestamp(),
        })
        const total = attachments.reduce((s, a) => s + a.chunkCount, 0)
        let done = 0
        onProgress(done, total)
        for (let a = 0; a < files.length; a++) {
          const chunks = splitIntoChunks(files[a].bytes)
          for (let i = 0; i < chunks.length; i++) {
            await setDoc(doc(db, 'feedback', ref.id, 'chunks', feedbackChunkId(a, i)), { data: Bytes.fromUint8Array(chunks[i]) })
            onProgress(++done, total)
          }
        }
        await setDoc(ref, { complete: true }, { merge: true })
      }),

    watchFeedback(uid, onDocs, onError) {
      const source = uid ? query(collection(db, 'feedback'), where('uid', '==', uid)) : collection(db, 'feedback')
      return onSnapshot(
        source,
        (snap) => onDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() }))),
        (e) => onError(describeError(e)),
      )
    },

    updateFeedback: (id, patch) => wrap(() => setDoc(doc(db, 'feedback', id), patch, { merge: true })),

    async downloadFeedbackFile(id, attachment, chunkCount) {
      const chunks: Uint8Array[] = []
      for (let i = 0; i < chunkCount; i++) {
        const snap = await getDoc(doc(db, 'feedback', id, 'chunks', feedbackChunkId(attachment, i)))
        const data = snap.data()?.data as Bytes | undefined
        if (!data) throw new Error('Brakuje części załącznika.')
        chunks.push(data.toUint8Array())
      }
      return chunks
    },

    // Kawałki przed zgłoszeniem - reguły sprawdzają autora w zgłoszeniu.
    deleteFeedback: (id, attachments) =>
      wrap(async () => {
        for (let a = 0; a < attachments.length; a++) {
          for (let i = 0; i < attachments[a].chunkCount; i++) {
            await deleteDoc(doc(db, 'feedback', id, 'chunks', feedbackChunkId(a, i)))
          }
        }
        await deleteDoc(doc(db, 'feedback', id))
      }),

    // Kolejność ma znaczenie: dane usuwamy, póki reguły jeszcze wpuszczają (konto zatwierdzone),
    // potem prośbę o dostęp, a na końcu samo konto.
    deleteAccount: (password) =>
      wrap(async () => {
        const user = auth.currentUser
        if (!user?.email) return
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
        const uid = user.uid
        for (const name of ACCOUNT_COLLECTIONS) {
          const snap = await getDocs(collection(db, 'users', uid, name))
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
        }
        await deleteDoc(doc(db, 'users', uid))
        const own = await getDocs(query(collection(db, 'materials'), where('uploadedBy', '==', uid)))
        for (const m of own.docs) {
          const chunks = await getDocs(collection(m.ref, 'chunks'))
          for (const c of chunks.docs) await deleteDoc(c.ref)
          await deleteDoc(m.ref)
        }
        // Zgłoszenia (mają e-mail autora). Bez reguł dla zgłoszeń w konsoli - pomijamy, konto i tak znika.
        try {
          const feedback = await getDocs(query(collection(db, 'feedback'), where('uid', '==', uid)))
          for (const f of feedback.docs) {
            const chunks = await getDocs(collection(f.ref, 'chunks'))
            for (const c of chunks.docs) await deleteDoc(c.ref)
            await deleteDoc(f.ref)
          }
        } catch {
          // brak uprawnień - zostają do usunięcia przez administratora
        }
        // Udostępnione godziny zajęć (wspólne okienka) - jeśli były.
        await deleteDoc(doc(db, 'sharedBusy', uid)).catch(() => undefined)
        // Starsze reguły nie pozwalały usunąć własnej prośby - wtedy zostaje (sam e-mail i status).
        await deleteDoc(doc(db, 'access', uid)).catch(() => undefined)
        await deleteUser(user)
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
