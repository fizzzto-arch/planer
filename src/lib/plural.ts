import { getLanguage, pluralIn } from './i18n.ts'

// Odmiana liczebników w bieżącym języku: 1 przedmiot, 2 przedmioty, 5 przedmiotów, 22 przedmioty
// (po angielsku 1 course, 2 courses - formy w słowniku i18n.en.ts).
export function plural(n: number, one: string, few: string, many: string): string {
  return pluralIn(getLanguage(), n, one, few, many)
}
