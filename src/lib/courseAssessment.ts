// Zaliczenie przedmiotu z planu - z rozpiski programu studiów, jeśli plan do niego pasuje
// (przedmiot o tej samej nazwie na innym kierunku może mieć inne zasady).
import type { CourseAssessment } from './assessment'
import { ASSESSMENTS } from './programs/ibAssessment'
import { PROGRAM_NAMES } from './programs/ibNames'
import { currentCourseNames, matchesProgram, programCourseKey } from './studyProgram'

export type AssessmentLookup = (courseName: string) => CourseAssessment | null

// null - plan nie pasuje do żadnego znanego programu.
export function programAssessments(
  meetings: { courseName: string; start: Date; custom?: boolean }[],
  now: Date,
): AssessmentLookup | null {
  if (!matchesProgram(PROGRAM_NAMES, currentCourseNames(meetings, now))) return null
  return (courseName) => {
    const key = programCourseKey(PROGRAM_NAMES, courseName)
    return key ? (ASSESSMENTS[key] ?? null) : null
  }
}
