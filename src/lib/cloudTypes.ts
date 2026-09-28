// Wspólny interfejs chmury - prawdziwej (Firebase, cloud.ts) i udawanej do testów (cloudMock.ts).

export interface CloudUser {
  uid: string
  email: string | null
}

export interface CloudData {
  icalUrl: string | null
}

// Kolekcje z dodatkami użytkownika: users/{uid}/{nazwa}/{id}
export type CollectionName = 'courses' | 'deadlines' | 'meetingEdits' | 'seriesEdits' | 'customMeetings'

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
}
