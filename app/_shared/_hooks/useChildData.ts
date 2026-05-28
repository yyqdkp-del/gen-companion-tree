import { useState, useEffect, useCallback, useRef } from 'react'
import { enrichChildren } from '../_services/childService'
import { useLocalTodayStr } from '@/lib/date/useLocalTodayStr'
import { useApp } from '@/app/context/AppContext'

type Options = {
  /** 延迟加载 enrich（校历/精力等），首屏先展示核心水珠；0 = 立即 enrich */
  deferMs?: number
}

export function useChildData(userId: string | null, options?: Options) {
  const { kids } = useApp()
  const [enrichedKids, setEnrichedKids] = useState<any[]>([])
  const cacheRef = useRef<Record<string, any>>({})
  const today = useLocalTodayStr()
  const deferMs = options?.deferMs ?? 0

  const refresh = useCallback(async (): Promise<any[]> => {
    if (!userId) return []
    const enriched = await enrichChildren(userId, today, kids.length > 0 ? kids : undefined)
    setEnrichedKids(enriched)
    enriched.forEach((c: any) => { cacheRef.current[c.id] = c })
    return enriched
  }, [userId, today, kids])

  useEffect(() => {
    if (!userId) {
      setEnrichedKids([])
      return
    }
    const timer = setTimeout(() => { void refresh() }, deferMs)
    return () => clearTimeout(timer)
  }, [userId, deferMs, refresh, kids.length])

  return { enrichedKids, refresh }
}
