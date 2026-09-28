import { usePlanUi } from '../hooks/planUi'
import { upcomingDeadlines } from '../lib/deadlines'
import { DeadlineList } from './DeadlineList'

const DAYS_AHEAD = 14
const MAX_ITEMS = 3

// Pasek "Nadchodzące terminy" w widoku Dziś - pokazuje się tylko, gdy coś jest.
export function UpcomingDeadlines({ now }: { now: Date }) {
  const { extras } = usePlanUi()
  if (!extras) return null
  const upcoming = upcomingDeadlines(extras.extras.deadlines, now, DAYS_AHEAD)
  if (upcoming.length === 0) return null

  return (
    <section className="upcoming">
      <h3 className="section-title">Nadchodzące terminy</h3>
      <DeadlineList deadlines={upcoming.slice(0, MAX_ITEMS)} now={now} showCourse compact />
      {upcoming.length > MAX_ITEMS && (
        <p className="muted small">i jeszcze {upcoming.length - MAX_ITEMS} w zakładce Przedmioty</p>
      )}
    </section>
  )
}
