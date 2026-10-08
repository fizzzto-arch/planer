// Wspólny interfejs chmury - prawdziwej (Firebase, cloud.ts) i udawanej do testów (cloudMock.ts).
import type { FeedbackAttachment, FeedbackFile, FeedbackStatus, NewFeedback } from './feedback'
import type { NewMaterial } from './materials'
import type { PersonInfo } from './usosPeople'

export interface CloudUser {
  uid: string
  email: string | null
  emailVerified: boolean
}

// Dostęp do Planera zatwierdza administrator.
export type AccessStatus = 'pending' | 'approved' | 'rejected'

export interface AccessRequest {
  uid: string
  email: string
  status: AccessStatus
  requestedAt: number | null
  optimizer: boolean // dostęp do optymalizatora (wersja testowa), nadaje administrator
  testerTasks: string[] // odhaczone zadania dla testerów (kopia z konta, żeby administrator widział postęp)
}

// Własna prośba o dostęp: status i dodatkowe uprawnienia.
export interface AccessInfo {
  status: AccessStatus | null
  optimizer: boolean
}

export interface CloudData {
  icalUrl: string | null
}

// Kolekcje z dodatkami użytkownika: users/{uid}/{nazwa}/{id}
// 'push' - urządzenia z włączonymi przypomnieniami (czyta je skrypt wysyłający, nie aplikacja).
// Jedna lista: nowa kolekcja dopisana tutaj od razu znika też przy usuwaniu konta.
export const COLLECTION_NAMES = [
  'courses',
  'deadlines',
  'meetingEdits',
  'seriesEdits',
  'customMeetings',
  'settings',
  'scores', // punkty z zaliczeń przedmiotów (i własne rozpiski)
  'grades', // oceny końcowe z programu studiów
  'push',
  'notifications', // historia powiadomień - zapisuje ją serwer przypomnień
] as const
export type CollectionName = (typeof COLLECTION_NAMES)[number]

// Ręczne zmiany planu: każdy zapis zostawia też znacznik w users/{uid} (planEditsAt). Serwer powiadomień
// czyta je dopiero, gdy znacznik się zmieni - bez czytania wszystkich zmian co kwadrans.
export const PLAN_EDIT_COLLECTIONS: readonly CollectionName[] = ['meetingEdits', 'seriesEdits', 'customMeetings']

export interface CloudDoc {
  id: string
  data: Record<string, unknown>
}

type Unsubscribe = () => void

export interface Cloud {
  watchUser(onChange: (user: CloudUser | null) => void): Unsubscribe
  // remember = "Zapamiętaj mnie na tym urządzeniu"; bez tego sesja kończy się z zamknięciem przeglądarki.
  signIn(email: string, password: string, remember: boolean): Promise<void>
  signUp(email: string, password: string, remember: boolean): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  // Potwierdzenie e-maila linkiem (wysyła Firebase); po kliknięciu refreshUser odświeża stan.
  sendVerificationEmail(): Promise<void>
  refreshUser(): Promise<void>

  // Dostęp: własna prośba (każdy) i zatwierdzanie (tylko administrator).
  watchAccess(uid: string, onAccess: (access: AccessInfo) => void, onError: (message: string) => void): Unsubscribe
  requestAccess(uid: string, email: string): Promise<void>
  watchAccessRequests(onRequests: (requests: AccessRequest[]) => void, onError: (message: string) => void): Unsubscribe
  setAccessStatus(uid: string, status: AccessStatus): Promise<void>
  setOptimizerAccess(uid: string, on: boolean): Promise<void>
  // Kopia odhaczonych zadań testera w jego prośbie o dostęp (widzi ją administrator).
  saveTesterProgress(uid: string, done: string[]): Promise<void>
  // Wspólne okienka: udostępnione godziny zajęć (sharedBusy/{uid}) - widzą je tylko udostępniający.
  watchSharedBusy(onDocs: (docs: CloudDoc[]) => void, onError: (message: string) => void): Unsubscribe
  saveSharedBusy(uid: string, name: string, busy: number[]): Promise<void>
  deleteSharedBusy(uid: string): Promise<void>
  // Tytuły prowadzących (people/{id}, uzupełnia serwer). requested - osoby, o które już ktoś poprosił;
  // brakujące zgłasza requestPeople, a serwer przypomnień doczytuje je ze stron USOSweb.
  watchPeople(ids: string[], onPeople: (people: Record<string, PersonInfo>, requested: string[]) => void): Unsubscribe
  requestPeople(ids: string[]): Promise<void>

  watchData(uid: string, onData: (data: CloudData) => void, onError: (message: string) => void): Unsubscribe
  saveIcalUrl(uid: string, url: string): Promise<void>

  watchCollection(
    uid: string,
    name: CollectionName,
    onDocs: (docs: CloudDoc[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe
  // Historia powiadomień: tylko najnowsze (limit) - cała z 60 dni przy każdym otwarciu to zbędne odczyty.
  watchNotifications(uid: string, max: number, onDocs: (docs: CloudDoc[]) => void, onError: (message: string) => void): Unsubscribe
  // Zastępuje cały dokument (dokumenty są małe, zapisujemy je w całości).
  setItem(uid: string, name: CollectionName, id: string, data: Record<string, unknown>): Promise<void>
  deleteItem(uid: string, name: CollectionName, id: string): Promise<void>
  newId(): string

  // Wspólne materiały przedmiotów (widoczne dla wszystkich z listy dostępu).
  watchMaterials(onDocs: (docs: CloudDoc[]) => void, onError: (message: string) => void): Unsubscribe
  uploadMaterial(meta: NewMaterial, chunks: Uint8Array[], onProgress: (chunksDone: number) => void): Promise<void>
  downloadMaterial(id: string, chunkCount: number, onProgress: (chunksDone: number) => void): Promise<Uint8Array[]>
  deleteMaterial(id: string, chunkCount: number): Promise<void>
  // Usuwa konto i wszystkie dane użytkownika (wymaga hasła - potwierdzenie tożsamości).
  deleteAccount(password: string): Promise<void>

  // Zgłoszenia testerów (feedback/{id}, załączniki w kawałkach).
  submitFeedback(
    uid: string,
    email: string,
    feedback: NewFeedback,
    files: FeedbackFile[],
    onProgress: (done: number, total: number) => void,
  ): Promise<void>
  watchFeedback(uid: string | null, onDocs: (docs: CloudDoc[]) => void, onError: (message: string) => void): Unsubscribe // null = wszystkie
  updateFeedback(id: string, patch: { status?: FeedbackStatus; reply?: string }): Promise<void>
  downloadFeedbackFile(id: string, attachment: number, chunkCount: number): Promise<Uint8Array[]>
  deleteFeedback(id: string, attachments: FeedbackAttachment[]): Promise<void>
}
