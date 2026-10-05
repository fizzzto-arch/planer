// Dobieranie grup zajęciowych: sprawdza wszystkie kombinacje grup bez kolizji
// i ocenia je według kryteriów użytkownika (okienka, dni, wczesny start, późny koniec).
import { startOfWeek } from './dates'

export interface OptMeeting {
  start: Date
  end: Date
  room: string | null
  building: string | null
}

export interface GroupOption {
  unitId: string
  groupNumber: number
  meetings: OptMeeting[]
  // Tylko zajęcia spoza planu: kilka przedmiotów (np. różne lektoraty B2) w jednym wyborze.
  courseId?: string
  courseName?: string
}

// Jedne zajęcia z planu (przedmiot + typ), w których można wybrać grupę.
export interface Slot {
  id: string // `${courseId}|${classType}`
  courseName: string
  classType: string
  options: GroupOption[]
  currentIndex: number | null // grupa, w której użytkownik jest teraz
  // Zajęcia spoza planu (WF, lektorat), do których dopiero się zapiszesz - wybór grupy nie jest
  // "zmianą", a obecny plan dostaje najlepiej pasującą grupę.
  extra?: boolean
}

export interface BlockedTime {
  id: string
  weekday: number // 1 = poniedziałek ... 7 = niedziela
  from: string // "HH:MM"
  to: string
}

export interface Weights {
  gaps: number // 0-3
  days: number
  early: number
  late: number
  finish: number // tylko w trybie 'early'
}

// Pora zajęć: 'window' - zajęcia między startAfter a endBefore (późny start, wczesny koniec);
// 'early' - wcześniej zaczynam, wcześniej kończę (zajęcia jak najbliżej rana).
export type DayStyle = 'window' | 'early'

export interface OptimizerSettings {
  weights: Weights
  dayStyle: DayStyle
  startAfter: string // "zaczynaj nie wcześniej niż"
  endBefore: string // "kończ nie później niż"
  blocked: BlockedTime[]
  pinned: Record<string, number> // slotId -> numer grupy, której nie ruszamy
}

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  weights: { gaps: 3, days: 2, early: 1, late: 1, finish: 2 },
  dayStyle: 'window',
  startAfter: '10:00',
  endBefore: '16:00',
  blocked: [],
  pinned: {},
}

export interface PlanMetrics {
  gapMinutes: number // średnio na tydzień
  days: number // dni na uczelni, średnio na tydzień
  earlyMinutes: number // zajęcia przed startAfter, średnio na tydzień
  lateMinutes: number // zajęcia po endBefore, średnio na tydzień
  avgEndMinutes: number | null // o której średnio kończą się zajęcia (minuty od północy); null = brak zajęć
  score: number // mniej = lepiej
}

export interface Candidate {
  choice: number[] // indeks opcji dla każdego slotu; -1 = zajęcia spoza planu pominięte (tylko obecny plan)
  metrics: PlanMetrics
  changes: number // ile slotów różni się od obecnego planu
}

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
// Od tej godziny liczymy "zajęty ranek" w trybie 'early' (pierwsze zajęcia na PW są o 8:15).
const DAY_START = 8 * 60

// Dzień i godziny zajęć liczone raz na zajęcia - evaluate oceniamy setki razy na tych samych
// zajęciach, a odczyt dnia i godziny z daty (strefa czasowa) jest kosztowny.
interface Timing {
  day: number // rrrrmmdd (czas lokalny)
  start: number // ms
  end: number
  startMinutes: number // minuty od północy
  endMinutes: number
}
const timings = new WeakMap<OptMeeting, Timing>()

function timingOf(m: OptMeeting): Timing {
  let timing = timings.get(m)
  if (!timing) {
    timing = {
      day: m.start.getFullYear() * 10_000 + m.start.getMonth() * 100 + m.start.getDate(),
      start: m.start.getTime(),
      end: m.end.getTime(),
      startMinutes: minutesOfDay(m.start),
      endMinutes: minutesOfDay(m.end),
    }
    timings.set(m, timing)
  }
  return timing
}

// Getday: 0 = niedziela; my liczymy od poniedziałku.
const weekdayOf = (d: Date) => ((d.getDay() + 6) % 7) + 1

function overlaps(a: OptMeeting, b: OptMeeting): boolean {
  return a.start < b.end && b.start < a.end
}

// Terminy grupy jako tekst - równe podpisy = identyczny plan.
function scheduleSignature(option: GroupOption): string {
  return option.meetings.map((m) => `${m.start.getTime()}-${m.end.getTime()}`).join(',')
}

export function optionsConflict(a: GroupOption, b: GroupOption): boolean {
  return a.meetings.some((m) => b.meetings.some((n) => overlaps(m, n)))
}

export function hitsBlocked(meeting: OptMeeting, blocked: BlockedTime[]): boolean {
  const day = weekdayOf(meeting.start)
  const start = minutesOfDay(meeting.start)
  const end = minutesOfDay(meeting.end)
  return blocked.some((b) => b.weekday === day && start < toMinutes(b.to) && toMinutes(b.from) < end)
}

// Liczba tygodni, na które rozkładamy wyniki - wspólna dla wszystkich kombinacji,
// żeby dało się je porównywać.
export function countWeeks(meetings: OptMeeting[]): number {
  return Math.max(1, new Set(meetings.map((m) => startOfWeek(m.start).getTime())).size)
}

export function evaluate(
  meetings: OptMeeting[],
  settings: Pick<OptimizerSettings, 'weights' | 'dayStyle' | 'startAfter' | 'endBefore'>,
  gapThreshold: number,
  weeks: number,
): PlanMetrics {
  const byDay = new Map<number, Timing[]>()
  for (const m of meetings) {
    const timing = timingOf(m)
    const list = byDay.get(timing.day)
    if (list) list.push(timing)
    else byDay.set(timing.day, [timing])
  }

  const startAfter = toMinutes(settings.startAfter)
  const endBefore = toMinutes(settings.endBefore)
  let gaps = 0
  let early = 0
  let late = 0
  let endSum = 0
  for (const day of byDay.values()) {
    day.sort((a, b) => a.start - b.start)
    let last = day[0] // zajęcia, które kończą się najpóźniej
    for (let i = 1; i < day.length; i++) {
      const gap = (day[i].start - last.end) / 60_000
      if (gap >= gapThreshold) gaps += gap
      if (day[i].end > last.end) last = day[i]
    }
    early += Math.max(0, startAfter - day[0].startMinutes)
    late += Math.max(0, last.endMinutes - endBefore)
    endSum += last.endMinutes
  }

  const metrics = {
    gapMinutes: gaps / weeks,
    days: byDay.size / weeks,
    earlyMinutes: early / weeks,
    lateMinutes: late / weeks,
    avgEndMinutes: byDay.size > 0 ? endSum / byDay.size : null,
  }
  const w = settings.weights
  // Tryb 'early': suma godzin od 8:00 do końca zajęć w każdym dniu. Suma, nie średnia -
  // inaczej dokładanie krótkich porannych dni "poprawiałoby" wynik.
  const morning = (endSum - DAY_START * byDay.size) / weeks
  const timing =
    settings.dayStyle === 'early'
      ? (w.finish * morning) / 60
      : (w.early * metrics.earlyMinutes) / 60 + (w.late * metrics.lateMinutes) / 60
  const score = (w.gaps * metrics.gapMinutes) / 60 + w.days * metrics.days + timing
  return { ...metrics, score }
}

// Grupa dziekańska z numeru grupy zajęciowej: 101, 102 -> 1; 201 -> 2. Wykłady (gr. 1) - brak.
export function deanGroupOf(groupNumber: number): number | null {
  return groupNumber >= 100 ? Math.floor(groupNumber / 100) : null
}

// Grupy dziekańskie obecne w co najmniej połowie zajęć z grupami dziekańskimi. Pojedyncza
// "trójka" w jednym przedmiocie to nie jest osobna grupa dziekańska do porównania.
export function deanGroups(slots: Slot[]): number[] {
  const withDeans = slots.filter((s) => !s.extra && s.options.some((o) => deanGroupOf(o.groupNumber) !== null))
  const counts = new Map<number, number>()
  for (const s of withDeans) {
    for (const d of new Set(s.options.map((o) => deanGroupOf(o.groupNumber)))) {
      if (d !== null) counts.set(d, (counts.get(d) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= withDeans.length / 2)
    .map(([d]) => d)
    .sort((a, b) => a - b)
}

// Filtr "cała grupa dziekańska N": w zajęciach, które mają grupy tej dziekanki, tylko one;
// w pozostałych zostaje obecna grupa (przejście do innej dziekanki ich nie zmienia).
export function deanFilter(dean: number) {
  return (slot: Slot, option: GroupOption) => {
    if (slot.extra) return true
    if (slot.options.some((o) => deanGroupOf(o.groupNumber) === dean)) return deanGroupOf(option.groupNumber) === dean
    return slot.currentIndex === null || slot.options[slot.currentIndex] === option
  }
}

export interface OptimizeOptions {
  fixed: OptMeeting[] // zajęcia bez wyboru grup (np. własne)
  settings: OptimizerSettings
  gapThreshold: number
  limit: number // ile najlepszych kombinacji zwrócić
  filter?: (slot: Slot, option: GroupOption) => boolean
  maxLeaves?: number // bezpiecznik na ogromne plany
}

export interface OptimizeResult {
  candidates: Candidate[]
  current: Candidate | null // obecny plan (jeśli spełnia ograniczenia, liczymy go i tak)
  currentExtraClash: boolean // żadna grupa zajęć spoza planu nie mieści się w obecnym planie bez kolizji
  checked: number
  truncated: boolean
}

// Kara za każdą zmianę grupy - przy równych wynikach wygrywa plan bliższy obecnemu.
const CHANGE_PENALTY = 0.01

export function optimize(slots: Slot[], opts: OptimizeOptions): OptimizeResult {
  const { fixed, settings, gapThreshold, limit, filter, maxLeaves = 500_000 } = opts
  const allMeetings = [...fixed, ...slots.flatMap((s) => s.options.flatMap((o) => o.meetings))]
  const weeks = countWeeks(allMeetings)

  const scoreOf = (choice: number[]): Candidate => {
    const meetings = [...fixed, ...choice.flatMap((c, i) => (c < 0 ? [] : slots[i].options[c].meetings))]
    const changes = choice.filter((c, i) => slots[i].currentIndex !== null && c !== slots[i].currentIndex).length
    const metrics = evaluate(meetings, settings, gapThreshold, weeks)
    return { choice, changes, metrics: { ...metrics, score: metrics.score + changes * CHANGE_PENALTY } }
  }

  // Obecny plan - do porównania, niezależnie od ograniczeń. Zajęcia spoza planu dostają w nim
  // grupę, która najlepiej pasuje do obecnych grup (bez kolizji i poza zablokowanymi godzinami).
  const currentChoice = slots.map((s) => s.currentIndex ?? 0)
  // Grupa, która się nie mieści, zostaje poza obecnym planem - plan z kolizją byłby fikcją.
  let currentExtraClash = false
  slots.forEach((slot, i) => {
    if (slot.extra) currentChoice[i] = -1
  })
  slots.forEach((slot, i) => {
    if (!slot.extra) return
    const busy = [
      ...fixed,
      ...slots.flatMap((s, j) => (s.extra && (j >= i || currentChoice[j] < 0) ? [] : s.options[currentChoice[j]].meetings)),
    ]
    let best = -1
    let bestScore = Infinity
    slot.options.forEach((option, k) => {
      if (option.meetings.some((m) => hitsBlocked(m, settings.blocked) || busy.some((b) => overlaps(m, b)))) return
      currentChoice[i] = k
      const score = scoreOf(currentChoice).metrics.score
      if (score < bestScore) {
        best = k
        bestScore = score
      }
    })
    if (best === -1) currentExtraClash = true
    currentChoice[i] = best
  })
  const current = slots.length > 0 ? scoreOf(currentChoice) : null

  // Dozwolone grupy w każdym slocie: przypięcia, blokady godzin, filtr, kolizje z zajęciami stałymi.
  const allowed = slots.map((slot) =>
    slot.options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => {
        const pinned = settings.pinned[slot.id]
        if (pinned !== undefined && slot.options.some((o) => o.groupNumber === pinned)) {
          if (option.groupNumber !== pinned) return false
        }
        if (filter && !filter(slot, option)) return false
        if (option.meetings.some((m) => hitsBlocked(m, settings.blocked))) return false
        return !option.meetings.some((m) => fixed.some((f) => overlaps(m, f)))
      })
      .map(({ index }) => index),
  )
  if (allowed.some((a) => a.length === 0)) return { candidates: [], current, currentExtraClash, checked: 0, truncated: false }

  // Grupy o identycznych terminach (np. podgrupy 101 i 102 tego samego labu) dają ten sam plan -
  // zostawiamy jedną: przypiętą, obecną albo pierwszą. Inaczej propozycje różniłyby się tylko numerkiem.
  for (let i = 0; i < slots.length; i++) {
    const bySignature = new Map<string, number>()
    const preferred = (index: number) =>
      slots[i].options[index].groupNumber === settings.pinned[slots[i].id] || index === slots[i].currentIndex
    for (const index of allowed[i]) {
      const signature = scheduleSignature(slots[i].options[index])
      const kept = bySignature.get(signature)
      if (kept === undefined || (!preferred(kept) && preferred(index))) bySignature.set(signature, index)
    }
    allowed[i] = [...bySignature.values()]
  }

  // Kolizja dwóch grup liczona raz - przeszukiwanie pyta o te same pary tysiące razy.
  const conflicts = new Map<GroupOption, Map<GroupOption, boolean>>()
  const conflict = (a: GroupOption, b: GroupOption) => {
    let row = conflicts.get(a)
    if (!row) conflicts.set(a, (row = new Map()))
    let result = row.get(b)
    if (result === undefined) row.set(b, (result = optionsConflict(a, b)))
    return result
  }

  // Najpierw sloty z najmniejszym wyborem - szybciej odcinamy kolizje.
  const order = slots.map((_, i) => i).sort((a, b) => allowed[a].length - allowed[b].length)
  const choice = new Array<number>(slots.length).fill(0)
  const top: Candidate[] = []
  let checked = 0
  let truncated = false

  const keep = (candidate: Candidate) => {
    if (top.length === limit && candidate.metrics.score >= top[top.length - 1].metrics.score) return
    top.push(candidate)
    top.sort((a, b) => a.metrics.score - b.metrics.score)
    if (top.length > limit) top.pop()
  }

  const visit = (depth: number) => {
    if (truncated) return
    if (depth === order.length) {
      checked++
      if (checked > maxLeaves) {
        truncated = true
        return
      }
      keep(scoreOf([...choice]))
      return
    }
    const slotIndex = order[depth]
    for (const optionIndex of allowed[slotIndex]) {
      const option = slots[slotIndex].options[optionIndex]
      // Kolizja z już wybranymi grupami innych zajęć - ta gałąź odpada.
      let clash = false
      for (let d = 0; d < depth && !clash; d++) {
        const other = order[d]
        clash = conflict(option, slots[other].options[choice[other]])
      }
      if (clash) continue
      choice[slotIndex] = optionIndex
      visit(depth + 1)
    }
  }
  visit(0)

  return { candidates: top, current, currentExtraClash, checked, truncated }
}
