import { describe, expect, it } from 'vitest'
import { EN } from './i18n.en'
import { pluralIn, setLanguage, t, translate } from './i18n'

// Wszystkie pliki źródłowe (bez testów i samego słownika) - z nich wyciągamy teksty do tłumaczenia.
const FILES = import.meta.glob(['/src/**/*.{ts,tsx}', '/scripts/*.ts', '!**/*.test.{ts,tsx}', '!**/i18n.ts', '!**/i18n.en.ts', '!**/i18nReact.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Literał w cudzysłowie: '...', "..." albo `...` (bez ${}).
const LITERAL = String.raw`('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\x60(?:[^\x60\\$]|\\.)*\x60)`
const unquote = (lit: string) => lit.slice(1, -1).replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c))

function collect() {
  const keys = new Map<string, string>() // tekst -> plik
  const dynamic: string[] = []
  for (const [file, code] of Object.entries(FILES)) {
    for (const m of code.matchAll(new RegExp(String.raw`(?:\bt\(|\btx\(|\bmsg\(|\btranslate\(\s*[\w.]+\s*,)\s*` + LITERAL, 'g'))) {
      keys.set(unquote(m[1]), file)
    }
    for (const m of code.matchAll(new RegExp(String.raw`\bplural(?:In\(\s*[\w.]+\s*,|\()\s*[^,]+?,\s*${LITERAL}\s*,\s*${LITERAL}\s*,\s*${LITERAL}`, 'g'))) {
      keys.set([m[1], m[2], m[3]].map(unquote).join('|'), file)
    }
    // t(zmienna) albo t(`...${x}`) - słownik tego nie sprawdzi.
    for (const m of code.matchAll(/\bt\(\s*(?!['"`)])([^)]{0,40})/g)) dynamic.push(`${file}: t(${m[1]}`)
    for (const m of code.matchAll(/\bt\(\s*`[^`]*\$\{/g)) dynamic.push(`${file}: ${m[0]}`)
  }
  return { keys, dynamic }
}

describe('tłumaczenia', () => {
  const { keys, dynamic } = collect()

  it('każdy tekst ma tłumaczenie angielskie', () => {
    const missing = [...keys].filter(([k]) => !(k in EN)).map(([k, file]) => `${file}: ${k}`)
    expect(missing).toEqual([])
  })

  it('t() tylko ze stałym tekstem (zmienne przez {nazwa})', () => {
    expect(dynamic.filter((d) => !d.includes('i18n.ts'))).toEqual([])
  })

  it('tłumaczenia mają te same zmienne co oryginał', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
    const wrong = Object.entries(EN).filter(([pl, en]) => vars(pl) !== vars(en)).map(([pl]) => pl)
    expect(wrong).toEqual([])
  })

  it('zmienne, odmiana i powrót do polskiego', () => {
    setLanguage('en')
    expect(translate('pl', 'Dziś')).toBe('Dziś')
    expect(pluralIn('en', 1, 'termin', 'terminy', 'terminów')).toBe('deadline')
    expect(pluralIn('en', 5, 'termin', 'terminy', 'terminów')).toBe('deadlines')
    expect(pluralIn('pl', 22, 'termin', 'terminy', 'terminów')).toBe('terminy')
    expect(t('nieznany tekst {x}', { x: 1 })).toBe('nieznany tekst 1')
    setLanguage('pl')
  })
})

describe('tekst w innym języku niż interfejs', () => {
  it('inLanguage tłumaczy w podanym języku i przywraca język interfejsu, także po błędzie', async () => {
    const { inLanguage, getLanguage, midSentence } = await import('./i18n')
    setLanguage('en')
    expect(inLanguage('pl', () => t('Dziś'))).toBe('Dziś')
    expect(getLanguage()).toBe('en')
    expect(() => inLanguage('pl', () => { throw new Error('x') })).toThrow()
    expect(getLanguage()).toBe('en')
    expect(midSentence('Wednesday')).toBe('Wednesday')
    setLanguage('pl')
    expect(midSentence('Środa')).toBe('środa')
  })
})
