export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDeepAnalysisForTodo } from '@/lib/action/deepAnalysis'
import { getDaysLeftForTodo } from '@/lib/action/instantDecision'
import { sendPushToUser } from '@/lib/push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)
  const threeDaysStr = threeDaysLater.toISOString().slice(0, 10)

  const { data: urgentTodos } = await supabase
    .from('todo_items')
    .select('id, title, category, due_date, user_id, child_id, ai_action_data')
    .eq('status', 'pending')
    .lte('due_date', threeDaysStr)
    .gte('due_date', today)
    .in('category', ['compliance', 'wealth', 'medical', 'education'])

  let pushed = 0

  for (const todo of urgentTodos || []) {
    const daysLeft = getDaysLeftForTodo(todo.due_date)
    const urgencyText = daysLeft === 0
      ? '今天截止'
      : daysLeft === 1
        ? '明天截止'
        : `${daysLeft}天后截止`

    try {
      await runDeepAnalysisForTodo(supabase, todo.user_id, todo.id, todo as Record<string, unknown>)
    } catch (e) {
      console.error('[pre-generate failed]', todo.id, e)
    }

    try {
      const sent = await sendPushToUser(todo.user_id, {
        title: `根提醒你：${todo.title}`,
        body: `${urgencyText}，根已帮你准备好方案`,
        url: `/?todo=${todo.id}`,
        tag: `todo-${todo.id}`,
      })
      if (sent > 0) pushed++
    } catch (e) {
      console.error('[push failed]', todo.user_id, e)
    }
  }

  return NextResponse.json({ ok: true, pushed, total: urgentTodos?.length || 0 })
}
