export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '../push/send/route'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function getDefaultUserId(): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return data?.users?.[0]?.id || null
}

// 检查是否已推送过
async function alreadySent(userId: string, eventId: string, pushType: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('push_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('push_type', pushType)
    .gte('sent_at', `${today}T00:00:00`)
    .single()
  return !!data
}

// 记录已推送
async function logPush(userId: string, eventId: string, pushType: string) {
  await supabase.from('push_logs').insert({
    user_id: userId,
    event_id: eventId,
    push_type: pushType,
  })
}

// ── 晨报推送（07:00）──
async function sendMorningReport(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  // 已推送过今天的晨报就跳过
  const { data: existing } = await supabase
    .from('push_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('push_type', 'morning_report')
    .gte('sent_at', `${today}T00:00:00`)
    .single()

  if (existing) return

  // 查今天所有孩子日程
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId)

  if (!children?.length) return

  const childIds = children.map(c => c.id)

  const { data: events } = await supabase
    .from('child_school_calendar')
    .select('*, children(name)')
    .in('child_id', childIds)
    .eq('date_start', today)
    .order('date_start')

  // 查今天需要缴费的待办
  const { data: payments } = await supabase
    .from('todo_items')
    .select('title, due_date')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .in('priority', ['red', 'orange'])
    .lte('due_date', today)

  if (!events?.length && !payments?.length) return

  // 构建晨报内容
  const lines: string[] = []

  if (events?.length) {
    for (const event of events) {
      const items = Array.isArray(event.requires_items) ? event.requires_items : []
      const childName = (event as any).children?.name || ''
      let line = `${childName} ${event.title}`
      if (items.length > 0) line += ` → 带${items.slice(0, 3).join('、')}`
      lines.push(line)
    }
  }

  if (payments?.length) {
    lines.push(`💰 今日缴费：${payments.map(p => p.title).join('、')}`)
  }

  await sendPushToUser(userId, {
    title: '🌱 早安，今天的安排',
    body: lines.join('\n'),
    url: '/',
    tag: 'morning_report',
  })

  await supabase.from('push_logs').insert({
    user_id: userId,
    push_type: 'morning_report',
  })
}

// ── 次日提醒推送（21:00）──
async function sendEveningReminder(userId: string) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('push_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('push_type', 'evening_reminder')
    .gte('sent_at', `${today}T00:00:00`)
    .single()

  if (existing) return

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId)

  if (!children?.length) return

  const childIds = children.map(c => c.id)

  const { data: events } = await supabase
    .from('child_school_calendar')
    .select('*, children(name)')
    .in('child_id', childIds)
    .eq('date_start', tomorrow)

  if (!events?.length) return

  const lines: string[] = []
  for (const event of events) {
    const items = Array.isArray(event.requires_items) ? event.requires_items : []
    const childName = (event as any).children?.name || ''
    let line = `${childName} 明天${event.title}`
    if (items.length > 0) line += `\n今晚装好：${items.slice(0, 3).join('、')}`
    lines.push(line)
  }

  await sendPushToUser(userId, {
    title: '🌙 明天准备好了吗？',
    body: lines.join('\n'),
    url: '/',
    tag: 'evening_reminder',
  })

  await supabase.from('push_logs').insert({
    user_id: userId,
    push_type: 'evening_reminder',
  })
}

// ── 出发提醒（1小时/30分钟）──
async function sendDepartureReminders(userId: string) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const nowTime = now.getTime()

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId)

  if (!children?.length) return

  const childIds = children.map(c => c.id)

  // 查今天所有有时间的活动
  const { data: events } = await supabase
    .from('child_school_calendar')
    .select('*, children(name)')
    .in('child_id', childIds)
    .eq('date_start', today)

  if (!events?.length) return

  for (const event of events) {
    // 尝试从 description 或 title 提取时间
    const timeMatch = (event.description || event.title || '').match(/(\d{1,2}):(\d{2})/)
    if (!timeMatch) continue

    const eventHour = parseInt(timeMatch[1])
    const eventMin = parseInt(timeMatch[2])
    const eventTime = new Date(today)
    eventTime.setHours(eventHour, eventMin, 0, 0)
    const eventMs = eventTime.getTime()

    const minutesLeft = Math.round((eventMs - nowTime) / 60000)
    const childName = (event as any).children?.name || ''
    const items = Array.isArray(event.requires_items) ? event.requires_items : []

    // 1小时提醒
    if (minutesLeft >= 55 && minutesLeft <= 65) {
      const sent = await alreadySent(userId, event.id, 'depart_60')
      if (!sent) {
        await sendPushToUser(userId, {
          title: `🏃 ${childName} ${event.title} 1小时后`,
          body: items.length > 0
            ? `记得带：${items.join('、')}`
            : '记得准时出发',
          url: '/',
          tag: `depart_60_${event.id}`,
        })
        await logPush(userId, event.id, 'depart_60')
      }
    }

    // 30分钟紧急提醒
    if (minutesLeft >= 25 && minutesLeft <= 35) {
      const sent = await alreadySent(userId, event.id, 'depart_30')
      if (!sent) {
        await sendPushToUser(userId, {
          title: `⚡ ${childName} ${event.title} 30分钟后出发！`,
          body: items.length > 0
            ? `最后确认：${items.join(' □  ')} □`
            : '该出发了！',
          url: '/',
          urgent: true,
          tag: `depart_30_${event.id}`,
          actions: [
            { action: 'ready', title: '已经好了 ✓' },
          ],
        })
        await logPush(userId, event.id, 'depart_30')
      }
    }
  }
}

// ── 主入口 ──
export async function GET() {
  try {
    const userId = await getDefaultUserId()
    if (!userId) return NextResponse.json({ ok: false, error: 'no user' }, { status: 400 })

    const hour = new Date().getHours()
    const tasks: string[] = []

    // 晨报 07:00
    if (hour === 7) {
      await sendMorningReport(userId)
      tasks.push('morning_report')
    }

    // 次日提醒 21:00
    if (hour === 21) {
      await sendEveningReminder(userId)
      tasks.push('evening_reminder')
    }

    // 出发提醒 每小时检查
    await sendDepartureReminders(userId)
    tasks.push('departure_check')

    return NextResponse.json({ ok: true, tasks })

  } catch (e: any) {
    console.error('notify 错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
