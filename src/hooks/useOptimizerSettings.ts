import { useCallback } from 'react'
import type { OptimizerSettings } from '../lib/optimizer'
import { loadOptimizerSettings, saveOptimizerSettings } from '../lib/optimizerSettings'
import type { ExtrasApi } from './useExtras'
import { useSyncedValue } from './useSyncedValue'

// Godziny w polach czasu zmieniają się przy każdej cyfrze - na konto wysyłamy ostatnią wersję.
const ACCOUNT_SAVE_DELAY_MS = 600

// Ustawienia "Dobierz grupy": zalogowany - z konta (te same na każdym komputerze), z kopią w przeglądarce.
export function useOptimizerSettings(extras: ExtrasApi | null) {
  const [settings, setSettings] = useSyncedValue<OptimizerSettings>({
    account: extras?.ready ? extras.extras.optimizer : null,
    loadLocal: loadOptimizerSettings,
    saveLocal: saveOptimizerSettings,
    saveAccount: extras?.saveOptimizer,
    delayMs: ACCOUNT_SAVE_DELAY_MS,
  })

  const update = useCallback(
    (patch: Partial<OptimizerSettings>) => setSettings({ ...settings, ...patch }),
    [settings, setSettings],
  )

  return { settings, update }
}

export type OptimizerSettingsApi = ReturnType<typeof useOptimizerSettings>
