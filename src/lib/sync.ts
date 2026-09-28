// Decyzja, co zrobić, gdy link do planu na koncie (w chmurze) i w tej
// przeglądarce się różnią. Liczy się to, która strona zmieniła się ostatnio.
//
// cloudUrl === undefined oznacza "jeszcze nie wiemy, co jest na koncie".

export interface SyncSnapshot {
  cloudUrl: string | null | undefined
  localUrl: string | null
}

export type SyncAction =
  | { kind: 'none' }
  | { kind: 'adopt'; url: string } // pobierz plan z konta do tej przeglądarki
  | { kind: 'upload'; url: string } // zapisz lokalny link na koncie

export function decideSync(prev: SyncSnapshot, next: SyncSnapshot): SyncAction {
  const { cloudUrl, localUrl } = next
  if (cloudUrl === undefined || cloudUrl === localUrl) return { kind: 'none' }

  const cloudChanged = cloudUrl !== prev.cloudUrl
  const localChanged = localUrl !== prev.localUrl

  // Pierwszy odczyt po zalogowaniu też jest "zmianą w chmurze": konto wygrywa,
  // jeśli ma już zapisany plan.
  if (cloudChanged && cloudUrl) return { kind: 'adopt', url: cloudUrl }
  // Konto jest puste (albo to my zmieniliśmy link) - wysyłamy lokalny.
  if (localUrl && (localChanged || !cloudUrl)) return { kind: 'upload', url: localUrl }
  return { kind: 'none' }
}
