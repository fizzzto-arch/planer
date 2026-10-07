import { useCallback, useEffect, useRef, useState } from 'react'

// Porównanie niezależne od kolejności kluczy (Firestore może zwrócić mapę posortowaną inaczej).
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

interface Options<T> {
  account: T | null // wartość z konta; null = brak (niezalogowany albo jeszcze nie zapisana)
  loadLocal: () => T
  saveLocal: (value: T) => void
  saveAccount?: (value: T) => void // brak = niezalogowany
  delayMs: number // zapis na konto dopiero po chwili bez zmian (pisanie, przeciąganie)
}

// Ustawienie trzymane w przeglądarce i na koncie. Własna zmiana jest widoczna od razu
// i wygrywa, dopóki konto jej nie potwierdzi - bez tego pole "cofałoby" wpisywane znaki.
export function useSyncedValue<T>({ account, loadLocal, saveLocal, saveAccount, delayMs }: Options<T>) {
  const [local, setLocal] = useState<T>(loadLocal)
  const [pending, setPending] = useState<T | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Konto potwierdziło naszą zmianę - od teraz znowu słuchamy konta (np. zmian z telefonu).
  if (pending !== null && account !== null && stableStringify(account) === stableStringify(pending)) {
    setPending(null)
  }

  const value = pending ?? account ?? local

  // Kopia z konta w przeglądarce - na wypadek wylogowania i dla skryptu startowego.
  useEffect(() => {
    if (account !== null) saveLocal(account)
  }, [account, saveLocal])

  useEffect(() => () => clearTimeout(timer.current), [])

  // immediate - jednorazowa zmiana (np. usunięcie przedmiotu z planu), bez czekania na koniec pisania.
  const set = useCallback(
    (next: T, immediate = false) => {
      setLocal(next)
      saveLocal(next)
      if (!saveAccount) return
      setPending(next)
      clearTimeout(timer.current)
      if (immediate) saveAccount(next)
      else timer.current = setTimeout(() => saveAccount(next), delayMs)
    },
    [saveLocal, saveAccount, delayMs],
  )

  return [value, set] as const
}
