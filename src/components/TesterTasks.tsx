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
  const count = tasks.filter((t) => done.has(t.id)).length
  const allDone = count === tasks.length

  const toggle = (id: string) => {
    const next = done.has(id) ? [...done].filter((d) => d !== id) : [...done, id]
    extras.saveTesterTasks(next)
  }

  return (
    <div className="panel tester-tasks">
      <div className="section-head">
        <h3 className="panel-title">Zadania do przetestowania</h3>
        <span className="muted small">
          {count} z {tasks.length}
        </span>
      </div>
      <progress className="opt-progress" value={count} max={tasks.length} aria-label="Postęp zadań" />
      {allDone ? (
        <p className="success">Wszystko sprawdzone - dzięki! Każda uwaga niżej dalej się przyda.</p>
      ) : (
        <p className="hint">
          Przejdź po kolei i odhacz, co działa. Coś nie tak? Kliknij „Problem?” przy zadaniu - zgłoszenie od razu
          będzie wiedziało, o co chodzi.
        </p>
      )}
      {(!allDone || showDone) && (
        <ul className="tester-task-list">
          {tasks.map((t) => (
            <li key={t.id} className={done.has(t.id) ? 'is-done' : undefined}>
              <label className="check-row">
                <input type="checkbox" checked={done.has(t.id)} onChange={() => toggle(t.id)} />
                <span>
                  <strong>{t.title}</strong>
                  <span className="setting-hint">{t.how}</span>
                </span>
              </label>
              <button type="button" className="link-button" onClick={() => onReport(t)}>
                Problem?
              </button>
            </li>
          ))}
        </ul>
      )}
      {allDone && (
        <button type="button" className="link-button" onClick={() => setShowDone(!showDone)}>
          {showDone ? 'Schowaj zadania' : 'Pokaż zadania'}
        </button>
      )}
    </div>
  )
}
