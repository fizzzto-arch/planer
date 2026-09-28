import { useState } from 'react'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1.5 12C4 7.6 7.8 5.2 12 5.2s8 2.4 10.5 6.8C20 16.4 16.2 18.8 12 18.8S4 16.4 1.5 12z" fill="currentColor" />
      <circle cx="12" cy="12" r="4.3" className="eye-cutout" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="13.3" cy="10.7" r="1" className="eye-cutout" />
      {crossed && (
        <>
          <path d="M4.5 3.5 19.5 20.5" className="eye-slash-gap" />
          <path d="M4.5 3.5 19.5 20.5" className="eye-slash" />
        </>
      )}
    </svg>
  )
}

// Pole hasła z przyciskiem podglądu - przełączanym kliknięciem (nie przytrzymaniem).
export function PasswordField({ id, value, onChange, autoComplete }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <input
        id={id}
        className="text-input"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? 'Ukryj hasło' : 'Pokaż hasło'}
        aria-pressed={visible}
        // Nie zabieramy fokusu polu - na telefonie klawiatura zostaje otwarta.
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  )
}
