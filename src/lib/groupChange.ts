// Prośba o zmianę grupy (z propozycji optymalizatora): gotowe maile według ścieżki, która
// działa na PW - najpierw zgoda prowadzącego grupy docelowej, potem wpis w USOS u koordynatora.
// Powitanie neutralne ("Dzień dobry") - płci i właściwej formy tytułu nie zgadujemy.

export interface StudentInfo {
  name: string // "Jan Kowalski"
  album: string // numer albumu
  intro: string // "studentem 3. semestru Inżynierii Biomedycznej"
}

export interface ChangeRequest {
  course: string
  classType: string // "Ćwiczenia"
  from: { group: number; when: string } // when: "wt. 15:15"
  to: { group: number; when: string }
}

const or = (value: string, placeholder: string) => value.trim() || placeholder

function who(me: StudentInfo): string {
  return `jestem ${or(me.intro, '[studentem … semestru … kierunku]')}, ${or(me.name, '[imię i nazwisko]')}, nr albumu ${or(me.album, '[nr albumu]')}`
}

const groups = (r: ChangeRequest) =>
  `z grupy ${r.from.group} (${r.from.when}) do grupy ${r.to.group} (${r.to.when})`

export function subject(r: ChangeRequest): string {
  return `Prośba o zmianę grupy – ${r.course}, ${r.classType.toLowerCase()} ${r.from.group} → ${r.to.group}`
}

// Do prowadzącego grupy docelowej: prośba o zgodę.
export function lecturerMail(r: ChangeRequest, me: StudentInfo): string {
  return [
    'Dzień dobry,',
    `${who(me)}. Uprzejmie proszę o zgodę na przeniesienie ${groups(r)} z przedmiotu ${r.course} (${r.classType.toLowerCase()}). Jeśli zmianę należy zgłosić u koordynatora przedmiotu albo w dziekanacie, bardzo proszę o informację.`,
    '',
    'Z poważaniem,',
    or(me.name, '[imię i nazwisko]'),
  ].join('\n')
}

// Do koordynatora: formalna zmiana w USOS, z powołaniem na zgodę prowadzącego.
export function coordinatorMail(r: ChangeRequest, me: StudentInfo): string {
  return [
    'Dzień dobry,',
    `${who(me)}. Uprzejmie proszę o przeniesienie mnie w USOS ${groups(r)} z przedmiotu ${r.course} (${r.classType.toLowerCase()}). Prowadzący zajęcia wyraził zgodę na zmianę - jego odpowiedź przesyłam poniżej.`,
    '',
    'Z poważaniem,',
    or(me.name, '[imię i nazwisko]'),
  ].join('\n')
}

// Dane studenta tylko w tej przeglądarce - wpisuje się je raz.
const KEY = 'planer.student-info'

export function loadStudentInfo(): StudentInfo {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<StudentInfo>
    return { name: raw.name ?? '', album: raw.album ?? '', intro: raw.intro ?? '' }
  } catch {
    return { name: '', album: '', intro: '' }
  }
}

export function saveStudentInfo(info: StudentInfo): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(info))
  } catch {
    // bez zapisu - trzeba będzie wpisać ponownie
  }
}
