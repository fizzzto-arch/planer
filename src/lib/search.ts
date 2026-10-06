// Wyszukiwanie w Planerze: bez polskich znaków i wielkości liter ("lodz" znajdzie "Łódź"); każde słowo
// zapytania musi wystąpić w którymś polu wyniku (np. "radiologia egzamin" - nazwa i zasady zaliczenia).

// Małe litery bez znaków diakrytycznych, ta sama długość co oryginał (pozycje dopasowań się zgadzają).
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
}

export type SearchGroup = 'courses' | 'deadlines' | 'rooms' | 'notes' | 'materials' | 'program' | 'settings'

export const GROUP_ORDER: SearchGroup[] = ['courses', 'deadlines', 'rooms', 'notes', 'materials', 'program', 'settings']

export interface SearchField {
  label: string | null // np. "Prowadzący" - pokazywane przy fragmencie, gdy to pole pasuje
  value: string
  hidden?: boolean // tylko do znajdowania (np. hasła ustawień) - bez fragmentu w wynikach
}

export interface SearchItem<A> {
  id: string
  group: SearchGroup
  title: string
  detail?: string // stała druga linijka (np. data terminu)
  fields: SearchField[] // przeszukiwane oprócz tytułu
  action: A
  order?: number // przy równym dopasowaniu mniejsze wyżej (np. data terminu)
}

export interface SearchHit<A> {
  item: SearchItem<A>
  score: number
  // Pole spoza tytułu, które tłumaczy wynik (np. "Prowadzący: Alicja Siewnicka") - fragment wokół dopasowania.
  snippet: { label: string | null; text: string } | null
}

export interface SearchResultGroup<A> {
  group: SearchGroup
  hits: SearchHit<A>[]
}

export const tokens = (query: string) => fold(query).split(/\s+/).filter(Boolean)

const wordStart = (text: string, token: string) => {
  const i = text.indexOf(token)
  return i === 0 || (i > 0 && !/[\p{L}\p{N}]/u.test(text[i - 1]))
}

const SNIPPET_AROUND = 36

// Fragment tekstu wokół pierwszego dopasowania, z wielokropkami.
export function snippetAround(text: string, token: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const i = fold(flat).indexOf(token)
  if (i < 0) return flat.length > SNIPPET_AROUND * 2 ? `${flat.slice(0, SNIPPET_AROUND * 2)}…` : flat
  const start = Math.max(0, i - SNIPPET_AROUND)
  const end = Math.min(flat.length, i + token.length + SNIPPET_AROUND)
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`
}

export function scoreItem<A>(item: SearchItem<A>, words: string[]): SearchHit<A> | null {
  if (words.length === 0) return null
  const title = fold(item.title)
  const fields = item.fields.map((f) => ({ field: f, folded: fold(f.value) }))
  let score = 0
  const outside: string[] = [] // słowa spoza tytułu - fragment pokaże, gdzie są
  for (const word of words) {
    if (title.startsWith(word)) score += 30
    else if (wordStart(title, word)) score += 20
    else if (title.includes(word)) score += 10
    else {
      const hit = fields.find((f) => f.folded.includes(word))
      if (!hit) return null
      score += wordStart(hit.folded, word) ? 6 : 3
      outside.push(word)
    }
  }
  if (words.length > 1 && title.includes(words.join(' '))) score += 15
  let snippet: SearchHit<A>['snippet'] = null
  if (outside.length > 0) {
    // Pole z największą liczbą słów spoza tytułu.
    const best = fields
      .map((f) => ({ ...f, count: outside.filter((w) => f.folded.includes(w)).length }))
      .sort((a, b) => b.count - a.count)[0]
    if (!best.field.hidden) {
      const word = outside.find((w) => best.folded.includes(w)) ?? outside[0]
      snippet = { label: best.field.label, text: snippetAround(best.field.value, word) }
    }
  }
  return { item, score, snippet }
}

export function searchItems<A>(items: SearchItem<A>[], query: string): SearchResultGroup<A>[] {
  const words = tokens(query)
  if (words.length === 0) return []
  const hits = items.flatMap((item) => scoreItem(item, words) ?? [])
  return GROUP_ORDER.flatMap((group) => {
    const inGroup = hits
      .filter((h) => h.item.group === group)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.item.order ?? 0) - (b.item.order ?? 0) ||
          a.item.title.localeCompare(b.item.title, 'pl'),
      )
    return inGroup.length > 0 ? [{ group, hits: inGroup }] : []
  })
}

// Fragmenty tytułu do podświetlenia: [tekst, czy pasuje].
export function highlight(text: string, query: string): [string, boolean][] {
  const words = tokens(query)
  const folded = fold(text)
  const marks = new Array<boolean>(text.length).fill(false)
  for (const word of words) {
    let from = 0
    for (let i = folded.indexOf(word, from); i >= 0; i = folded.indexOf(word, from)) {
      for (let k = i; k < i + word.length; k++) marks[k] = true
      from = i + word.length
    }
  }
  const parts: [string, boolean][] = []
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1)
    if (last && last[1] === marks[i]) last[0] += text[i]
    else parts.push([text[i], marks[i]])
  }
  return parts
}
