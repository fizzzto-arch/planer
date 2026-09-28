import { createContext, useContext } from 'react'
import type { CustomMeeting, Deadline } from '../lib/extras'
import type { PlanMeeting } from '../lib/edits'
import type { ExtrasApi } from './useExtras'

// Termin do edycji: bez id = nowy (pola mogą być wstępnie wypełnione).
export type DeadlineDraft = Partial<Deadline>

// Własne zajęcia do edycji: bez id = nowe.
export type CustomMeetingDraft = Partial<CustomMeeting>

// Wspólne dla wszystkich widoków: dodatki i nawigacja.
export interface PlanUi {
  extras: ExtrasApi | null // null = niezalogowany
  openCourse: (courseName: string) => void
  editDeadline: (draft: DeadlineDraft) => void
  editMeeting: (meeting: PlanMeeting) => void // zmiana zajęć z USOS albo własnych
  addCustomMeeting: (draft: CustomMeetingDraft) => void
  deadlinesFor: (meeting: PlanMeeting) => Deadline[] // terminy przypadające na te zajęcia
}

export const PlanUiContext = createContext<PlanUi | null>(null)

export function usePlanUi(): PlanUi {
  const ui = useContext(PlanUiContext)
  if (!ui) throw new Error('usePlanUi poza PlanUiContext')
  return ui
}
