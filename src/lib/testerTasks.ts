// Zadania dla testerów: bez konkretnych zadań testerzy głównie się rozglądają i znajdują mało.
// Postęp (lista zrobionych) jest zapisany na koncie - ten sam na telefonie i komputerze.

import { msg } from './i18n'

export interface TesterTask {
  id: string
  title: string
  how: string // gdzie kliknąć i na co patrzeć
  optimizerOnly?: boolean // tylko dla osób z dostępem do "Dobierz grupy"
}

export const TESTER_TASKS: TesterTask[] = [
  {
    id: 'plan',
    title: msg('Dodaj swój plan'),
    how: msg('Wklej link z USOSweb (ikona eksportu) albo kod grupy WAT. Czy zajęcia zgadzają się z tym, co widzisz w USOS?'),
  },
  {
    id: 'week',
    title: msg('Przejrzyj kilka tygodni'),
    how: msg('Zakładka Tydzień, przełącz parę tygodni do przodu. Czy godziny, sale i parzystość tygodnia się zgadzają?'),
  },
  {
    id: 'note',
    title: msg('Dodaj notatkę do przedmiotu'),
    how: msg('Przedmioty → wybierz przedmiot → Notatka do przedmiotu.'),
  },
  {
    id: 'deadline',
    title: msg('Dodaj kolokwium albo inny termin'),
    how: msg('Przedmioty → + Dodaj termin. Spróbuj też listy „Do przygotowania”.'),
  },
  {
    id: 'edit',
    title: msg('Zmień jedne zajęcia'),
    how: msg('Kliknij zajęcia w planie → „Zmień”, np. zmień salę. Potem na tej samej karcie kliknij „Przywróć z USOS”.'),
  },
  {
    id: 'homescreen',
    title: msg('Dodaj Planera do ekranu początkowego'),
    how: msg('iPhone: Safari → Udostępnij → Do ekranu początkowego. Android: menu przeglądarki → Zainstaluj aplikację.'),
  },
  {
    id: 'reminders',
    title: msg('Włącz przypomnienia'),
    how: msg('Ustawienia → Przypomnienia o terminach. Na iPhonie tylko z ekranu początkowego. Czy przyszło próbne powiadomienie?'),
  },
  {
    id: 'export',
    title: msg('Wyeksportuj plan'),
    how: msg('Tydzień → Eksportuj plan. Zdjęcie, PDF albo Excel - czy plik wygląda dobrze tam, gdzie go otwierasz?'),
  },
  {
    id: 'sync',
    title: msg('Sprawdź drugie urządzenie'),
    how: msg('Zaloguj się na telefonie i na komputerze. Czy notatka i termin są na obu?'),
  },
  {
    id: 'optimizer',
    title: msg('Dobierz grupy'),
    how: msg('Przedmioty → Dobierz grupy. Czy propozycje mają sens i zgadzają się z terminami w USOS?'),
    optimizerOnly: true,
  },
]

export function tasksFor(canOptimize: boolean): TesterTask[] {
  return TESTER_TASKS.filter((t) => canOptimize || !t.optimizerOnly)
}

// Dokument z bazy -> id zrobionych zadań (tylko znane, bez powtórzeń).
export function parseTesterTasks(raw: Record<string, unknown> | undefined): string[] {
  const known = new Set(TESTER_TASKS.map((t) => t.id))
  const done = Array.isArray(raw?.done) ? raw.done : []
  return [...new Set(done.filter((id): id is string => typeof id === 'string' && known.has(id)))]
}
