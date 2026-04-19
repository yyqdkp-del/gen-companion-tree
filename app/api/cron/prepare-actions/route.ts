import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(req: NextRequest) {
  // Vercel Cron 鉴权
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 查找：one_tap_ready=true 且没有 execution_pack 的 todo
    // 只处理 48 小时内创建的，避免重复处理太老的
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: todos, error } = await supabase
      .from('todo_items')
      .select('id, user_id, ai_action_data, created_at')
      .eq('one_tap_ready', true)
      .eq('status', 'pending')
      .gte('created_at', cutoff)

    if (error) throw error
    if (!todos?.length) {
      return NextResponse.json({ ok: true, processed: 0, message: '无待处理 todo' })
    }

    // 过滤出没有 execution_pack 的
    const needProcess = todos.filter(t => {
      const data = t.ai_action_data
      if (!data) return true
      if (typeof data === 'string') {
        try {
          return !JSON.parse(data)?.execution_pack
        } catch { return true }
      }
      return !data?.execution_pack
    })

    if (!needProcess.length) {
      return NextResponse.json({ ok: true, processed: 0, message: '全部已预处理' })
    }

    console.log(`[prepare-actions] 发现 ${needProcess.length} 条未预处理 todo`)

    // 并发限制：每次最多处理 5 条（避免超时）
    const batch = needProcess.slice(0, 5)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    const results = await Promise.allSettled(
      batch.map(todo =>
        fetch(`${appUrl}/api/todo/smart-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            todo_id: todo.id,
            user_id: todo.user_id,
            background: true,
          }),
        }).then(r => r.json())
      )
    )

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[prepare-actions] 完成: ${succeeded} 成功, ${failed} 失败`)

    return NextResponse.json({
      ok: true,
      total_pending: needProcess.length,
      processed: batch.length,
      succeeded,
      failed,
    })

  } catch (e: any) {
    console.error('[prepare-actions] error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
