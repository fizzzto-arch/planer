import { useEffect, useState } from 'react'
import { fetchCourseId, loadCachedCourseId, saveCachedCourseId } from '../lib/courseInfo'

// Kod przedmiotu w USOS (do linku do strony przedmiotu w USOSweb) z numeru zajęć z planu.
// Zapamiętany w przeglądarce - pobieramy go raz; bez internetu po prostu nie ma linku.
export function useCourseId(unitId: string | null): string | null {
  const [courseId, setCourseId] = useState<{ unitId: string; id: string } | null>(() => {
    const cached = unitId ? loadCachedCourseId(unitId) : null
    return cached && unitId ? { unitId, id: cached } : null
  })
  const current = courseId?.unitId === unitId ? courseId.id : null

  useEffect(() => {
    if (!unitId || current) return
    let cancelled = false
    fetchCourseId(unitId)
      .then((id) => {
        if (cancelled) return
        saveCachedCourseId(unitId, id)
        setCourseId({ unitId, id })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [unitId, current])

  return current
}
