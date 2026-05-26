export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/account/delete
 *
 * 用户主动请求注销账号：
 * 1. 在 auth.users.user_metadata 写入 delete_requested_at / delete_scheduled_for
 *    （30 天硬删宽限期，让用户撤销）
 * 2. 立即删除最敏感的数据：木棉树洞家书、推送订阅、LINE 凭据
 * 3. 30 天后由 cron（待补）完成 auth.admin.deleteUser + 级联清理
 *
 * 返回 200 后前端应：
 *   - 调 supabase.auth.signOut()
 *   - 跳到 /auth
 */
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { error: metaErr } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      delete_requested_at: now.toISOString(),
      delete_scheduled_for: scheduledFor.toISOString(),
    },
  })
  if (metaErr) {
    console.error('account delete: updateUserById failed', metaErr.message)
    return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 })
  }

  // 高敏感数据立即清，剩余数据由 30 天后的 cron 任务彻底删除
  const results = await Promise.allSettled([
    supabase.from('mom_memories').delete().eq('user_id', user.id),
    supabase.from('push_subscriptions').delete().eq('user_id', user.id),
    supabase.from('user_line_credentials').delete().eq('user_id', user.id),
  ])
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`account delete: immediate cleanup [${i}] failed`, r.reason)
    }
  })

  return NextResponse.json({
    ok: true,
    message: '账号已进入注销流程，30 天后将永久删除所有数据',
    scheduled_for: scheduledFor.toISOString(),
  })
}
