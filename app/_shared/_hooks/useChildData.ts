import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { enrichOneChild, toMinimalEnrichedChild } from '../_services/childService'
import { useLocalTodayStr } from '@/lib/date/useLocalTodayStr'
import { useApp } from '@/app/context/AppContext'

type Options = {
  /** 延迟加载 enrich（校历/精力等），首屏先展示核心水珠；0 = 立即 enrich */
  deferMs?: number
  /** 当前选中孩子：仅对该 id 拉详细数据 */
  activeChildId?: string | null
}

function buildEnrichedList(
  kids: any[],
  activeEnriched: any | undefined,
  enrichedById: Record<string, any>,
): any[] {
  return kids.map((k: any) => {
    if (activeEnriched && k.id === activeEnriched.id) return activeEnriched
    const cached = enrichedById[k.id]
    if (cached?._enriched) return cached
    return toMinimalEnrichedChild(k)
  })
}

export function useChildData(userId: string | null, options?: Options) {
  const { kids } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const [enrichedById, setEnrichedById] = useState<Record<string, any>>({})
  const today = useLocalTodayStr()
  const activeChildId = options?.activeChildId ?? null
  const enrichTargetId = activeChildId ?? (kids.length === 1 ? kids[0]?.id ?? null : null)

  const mergeEnriched = useCallback((full: any) => {
    setEnrichedById((prev) => ({ ...prev, [full.id]: full }))
  }, [])

  const { data: activeEnriched } = useSWR(
    userId && enrichTargetId ? (['child-enriched', userId, enrichTargetId, today] as const) : null,
    async () => {
      const base = kids.find((k: any) => k.id === enrichTargetId)
      if (!base) throw new Error('Child not found')
      return enrichOneChild(base, userId!, today)
    },
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
      onSuccess: mergeEnriched,
    },
  )

  useEffect(() => {
    if (!userId) setEnrichedById({})
  }, [userId])

  const enrichedKids = useMemo(
    () => (userId && kids.length ? buildEnrichedList(kids, activeEnriched, enrichedById) : []),
    [userId, kids, activeEnriched, enrichedById],
  )

  const fetchEnriched = useCallback(async (childId: string) => {
    const base = kids.find((k: any) => k.id === childId)
    if (!base || !userId) return null
    return enrichOneChild(base, userId, today)
  }, [kids, userId, today])

  const refresh = useCallback(async (forChildId?: string | null): Promise<any[]> => {
    if (!userId) return []
    const targetId = forChildId ?? enrichTargetId
    if (!targetId) return buildEnrichedList(kids, activeEnriched, enrichedById)

    const full = await globalMutate(
      ['child-enriched', userId, targetId, today],
      () => fetchEnriched(targetId),
      { revalidate: true },
    )

    const mergedById = full
      ? { ...enrichedById, [targetId]: full }
      : enrichedById

    return buildEnrichedList(kids, targetId === enrichTargetId ? (full ?? activeEnriched) : activeEnriched, mergedById)
  }, [userId, enrichTargetId, kids, activeEnriched, enrichedById, globalMutate, fetchEnriched])

  const ensureEnriched = useCallback(async (childId: string, force = false): Promise<any | null> => {
    if (!userId || !childId) return null
    const base = kids.find((k: any) => k.id === childId)
    if (!base) return null

    if (!force) {
      if (activeEnriched?.id === childId && activeEnriched._enriched) return activeEnriched
      const cached = enrichedById[childId]
      if (cached?._enriched) return cached
    }

    const full = await globalMutate(
      ['child-enriched', userId, childId, today],
      () => fetchEnriched(childId),
      { revalidate: true },
    )
    return full ?? null
  }, [userId, today, kids, activeEnriched, enrichedById, globalMutate, fetchEnriched])

  return { enrichedKids, refresh, ensureEnriched }
}
