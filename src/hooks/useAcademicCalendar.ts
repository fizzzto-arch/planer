import { useEffect, useState } from 'react'
import type { AcademicCalendar, CalendarEvent } from '../lib/academicCalendar'

// Kalendarz akademicki leży obok strony (calendar.json, publikuje go wdrożenie). Raz na sesję;
// bez pliku (np. wersja deweloperska) - po prostu bez etykiet.
let loading: Promise<CalendarEvent[]> | null = null

function loadCalendar(): Promise<CalendarEvent[]> {
  loading ??= fetch('./calendar.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<AcademicCalendar>) : { fetchedAt: '', events: [] }))
    .then((c) => (Array.isArray(c.events) ? c.events : []))
    .catch(() => [])
  return loading
}

export function useAcademicCalendar(): CalendarEvent[] {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  useEffect(() => {
    let cancelled = false
    void loadCalendar().then((list) => {
      if (!cancelled) setEvents(list)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return events
}
