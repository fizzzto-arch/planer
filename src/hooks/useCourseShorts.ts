import { useEffect, useMemo, useState } from 'react'
import { codeShort, fetchCourseCodes, loadCourseCodes, saveCourseCodes } from '../lib/courseCodes'
import type { Meeting } from '../lib/usos'

// Skróty przedmiotów z kodów USOS (nazwa przedmiotu -> np. "LAEL"). Brakujące kody pobieramy raz
// i zapamiętujemy; bez nich (WAT, brak internetu) zostaje skrót z pierwszych liter.
export function useCourseShorts(meetings: Meeting[]): Map<string, string> {
  const [codes, setCodes] = useState(loadCourseCodes)
  // Jedne zajęcia na przedmiot wystarczą - wszystkie typy zajęć mają ten sam kod przedmiotu.
  const units = useMemo(() => {
    const byCourse = new Map<string, string>()
    for (const m of meetings) if (m.unitId && !byCourse.has(m.courseName)) byCourse.set(m.courseName, m.unitId)
    return byCourse
  }, [meetings])
  const missing = [...new Set(units.values())].filter((unit) => !(unit in codes)).sort().join(',')

  useEffect(() => {
    if (!missing) return
    let cancelled = false
    void fetchCourseCodes(missing.split(',')).then((found) => {
      if (cancelled || Object.keys(found).length === 0) return
      setCodes((prev) => {
        const next = { ...prev, ...found }
        saveCourseCodes(next)
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [missing])

  return useMemo(() => {
    const shorts = new Map<string, string>()
    for (const [course, unit] of units) {
      const short = codes[unit] ? codeShort(codes[unit]) : null
      if (short) shorts.set(course, short)
    }
    return shorts
  }, [units, codes])
}
