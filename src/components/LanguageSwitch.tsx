import type { Language } from '../lib/i18n'

// Wybór języka na ekranie startowym - nazwy języków zawsze w ich własnym języku.
const NAMES: Record<Language, string> = { pl: 'Polski', en: 'English' }

export function LanguageSwitch({ value, onChange }: { value: Language; onChange: (lang: Language) => void }) {
  const other: Language = value === 'pl' ? 'en' : 'pl'
  return (
    <button type="button" className="link-button" lang={other} onClick={() => onChange(other)}>
      {NAMES[other]}
    </button>
  )
}

export const LANGUAGE_NAMES = NAMES
