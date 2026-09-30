// Tytuły i stanowiska prowadzących z publicznej strony osoby w USOSweb (API USOS podaje je tylko
// zarejestrowanym aplikacjom, a przeglądarka nie może pobrać tej strony). Stronę czyta serwer
// przypomnień (scripts/send-reminders.ts) i zapisuje wynik w people/{id} dla wszystkich.
// Bez importów - czyta go też Node.

export const USOSWEB_PERSON_URL = 'https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/osoby/pokazOsobe&os_id='

export interface PersonInfo {
  title: string | null // "dr inż.", "dr hab. inż. prof. uczelni"
  position: string | null // "adiunkt", "profesor uczelni"
  unit: string | null // "Wydział Elektroniki i Technik Informacyjnych"
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  oacute: 'ó',
  Oacute: 'Ó',
}

const clean = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, ' ')
    .trim()

export function parsePersonPage(html: string): PersonInfo {
  const title = /<div>\s*Stopnie i tytuły\s*<\/div>\s*<div>([\s\S]*?)<\/div>/.exec(html)
  // Pierwsze zatrudnienie: "adiunkt w jednostce <a ...>Wydział Mechatroniki</a>".
  const job = /<div class='uwb-primary'>([^<]*?)w jednostce\s*<a[^>]*>([\s\S]*?)<\/a>/.exec(html)
  return {
    title: title ? clean(title[1]) || null : null,
    position: job ? clean(job[1]) || null : null,
    unit: job ? clean(job[2]) || null : null,
  }
}

// Numer osoby w USOS - tylko cyfry (też jako id dokumentu w bazie).
export const isPersonId = (id: string) => /^\d{1,10}$/.test(id)
