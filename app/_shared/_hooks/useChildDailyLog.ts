import { useState, useEffect, useCallback } from 'react'
import { fetchDailyLog, saveDailyLog } from '../_services/childService'
import type { DailyLog, HealthStatus, MoodStatus } from '../_types'

export function useChildDailyLog(
  childId: string | undefined,
  userId: string,
  today: string,
  defaultHealth?: HealthStatus,
  defaultMood?: MoodStatus,
) {
  const [dailyLog, setDailyLog] = useState<DailyLog>({
    health_status: defaultHealth ?? 'normal',
    mood_status:   defaultMood   ?? 'calm',
  })

  useEffect(() => {
    if (!childId) return
    fetchDailyLog(childId, today).then(data => {
      setDailyLog(data ?? {
        health_status: defaultHealth ?? 'normal',
        mood_status:   defaultMood   ?? 'calm',
      })
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
