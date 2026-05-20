import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _service: SupabaseClient | null = null

/** 服务端 service role 客户端；懒加载，避免构建阶段无 env 时模块初始化失败 */
export function getServiceSupabase(): SupabaseClient {
  if (!_service) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase service credentials are not configured')
    _service = createClient(url, key)
  }
  return _service
}
