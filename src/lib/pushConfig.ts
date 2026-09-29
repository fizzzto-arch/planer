// Publiczny klucz VAPID - przeglądarka podpisuje nim subskrypcję powiadomień, a serwer (skrypt
// scripts/send-reminders.ts) wysyła powiadomienia kluczem prywatnym z sekretów GitHuba.
// Plik bez importów - czyta go też skrypt w Node.
export const VAPID_PUBLIC_KEY = 'BI8v1URriYj5u479Sx4ZHEpp1Vq9gZ0I8vv8a7-gZUuUaROlJ6Bf8RbzSZMc4ua1GCY4Mk-0URXP719ETp42vLQ'

// Nadawca powiadomień widoczny dla usług push (Apple, Google) - adres strony.
export const VAPID_SUBJECT = 'https://fizzzto-arch.github.io/planer/'
