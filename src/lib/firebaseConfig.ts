import type { FirebaseOptions } from 'firebase/app'

// Dane projektu Firebase. Są publiczne z założenia - dostęp do danych chronią
// reguły Firestore (każdy widzi tylko swoje, a dostęp zatwierdza administrator).
// null = synchronizacja wyłączona, strona działa tylko lokalnie.
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyCy3zU1IUa-u3YlOBWgSkEl2g_Q-kKBVM4',
  authDomain: 'planer-9feb3.firebaseapp.com',
  projectId: 'planer-9feb3',
  storageBucket: 'planer-9feb3.firebasestorage.app',
  messagingSenderId: '699270140857',
  appId: '1:699270140857:web:cb28cc62126d4e07319c68',
}

// Administratorzy zatwierdzają nowe konta. Ta sama lista musi być w regułach Firestore
// (funkcja isAdmin) - tu służy tylko do pokazania panelu, prawdziwej ochrony pilnują reguły.
export const ADMIN_EMAILS = ['fizzz.to@gmail.com']

// Potwierdzony mail uczelniany (PW, WAT - także adresy wydziałów, np. @student.wat.edu.pl) daje dostęp od razu,
// bez czekania na administratora. Ten sam wzór jest w regułach Firestore (isUniversityEmail).
export function isUniversityEmail(email: string): boolean {
  return /@([a-z0-9-]+\.)*(pw|wat)\.edu\.pl$/.test(email.trim().toLowerCase())
}
