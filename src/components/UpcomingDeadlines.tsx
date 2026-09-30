import { t } from '../lib/i18n'
import { usePlanUi } from '../hooks/planUi'
import { upcomingDeadlines } from '../lib/deadlines'
import { DeadlineList } from './DeadlineList'

const MAX_ITEMS = 3

// Pasek "Nadchodzące terminy" w widoku Dziś - pokazuje się tylko, gdy coś jest.
// Zasięg (ile dni naprzód) ustawia się w ustawieniach.
export function UpcomingDeadlines({ now }: { now: Date }) {
  const { extras, prefs } = usePlanUi()
  if (!extras) return null
  const upcoming = upcomingDeadlines(extras.extras.deadlines, now, prefs.upcomingDays)
  if (upcoming.length === 0) return null

  return (
    <section className="upcoming">
      <h3 className="section-title">{t('Nadchodzące terminy')}</h3>
      <DeadlineList deadlines={upcoming.slice(0, MAX_ITEMS)} now={now} showCourse compact />
      {upcoming.length > MAX_ITEMS && (
        <p className="muted small">{t('i jeszcze {n} w zakładce Przedmioty', { n: upcoming.length - MAX_ITEMS })}</p>
      )}
    </section>
  )
}
