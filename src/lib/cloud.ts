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
import { doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'

export interface CloudUser {
  uid: string
  email: string | null
}

export interface CloudData {
  icalUrl: string | null
}

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

function createCloud(config: FirebaseOptions) {
  // getApps() chroni przed podwójną inicjalizacją (React w trybie deweloperskim montuje dwa razy).
  const app = getApps().length > 0 ? getApp() : initializeApp(config)
  const auth = getAuth(app)
  auth.languageCode = 'pl' // maile (np. reset hasła) po polsku
  const db = getFirestore(app)

  return {
    watchUser(onChange: (user: CloudUser | null) => void): () => void {
      return onAuthStateChanged(auth, (u) => onChange(u ? { uid: u.uid, email: u.email } : null))
    },

    async signIn(email: string, password: string): Promise<void> {
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (e) {
        throw new Error(describeError(e))
      }
    },

    async signUp(email: string, password: string): Promise<void> {
      try {
        await createUserWithEmailAndPassword(auth, email, password)
      } catch (e) {
        throw new Error(describeError(e))
      }
    },

    async signOut(): Promise<void> {
      await signOut(auth)
    },

    async resetPassword(email: string): Promise<void> {
      try {
        await sendPasswordResetEmail(auth, email)
      } catch (e) {
        throw new Error(describeError(e))
      }
    },

    watchData(uid: string, onData: (data: CloudData) => void, onError: (message: string) => void): () => void {
      return onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          const data = snap.data()
          onData({ icalUrl: typeof data?.icalUrl === 'string' ? data.icalUrl : null })
        },
        (e) => onError(describeError(e)),
      )
    },

    async saveIcalUrl(uid: string, url: string): Promise<void> {
      try {
        await setDoc(doc(db, 'users', uid), { icalUrl: url, updatedAt: serverTimestamp() }, { merge: true })
      } catch (e) {
        throw new Error(describeError(e))
      }
    },
  }
}

export type Cloud = ReturnType<typeof createCloud>

let instance: Cloud | null = null

export function getCloud(config: FirebaseOptions): Cloud {
  instance ??= createCloud(config)
  return instance
}
