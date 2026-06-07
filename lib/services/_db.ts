import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase/service'

/** 服务端写入默认 service role；可传入 route/worker 已有 client */
export function getDb(client?: SupabaseClient): SupabaseClient {
  return client ?? getServiceSupabase()
}

/** 需要用户 JWT 的读取（API route） */
export async function getAuthDb(client?: SupabaseClient): Promise<SupabaseClient> {
  return client ?? await createServerClient()
}
