import { createContext, useContext } from 'react'
import type { Deadline } from '../lib/extras'
import type { PlanMeeting } from '../lib/edits'
import type { ExtrasApi } from './useExtras'

// Termin do edycji: bez id = nowy (pola mogą być wstępnie wypełnione).
export type DeadlineDraft = Partial<Deadline>

// Wspólne dla wszystkich widoków: dodatki i nawigacja.
export interface PlanUi {
  extras: ExtrasApi | null // null = niezalogowany
  openCourse: (courseName: string) => void
  editDeadline: (draft: DeadlineDraft) => void
  deadlinesFor: (meeting: PlanMeeting) => Deadline[] // terminy przypadające na te zajęcia
}

export const PlanUiContext = createContext<PlanUi | null>(null)

export function usePlanUi(): PlanUi {
  const ui = useContext(PlanUiContext)
  if (!ui) throw new Error('usePlanUi poza PlanUiContext')
  return ui
}
