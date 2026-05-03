import { useMemo, useCallback } from 'react'
import { convertHotspotToTodo } from '../_services/todoService'
import type { HotspotItem } from '../_types'

const URGENCY_ORDER: Record<string, number> = { urgent: 0, important: 1, lifestyle: 2 }

export function isConsumed(status: string) {
  return status === 'read' || status === 'dismissed'
}

export function useHotspotSheet(
  hotspots: HotspotItem[],
  userId: string,
  onRead: (id: string) => void,
  onSync?: () => void,
) {
  const { sorted, urgentCount, unreadCount } = useMemo(() => {
    const now = Date.now()

    // 过滤过期热点
    const valid = hotspots.filter(h => {
      if ((h as any).expires_at) {
        return new Date((h as any).expires_at).getTime() > now
      }
      // 没有 expires_at 的，超过24小时也过滤
      const age = now - new Date(h.created_at).getTime()
      return age < 24 * 60 * 60 * 1000
    })

    let urgentCount = 0
    let unreadCount = 0
    for (const h of valid) {
      if (h.urgency === 'urgent') urgentCount++
      if (!isConsumed(h.status))  unreadCount++
    }
    const sorted = [...valid].sort(
      (a, b) => (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2),
    )
    return { sorted, urgentCount, unreadCount }
  }, [hotspots])

  const handleConvertTodo = useCallback(async (hotspot: HotspotItem): Promise<void> => {
    await convertHotspotToTodo(hotspot.id, userId)
    onRead(hotspot.id)
    onSync?.()
  }, [userId, onRead, onSync])

  return { sorted, urgentCount, unreadCount, handleConvertTodo }
}
