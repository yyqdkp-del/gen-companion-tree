import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
// ── 孩子数据修改约定 ──
// 加新字段时必须同时更新：
// 1. app/children/[id]/page.tsx → childPayload
// 2. app/context/AppContext.tsx → enrichKids() 的 select
// 3. app/rian/ChildSheet.tsx → Child type
