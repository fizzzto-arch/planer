// Program studiów z Katalogu ECTS PW (semestry, przedmioty, sylabusy) jako plik w Planerze.
// Katalog nie jest już prowadzony (EiTI ostatni raz: rok 2021/22), więc skrypt uruchamia się ręcznie,
// raz na kierunek, a wynik trafia do repozytorium - strona nie zależy od serwera katalogu.
//
// Użycie: node scripts/ects-program.ts 2247 4 1 src/lib/programs/ib.ts
//         (idProgram, idWydzial, idStopien z adresu programu w katalogu, plik wynikowy)
import { writeFileSync } from 'node:fs'
import type { ProgramCourse, StudyProgram } from '../src/lib/studyProgram.ts'

const [idProgram, idWydzial, idStopien, out] = process.argv.slice(2)
if (!idProgram || !idWydzial || !idStopien || !out) throw new Error('Użycie: node scripts/ects-program.ts idProgram idWydzial idStopien plik.ts')

const BASE = 'https://ects.pw.edu.pl'
const PAUSE_MS = 300 // jedno zapytanie naraz, z przerwą
const HEADERS = { 'User-Agent': 'Planer (plan zajec dla studentow; github.com/fizzzto-arch/planer)' }
// Więcej godzin jednej formy w semestrze nie bywa - takie liczby w katalogu to błędy (np. 225 zamiast 22,5).
const MAX_HOURS = 120

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.text()
    } catch (e) {
      if (attempt >= 3) throw e
      await sleep(2000 * attempt)
    }
  }
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;?/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

// Tekst z HTML: znaczniki out, wiersze zostają (w sylabusach to zwykle listy).
function plain(html: string): string {
  return decode(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const oneLine = (html: string) => plain(html).replace(/\s+/g, ' ').trim()
// "brak", "-", "" - nic do pokazania
const filled = (value: string) => (/^(brak\.?|-+|—|b\.d\.)?$/i.test(value.trim()) ? undefined : value)

interface Row {
  semester: number
  block: string
  group: string
  name: string
  ects: number
  hours: Record<string, number>
  syllabusId: number | null
}

function parseProgram(html: string): { name: string; mode: string; faculty: string; year: string; degree: string; rows: Row[] } {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '')
  // Nagłówek: Program | Wydział | Rok akademicki | Stopień, niżej Rodzaj | Kierunek | ...
  const cells = (label: string) => {
    const m = new RegExp(`<th[^>]*>\\s*${label}[\\s\\S]*?</tr>\\s*<tr[^>]*>([\\s\\S]*?)</tr>`).exec(clean)
    return m ? [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => oneLine(c[1])) : []
  }
  const [name = '', faculty = '', year = '', degree = ''] = cells('Program')
  const [mode = ''] = cells('Rodzaj')

  const rows: Row[] = []
  let block = ''
  let group = ''
  for (const [, semester, body] of clean.matchAll(/<tr semestr="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const td = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => oneLine(c[1]))
    if (td.length < 10) continue // nagłówek tabeli albo podsumowanie
    if (td[0]) block = td[0]
    if (td[1]) group = td[1]
    const num = (i: number) => Number(td[i].replace(',', '.')) || 0
    const hours: Record<string, number> = { W: num(4), C: num(5), L: num(6), P: num(7), K: num(8) }
    const link = /idPrzedmiot\/(\d+)/.exec(body)
    rows.push({ semester: Number(semester), block, group, name: td[2], ects: num(3), hours, syllabusId: link ? Number(link[1]) : null })
  }
  return { name, faculty, year, degree, mode, rows }
}

// Pola sylabusa: <dt>Etykieta:</dt> <dd>wartość</dd>
function parseSyllabus(html: string): Map<string, string> {
  const fields = new Map<string, string>()
  const syllabus = html.slice(html.indexOf('id="sylabus"'), html.indexOf('id="efektyprzedmiotu"'))
  for (const [, label, value] of syllabus.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    fields.set(oneLine(label).replace(/:$/, ''), plain(value))
  }
  return fields
}

const programUrl = `${BASE}/menu2/detail2test/idProgram/${idProgram}/idWydzial/${idWydzial}/idStopien/${idStopien}`
const program = parseProgram(await fetchText(programUrl))
console.log(`${program.name} (${program.year}): ${program.rows.length} przedmiotów`)

const semesters = new Map<number, ProgramCourse[]>()
for (const row of program.rows) {
  // Pusty wiersz-zaślepka w puli przedmiotów obieralnych.
  if (/^obieralny$/i.test(row.name) && row.ects === 0) continue
  let fields = new Map<string, string>()
  if (row.syllabusId) {
    await sleep(PAUSE_MS)
    fields = parseSyllabus(await fetchText(`${BASE}/menu3/view2/idPrzedmiot/${row.syllabusId}`))
  }
  const field = (label: string) => filled(fields.get(label) ?? '')
  const sane = Object.values(row.hours).every((h) => h <= MAX_HOURS)
  const hours = Object.fromEntries(Object.entries(row.hours).filter(([, h]) => sane && h > 0))
  const exam = field('Egzamin')
  const course: ProgramCourse = {
    name: row.name,
    block: row.block,
    group: row.group,
    ects: row.ects,
    ...(Object.keys(hours).length > 0 && { hours }),
    ...(row.syllabusId && { syllabusId: row.syllabusId }),
    ...(field('Kod przedmiotu') && { code: field('Kod przedmiotu') }),
    ...(field('Koordynator przedmiotu') && { coordinator: field('Koordynator przedmiotu') }),
    ...(exam && { exam: /^tak/i.test(exam) }),
    ...(field('Wymagania wstępne') && { prerequisites: field('Wymagania wstępne') }),
    ...(field('Cel przedmiotu') && { goal: field('Cel przedmiotu') }),
    ...(field('Treści kształcenia') && { content: field('Treści kształcenia') }),
    ...(field('Metody oceny') && { assessment: field('Metody oceny') }),
    ...(field('Literatura') && { literature: field('Literatura') }),
  }
  if (!semesters.has(row.semester)) semesters.set(row.semester, [])
  semesters.get(row.semester)!.push(course)
  process.stdout.write('.')
}

const result: StudyProgram = {
  id: Number(idProgram),
  name: program.name,
  faculty: program.faculty,
  degree: program.degree,
  mode: program.mode,
  year: program.year,
  url: programUrl,
  semesters: [...semesters.entries()].sort((a, b) => a[0] - b[0]).map(([number, courses]) => ({ number, courses })),
}

const header = `// Wygenerowane przez scripts/ects-program.ts z Katalogu ECTS PW (${program.year}) - nie edytować ręcznie.\n`
writeFileSync(
  out,
  header + `import type { StudyProgram } from '../studyProgram'\n\nexport const PROGRAM: StudyProgram = ${JSON.stringify(result, null, 1)}\n`,
)
// Same nazwy przedmiotów (mały plik) - do rozpoznania kierunku bez ładowania sylabusów.
const namesFile = out.replace(/\.ts$/, 'Names.ts')
const names = result.semesters.flatMap((s) => s.courses.map((c) => c.name))
writeFileSync(namesFile, header + `export const PROGRAM_NAMES: string[] = ${JSON.stringify(names, null, 1)}\n`)
console.log(`\nZapisano ${out} i ${namesFile}`)
