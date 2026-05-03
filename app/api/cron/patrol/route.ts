export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
  try {
    const { data: users } = await supabase.auth.admin.listUsers()
    const userList = users?.users || []

    console.log(`热点巡逻 cron 触发，共 ${userList.length} 个用户`)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app'

    for (const user of userList) {
      try {
        const res = await fetch(`${appUrl}/api/base/patrol`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            trigger_type: 'cron',
          }),
        })
        console.log(`用户 ${user.id} 巡逻触发状态：${res.status}`)
      } catch (e: any) {
        console.error(`用户 ${user.id} 巡逻触发失败：`, e?.message)
      }
    }

    return NextResponse.json({
      ok: true,
      triggered: userList.length,
      time: new Date().toISOString(),
    })

  } catch (e: any) {
    console.error('cron patrol 错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
