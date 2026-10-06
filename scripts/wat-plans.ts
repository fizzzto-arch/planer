// Plany grup Wydziału Cybernetyki WAT jako pliki .ics obok strony Planera (dist/wat/GRUPA.ics).
// Uruchamia go wdrożenie (.github/workflows/deploy.yml) - także co noc, bo WAT generuje plany ok. 0:40.
// Przeglądarka nie pobierze planu z WAT sama (serwer WAT nie pozwala na zapytania z innych stron).
//
// Użycie: node scripts/wat-plans.ts dist/wat
// Grupa, której nie udało się pobrać, dostaje wersję z obecnie opublikowanej strony - awaria WAT
// nie może skasować planów. Skrypt nie przerywa wdrożenia (najwyżej ostrzeżenie w logu).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WAT_PLAN_URL, parseWatGroups, parseWatPlan, watToIcs } from '../src/lib/wat.ts'

const OUT = process.argv[2] ?? 'dist/wat'
const PUBLISHED = 'https://fizzzto-arch.github.io/planer/wat/'
const START_GROUP = 'WCY26IY4S1' // strona dowolnej grupy ma listę wszystkich
const PAUSE_MS = 400 // grzecznie - jedno zapytanie naraz
const HEADERS = { 'User-Agent': 'Planer (plan zajec dla studentow; github.com/fizzzto-arch/planer)' }

// Dłużej nie czekamy na WAT - reszta grup dostaje poprzednią wersję, a wdrożenie idzie dalej.
const TIME_BUDGET_MS = 10 * 60 * 1000
const deadline = Date.now() + TIME_BUDGET_MS

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Serwer WAT odrzuca automaty (zabezpieczenie przed botami, odpowiedź 403). Takiej blokady nie
// obchodzimy i nie ponawiamy - od razu zostają poprzednie wersje planów.
class Blocked extends Error {}

async function fetchText(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) })
      if (response.status === 403) throw new Blocked('WAT blokuje zapytania (HTTP 403)')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const text = await response.text()
      if (text.includes('_Incapsula_Resource')) throw new Blocked('WAT blokuje zapytania (ochrona przed botami)')
      return text
    } catch (e) {
      if (e instanceof Blocked || attempt >= 3 || Date.now() > deadline) throw e
      await sleep(2000 * attempt)
    }
  }
}

let blocked = false

// Poprzednio opublikowany plan grupy (null, jeśli go nie ma).
async function published(group: string): Promise<string | null> {
  try {
    const response = await fetch(`${PUBLISHED}${group}.ics`, { signal: AbortSignal.timeout(15_000) })
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

mkdirSync(OUT, { recursive: true })

let groups: string[] = []
try {
  groups = parseWatGroups(await fetchText(`${WAT_PLAN_URL}?grupa_id=${START_GROUP}`))
} catch (e) {
  blocked = e instanceof Blocked
  console.log(`::warning::Nie udało się pobrać listy grup WAT: ${(e as Error).message}`)
}
if (groups.length === 0) {
  // Bez listy z WAT - przynajmniej to, co już było opublikowane.
  try {
    const index = JSON.parse(await fetchText(`${PUBLISHED}index.json`)) as { groups?: string[] }
    groups = index.groups ?? []
  } catch {
    // pierwsze wdrożenie albo strona niedostępna - nie ma czego zachować
  }
}

const saved: string[] = []
let fresh = 0
let kept = 0
let failed = 0
let updatedAt: string | null = null
for (const group of groups) {
  let ics: string | null = null
  try {
    if (blocked) throw new Blocked('WAT blokuje zapytania')
    if (Date.now() > deadline) throw new Error('WAT odpowiada zbyt wolno')
    const plan = parseWatPlan(group, await fetchText(`${WAT_PLAN_URL}?grupa_id=${group}`))
    updatedAt ??= plan.updatedAt
    // Grupy z poprzednich lat mają pusty plan - nie publikujemy ich.
    if (plan.lessons.length > 0) {
      ics = watToIcs(plan)
      fresh++
    }
  } catch (e) {
    blocked ||= e instanceof Blocked
    ics = await published(group)
    if (ics) kept++
    else failed++
    console.log(`${group}: ${(e as Error).message}${ics ? ' - zostaje poprzednia wersja' : ''}`)
  }
  if (ics) {
    writeFileSync(join(OUT, `${group}.ics`), ics)
    saved.push(group)
  }
  if (!blocked && Date.now() <= deadline) await sleep(PAUSE_MS)
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify({ updatedAt, fetchedAt: new Date().toISOString(), groups: saved }))
console.log(`Plany WAT: ${saved.length} grup (świeże ${fresh}, poprzednie ${kept}, nieudane ${failed}), WAT: ${updatedAt ?? '?'}`)
if (failed > 0 || (groups.length > 0 && fresh === 0)) console.log('::warning::Część planów WAT nie została pobrana.')
