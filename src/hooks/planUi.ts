import { createContext, useContext } from 'react'
import type { CustomMeeting, Deadline } from '../lib/extras'
import type { PlanMeeting } from '../lib/edits'
import type { Prefs } from '../lib/prefs'
import type { Cloud } from '../lib/cloudTypes'
import type { CalendarEvent } from '../lib/academicCalendar'
import type { ExtrasApi } from './useExtras'
import type { SharedMaterialsApi } from './useSharedMaterials'
import type { SharedBusyApi } from './useSharedBusy'

// Termin do edycji: bez id = nowy (pola mogą być wstępnie wypełnione).
export type DeadlineDraft = Partial<Deadline>

// Własne zajęcia do edycji: bez id = nowe.
export type CustomMeetingDraft = Partial<CustomMeeting>

// Plan do eksportu inny niż obecny (np. propozycja z optymalizatora) i podpowiedź tytułu.
export interface ExportSource {
  meetings: PlanMeeting[]
  title: string
}

// Wspólne dla wszystkich widoków: dodatki i nawigacja.
export interface PlanUi {
  extras: ExtrasApi | null // null = niezalogowany
  materials: SharedMaterialsApi | null // wspólne pliki przedmiotów; null = niezalogowany
  openCourse: (courseName: string) => void
  openOptimizer: () => void // "Dobierz grupy"
  openProgram: () => void // program studiów
  // eksport planu (zdjęcie, PDF, Excel, kalendarz); source = inny plan, np. propozycja z optymalizatora
  openExport: (weekStart: Date, source?: ExportSource) => void
  openHelp: () => void // pomoc i prywatność
  openFeedback: () => void // uwagi i pomysły / skrzynka zgłoszeń
  feedbackNew: number // nowe zgłoszenia (tylko w widoku administratora, inaczej 0)
  openSettings: () => void // zakładka Ustawienia (np. z "Pierwszych kroków")
  isAdmin: boolean // widok administratora (w podglądzie "jako zwykły użytkownik" - false)
  canOptimize: boolean // optymalizator: administrator albo osoba, której go przyznał
  cloud: Cloud | null // zalogowane konto z dostępem (np. tytuły prowadzących); null = bez konta
  sharedBusy: SharedBusyApi // wspólne okienka ze znajomymi
  calendarEvents: CalendarEvent[] // kalendarz akademicki PW (dni wolne, przerwy, sesja)
  editDeadline: (draft: DeadlineDraft) => void
  editMeeting: (meeting: PlanMeeting) => void // zmiana zajęć z USOS albo własnych
  addCustomMeeting: (draft: CustomMeetingDraft) => void
  deadlinesFor: (meeting: PlanMeeting) => Deadline[] // terminy przypadające na te zajęcia
  prefs: Prefs
  displayName: (courseName: string) => string // skrót nazwy przedmiotu, jeśli ustawiony
}

export const PlanUiContext = createContext<PlanUi | null>(null)

export function usePlanUi(): PlanUi {
  const ui = useContext(PlanUiContext)
  if (!ui) throw new Error('usePlanUi poza PlanUiContext')
  return ui
}
