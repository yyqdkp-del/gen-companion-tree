import { useState, useEffect, useCallback } from 'react'
import {
  fetchDiscoveries,
  dismissDiscovery,
  addDiscoveryToCalendar,
  addDiscoveryReminder,
  type DiscoveryItem,
} from '../_services/discoveryService'

export function useDiscoveries(userId: string | null | undefined) {
  const [items, setItems] = useState<DiscoveryItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const data = await fetchDiscoveries(userId)
      setItems(data)
    } catch (e) {
      console.error('fetchDiscoveries', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  const dismiss = useCallback(async (item: DiscoveryItem) => {
    if (!userId) return
    await dismissDiscovery(userId, item)
    setItems((prev) => prev.filter((x) => x.id !== item.id || x.table !== item.table))
  }, [userId])

  const addCalendar = useCallback(async (item: DiscoveryItem) => {
    if (!userId) return
    await addDiscoveryToCalendar(userId, item)
    setItems((prev) => prev.filter((x) => x.id !== item.id || x.table !== item.table))
  }, [userId])

  const addReminder = useCallback(async (item: DiscoveryItem) => {
    if (!userId) return
    await addDiscoveryReminder(userId, item)
    setItems((prev) => prev.filter((x) => x.id !== item.id || x.table !== item.table))
  }, [userId])

  return { items, loading, reload, dismiss, addCalendar, addReminder }
}
