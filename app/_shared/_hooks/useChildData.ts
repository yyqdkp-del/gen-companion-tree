import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { enrichChildren } from '../_services/childService'

export function useChildData(userId: string | null) {
  const [enrichedKids, setEnrichedKids] = useState<any[]>([])
  const cacheRef = useRef<Record<string, any>>({})
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const refresh = useCallback(async () => {
    if (!userId) return
    const kids = await enrichChildren(userId, today)
    setEnrichedKids(kids)
    kids.forEach((c: any) => { cacheRef.current[c.id] = c })
  }, [userId, today])

  useEffect(() => { refresh() }, [refresh])

  return { enrichedKids, refresh }
}
