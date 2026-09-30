import type { Language } from '../lib/i18n'

// Przełącznik języka na głównym pasku: dwa "klawisze" PL | EN jak na klawiaturze iPhone'a.
const KEYS: { lang: Language; label: string; name: string }[] = [
  { lang: 'pl', label: 'PL', name: 'Polski' },
  { lang: 'en', label: 'EN', name: 'English' },
]

export function LanguageToggle({ value, onChange }: { value: Language; onChange: (lang: Language) => void }) {
  return (
    <div className="lang-toggle" role="radiogroup" aria-label="Język / Language">
      {KEYS.map((k) => (
        <button
          key={k.lang}
          type="button"
          role="radio"
          lang={k.lang}
          aria-checked={value === k.lang}
          aria-label={k.name}
          className={`lang-key${value === k.lang ? ' is-active' : ''}`}
          onClick={() => onChange(k.lang)}
        >
          {k.label}
        </button>
      ))}
    </div>
  )
}
