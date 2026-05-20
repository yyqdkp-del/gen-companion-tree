import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function applyAbortSignal<T>(builder: T, signal?: AbortSignal): T {
  if (!signal) return builder
  const b = builder as { abortSignal?: (s: AbortSignal) => T }
  return typeof b.abortSignal === 'function' ? b.abortSignal(signal) : builder
}

export async function fetchAppData(uid: string, signal?: AbortSignal) {
  const [childRes, todoRes, hotspotRes] = await Promise.all([
    applyAbortSignal(
      supabase.from('children').select('*').eq('user_id', uid),
      signal,
    ),
    applyAbortSignal(
      supabase.from('todo_items')
        .select('*').eq('user_id', uid)
        .not('status', 'in', '("done","dismissed")')
        .order('created_at', { ascending: false })
        .limit(50),
      signal,
    ),
    applyAbortSignal(
      supabase.from('hotspot_items')
        .select('*').neq('status', 'dismissed')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20),
      signal,
    ),
  ])

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  if (childRes.error) console.error('children fetch error:', childRes.error)
  if (todoRes.error) console.error('todos fetch error:', todoRes.error)
  if (hotspotRes.error) console.error('hotspots fetch error:', hotspotRes.error)

  return {
    kids:     childRes.data   || [],
    todos:    todoRes.data    || [],
    hotspots: hotspotRes.data || [],
  }
}
