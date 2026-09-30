import { t } from './i18n'
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : t('Coś poszło nie tak.')
}
