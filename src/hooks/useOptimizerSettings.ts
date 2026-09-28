import { useCallback, useState } from 'react'
import type { OptimizerSettings } from '../lib/optimizer'
import { loadOptimizerSettings, saveOptimizerSettings } from '../lib/optimizerSettings'

export function useOptimizerSettings() {
  const [settings, setSettings] = useState<OptimizerSettings>(loadOptimizerSettings)

  const update = useCallback((patch: Partial<OptimizerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveOptimizerSettings(next)
      return next
    })
  }, [])

  return { settings, update }
}

export type OptimizerSettingsApi = ReturnType<typeof useOptimizerSettings>
