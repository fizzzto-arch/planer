// Co nowego w kolejnych wersjach Planera: karta raz po aktualizacji (WhatsNewCard) i lista w Ustawieniach.
// Nowa wersja = nowy wpis na początku listy i RELEASE - wtedy karta pokaże się każdemu jeden raz.
import { msg } from './i18n'

export const RELEASE = '1.0'

export interface Release {
  version: string
  date: string // "YYYY-MM-DD"
  items: string[] // teksty do słownika (msg) - tłumaczy je tk()
}

export const CHANGELOG: Release[] = [
  {
    version: '1.0',
    date: '2026-10-19',
    items: [
      msg('Konto z mailem uczelnianym (PW, WAT) działa od razu - bez czekania na zatwierdzenie.'),
      msg('Własne zdjęcia i pliki przy przedmiocie (np. zdjęcie tablicy) - widzisz je tylko Ty, na każdym swoim urządzeniu.'),
      msg('Zmiana terminów grupy: zajęcia online i liczba zajęć zamiast daty końca.'),
      msg('Strzałki ‹ › na stronie przedmiotu - następny przedmiot bez wracania do listy.'),
      msg('Krótkie nazwy przedmiotów z kodów USOS (np. LAEL) w siatce tygodnia.'),
      msg('Powiadomienia o zmianach w planie uwzględniają Twoje ręczne zmiany.'),
      msg('Plan WAT: widać, z kiedy jest, a aktualny wgrasz z zapisanej strony WAT.'),
      msg('Szybsze otwieranie i nowa ikona.'),
    ],
  },
]

const SEEN_KEY = 'planer.release'

// Czy pokazać kartę "Co nowego": tylko osobom, które używały już Planera (mają plan) i jeszcze jej nie widziały.
// Nowa osoba (bez planu) od razu ma tę wersję za "widzianą" - zaczyna od przewodnika, nie od listy zmian.
export function releaseToShow(hasPlan: boolean): Release | null {
  try {
    const seen = localStorage.getItem(SEEN_KEY)
    if (seen === RELEASE) return null
    if (seen === null && !hasPlan) {
      localStorage.setItem(SEEN_KEY, RELEASE)
      return null
    }
  } catch {
    return null // bez pamięci przeglądarki karta pokazywałaby się za każdym razem
  }
  return CHANGELOG[0] ?? null
}

export function markReleaseSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, RELEASE)
  } catch {
    // bez zapamiętania - karta pokaże się jeszcze raz
  }
}
