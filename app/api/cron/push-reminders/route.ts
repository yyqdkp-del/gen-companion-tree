export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildFamilyContext } from '@/lib/action/contextBuilder'
import { makeDecision } from '@/lib/action/claudeDecision'
import { isCachedRootDecisionValid } from '@/lib/action/decisionCache'
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
  const todayStart = `${today}T00:00:00.000Z`

  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  const { data: todos } = await supabase
    .from('todo_items')
    .select('id, user_id, child_id, category, title, due_date, priority, ai_action_data')
    .eq('status', 'pending')
    .lte('due_date', sevenDaysLater.toISOString().slice(0, 10))
    .gte('due_date', today)

  let generated = 0
  let pushed = 0

  for (const todo of todos || []) {
    const cacheCheck = isCachedRootDecisionValid(todo.ai_action_data)
    if (!cacheCheck.valid) {
      try {
        const context = await buildFamilyContext(todo.user_id, todo.id, supabase)
        const decision = await makeDecision(context)

        await supabase
          .from('todo_items')
          .update({
            ai_action_data: {
              ...(todo.ai_action_data as Record<string, unknown> || {}),
              root_decision: { ...decision, isPartial: false },
              cached_at: new Date().toISOString(),
              deep_analysis_pending: false,
            },
          })
          .eq('id', todo.id)

        generated++
        console.log('[pre-generate complete]', todo.title)

        await new Promise((r) => setTimeout(r, 2000))
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        console.error('[pre-generate failed]', todo.title, message)
      }
    }
  }

  for (const todo of todos || []) {
    if (!['red', 'orange'].includes(todo.priority || '')) continue

    const { data: todayPushes } = await supabase
      .from('push_logs')
      .select('id')
      .eq('user_id', todo.user_id)
      .gte('created_at', todayStart)

    if ((todayPushes?.length || 0) >= 2) {
      console.log('[push budget exhausted]', todo.user_id)
      continue
    }

    const daysLeft = getDaysLeftForTodo(todo.due_date)
    const urgencyText = daysLeft === 0
      ? '今天截止'
      : daysLeft === 1
        ? '明天截止'
        : `${daysLeft}天后截止`

    try {
      const sent = await sendPushToUser(todo.user_id, {
        title: `根提醒你：${todo.title}`,
        body: `${urgencyText}，根已帮你准备好方案`,
        url: `/?todo=${todo.id}`,
        tag: `todo-${todo.id}`,
      })

      if (sent > 0) {
        await supabase.from('push_logs').insert({
          user_id: todo.user_id,
          todo_id: todo.id,
          push_type: 'todo_reminder',
          event_id: todo.id,
          sent_at: new Date().toISOString(),
        })
        pushed++
      }
    } catch (e) {
      console.error('[push failed]', todo.user_id, e)
    }
  }

  console.log(`[cron] pre-generated ${generated} decisions, pushed ${pushed}`)
  return NextResponse.json({ ok: true, generated, pushed })
}
