import { useState, useEffect, useCallback, useRef } from 'react'
import { enrichChildren } from '../_services/childService'
import { useLocalTodayStr } from '@/lib/date/useLocalTodayStr'

export function useChildData(userId: string | null) {
  const [enrichedKids, setEnrichedKids] = useState<any[]>([])
  const cacheRef = useRef<Record<string, any>>({})
  const today = useLocalTodayStr()

  const refresh = useCallback(async (): Promise<any[]> => {
    if (!userId) return []
    const kids = await enrichChildren(userId, today)
    setEnrichedKids(kids)
    kids.forEach((c: any) => { cacheRef.current[c.id] = c })
    return kids
  }, [userId, today])

  useEffect(() => { refresh() }, [refresh])

  return { enrichedKids, refresh }
}
