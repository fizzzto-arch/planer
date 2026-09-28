import type { TypeColorsApi } from '../hooks/useTypeColors'
import { DEFAULT_TYPE_COLORS } from '../lib/typeColors'
import { MEETING_TYPES, typeSlug } from '../lib/usos'

interface Props {
  typeColors: TypeColorsApi
  signedIn: boolean
}

export function ColorsPanel({ typeColors, signedIn }: Props) {
  const { colors, setColor, reset, isCustom } = typeColors

  return (
    <div className="panel">
      <h3 className="panel-title">Kolory zajęć</h3>
      <p className="hint">
        Domyślnie jak w USOS. Kliknij kolor, żeby go zmienić.
        {signedIn ? ' Zmiany zapisują się na koncie.' : ' Zmiany zapisują się w tej przeglądarce.'}
      </p>
      <ul className="color-list">
        {MEETING_TYPES.map((t) => (
          <li key={t.id} className={`color-row type-${typeSlug(t.id)}`}>
            <span className="color-sample">{t.label}</span>
            <input
              type="color"
              className="color-input"
              aria-label={`Kolor: ${t.label}`}
              value={colors[t.id] ?? DEFAULT_TYPE_COLORS[t.id]}
              onChange={(e) => setColor(t.id, e.target.value)}
            />
          </li>
        ))}
      </ul>
      {isCustom && (
        <button type="button" className="button small secondary" onClick={reset}>
          Przywróć kolory z USOS
        </button>
      )}
    </div>
  )
}
