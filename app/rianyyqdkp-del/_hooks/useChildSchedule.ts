import { useState, useEffect } from 'react'
import { fetchChildSchedule } from '../_services/childService'
import type { TimelineItem } from '../_types'

export function useChildSchedule(childId: string | undefined, today: string) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!childId) return
    setLoading(true)
    fetchChildSchedule(childId, today)
      .then(({ timeline, calendar }) => {
        setTimeline(timeline)
        setCalendar(calendar)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [childId, today])

  return { timeline, calendar, loading }
}
