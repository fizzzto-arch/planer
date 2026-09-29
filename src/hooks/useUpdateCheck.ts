import { useEffect, useState } from 'react'

// Co najmniej tyle między sprawdzeniami (powrót do aplikacji kilka razy na minutę nie pyta serwera za każdym razem).
const MIN_INTERVAL_MS = 5 * 60 * 1000

// Czy na serwerze jest nowsza wersja Planera. Aplikacja z ekranu początkowego iPhone'a potrafi
// długo działać na starej wersji - pytamy przy otwarciu i przy każdym powrocie z tła.
export function useUpdateCheck(): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return // w trybie deweloperskim nie ma version.json
    let last = 0
    const check = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < MIN_INTERVAL_MS) return
      last = Date.now()
      try {
        const response = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) return
        const { version } = (await response.json()) as { version?: string }
        if (version && version !== __APP_VERSION__) setAvailable(true)
      } catch {
        // bez internetu - sprawdzimy następnym razem
      }
    }
    void check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  return available
}
