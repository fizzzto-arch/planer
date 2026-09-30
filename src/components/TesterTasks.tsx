import { t, tk } from '../lib/i18n'
import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { tasksFor, type TesterTask } from '../lib/testerTasks'

interface Props {
  onReport: (task: TesterTask) => void // "Problem?" - zgłoszenie z nazwą zadania
}

// Lista zadań do przetestowania z odhaczaniem (postęp na koncie, na wszystkich urządzeniach).
export function TesterTasks({ onReport }: Props) {
  const { extras, canOptimize } = usePlanUi()
  const [showDone, setShowDone] = useState(false)
  if (!extras) return null

  const tasks = tasksFor(canOptimize)
  const done = new Set(extras.extras.testerTasks)
  const count = tasks.filter((item) => done.has(item.id)).length
  const allDone = count === tasks.length

  const toggle = (id: string) => {
    const next = done.has(id) ? [...done].filter((d) => d !== id) : [...done, id]
    extras.saveTesterTasks(next)
  }

  return (
    <div className="panel tester-tasks">
      <div className="section-head">
        <h3 className="panel-title">{t('Zadania do przetestowania')}</h3>
        <span className="muted small">
          {t('{done} z {total}', { done: count, total: tasks.length })}
        </span>
      </div>
      <progress className="opt-progress" value={count} max={tasks.length} aria-label={t('Postęp zadań')} />
      {allDone ? (
        <p className="success">{t('Wszystko sprawdzone - dzięki! Każda uwaga niżej dalej się przyda.')}</p>
      ) : (
        <p className="hint">
          {t('Przejdź po kolei i odhacz, co działa. Coś nie tak? Kliknij „Problem?” przy zadaniu - zgłoszenie od razu będzie wiedziało, o co chodzi.')}
        </p>
      )}
      {(!allDone || showDone) && (
        <ul className="tester-task-list">
          {tasks.map((task) => (
            <li key={task.id} className={done.has(task.id) ? 'is-done' : undefined}>
              <label className="check-row">
                <input type="checkbox" checked={done.has(task.id)} onChange={() => toggle(task.id)} />
                <span>
                  <strong>{tk(task.title)}</strong>
                  <span className="setting-hint">{tk(task.how)}</span>
                </span>
              </label>
              <button type="button" className="link-button" onClick={() => onReport(task)}>
                {t('Problem?')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {allDone && (
        <button type="button" className="link-button" onClick={() => setShowDone(!showDone)}>
          {showDone ? t('Schowaj zadania') : t('Pokaż zadania')}
        </button>
      )}
    </div>
  )
}
