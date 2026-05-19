'use client'

import { useEffect, useState } from 'react'
import { getTodayStr } from './localDate'

/**
 * 当前用户本地的「日历日」YYYY-MM-DD，跨日或切回前台时更新。
 */
export function useLocalTodayStr(): string {
  const [today, setToday] = useState(() => getTodayStr())

  useEffect(() => {
    const update = () => setToday(getTodayStr())
    const id = setInterval(update, 60 * 60 * 1000)
    const onVis = () => {
      if (document.visibilityState === 'visible') update()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return today
}
