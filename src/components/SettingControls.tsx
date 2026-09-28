import type { ReactNode } from 'react'

interface ChoiceProps<T extends string | number> {
  label: string
  hint?: ReactNode
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

// Wiersz ustawień z wyborem jednej z kilku opcji (przyciski obok siebie).
export function ChoiceSetting<T extends string | number>({ label, hint, value, options, onChange }: ChoiceProps<T>) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      <div className="segmented setting-choice" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={`segment${value === o.value ? ' is-active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SwitchProps {
  label: string
  hint?: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

// Wiersz ustawień z przełącznikiem wł./wył.
export function SwitchSetting({ label, hint, checked, onChange }: SwitchProps) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}
