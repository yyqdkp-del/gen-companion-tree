import { useState, useEffect, useCallback, useRef } from 'react'
import { enrichChildren } from '../_services/childService'
import { useLocalTodayStr } from '@/lib/date/useLocalTodayStr'

type Options = {
  /** 延迟加载 enrich（校历/精力等），首屏先展示核心水珠 */
  deferMs?: number
}

export function useChildData(userId: string | null, options?: Options) {
  const [enrichedKids, setEnrichedKids] = useState<any[]>([])
  const cacheRef = useRef<Record<string, any>>({})
  const today = useLocalTodayStr()
  const deferMs = options?.deferMs ?? 1000

  const refresh = useCallback(async (): Promise<any[]> => {
    if (!userId) return []
    const kids = await enrichChildren(userId, today)
    setEnrichedKids(kids)
    kids.forEach((c: any) => { cacheRef.current[c.id] = c })
    return kids
  }, [userId, today])

  useEffect(() => {
    if (!userId) {
      setEnrichedKids([])
      return
    }
    const timer = setTimeout(() => { void refresh() }, deferMs)
    return () => clearTimeout(timer)
  }, [userId, deferMs, refresh])

  return { enrichedKids, refresh }
}
