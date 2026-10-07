import { t } from '../lib/i18n'
import { useMemo, type ReactNode } from 'react'
import { usePlanUi } from '../hooks/planUi'
import type { FeedbackApi } from '../hooks/useFeedback'
import { programAssessments } from '../lib/courseAssessment'
import type { PlanMeeting } from '../lib/edits'
import { FeedbackView } from './FeedbackView'

interface Props {
  meetings: PlanMeeting[]
  now: Date
  feedback: FeedbackApi | null // null - bez konta (zgłoszenia tylko po zalogowaniu)
  admin: boolean
}

// Zakładka "Dla testerów": funkcje w wersji testowej (alpha) - na co dzień niepotrzebne, więc nie
// w Przedmiotach - oraz zgłoszenia, zadania dla testerów i (administrator) skrzynka.
export function TestersView({ meetings, now, feedback, admin }: Props) {
  const { canOptimize, isAdmin, openOptimizer, openProgram } = usePlanUi()
  // Program studiów (na razie Inżynieria Biomedyczna) - gdy przedmioty z planu do niego pasują.
  const hasProgram = useMemo(() => programAssessments(meetings, now) !== null, [meetings, now])

  return (
    <section>
      <h2 className="day-title">{t('Dla testerów')}</h2>
      <p className="muted testers-lead">{t('Nowe funkcje w wersji testowej i miejsce na uwagi - napisz, co działa, a co nie.')}</p>

      {(hasProgram || canOptimize) && (
        <div className="testers-alpha">
          <h3 className="day-title secondary">{t('Wersje testowe')}</h3>
          {hasProgram && (
            <AlphaEntry
              title={t('Program studiów')}
              text={t('Wszystkie semestry i przedmioty Twojego kierunku, z sylabusami, ocenami i średnią')}
              onClick={() => openProgram()}
              icon={<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" />}
            />
          )}
          {/* Optymalizator: administrator i osoby, którym go przyznał. */}
          {canOptimize && (
            <AlphaEntry
              title={t('Dobierz grupy')}
              text={
                t('Znajdź układ grup z mniejszą liczbą okienek i dni na uczelni') +
                (isAdmin ? t(' (widoczne dla Ciebie i osób, którym dasz dostęp)') : '')
              }
              onClick={openOptimizer}
              icon={<path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" />}
            />
          )}
        </div>
      )}

      {feedback ? (
        <FeedbackView feedback={feedback} admin={admin} />
      ) : (
        <p className="empty-state">{t('Zaloguj się, żeby zgłosić problem albo pomysł.')}</p>
      )}
    </section>
  )
}

function AlphaEntry({ title, text, icon, onClick }: { title: string; text: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="optimizer-entry" onClick={onClick}>
      <span className="optimizer-entry-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">{icon}</svg>
      </span>
      <span className="optimizer-entry-text">
        <strong>
          {title} <span className="alpha-badge">alpha</span>
        </strong>
        <span>{text}</span>
      </span>
      <svg className="course-row-chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  )
}
