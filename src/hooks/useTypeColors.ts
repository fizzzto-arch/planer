import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { colorVariables, loadLocalColors, saveLocalColors, type TypeColors } from '../lib/typeColors'
import type { ExtrasApi } from './useExtras'

// Przeciąganie w próbniku koloru zmienia wartość wiele razy na sekundę - na konto wysyłamy ostatnią.
const ACCOUNT_SAVE_DELAY_MS = 500

// Kolory typów zajęć. Zalogowany: z konta (te same na wszystkich urządzeniach),
// z kopią w przeglądarce, żeby działały też po wylogowaniu.
export function useTypeColors(extras: ExtrasApi | null) {
  const [local, setLocal] = useState<TypeColors>(loadLocalColors)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const account = extras?.ready ? extras.extras.typeColors : null
  const colors = account && Object.keys(account).length > 0 ? account : local
  const saveToAccount = extras?.saveTypeColors

  useEffect(() => () => clearTimeout(timer.current), [])

  const apply = useCallback(
    (next: TypeColors) => {
      setLocal(next)
      saveLocalColors(next)
      clearTimeout(timer.current)
      if (saveToAccount) timer.current = setTimeout(() => saveToAccount(next), ACCOUNT_SAVE_DELAY_MS)
    },
    [saveToAccount],
  )

  const setColor = useCallback((type: string, hex: string) => apply({ ...colors, [type]: hex }), [apply, colors])
  const reset = useCallback(() => apply({}), [apply])
  const style = useMemo(() => colorVariables(colors), [colors])

  return { colors, setColor, reset, style, isCustom: Object.keys(colors).length > 0 }
}

export type TypeColorsApi = ReturnType<typeof useTypeColors>
