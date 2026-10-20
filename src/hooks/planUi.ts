import { createContext, useContext } from 'react'
import type { CustomMeeting, Deadline } from '../lib/extras'
import type { PlanMeeting } from '../lib/edits'
import type { HiddenClass } from '../lib/hiddenClasses'
import type { Prefs } from '../lib/prefs'
import type { Cloud } from '../lib/cloudTypes'
import type { CalendarEvent } from '../lib/academicCalendar'
import type { ExtrasApi } from './useExtras'
import type { SharedMaterialsApi } from './useSharedMaterials'
import type { OwnFilesApi } from './useOwnFiles'
import type { SharedBusyApi } from './useSharedBusy'
import type { Suggestion } from '../lib/sharedDeadlines'

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
  ownFiles: OwnFilesApi | null // własne zdjęcia i pliki (tylko dla zalogowanego)
  openCourse: (courseName: string) => void
  openOptimizer: () => void // "Dobierz grupy"
  openProgram: (course?: string) => void // program studiów; course - od razu ten przedmiot
  // eksport planu (zdjęcie, PDF, Excel, kalendarz); source = inny plan, np. propozycja z optymalizatora
  openExport: (weekStart: Date, source?: ExportSource) => void
  openHelp: () => void // pomoc i prywatność
  openFeedback: () => void // uwagi i pomysły / skrzynka zgłoszeń
  feedbackNew: number // nowe zgłoszenia (tylko w widoku administratora, inaczej 0)
  openSettings: () => void // zakładka Ustawienia (np. z "Pierwszych kroków")
  isAdmin: boolean // widok administratora (w podglądzie "jako zwykły użytkownik" - false)
  canOptimize: boolean // optymalizator: administrator albo osoba, której go przyznał
  cloud: Cloud | null // zalogowane konto z dostępem (np. tytuły prowadzących); null = bez konta
  signedOut: boolean // na tym urządzeniu nikt nie jest zalogowany (nie: konto w trakcie łączenia)
  sharedBusy: SharedBusyApi // wspólne okienka ze znajomymi
  calendarEvents: CalendarEvent[] // kalendarz akademicki PW (dni wolne, przerwy, sesja)
  editDeadline: (draft: DeadlineDraft) => void
  editMeeting: (meeting: PlanMeeting) => void // zmiana zajęć z USOS albo własnych
  addCustomMeeting: (draft: CustomMeetingDraft) => void
  deadlinesFor: (meeting: PlanMeeting) => Deadline[] // terminy przypadające na te zajęcia
  prefs: Prefs
  notesOn: boolean // notatki włączone (ustawienie albo - bez wyboru - są już jakieś notatki)
  displayName: (courseName: string) => string // nazwa przedmiotu do pokazania - pełna (skróty tylko w siatce)
  // Skrót do siatki tygodnia i eksportu: wpisany w ustawieniach; compact (telefon) - albo automatyczny.
  shortName: (courseName: string, compact?: boolean) => string
  autoShort: (courseName: string) => string // skrót bez wpisanego: z kodu USOS (np. "LAEL") albo z pierwszych liter
  setHiddenClasses: (hidden: HiddenClass[]) => void // zajęcia usunięte z planu (prefs.hiddenClasses)
  openSearch: () => void // pasek wyszukiwania (od razu do pisania)
  // Wspólne terminy: propozycje "od innych z roku", dodanie u siebie (albo aktualizacja) i ukrycie.
  sharedSuggestions: Suggestion[]
  adoptShared: (suggestion: Suggestion) => void
  dismissShared: (key: string) => void
  skipFirstStep: (id: string) => void // "Pierwsze kroki": krok zrobiony albo pominięty
  hideFirstSteps: () => void // "Pierwsze kroki": schowaj całą kartę
}

export const PlanUiContext = createContext<PlanUi | null>(null)

export function usePlanUi(): PlanUi {
  const ui = useContext(PlanUiContext)
  if (!ui) throw new Error('usePlanUi poza PlanUiContext')
  return ui
}
