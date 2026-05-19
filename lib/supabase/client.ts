import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | undefined

export function createClient() {
  if (typeof window !== 'undefined') {
    if (!browserClient) {
      browserClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    }
    return browserClient
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
// ── 孩子数据修改约定 ──
// 加新字段时必须同时更新：
// 1. app/children/[id]/page.tsx → childPayload
// 2. app/context/AppContext.tsx → enrichKids() 的 select
// 3. app/rian/ChildSheet.tsx → Child type
