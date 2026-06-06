'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDaysStr } from '@/lib/date/localDate'
import {
  getSmartPackingList,
  type SmartPackingItem,
} from '@/lib/packing/packingMemory'

export function useSmartPacking(
  childId: string | undefined,
  userId: string | undefined,
  todayClasses: unknown[],
  classSchedule: Record<string, unknown[] | unknown> | undefined,
) {
  const [smartPacking, setSmartPacking] = useState<SmartPackingItem[]>([])
  const [tomorrowSmartPacking, setTomorrowSmartPacking] = useState<SmartPackingItem[]>([])

  const schedule = (classSchedule || {}) as Record<string, unknown[]>
  const classes = todayClasses as { subject?: string; category?: string }[]
  const dataKey = useMemo(
    () => `${childId ?? ''}|${JSON.stringify(schedule)}|${JSON.stringify(classes)}`,
    [childId, schedule, classes],
  )

  const reload = useCallback(async () => {
    if (!childId || !userId) {
      setSmartPacking([])
      setTomorrowSmartPacking([])
      return
    }

    const tomorrow = addDaysStr(new Date(), 1)
    const tomorrowDate = new Date(`${tomorrow}T12:00:00`)
    const tomorrowDow = tomorrowDate.getDay()
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
    const tomorrowKey = dayKeys[tomorrowDow]
    const tomorrowRaw = schedule[tomorrowKey]
    const tomorrowClasses = Array.isArray(tomorrowRaw)
      ? tomorrowRaw.filter((c) => typeof c === 'object' && c !== null) as { subject?: string; category?: string }[]
      : []

    const [todayList, tomorrowList] = await Promise.all([
      getSmartPackingList(childId, userId, classes, new Date(), {
        classSchedule: schedule,
        autoInit: true,
      }),
      getSmartPackingList(childId, userId, tomorrowClasses, tomorrowDate, {
        classSchedule: schedule,
        autoInit: false,
      }),
    ])

    setSmartPacking(todayList)
    setTomorrowSmartPacking(tomorrowList)
  }, [childId, userId, schedule, classes])

  useEffect(() => {
    void reload()
  }, [dataKey, reload])

  return { smartPacking, tomorrowSmartPacking, reloadSmartPacking: reload }
}
