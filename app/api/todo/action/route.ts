// app/api/todo/action/route.ts
// 一键办理执行：根据ai_action_type执行对应操作

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 发送邮件（Gmail MCP）════════════════════════════════════
async function sendEmail(todo: any, actionData: any): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        mcp_servers: [{
          type: 'url',
          url: 'https://gmail.mcp.claude.com/mcp',
          name: 'gmail-mcp',
        }],
        messages: [{
          role: 'user',
          content: `请用Gmail发送以下邮件：

收件人：${actionData?.reply_to || todo.ai_action_data?.reply_to || ''}
主题：${actionData?.reply_subject || todo.ai_action_data?.reply_subject || `关于：${todo.title}`}
正文：${todo.ai_draft || ''}

发送完成后返回"已发送"。`
        }],
      }),
    })
    const data = await response.json()
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
    return text.includes('已发送') ? 'sent' : 'attempted'
  } catch (e: any) {
    console.error('发送邮件失败:', e?.message)
    return 'failed'
  }
}

// ══ 触发Make.com执行 ═════════════════════════════════════════
async function triggerMakeAction(type: string, payload: any): Promise<boolean> {
  if (!MAKE_WEBHOOK_URL) return false
  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    })
    return true
  } catch (e: any) {
    console.error('Make触发失败:', e?.message)
    return false
  }
}

// ══ 加入购物清单 ══════════════════════════════════════════════
async function addToShoppingList(todo: any): Promise<boolean> {
  try {
    await supabase.from('shopping_list').insert({
      family_id: 'default',
      item_name: todo.title,
      category: todo.category || 'other',
      urgency: todo.priority === 'red' ? 'this_week' : 'this_month',
      deadline: todo.due_date || null,
      related_todo_id: todo.id,
      status: 'needed',
    })
    return true
  } catch (e: any) {
    console.error('购物清单写入失败:', e?.message)
    return false
  }
}

// ══ 写入Google Calendar ════════════════════════════════════
async function addToCalendar(todo: any): Promise<boolean> {
  if (!todo.due_date) return false
  const startTime = new Date(todo.due_date + 'T09:00:00')
  const endTime = new Date(todo.due_date + 'T11:00:00')
  return triggerMakeAction('calendar', {
    title: todo.title,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    description: todo.ai_draft || todo.description || '',
    location: '清迈',
  })
}

// ══ 发WhatsApp通知配偶 ═══════════════════════════════════════
async function notifySpouse(todo: any): Promise<boolean> {
  return triggerMakeAction('notify_spouse', {
    title: todo.title,
    message: `根提醒：${todo.title}${todo.due_date ? `，截止${todo.due_date}` : ''}，需要你配合处理。`,
    due_date: todo.due_date,
  })
}

// ══ 预约（发预约邮件）════════════════════════════════════════
async function makeBooking(todo: any): Promise<string> {
  // 生成预约草稿
  const draft = todo.ai_draft || `您好，我想预约${todo.title}相关事宜，请问最近的可用时间是什么时候？谢谢。`
  // 写入待办草稿，等妈妈确认发件人
  await supabase.from('todo_items')
    .update({ ai_draft: draft, one_tap_ready: true, ai_action_type: 'send_email' })
    .eq('id', todo.id)
  return 'draft_ready'
}

// ══ 主处理函数 ════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { todoId, actionType } = await req.json()

    if (!todoId) {
      return NextResponse.json({ ok: false, error: 'todoId required' }, { status: 400 })
    }

    // 1. 读取待办详情
    const { data: todo, error } = await supabase
      .from('todo_items')
      .select('*')
      .eq('id', todoId)
      .single()

    if (error || !todo) {
      return NextResponse.json({ ok: false, error: '待办不存在' }, { status: 404 })
    }

    const action = actionType || todo.ai_action_type
    const actionData = todo.ai_action_data || {}

    console.log(`根执行一键办理：${todo.title}，类型：${action}`)

    let result = ''
    let success = false
    let message = ''

    // 2. 根据类型执行
    switch (action) {
      case 'send_email':
        result = await sendEmail(todo, actionData)
        success = result !== 'failed'
        message = success
          ? '根已帮你发送邮件 ✅'
          : '邮件发送遇到问题，请检查网络后重试'
        break

      case 'pay':
        // 付款需要妈妈确认金额，推送到热点
        await supabase.from('hotspot_items').insert({
          family_id: 'default',
          category: 'finance',
          urgency: 'important',
          title: `💳 ${todo.title}`,
          summary: `根帮你准备好了，确认付款金额后点击完成。${todo.ai_draft || ''}`,
          relevance_reason: todo.due_date ? `截止${todo.due_date}` : '待处理',
          action_available: true,
          action_type: 'pay',
          action_data: { todo_id: todo.id },
          status: 'unread',
          linked_todo_id: todo.id,
        })
        success = true
        message = '根已准备好付款详情，请在热点水珠确认 ✅'
        break

      case 'book':
        result = await makeBooking(todo)
        success = true
        message = result === 'draft_ready'
          ? '根已帮你起草预约邮件，确认后发送 ✅'
          : '预约信息已记录'
        break

      case 'buy':
        success = await addToShoppingList(todo)
        message = success
          ? '根已加入购物清单 ✅ 出门时会提醒你'
          : '加入购物清单失败，请重试'
        break

      case 'calendar':
        success = await addToCalendar(todo)
        message = success
          ? '根已写入日历 ✅'
          : '日历写入失败，请检查Make.com连接'
        break

      case 'whatsapp':
        success = await notifySpouse(todo)
        message = success
          ? '根已通知配偶 ✅'
          : 'WhatsApp发送失败，请检查Make.com连接'
        break

      case 'navigate':
        // 导航由前端处理，这里只标记
        success = true
        message = '导航已启动'
        break

      default:
        // 没有特定类型，标记完成
        success = true
        message = '根已帮你记录完成 ✅'
    }

    // 3. 成功后标记待办完成
    if (success && action !== 'pay') {
      await supabase.from('todo_items')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
        })
        .eq('id', todoId)

      // 关闭相关提醒链
      await supabase.from('reminder_chains')
        .update({ status: 'acknowledged' })
        .eq('todo_id', todoId)
        .eq('status', 'pending')
    }

    // 4. 记录行为信号（学习用）
    try {
      await supabase.from('behavior_signals').insert({
        family_id: 'default',
        signal_type: 'todo_complete',
        signal_content: `${todo.title} → ${action}`,
        extracted_topics: [todo.category],
      })
    } catch (_) {}
    return NextResponse.json({
      ok: success,
      message,
      action,
      todo_title: todo.title,
    })

  } catch (e: any) {
    console.error('一键办理错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
