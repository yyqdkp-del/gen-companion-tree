import { useState, useEffect, useCallback, useRef } from 'react'
import { enrichChildren, enrichOneChild, toMinimalEnrichedChild } from '../_services/childService'
import { useLocalTodayStr } from '@/lib/date/useLocalTodayStr'
import { useApp } from '@/app/context/AppContext'

type Options = {
  /** 延迟加载 enrich（校历/精力等），首屏先展示核心水珠；0 = 立即 enrich */
  deferMs?: number
  /** 当前选中孩子：仅对该 id 拉详细数据 */
  activeChildId?: string | null
}

export function useChildData(userId: string | null, options?: Options) {
  const { kids } = useApp()
  const [enrichedKids, setEnrichedKids] = useState<any[]>([])
  const cacheRef = useRef<Record<string, any>>({})
  const enrichBusyRef = useRef<string | null>(null)
  const today = useLocalTodayStr()
  const deferMs = options?.deferMs ?? 0
  const activeChildId = options?.activeChildId ?? null

  const mergeList = useCallback((list: any[]) => {
    setEnrichedKids(list)
    list.forEach((c: any) => { cacheRef.current[c.id] = c })
    return list
  }, [])

  const refresh = useCallback(async (forChildId?: string | null): Promise<any[]> => {
    if (!userId) return []
    const targetId = forChildId ?? activeChildId
    const enriched = await enrichChildren(userId, today, kids.length > 0 ? kids : undefined, {
      activeChildId: targetId,
    })
    return mergeList(enriched)
  }, [userId, today, kids, activeChildId, mergeList])

  /** 切换孩子时按需加载详细数据（已 enrich 则跳过） */
  const ensureEnriched = useCallback(async (childId: string, force = false): Promise<any | null> => {
    if (!userId || !childId) return null
    if (!force && cacheRef.current[childId]?._enriched) {
      return cacheRef.current[childId]
    }
    if (enrichBusyRef.current === childId) {
      return cacheRef.current[childId] ?? null
    }

    const base = kids.find((k: any) => k.id === childId)
    if (!base) return null

    enrichBusyRef.current = childId
    try {
      const full = await enrichOneChild(base, userId, today)
      cacheRef.current[childId] = full
      setEnrichedKids((prev) => {
        const next = prev.length
          ? prev.map((c) => (c.id === childId ? full : c))
          : kids.map((k: any) => (k.id === childId ? full : toMinimalEnrichedChild(k)))
        return next
      })
      return full
    } finally {
      if (enrichBusyRef.current === childId) enrichBusyRef.current = null
    }
  }, [userId, today, kids])

  useEffect(() => {
    if (!userId) {
      setEnrichedKids([])
      return
    }
    const timer = setTimeout(() => { void refresh() }, deferMs)
    return () => clearTimeout(timer)
  }, [userId, deferMs, refresh, kids.length, activeChildId])

  return { enrichedKids, refresh, ensureEnriched }
}
