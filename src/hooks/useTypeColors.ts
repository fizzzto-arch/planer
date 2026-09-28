import { useCallback, useMemo } from 'react'
import { colorVariables, loadLocalColors, saveLocalColors, type TypeColors } from '../lib/typeColors'
import { useSyncedValue } from './useSyncedValue'
import type { ExtrasApi } from './useExtras'

// Przeciąganie w próbniku koloru zmienia wartość wiele razy na sekundę - na konto wysyłamy ostatnią.
const ACCOUNT_SAVE_DELAY_MS = 500

// Kolory typów zajęć. Zalogowany: z konta (te same na wszystkich urządzeniach),
// z kopią w przeglądarce, żeby działały też po wylogowaniu.
export function useTypeColors(extras: ExtrasApi | null) {
  const accountColors = extras?.ready ? extras.extras.typeColors : null
  const [colors, setColors] = useSyncedValue<TypeColors>({
    // Puste kolory na koncie = nic nie zapisano; wtedy obowiązują te z przeglądarki.
    account: accountColors && Object.keys(accountColors).length > 0 ? accountColors : null,
    loadLocal: loadLocalColors,
    saveLocal: saveLocalColors,
    saveAccount: extras?.saveTypeColors,
    delayMs: ACCOUNT_SAVE_DELAY_MS,
  })

  const setColor = useCallback((type: string, hex: string) => setColors({ ...colors, [type]: hex }), [colors, setColors])
  const reset = useCallback(() => setColors({}), [setColors])
  const style = useMemo(() => colorVariables(colors), [colors])

  return { colors, setColor, reset, style, isCustom: Object.keys(colors).length > 0 }
}

export type TypeColorsApi = ReturnType<typeof useTypeColors>
