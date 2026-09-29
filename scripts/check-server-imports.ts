// Sprawdzenie przy wdrożeniu: czy Node wczyta pliki ze src/, których używa serwer przypomnień.
// Node (bez Vite) wymaga końcówki ".ts" w importach - brak jej w jednym pliku po cichu
// wyłącza wszystkie przypomnienia, a testy (Vitest) by tego nie wyłapały.
import { readFileSync } from 'node:fs'

const script = readFileSync(new URL('./send-reminders.ts', import.meta.url), 'utf8')
const paths = [...script.matchAll(/from '(\.\.\/src\/[^']+)'/g)].map((m) => m[1])
for (const path of paths) {
  await import(new URL(path, import.meta.url).href)
  console.log(`OK ${path}`)
}
