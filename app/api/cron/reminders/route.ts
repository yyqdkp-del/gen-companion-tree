export const dynamic = 'force-dynamic'
// app/api/cron/reminders/route.ts
// 每天早上检查三级提醒链，推送到热点水珠

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const familyId = 'default'

// ══ 提醒级别文案（根的语气）══════════════════════════════════
function buildReminderMessage(chain: any, todo: any): {
  title: string
  summary: string
  urgency: 'urgent' | 'important' | 'lifestyle'
  action_type: string
} {
  const daysLeft = chain.trigger_days_before
  const benefit = chain.benefit_description || '提前处理更从容'

  // 根据级别生成不同语气
  if (chain.level === 1) {
    // 战略提醒（90天前）- 轻松告知
    return {
      title: `📅 ${todo.title}`,
      summary: `根帮你查了，${todo.title}还有约${daysLeft}天。${benefit}，现在开始准备刚刚好。`,
      urgency: 'lifestyle',
      action_type: 'add_todo',
    }
  } else if (chain.level === 2) {
    // 准备提醒（30天前）- 温和提醒
    return {
      title: `⏰ ${todo.title}`,
      summary: `根注意到，${todo.title}还有${daysLeft}天截止。${benefit}，这周可以开始准备了。`,
      urgency: 'important',
      action_type: 'calendar',
    }
  } else {
    // 执行提醒（7天内）- 明确行动
    return {
      title: `🔴 ${todo.title}`,
      summary: `根提醒你，${todo.title}只剩${daysLeft}天了！${benefit}。根已经帮你准备好了，点一键办理直接搞定。`,
      urgency: daysLeft <= 1 ? 'urgent' : 'important',
      action_type: 'add_todo',
    }
  }
}

export async function GET(req: NextRequest) {
  // 验证Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('三级提醒检查开始:', new Date().toISOString())

  try {
    const today = new Date().toISOString().split('T')[0]

    // 1. 找到今天需要触发的提醒
    const { data: dueChains, error } = await supabase
      .from('reminder_chains')
      .select(`
        *,
        todo_items (
          id, title, category, priority, due_date,
          ai_draft, ai_action_type, one_tap_ready, status
        )
      `)
      .eq('family_id', familyId)
      .eq('status', 'pending')
      .lte('trigger_date', today)

    if (error) throw error
    if (!dueChains?.length) {
      console.log('今天没有需要触发的提醒')
      return NextResponse.json({ ok: true, triggered: 0 })
    }

    console.log(`找到${dueChains.length}条待触发提醒`)

    let triggered = 0

    for (const chain of dueChains) {
      const todo = chain.todo_items as any
      if (!todo || todo.status === 'done') {
        // 待办已完成，直接关闭提醒链
        await supabase.from('reminder_chains')
          .update({ status: 'acknowledged' })
          .eq('id', chain.id)
        continue
      }

      // 2. 生成提醒消息（根的语气）
      const msg = buildReminderMessage(chain, todo)

      // 3. 写入热点水珠
      await supabase.from('hotspot_items').insert({
        family_id: familyId,
        category: todo.category || 'education',
        urgency: msg.urgency,
        title: msg.title,
        summary: msg.summary,
        relevance_reason: `${todo.due_date ? `截止日期：${todo.due_date}` : '需要跟进'}`,
        action_available: todo.one_tap_ready || false,
        action_type: msg.action_type,
        action_data: {
          todo_id: todo.id,
          ai_draft: todo.ai_draft,
          ai_action_type: todo.ai_action_type,
          chain_level: chain.level,
          benefit: chain.benefit_description,
        },
        status: 'unread',
        linked_todo_id: todo.id,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      })

      // 4. 标记提醒已发送
      await supabase.from('reminder_chains')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', chain.id)

      // 5. 升级待办优先级（第三级提醒时）
      if (chain.level === 3 && todo.priority !== 'red') {
        await supabase.from('todo_items')
          .update({ priority: chain.trigger_days_before <= 1 ? 'red' : 'orange' })
          .eq('id', todo.id)
        console.log(`待办优先级升级：${todo.title}`)
      }

      triggered++
      console.log(`提醒触发：${todo.title}（第${chain.level}级）`)
    }

    return NextResponse.json({
      ok: true,
      checked: dueChains.length,
      triggered,
    })

  } catch (e: any) {
    console.error('提醒检查错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

// 支持手动触发
export async function POST(req: NextRequest) {
  return GET(req)
}
