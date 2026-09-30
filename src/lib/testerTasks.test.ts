import { describe, expect, it } from 'vitest'
import { parseTesterTasks, tasksFor, TESTER_TASKS } from './testerTasks'

describe('zadania dla testerów', () => {
  it('optymalizator tylko dla osób z dostępem', () => {
    expect(tasksFor(false).some((t) => t.id === 'optimizer')).toBe(false)
    expect(tasksFor(true)).toHaveLength(TESTER_TASKS.length)
  })

  it('z bazy tylko znane zadania, bez powtórzeń', () => {
    expect(parseTesterTasks({ done: ['plan', 'plan', 'nieznane', 3, 'sync'] })).toEqual(['plan', 'sync'])
    expect(parseTesterTasks(undefined)).toEqual([])
    expect(parseTesterTasks({ done: 'plan' })).toEqual([])
  })
})
