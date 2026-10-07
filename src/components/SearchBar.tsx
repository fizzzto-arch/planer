import { t } from '../lib/i18n'

// Lupa w pasku wyszukiwania (bez wyników - te są w SearchPanel, ładowanym dopiero po otwarciu).
export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  )
}

// Pasek wysuwany pociągnięciem w dół (i na czas ładowania wyszukiwarki) - wygląda jak prawdziwy.
export function SearchBarPreview() {
  return (
    <div className="search-bar" aria-hidden="true">
      <div className="search-field">
        <SearchIcon />
        <span className="search-placeholder">{t('Szukaj')}</span>
      </div>
      <span className="link-button search-cancel">{t('Anuluj')}</span>
    </div>
  )
}
