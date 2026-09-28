// Dobieranie grup zajęciowych: sprawdza wszystkie kombinacje grup bez kolizji
// i ocenia je według kryteriów użytkownika (okienka, dni, wczesny start, późny koniec).
import { startOfWeek, toDateKey } from './dates'

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
}

// Jedne zajęcia z planu (przedmiot + typ), w których można wybrać grupę.
export interface Slot {
  id: string // `${courseId}|${classType}`
  courseName: string
  classType: string
  options: GroupOption[]
  currentIndex: number | null // grupa, w której użytkownik jest teraz
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
}

export interface OptimizerSettings {
  weights: Weights
  startAfter: string // "zaczynaj nie wcześniej niż"
  endBefore: string // "kończ nie później niż"
  blocked: BlockedTime[]
  pinned: Record<string, number> // slotId -> numer grupy, której nie ruszamy
}

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  weights: { gaps: 3, days: 2, early: 1, late: 1 },
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
  score: number // mniej = lepiej
}

export interface Candidate {
  choice: number[] // indeks opcji dla każdego slotu
  metrics: PlanMetrics
  changes: number // ile slotów różni się od obecnego planu
}

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
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
  settings: Pick<OptimizerSettings, 'weights' | 'startAfter' | 'endBefore'>,
  gapThreshold: number,
  weeks: number,
): PlanMetrics {
  const byDay = new Map<string, OptMeeting[]>()
  for (const m of meetings) {
    const key = toDateKey(m.start)
    const list = byDay.get(key)
    if (list) list.push(m)
    else byDay.set(key, [m])
  }

  const startAfter = toMinutes(settings.startAfter)
  const endBefore = toMinutes(settings.endBefore)
  let gaps = 0
  let early = 0
  let late = 0
  for (const day of byDay.values()) {
    day.sort((a, b) => a.start.getTime() - b.start.getTime())
    let lastEnd = day[0].end
    for (let i = 1; i < day.length; i++) {
      const gap = (day[i].start.getTime() - lastEnd.getTime()) / 60_000
      if (gap >= gapThreshold) gaps += gap
      if (day[i].end > lastEnd) lastEnd = day[i].end
    }
    early += Math.max(0, startAfter - minutesOfDay(day[0].start))
    late += Math.max(0, minutesOfDay(lastEnd) - endBefore)
  }

  const metrics = {
    gapMinutes: gaps / weeks,
    days: byDay.size / weeks,
    earlyMinutes: early / weeks,
    lateMinutes: late / weeks,
  }
  const w = settings.weights
  const score =
    (w.gaps * metrics.gapMinutes) / 60 +
    w.days * metrics.days +
    (w.early * metrics.earlyMinutes) / 60 +
    (w.late * metrics.lateMinutes) / 60
  return { ...metrics, score }
}

// Grupa dziekańska z numeru grupy zajęciowej: 101, 102 -> 1; 201 -> 2. Wykłady (gr. 1) - brak.
export function deanGroupOf(groupNumber: number): number | null {
  return groupNumber >= 100 ? Math.floor(groupNumber / 100) : null
}

// Grupy dziekańskie obecne w co najmniej połowie zajęć z grupami dziekańskimi. Pojedyncza
// "trójka" w jednym przedmiocie to nie jest osobna grupa dziekańska do porównania.
export function deanGroups(slots: Slot[]): number[] {
  const withDeans = slots.filter((s) => s.options.some((o) => deanGroupOf(o.groupNumber) !== null))
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
    const meetings = [...fixed, ...choice.flatMap((c, i) => slots[i].options[c].meetings)]
    const changes = choice.filter((c, i) => slots[i].currentIndex !== null && c !== slots[i].currentIndex).length
    const metrics = evaluate(meetings, settings, gapThreshold, weeks)
    return { choice, changes, metrics: { ...metrics, score: metrics.score + changes * CHANGE_PENALTY } }
  }

  // Obecny plan - do porównania, niezależnie od ograniczeń.
  const currentChoice = slots.map((s) => s.currentIndex ?? 0)
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
  if (allowed.some((a) => a.length === 0)) return { candidates: [], current, checked: 0, truncated: false }

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
        clash = optionsConflict(option, slots[other].options[choice[other]])
      }
      if (clash) continue
      choice[slotIndex] = optionIndex
      visit(depth + 1)
    }
  }
  visit(0)

  return { candidates: top, current, checked, truncated }
}
