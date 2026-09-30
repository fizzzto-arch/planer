import { Fragment, type ReactNode } from 'react'
import { t } from './i18n'

// Tłumaczenie z elementami w środku zdania, np. tx('Wysłaliśmy link na {email}.', { email: <strong>{email}</strong> }).
// Całe zdanie jest jednym tekstem do przetłumaczenia - szyk wyrazów może się różnić między językami.
export function tx(pl: string, vars: Record<string, ReactNode>): ReactNode {
  const text = t(pl)
  const parts = text.split(/\{(\w+)\}/)
  return parts.map((part, i) =>
    i % 2 === 0 ? part : <Fragment key={i}>{part in vars ? vars[part] : `{${part}}`}</Fragment>,
  )
}
