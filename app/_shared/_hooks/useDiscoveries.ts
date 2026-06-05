import { useState, useEffect, useCallback } from 'react'
import {
  fetchDiscoveries,
  dismissDiscovery,
  addDiscoveryToTodo,
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

  const addTodo = useCallback(async (item: DiscoveryItem) => {
    if (!userId) return
    await addDiscoveryToTodo(userId, item)
    setItems((prev) => prev.filter((x) => x.id !== item.id || x.table !== item.table))
  }, [userId])

  return { items, loading, reload, dismiss, addTodo }
}
