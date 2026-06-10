import { createClient } from '@/lib/supabase/client'
import { addDaysStr } from '@/lib/date/localDate'

const supabase = createClient()

const CORE_CHILD_COLUMNS =
  'id,user_id,name,emoji,avatar_url,grade,school_name,school_end_time,usual_bedtime,weekend_bedtime,school_start_time,chinese_level,level,total_hanzi,energy,status'

function applyAbortSignal<T>(builder: T, signal?: AbortSignal): T {
  if (!signal) return builder
  const b = builder as { abortSignal?: (s: AbortSignal) => T }
  return typeof b.abortSignal === 'function' ? b.abortSignal(signal) : builder
}

/** 首屏核心三件套：孩子 / 待办 / 热点（并行、限量） */
export async function fetchAppData(uid: string, signal?: AbortSignal) {
  const hotspotSince = `${addDaysStr(new Date(), -1)}T00:00:00`

  const [childRes, todoRes, hotspotRes] = await Promise.all([
    applyAbortSignal(
      supabase
        .from('children')
        .select(CORE_CHILD_COLUMNS)
        .eq('user_id', uid)
        .limit(5),
      signal,
    ),
    applyAbortSignal(
      supabase
        .from('todo_items')
        .select('*')
        .eq('user_id', uid)
        .not('status', 'in', '("done","dismissed","expired")')
        .order('created_at', { ascending: false })
        .limit(50),
      signal,
    ),
    applyAbortSignal(
      supabase
        .from('hotspot_items')
        .select('*')
        .eq('user_id', uid)
        .neq('status', 'dismissed')
        .gte('created_at', hotspotSince)
        .order('created_at', { ascending: false })
        .limit(20),
      signal,
    ),
  ])

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  if (childRes.error) {
    console.warn('children fetch error:', childRes.error)
    // 孩子表失败不阻断待办/热点，避免整页卡在骨架屏
    if (todoRes.error) console.warn('todos fetch error:', todoRes.error)
    if (hotspotRes.error) console.warn('hotspots fetch error:', hotspotRes.error)
    return {
      kids: [],
      todos: todoRes.data || [],
      hotspots: hotspotRes.data || [],
    }
  }

  if (todoRes.error) console.warn('todos fetch error:', todoRes.error)
  if (hotspotRes.error) console.warn('hotspots fetch error:', hotspotRes.error)

  return {
    kids: childRes.data || [],
    todos: todoRes.data || [],
    hotspots: hotspotRes.data || [],
  }
}

export type AppCoreCache = {
  userId: string
  kids: unknown[]
  todos: unknown[]
  hotspots: unknown[]
  updatedAt: number
}

const CACHE_KEY = 'app_core_cache_v1'

export function readAppCoreCache(uid: string): AppCoreCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppCoreCache
    if (parsed.userId !== uid) return null
    if (Date.now() - parsed.updatedAt > 24 * 60 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export function writeAppCoreCache(uid: string, data: Omit<AppCoreCache, 'userId' | 'updatedAt'>) {
  if (typeof window === 'undefined') return
  try {
    const payload: AppCoreCache = {
      userId: uid,
      kids: data.kids,
      todos: data.todos,
      hotspots: data.hotspots,
      updatedAt: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}
