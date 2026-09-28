import type { FirebaseOptions } from 'firebase/app'

// Dane projektu Firebase. Są publiczne z założenia - dostęp do danych chronią
// reguły Firestore (każdy widzi tylko swoje), a konta zakłada wyłącznie admin.
// null = synchronizacja wyłączona, strona działa tylko lokalnie.
export const firebaseConfig: FirebaseOptions | null = null
