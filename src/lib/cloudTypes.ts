// Wspólny interfejs chmury - prawdziwej (Firebase, cloud.ts) i udawanej do testów (cloudMock.ts).
import type { NewMaterial } from './materials'

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
}

export interface CloudData {
  icalUrl: string | null
}

// Kolekcje z dodatkami użytkownika: users/{uid}/{nazwa}/{id}
export type CollectionName = 'courses' | 'deadlines' | 'meetingEdits' | 'seriesEdits' | 'customMeetings' | 'settings'

export interface CloudDoc {
  id: string
  data: Record<string, unknown>
}

type Unsubscribe = () => void

export interface Cloud {
  watchUser(onChange: (user: CloudUser | null) => void): Unsubscribe
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  // Potwierdzenie e-maila linkiem (wysyła Firebase); po kliknięciu refreshUser odświeża stan.
  sendVerificationEmail(): Promise<void>
  refreshUser(): Promise<void>

  // Dostęp: własna prośba (każdy) i zatwierdzanie (tylko administrator).
  watchAccess(uid: string, onStatus: (status: AccessStatus | null) => void, onError: (message: string) => void): Unsubscribe
  requestAccess(uid: string, email: string): Promise<void>
  watchAccessRequests(onRequests: (requests: AccessRequest[]) => void, onError: (message: string) => void): Unsubscribe
  setAccessStatus(uid: string, status: AccessStatus): Promise<void>

  watchData(uid: string, onData: (data: CloudData) => void, onError: (message: string) => void): Unsubscribe
  saveIcalUrl(uid: string, url: string): Promise<void>

  watchCollection(
    uid: string,
    name: CollectionName,
    onDocs: (docs: CloudDoc[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe
  // Zastępuje cały dokument (dokumenty są małe, zapisujemy je w całości).
  setItem(uid: string, name: CollectionName, id: string, data: Record<string, unknown>): Promise<void>
  deleteItem(uid: string, name: CollectionName, id: string): Promise<void>
  newId(): string

  // Wspólne materiały przedmiotów (widoczne dla wszystkich z listy dostępu).
  watchMaterials(onDocs: (docs: CloudDoc[]) => void, onError: (message: string) => void): Unsubscribe
  uploadMaterial(meta: NewMaterial, chunks: Uint8Array[], onProgress: (chunksDone: number) => void): Promise<void>
  downloadMaterial(id: string, chunkCount: number, onProgress: (chunksDone: number) => void): Promise<Uint8Array[]>
  deleteMaterial(id: string, chunkCount: number): Promise<void>
}
