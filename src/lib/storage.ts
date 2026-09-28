import type { Meeting } from './usos'

// Wszystko zapisujemy tylko w tej przeglądarce (localStorage).

export type PlanSource = { kind: 'url'; url: string } | { kind: 'file'; name: string }

export interface SavedPlan {
  source: PlanSource | null
  meetings: Meeting[]
  updatedAt: Date | null
}

const KEY = 'planer.plan.v1'

type StoredMeeting = Omit<Meeting, 'start' | 'end'> & { start: number; end: number }

interface StoredPlan {
  source: PlanSource | null
  meetings: StoredMeeting[]
  updatedAt: number | null
}

export const EMPTY_PLAN: SavedPlan = { source: null, meetings: [], updatedAt: null }

export function loadPlan(): SavedPlan {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_PLAN
    const stored = JSON.parse(raw) as StoredPlan
    return {
      source: stored.source ?? null,
      meetings: (stored.meetings ?? []).map((m) => ({
        ...m,
        start: new Date(m.start),
        end: new Date(m.end),
      })),
      updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : null,
    }
  } catch {
    return EMPTY_PLAN
  }
}

export function savePlan(plan: SavedPlan): void {
  const stored: StoredPlan = {
    source: plan.source,
    meetings: plan.meetings.map((m) => ({
      ...m,
      start: m.start.getTime(),
      end: m.end.getTime(),
    })),
    updatedAt: plan.updatedAt ? plan.updatedAt.getTime() : null,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(stored))
  } catch {
    // brak miejsca albo zablokowany storage - plan działa dalej, tylko się nie zapamięta
  }
}

export function clearPlan(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nic do zrobienia
  }
}
