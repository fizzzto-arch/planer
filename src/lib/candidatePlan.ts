// Plan "po zmianie" z optymalizatora jako zwykła lista zajęć - do podglądu tygodnia i eksportu.
import { addDays, startOfWeek } from './dates'
import { applyChange, seriesOverride, type PlanMeeting } from './edits'
import type { SeriesEdit } from './extras'
import type { ExtraGroup } from './extraCourses'
import type { Candidate, OptMeeting, Slot } from './optimizer'
import { semesterWeek } from './semesterWeek'

export function toPlanMeeting(
  id: string,
  m: OptMeeting,
  courseName: string,
  type: string,
  groupNumber: number | null,
): PlanMeeting {
  return {
    id,
    courseName,
    type,
    start: m.start,
    end: m.end,
    room: m.room,
    building: m.building,
    address: null,
    groupNumber,
    unitId: null,
    usosUrl: null,
    cancelled: false,
    edited: false,
    custom: false,
    note: '',
    original: null,
  }
}

export type FixedMeeting = OptMeeting & { courseName: string; type: string }

// Wszystkie zajęcia propozycji (wybrane grupy + zajęcia stałe) i identyfikatory tych z nowych grup.
export function candidateMeetings(
  candidate: Candidate,
  slots: Slot[],
  fixed: FixedMeeting[],
): { meetings: PlanMeeting[]; changedIds: Set<string> } {
  const changedIds = new Set<string>()
  const meetings = [
    ...slots.flatMap((slot, i) => {
      const option = slot.options[candidate.choice[i]]
      if (!option) return [] // zajęcia spoza planu, które nie mieszczą się w obecnym planie
      // Zajęcia spoza planu (WF, lektorat) też są nowe - wyróżniamy je jak zmienione grupy.
      const changed = slot.extra === true || (slot.currentIndex !== null && candidate.choice[i] !== slot.currentIndex)
      return option.meetings.map((m, j) => {
        const id = `${slot.id}-${option.groupNumber}-${j}`
        if (changed) changedIds.add(id)
        return toPlanMeeting(id, m, option.courseName ?? slot.courseName, slot.classType, option.groupNumber)
      })
    }),
    ...fixed.map((m, j) => toPlanMeeting(`fixed-${j}`, m, m.courseName, m.type, null)),
  ].sort((a, b) => a.start.getTime() - b.start.getTime())
  return { meetings, changedIds }
}

// Stałe zmiany grup (wykład przeniesiony z piątku na czwartek, inna sala) nałożone na terminy grup
// z USOS - optymalizator liczy wtedy z prawdziwym planem, a nie z tym, co jest w USOS.
export function withSeriesEdits(slots: Slot[], seriesEdits: ReadonlyMap<string, SeriesEdit>): Slot[] {
  if (seriesEdits.size === 0) return slots
  return slots.map((slot) => {
    let changed = false
    const options = slot.options.map((option) => {
      const series = option.unitId ? seriesEdits.get(`${option.unitId}-${option.groupNumber}`) : undefined
      if (!series) return option
      changed = true
      const meetings = option.meetings
        .map((m) => {
          const change = seriesOverride(m.start, series)
          return change ? applyChange(m, change) : m
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime())
      return { ...option, meetings }
    })
    return changed ? { ...slot, options } : slot
  })
}

// Zajęcia grupy spoza planu (WF, lektorat) w jednym tygodniu - w tygodnie z właściwą parzystością.
export function extraGroupWeek(group: ExtraGroup, weekStart: Date, odd: boolean | null): PlanMeeting[] {
  if (group.parity !== 'weekly' && odd !== null && odd !== (group.parity === 'odd')) return []
  // WF z USOS ma typ "FIZ" - w Planerze kolor WF.
  const type = group.classType === 'FIZ' ? 'WF' : group.classType
  return group.meetings.map((m, i) => {
    const day = addDays(weekStart, m.weekday - 1)
    const at = (minutes: number) =>
      new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
    return toPlanMeeting(
      `extra-${group.id}-${weekStart.getTime()}-${i}`,
      { start: at(m.start), end: at(m.end), room: group.place || null, building: null },
      group.courseName,
      type,
      group.groupNumber,
    )
  })
}

// Tygodnie z zajęciami od bieżącego - w nich rozpisujemy grupy spoza planu.
function upcomingWeeks(meetings: Pick<PlanMeeting, 'start' | 'cancelled'>[], now: Date): Date[] {
  const from = startOfWeek(now).getTime()
  return [...new Set(meetings.map((m) => startOfWeek(m.start).getTime()))]
    .filter((w) => w >= from)
    .sort((a, b) => a - b)
    .map((w) => new Date(w))
}

// Identyfikator wyboru: te same przedmioty i typ zajęć = ten sam wybór (drugie wyszukiwanie go zastępuje).
export function extraSlotId(groups: ExtraGroup[]): string {
  const courses = [...new Set(groups.map((g) => g.courseId))].sort().join('+')
  return `extra|${courses}|${groups[0]?.classType ?? ''}`
}

// Grupy przedmiotu spoza planu jako jedne zajęcia do wyboru w optymalizatorze - rozpisane na
// tygodnie planu z właściwą parzystością, jak zwykłe grupy z USOS.
export function extraGroupsSlot(
  groups: ExtraGroup[],
  meetings: Pick<PlanMeeting, 'start' | 'cancelled'>[],
  now: Date,
): Slot | null {
  const usable = groups.filter((g) => g.meetings.length > 0) // grupa bez terminów "pasowałaby" zawsze
  if (usable.length === 0) return null
  const active = meetings.filter((m) => !m.cancelled)
  const weeks = upcomingWeeks(active, now).map((week) => ({ week, odd: semesterWeek(week, active)?.odd ?? null }))
  const first = usable[0]
  return {
    id: extraSlotId(groups),
    courseName: first.courseName,
    classType: first.classType === 'FIZ' ? 'WF' : first.classType,
    currentIndex: null,
    extra: true,
    options: usable.map((g) => ({
      unitId: '',
      groupNumber: g.groupNumber,
      courseId: g.courseId,
      courseName: g.courseName,
      meetings: weeks
        .flatMap(({ week, odd }) => extraGroupWeek(g, week, odd))
        .map(({ start, end, room, building }) => ({ start, end, room, building })),
    })),
  }
}

// Obecny plan + grupa spoza planu we wszystkich tygodniach z zajęciami (od bieżącego).
export function withExtraGroup(meetings: PlanMeeting[], group: ExtraGroup, now: Date): PlanMeeting[] {
  const active = meetings.filter((m) => !m.cancelled)
  const extra = upcomingWeeks(active, now).flatMap((week) => {
    const sw = semesterWeek(week, active)
    return extraGroupWeek(group, week, sw ? sw.odd : null)
  })
  return [...meetings, ...extra].sort((a, b) => a.start.getTime() - b.start.getTime())
}
