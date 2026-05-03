import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function fetchAppData(uid: string) {
  const [childRes, todoRes, hotspotRes] = await Promise.all([
    supabase.from('children')
      .select('*').eq('user_id', uid),
    supabase.from('todo_items')
      .select('*').eq('user_id', uid)
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('hotspot_items')
      .select('*').neq('status', 'dismissed')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return {
    kids:     childRes.data   || [],
    todos:    todoRes.data    || [],
    hotspots: hotspotRes.data || [],
  }
}
