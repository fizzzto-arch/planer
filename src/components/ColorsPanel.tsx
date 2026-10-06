import { t } from '../lib/i18n'
import type { TypeColorsApi } from '../hooks/useTypeColors'
import { DEFAULT_TYPE_COLORS } from '../lib/typeColors'
import { MEETING_TYPES, typeLabel, typeSlug } from '../lib/usos'

interface Props {
  typeColors: TypeColorsApi
  signedIn: boolean
}

export function ColorsPanel({ typeColors, signedIn }: Props) {
  const { colors, setColor, reset, isCustom } = typeColors

  return (
    <div className="panel" id="settings-colors">
      <h3 className="panel-title">{t('Kolory zajęć')}</h3>
      <p className="hint">
        {t('Domyślnie jak w USOS. Kliknij kolor, żeby go zmienić.')}
        {signedIn ? t(' Zmiany zapisują się na koncie.') : t(' Zmiany zapisują się w tej przeglądarce.')}
      </p>
      <ul className="color-list">
        {MEETING_TYPES.map((type) => (
          <li key={type} className={`color-row type-${typeSlug(type)}`}>
            <span className="color-sample">{typeLabel(type)}</span>
            <input
              type="color"
              className="color-input"
              aria-label={t('Kolor: {type}', { type: typeLabel(type) })}
              value={colors[type] ?? DEFAULT_TYPE_COLORS[type]}
              onChange={(e) => setColor(type, e.target.value)}
            />
          </li>
        ))}
      </ul>
      {isCustom && (
        <button type="button" className="button small secondary" onClick={reset}>
          {t('Przywróć kolory z USOS')}
        </button>
      )}
    </div>
  )
}
