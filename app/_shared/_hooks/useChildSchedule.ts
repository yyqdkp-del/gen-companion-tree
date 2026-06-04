import { useState, useEffect, useRef } from 'react'
import { fetchChildSchedule } from '../_services/childService'
import type { PackingPreferencesMap } from '@/lib/packing/packingPreferences'
import type { TimelineItem } from '../_types'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'

export function useChildSchedule(childId: string | undefined, userId: string | undefined, today: string) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [packingItems, setPackingItems] = useState<string[]>([])
  const [packingPreferences, setPackingPreferences] = useState<PackingPreferencesMap>({})
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const requestKeyRef = useRef<string>('')

  useEffect(() => {
    if (!childId || !userId) return
    // 切换孩子时先清空，避免短暂显示上一个孩子的数据
    setTimeline([])
    setCalendar([])
    setPackingItems([])
    setPackingPreferences({})
    setLoading(true)
    const reqKey = `${childId}|${userId}|${today}`
    requestKeyRef.current = reqKey
    fetchChildSchedule(childId, userId, today)
      .then(({ timeline, calendar, packingItems: packItems, packingPreferences: prefs }) => {
        if (requestKeyRef.current !== reqKey) return
        setTimeline(timeline)
        setCalendar(calendar)
        setPackingItems(packItems ?? [])
        setPackingPreferences(prefs ?? {})
      })
      .catch(logOrAlertNetworkError)
      .finally(() => {
        if (requestKeyRef.current !== reqKey) return
        setLoading(false)
      })
  }, [childId, userId, today, refreshKey])

  return {
    timeline,
    calendar,
    packingItems,
    packingPreferences,
    loading,
    reload: () => setRefreshKey((k) => k + 1),
  }
}
