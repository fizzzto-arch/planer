// Zadania dla testerów: bez konkretnych zadań testerzy głównie się rozglądają i znajdują mało.
// Postęp (lista zrobionych) jest zapisany na koncie - ten sam na telefonie i komputerze.

export interface TesterTask {
  id: string
  title: string
  how: string // gdzie kliknąć i na co patrzeć
  optimizerOnly?: boolean // tylko dla osób z dostępem do "Dobierz grupy"
}

export const TESTER_TASKS: TesterTask[] = [
  {
    id: 'plan',
    title: 'Dodaj swój plan',
    how: 'Wklej link z USOSweb (ikona eksportu) albo kod grupy WAT. Czy zajęcia zgadzają się z tym, co widzisz w USOS?',
  },
  {
    id: 'week',
    title: 'Przejrzyj kilka tygodni',
    how: 'Zakładka Tydzień, przełącz parę tygodni do przodu. Czy godziny, sale i parzystość tygodnia się zgadzają?',
  },
  {
    id: 'note',
    title: 'Dodaj notatkę do przedmiotu',
    how: 'Przedmioty → wybierz przedmiot → Notatka do przedmiotu.',
  },
  {
    id: 'deadline',
    title: 'Dodaj kolokwium albo inny termin',
    how: 'Przedmioty → + Dodaj termin. Spróbuj też listy „Do przygotowania”.',
  },
  {
    id: 'edit',
    title: 'Zmień jedne zajęcia',
    how: 'Rozwiń zajęcia w planie → Edytuj, np. zmień salę. Potem wróć do wersji z USOS przyciskiem „Przywróć z USOS”.',
  },
  {
    id: 'homescreen',
    title: 'Dodaj Planera do ekranu początkowego',
    how: 'iPhone: Safari → Udostępnij → Do ekranu początkowego. Android: menu przeglądarki → Zainstaluj aplikację.',
  },
  {
    id: 'reminders',
    title: 'Włącz przypomnienia',
    how: 'Ustawienia → Przypomnienia o terminach. Na iPhonie tylko z ekranu początkowego. Czy przyszło próbne powiadomienie?',
  },
  {
    id: 'export',
    title: 'Wyeksportuj plan',
    how: 'Tydzień → Eksportuj plan. Zdjęcie, PDF albo Excel - czy plik wygląda dobrze tam, gdzie go otwierasz?',
  },
  {
    id: 'sync',
    title: 'Sprawdź drugie urządzenie',
    how: 'Zaloguj się na telefonie i na komputerze. Czy notatka i termin są na obu?',
  },
  {
    id: 'optimizer',
    title: 'Dobierz grupy',
    how: 'Przedmioty → Dobierz grupy. Czy propozycje mają sens i zgadzają się z terminami w USOS?',
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
