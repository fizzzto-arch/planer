// Punkty z zaliczenia przedmiotu: części (np. egzamin, laboratorium) z progami zaliczenia i skala ocen
// z regulaminu. Liczy, ile masz, ile brakuje do zaliczenia i do kolejnej oceny i jaka ocena wychodzi.
// Zasady przedmiotów: src/lib/programs/*Assessment.ts (pole scoring); własna rozpiska: customScoring.
import type { AssessmentForm } from './assessment'
import { locale } from './i18n'

export type Grade = 2 | 3 | 3.5 | 4 | 4.5 | 5
export const GRADES: Grade[] = [2, 3, 3.5, 4, 4.5, 5]

// Próg: od `from` włącznie albo - gdy above - "ponad from" (więcej niż).
export interface Threshold {
  from: number
  above?: boolean
}

export interface GradeStep extends Threshold {
  grade: Exclude<Grade, 2>
}

export interface ScoreItem {
  id: string
  label: string // np. "1" (kolejne ćwiczenie) albo "Kolokwium 1"
  max: number
}

export interface ScorePart {
  id: string
  label: string // np. "Egzamin", "Laboratorium"
  form: AssessmentForm
  items: ScoreItem[]
  percent?: boolean // wyniki w procentach (prowadzący podaje %) - próg części też w %
  bonus?: boolean // punkty dodatkowe: liczą się do oceny, ale nie do zaliczenia ani do maksimum
  pass?: Threshold // próg zaliczenia części (w punktach części; przy percent - w %)
  itemPass?: Threshold & { count: number } // pozycja zaliczona od progu (poniżej liczy się 0); trzeba zaliczyć count
  weight?: number // przy ocenie ze średniej ważonej procentów części
}

// Zwolnienie z egzaminu (np. RPiS): każda z pozycji co najmniej itemFrom i część ponad partAbove.
export interface Exemption {
  part: string
  items: string[]
  itemFrom: number
  partAbove: number
  scale: GradeStep[] // ocena z punktów tej części
}

export interface Scoring {
  parts: ScorePart[]
  scale: GradeStep[] // rosnąco: suma punktów albo - przy weighted - procent średniej ważonej części
  weighted?: boolean
  exemption?: Exemption
}

export type Points = Record<string, number> // id pozycji -> punkty; brak = jeszcze nie wpisane

const EPS = 1e-9
const round1 = (x: number) => Math.round(x * 10) / 10

export const meets = (value: number, t: Threshold) => (t.above ? value > t.from + EPS : value >= t.from - EPS)

// Ile brakuje do progu (0 - już jest). Przy "ponad" trzeba przekroczyć próg o najmniejszą jednostkę.
export function missingTo(value: number, t: Threshold, step: number): number {
  if (meets(value, t)) return 0
  return Math.ceil((t.from - value + (t.above ? step : 0)) * 10 - EPS) / 10
}

export function gradeFor(value: number, scale: GradeStep[]): Grade {
  let grade: Grade = 2
  for (const step of scale) if (meets(value, step)) grade = step.grade
  return grade
}

export interface PartResult {
  part: ScorePart
  got: number // punkty (niezaliczona pozycja przy itemPass liczy się 0)
  max: number
  left: number // maksimum pozycji jeszcze bez punktów
  filled: number // ile pozycji wpisanych
  percent: number
  pass: { ok: boolean; missing: number; reachable: boolean } | null // missing w punktach albo % (percent)
  items: { passed: number; need: number } | null // itemPass: zaliczone pozycje
}

export interface ScoreResult {
  parts: PartResult[]
  unit: 'pkt' | '%'
  value: number // suma punktów albo średnia ważona %
  max: number // bez punktów dodatkowych
  potential: number // gdyby wszystko, czego jeszcze nie ma, było na maksa
  filled: number
  total: number
  conditionsMet: boolean // progi części spełnione (z obecnymi punktami)
  grade: Grade // z obecnych punktów; 2, gdy poniżej skali albo bez zaliczenia części
  forecast: Grade | null // przy tym samym procencie w tym, czego jeszcze nie ma; null bez wpisów albo gdy wszystko jest
  next: { grade: Grade; missing: number; reachable: boolean } | null // najbliższa wyższa ocena
  exemption: { ok: boolean; grade: Grade | null; missing: number; reachable: boolean } | null
}

function partResult(part: ScorePart, points: Points): PartResult {
  const filledItems = part.items.filter((i) => points[i.id] !== undefined)
  const counted = (i: ScoreItem) => {
    const v = points[i.id] ?? 0
    return part.itemPass && !meets(v, part.itemPass) ? 0 : v
  }
  const got = filledItems.reduce((sum, i) => sum + counted(i), 0)
  const max = part.items.reduce((sum, i) => sum + i.max, 0)
  const left = max - filledItems.reduce((sum, i) => sum + i.max, 0)
  const percent = max > 0 ? (got / max) * 100 : 0
  let pass: PartResult['pass'] = null
  if (part.pass) {
    const now = part.percent ? percent : got
    const best = part.percent ? (max > 0 ? ((got + left) / max) * 100 : 0) : got + left
    pass = { ok: meets(now, part.pass), missing: missingTo(now, part.pass, part.percent ? 0.1 : 0.5), reachable: meets(best, part.pass) }
  }
  const items = part.itemPass
    ? { passed: filledItems.filter((i) => meets(points[i.id], part.itemPass!)).length, need: part.itemPass.count }
    : null
  return { part, got, max, left, filled: filledItems.length, percent, pass, items }
}

// Wartość do oceny (suma albo średnia ważona) z punktów części.
function combine(scoring: Scoring, parts: { part: ScorePart; got: number; max: number }[]): number {
  if (scoring.weighted) {
    const weights = parts.reduce((sum, p) => sum + (p.part.weight ?? 0), 0) || 1
    return parts.reduce((sum, p) => sum + ((p.part.weight ?? 0) * (p.max > 0 ? (p.got / p.max) * 100 : 0)) / weights, 0)
  }
  return parts.reduce((sum, p) => sum + p.got, 0)
}

export function scoreResult(scoring: Scoring, points: Points): ScoreResult {
  const parts = scoring.parts.map((p) => partResult(p, points))
  const unit = scoring.weighted ? '%' : 'pkt'
  const step = scoring.weighted ? 0.1 : 0.5
  const value = combine(scoring, parts)
  const max = scoring.weighted ? 100 : parts.filter((p) => !p.part.bonus).reduce((sum, p) => sum + p.max, 0)
  const potential = combine(scoring, parts.map((p) => ({ ...p, got: p.got + p.left })))
  const filled = parts.reduce((sum, p) => sum + p.filled, 0)
  const total = scoring.parts.reduce((sum, p) => sum + p.items.length, 0)
  const conditionsMet = parts.every((p) => (p.pass?.ok ?? true) && (!p.items || p.items.passed >= p.items.need))

  // Kolejna ocena według samych punktów (progi części pokazujemy osobno przy częściach).
  const byPoints = gradeFor(value, scoring.scale)
  const nextStep = scoring.scale.find((s) => s.grade > byPoints)
  const next = nextStep
    ? { grade: nextStep.grade, missing: missingTo(value, nextStep, step), reachable: meets(potential, nextStep) }
    : null

  // Prognoza: w tym, czego jeszcze nie ma, tyle procent co dotąd w tej części (bez wpisów w części - co dotąd w ogóle).
  let forecast: Grade | null = null
  if (filled > 0 && filled < total) {
    const regular = parts.filter((p) => !p.part.bonus)
    const filledMax = regular.reduce((sum, p) => sum + (p.max - p.left), 0)
    const overall = filledMax > 0 ? regular.reduce((sum, p) => sum + p.got, 0) / filledMax : 0
    const projected = parts.map((p) => {
      const done = p.max - p.left
      const ratio = p.part.bonus ? 0 : done > 0 ? p.got / done : overall
      return { ...p, got: p.got + p.left * ratio }
    })
    const ok = projected.every((p) => !p.part.pass || meets(p.part.percent ? (p.max > 0 ? (p.got / p.max) * 100 : 0) : p.got, p.part.pass))
    forecast = ok ? gradeFor(combine(scoring, projected), scoring.scale) : 2
  }

  let exemption: ScoreResult['exemption'] = null
  if (scoring.exemption) {
    const e = scoring.exemption
    const part = parts.find((p) => p.part.id === e.part)
    if (part) {
      const items = part.part.items.filter((i) => e.items.includes(i.id))
      const itemMissing = items.reduce((sum, i) => sum + missingTo(points[i.id] ?? 0, { from: e.itemFrom }, 0.5), 0)
      const partMissing = missingTo(part.got, { from: e.partAbove, above: true }, 0.5)
      // Punkty dopisane do pozycji wchodzą też do części - brakuje tyle, ile większa z tych liczb.
      const missing = Math.max(itemMissing, partMissing)
      const ok = missing === 0
      exemption = {
        ok,
        grade: ok ? gradeFor(part.got, e.scale) : null,
        missing,
        // Wpisane kolokwium poniżej progu już się nie zmieni (kolokwiów nie ma jak poprawić).
        reachable:
          items.every((i) => (points[i.id] === undefined ? i.max : points[i.id]) >= e.itemFrom) &&
          part.got + part.left > e.partAbove + EPS,
      }
    }
  }

  return {
    parts,
    unit,
    value: round1(value),
    max,
    potential: round1(potential),
    filled,
    total,
    conditionsMet,
    grade: conditionsMet ? byPoints : 2,
    forecast,
    next,
    exemption,
  }
}

// ---------- Własna rozpiska (przedmiot bez zasad w Planerze) ----------

export interface CustomScoring {
  items: ScoreItem[]
  scale: number[] // próg w % maksimum na 3; 3,5; 4; 4,5; 5
}

const CUSTOM_GRADES: Exclude<Grade, 2>[] = [3, 3.5, 4, 4.5, 5]
// Skala z Regulaminu Studiów PW (§ 18): co 10% od 51%.
export const DEFAULT_CUSTOM_SCALE = [51, 61, 71, 81, 91]
export const CUSTOM_ITEMS_MAX = 30

export function customScoring(custom: CustomScoring): Scoring {
  const max = custom.items.reduce((sum, i) => sum + i.max, 0)
  return {
    parts: [{ id: 'own', label: '', form: 'ALL', items: custom.items }],
    scale: custom.scale.map((p, i) => ({ grade: CUSTOM_GRADES[i], from: round1((p / 100) * max) })),
  }
}

// ---------- Zapis na koncie ----------

export interface CourseScores {
  name: string
  points: Points
  custom: CustomScoring | null
}

type Raw = Record<string, unknown>
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function parseCourseScores(raw: Raw): CourseScores | null {
  if (typeof raw.name !== 'string' || !raw.name) return null
  const points: Points = {}
  if (typeof raw.points === 'object' && raw.points !== null) {
    for (const [id, v] of Object.entries(raw.points as Raw)) if (isNumber(v) && v >= 0) points[id] = v
  }
  let custom: CustomScoring | null = null
  const c = raw.custom as Raw | null | undefined
  if (c && Array.isArray(c.items) && Array.isArray(c.scale)) {
    const items = c.items
      .filter((i): i is Raw => typeof i === 'object' && i !== null)
      .map((i) => ({ id: String(i.id ?? ''), label: String(i.label ?? '').slice(0, 60), max: Number(i.max) }))
      .filter((i) => i.id && isNumber(i.max) && i.max > 0)
      .slice(0, CUSTOM_ITEMS_MAX)
    const scale = c.scale.filter(isNumber)
    if (items.length > 0) custom = { items, scale: scale.length === 5 ? scale : DEFAULT_CUSTOM_SCALE }
  }
  return { name: raw.name, points, custom }
}

// Wpisany tekst -> punkty: przecinek albo kropka; null - puste albo niepoprawne.
export function parsePoints(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'))
  return text.trim() === '' || !Number.isFinite(value) || value < 0 ? null : value
}

export function formatNumber(value: number): string {
  return round1(value).toLocaleString(locale(), { maximumFractionDigits: 1 })
}

// Ocena: "4", "3,5"; średnia: "4,21".
export function formatGrade(grade: number): string {
  return grade.toLocaleString(locale(), { minimumFractionDigits: grade % 1 ? 1 : 0, maximumFractionDigits: 2 })
}
