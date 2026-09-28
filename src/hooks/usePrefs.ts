import { useCallback, useEffect } from 'react'
import {
  DEFAULT_PREFS,
  PHONE_QUERY,
  applyPrefsToDocument,
  loadLocalPrefs,
  saveLocalPrefs,
  type Prefs,
} from '../lib/prefs'
import { useMediaQuery } from './useMediaQuery'
import { useSyncedValue } from './useSyncedValue'
import type { ExtrasApi } from './useExtras'

// Pisanie skrótów nazw zmienia ustawienia przy każdej literze - na konto wysyłamy ostatnią wersję.
const ACCOUNT_SAVE_DELAY_MS = 600

const loadPrefs = () => loadLocalPrefs() ?? DEFAULT_PREFS

// Ustawienia: zalogowany - z konta (te same na każdym urządzeniu), z kopią w przeglądarce;
// niezalogowany - tylko w przeglądarce.
export function usePrefs(extras: ExtrasApi | null) {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const isPhone = useMediaQuery(PHONE_QUERY)
  const [prefs, setPrefs] = useSyncedValue<Prefs>({
    account: extras?.ready ? extras.extras.prefs : null,
    loadLocal: loadPrefs,
    saveLocal: saveLocalPrefs,
    saveAccount: extras?.savePrefs,
    delayMs: ACCOUNT_SAVE_DELAY_MS,
  })

  useEffect(() => {
    applyPrefsToDocument(prefs, systemDark, isPhone)
  }, [prefs, systemDark, isPhone])

  const update = useCallback((patch: Partial<Prefs>) => setPrefs({ ...prefs, ...patch }), [prefs, setPrefs])

  return { prefs, update, isPhone }
}

export type PrefsApi = ReturnType<typeof usePrefs>
