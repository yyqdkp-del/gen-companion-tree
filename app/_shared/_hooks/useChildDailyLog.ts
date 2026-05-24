import { useState, useEffect, useCallback } from 'react'
import { fetchDailyLog, saveDailyLog } from '../_services/childService'
import type { DailyLog, HealthStatus, MoodStatus } from '../_types'

const emptyLog = (): DailyLog => ({})

export function useChildDailyLog(
  childId: string | undefined,
  userId: string,
  today: string,
) {
  const [dailyLog, setDailyLog] = useState<DailyLog>(emptyLog())

  useEffect(() => {
    if (!childId) return
    setDailyLog(emptyLog())
    fetchDailyLog(childId, today).then(data => {
      setDailyLog(data ?? emptyLog())
    })
  }, [childId, today])

  const saveStatus = useCallback(async (health: HealthStatus, mood: MoodStatus) => {
    if (!childId) return
    const newId = await saveDailyLog(
      childId, userId, today, health, mood, dailyLog.id,
    )
    setDailyLog(prev => ({ ...prev, id: newId, health_status: health, mood_status: mood }))
  }, [childId, userId, today, dailyLog.id])

  return { dailyLog, saveStatus }
}
