// Rozpiska zaliczenia przedmiotu: co składa się na ocenę z każdej formy zajęć (np. ćwiczenia - 2 kolokwia,
// całość - egzamin). Dane w src/lib/programs/*Assessment.ts - z sylabusa, uzupełniane z regulaminu przedmiotu.
import type { DeadlineKind } from './extras'
import { t } from './i18n'
import { typeLabel } from './usos'

export type AssessmentForm = 'WYK' | 'CWI' | 'LAB' | 'PRO' | 'ALL' // ALL - cały przedmiot

export interface AssessmentRow {
  form: AssessmentForm
  text: string // np. "2 kolokwia po 20 pkt"
  // Termin do dodania jednym stuknięciem (np. daty kolokwiów); count - ile ich jest, jeśli wiadomo.
  add?: { kind: DeadlineKind; title: string; count?: number }
}

export interface CourseAssessment {
  rows: AssessmentRow[]
  grading?: string // skala ocen albo sposób liczenia oceny końcowej
  source: string // skąd dane, np. "sylabus 2021/22"
}

export function formLabel(form: AssessmentForm): string {
  return form === 'ALL' ? t('Całość') : typeLabel(form)
}

// Jedna linijka na liście przedmiotów: "ćwiczenia - kolokwia · egzamin".
export function assessmentLine(assessment: CourseAssessment): string {
  return assessment.rows
    .map((row) => (row.form === 'ALL' ? row.text : `${formLabel(row.form).toLocaleLowerCase()} – ${row.text}`))
    .join(' · ')
}

// Tytuł kolejnego terminu: "Kolokwium 2", gdy jest ich kilka; "Egzamin", gdy jeden.
export function nextDeadlineTitle(add: NonNullable<AssessmentRow['add']>, added: number): string {
  return add.count === 1 ? add.title : `${add.title} ${added + 1}`
}
