import { t } from '../lib/i18n'
import type { KeyboardEvent, RefObject } from 'react'

// Lupa (pasek wyszukiwania i przycisk w górnym pasku).
export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  )
}

interface Props {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  onQuery: (text: string) => void
  onCancel: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}

// Sam pasek - zawsze w stronie (schowany), żeby pociągnięcie mogło go wysunąć bez przebudowy całej aplikacji
// i od razu ustawić w nim kursor (iPhone pokazuje klawiaturę tylko wtedy, gdy pole dostaje kursor w trakcie gestu).
// Wyniki są osobno (SearchPanel, ładowany dopiero przy pierwszym wyszukiwaniu).
export function SearchBar({ inputRef, query, onQuery, onCancel, onKeyDown }: Props) {
  return (
    <div className="search-bar">
      <label className="search-field">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label={t('Szukaj')}
          placeholder={t('Szukaj')}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {query !== '' && (
          <button
            type="button"
            className="search-clear"
            aria-label={t('Wyczyść')}
            onClick={() => {
              onQuery('')
              inputRef.current?.focus()
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="m8.5 8.5 7 7m0-7-7 7" />
            </svg>
          </button>
        )}
      </label>
      <button type="button" className="link-button search-cancel" onClick={onCancel}>
        {t('Anuluj')}
      </button>
    </div>
  )
}
