// Rozpiska zaliczenia przedmiotu: co składa się na ocenę z każdej formy zajęć (np. ćwiczenia - 2 kolokwia,
// całość - egzamin). Dane w src/lib/programs/*Assessment.ts - z regulaminu przedmiotu, a gdy go nie mamy, z sylabusa.
import type { DeadlineKind } from './extras'
import { t } from './i18n'
import type { Scoring } from './scoring'
import { typeLabel } from './usos'

export type AssessmentForm = 'WYK' | 'CWI' | 'LAB' | 'PRO' | 'ALL' // ALL - cały przedmiot

export interface AssessmentRow {
  form: AssessmentForm
  text: string // np. "2 kolokwia po 16 pkt"
  // Termin do dodania jednym stuknięciem (np. daty kolokwiów); count - ile ich jest, jeśli wiadomo.
  add?: { kind: DeadlineKind; title: string; count?: number }
}

export interface CourseAssessment {
  rows: AssessmentRow[]
  grading?: string // skala ocen albo sposób liczenia oceny końcowej
  notes?: string[] // "warto wiedzieć": obecność, poprawy, co wolno na kolokwium
  summary?: string // krótka wersja na listę przedmiotów (bez niej - złożona z wierszy)
  scoring?: Scoring // punkty i progi do kalkulatora (tylko z regulaminu - sylabus nie podaje liczb)
  source: { kind: 'sylabus' | 'regulamin'; year: string }
}

export function formLabel(form: AssessmentForm): string {
  return form === 'ALL' ? t('Całość') : typeLabel(form)
}

// Jedna linijka na liście przedmiotów: "ćwiczenia - kolokwia · egzamin".
export function assessmentLine(assessment: CourseAssessment): string {
  return (
    assessment.summary ??
    assessment.rows
      .map((row) => (row.form === 'ALL' ? row.text : `${formLabel(row.form).toLocaleLowerCase()} – ${row.text}`))
      .join(' · ')
  )
}

// Tytuł kolejnego terminu: "Kolokwium 2", gdy jest ich kilka; "Egzamin", gdy jeden.
export function nextDeadlineTitle(add: NonNullable<AssessmentRow['add']>, added: number): string {
  return add.count === 1 ? add.title : `${add.title} ${added + 1}`
}
