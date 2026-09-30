import { t } from '../lib/i18n'
import { useUpdateCheck } from '../hooks/useUpdateCheck'

// Dyskretny pasek na dole: jest nowa wersja Planera - jedno stuknięcie ją wczytuje.
export function UpdateBanner() {
  const available = useUpdateCheck()
  if (!available) return null
  return (
    <div className="update-banner" role="status">
      <span>{t('Jest nowa wersja Planera')}</span>
      <button type="button" className="button small" onClick={() => window.location.reload()}>
        {t('Odśwież')}
      </button>
    </div>
  )
}
