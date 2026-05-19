export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/push'
import { getUserLocation, isMorningReportTime, isEveningReportTime } from '@/lib/geofence'
import {
  addDaysStrInTimeZone,
  getDayOfWeekInTimeZone,
  getTodayStrInTimeZone,
  zonedYmdHmToDate,
} from '@/lib/date/localDate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── 取所有有推送订阅的用户 ──
async function getAllSubscribedUsers(): Promise<string[]> {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('user_id')
  if (!data?.length) return []
  return [...new Set(data.map((r: any) => r.user_id))]
}

// ── 检查今天是否已推送过某类型（按用户时区的「日历日」） ──
async function alreadySent(
  userId: string,
  pushType: string,
  timeZone: string,
  eventId?: string,
): Promise<boolean> {
  const userToday = getTodayStrInTimeZone(timeZone)
  let q = supabase
    .from('push_logs')
    .select('sent_at')
    .eq('user_id', userId)
    .eq('push_type', pushType)
    .gte('sent_at', new Date(Date.now() - 48 * 3600000).toISOString())
    .order('sent_at', { ascending: false })
    .limit(1)
  if (eventId) q = q.eq('event_id', eventId)
  const { data } = await q.maybeSingle()
  if (!data?.sent_at) return false
  return getTodayStrInTimeZone(timeZone, new Date(data.sent_at)) === userToday
}

// ── 记录推送日志 ──
async function logPush(userId: string, pushType: string, eventId?: string) {
  await supabase.from('push_logs').insert({
    user_id: userId,
    push_type: pushType,
    event_id: eventId || null,
    sent_at: new Date().toISOString(),
  })
}

// ────────────────────────────────────────
// 晨报 06:30 — 今日全貌
// ────────────────────────────────────────
async function sendMorningReport(userId: string, timeZone: string) {
  const already = await alreadySent(userId, 'morning_report', timeZone)
  if (already) return

  const today = getTodayStrInTimeZone(timeZone)

  // 查孩子
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId)
  if (!children?.length) return

  const childIds = children.map((c: any) => c.id)
  const childMap = Object.fromEntries(children.map((c: any) => [c.id, c.name]))

  // 今天特殊活动
  const { data: events } = await supabase
    .from('child_school_calendar')
    .select('child_id, title, requires_items, requires_payment')
    .in('child_id', childIds)
    .eq('date_start', today)



  // 今天到期红色待办
  const { data: urgentTodos } = await supabase
    .from('todo_items')
    .select('title')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('priority', 'red')
    .lte('due_date', today)

  const lines: string[] = []

  // 特殊活动
  if (events?.length) {
    for (const e of events) {
      const name = childMap[e.child_id] || '孩子'
      const items = Array.isArray(e.requires_items) ? e.requires_items : []
      let line = `${name}：${e.title}`
      if (items.length) line += `，带${items.slice(0, 3).join('、')}`
      if (e.requires_payment) line += `，缴费 ฿${e.requires_payment}`
      lines.push(line)
    }
  }



  // 紧急待办
  if (urgentTodos?.length) {
    lines.push(`今日必办：${urgentTodos.map((t: any) => t.title).slice(0, 2).join('、')}`)
  }

  if (!lines.length) return

  const sentMorning = await sendPushToUser(userId, {
    title: '🌱 早安，今天的安排',
    body: lines.join('\n'),
    url: '/',
    tag: 'morning_report',
    urgent: false,
  })

  if (sentMorning > 0) {
    await logPush(userId, 'morning_report')
  }
}

// ────────────────────────────────────────
// 晚报 21:00 — 次日预告 + 今晚准备
// ────────────────────────────────────────
async function sendEveningReminder(userId: string, timeZone: string) {
  const already = await alreadySent(userId, 'evening_reminder', timeZone)
  if (already) return

  const tomorrowStr = addDaysStrInTimeZone(timeZone, new Date(), 1)

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId)
  if (!children?.length) return

  const childIds = children.map((c: any) => c.id)
  const childMap = Object.fromEntries(children.map((c: any) => [c.id, c.name]))

  // 明天特殊活动
  const { data: events } = await supabase
    .from('child_school_calendar')
    .select('child_id, title, requires_items')
    .in('child_id', childIds)
    .eq('date_start', tomorrowStr)



  const lines: string[] = []

  if (events?.length) {
    for (const e of events) {
      const name = childMap[e.child_id] || '孩子'
      const items = Array.isArray(e.requires_items) ? e.requires_items : []
      let line = `${name} 明天：${e.title}`
      if (items.length) line += `\n今晚装好：${items.slice(0, 4).join('、')}`
      lines.push(line)
    }
  }



  if (!lines.length) return

  const sentEvening = await sendPushToUser(userId, {
    title: '🌙 明天准备好了吗？',
    body: lines.join('\n'),
    url: '/',
    tag: 'evening_reminder',
    urgent: false,
  })

  if (sentEvening > 0) {
    await logPush(userId, 'evening_reminder')
  }
}

// ────────────────────────────────────────
// 出发提醒 — 每小时检查，60分钟 + 30分钟各一次
// ────────────────────────────────────────
async function sendDepartureReminders(userId: string, timeZone: string) {
  const now = new Date()
  const nowMs = now.getTime()
  const dow = getDayOfWeekInTimeZone(timeZone, now)
  const today = getTodayStrInTimeZone(timeZone, now)

  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('user_id', userId)
  if (!children?.length) return

  const childIds = children.map((c: any) => c.id)
  const childMap = Object.fromEntries(children.map((c: any) => [c.id, c.name]))

  // 今天课表（有 period_start 的）
  const { data: schedule } = await supabase
    .from('child_schedule_template')
    .select('id, child_id, subject, period_start, requires_items')
    .in('child_id', childIds)
    .eq('day_of_week', dow)
    .order('period_start', { ascending: true })

  // 今天特殊活动（从 description 提取时间作为补充）
  const { data: events } = await supabase
    .from('child_school_calendar')
    .select('id, child_id, title, requires_items, description')
    .in('child_id', childIds)
    .eq('date_start', today)

  // 把课表和活动统一成 { id, childId, label, timeStr, items } 列表
  type PushItem = { id: string; childId: string; label: string; timeStr: string; items: string[] }
  const pushItems: PushItem[] = []

  for (const s of schedule || []) {
    if (!s.period_start) continue
    pushItems.push({
      id: `sched_${s.id}`,
      childId: s.child_id,
      label: s.subject,
      timeStr: s.period_start, // HH:MM:SS
      items: Array.isArray(s.requires_items) ? s.requires_items : [],
    })
  }

  for (const e of events || []) {
    const match = (e.description || e.title || '').match(/(\d{1,2}):(\d{2})/)
    if (!match) continue
    pushItems.push({
      id: `cal_${e.id}`,
      childId: e.child_id,
      label: e.title,
      timeStr: `${match[1].padStart(2, '0')}:${match[2]}:00`,
      items: Array.isArray(e.requires_items) ? e.requires_items : [],
    })
  }

  for (const item of pushItems) {
    const [hh, mm] = item.timeStr.split(':').map(Number)
    const eventMs = zonedYmdHmToDate(timeZone, today, hh, mm).getTime()
    const minutesLeft = Math.round((eventMs - nowMs) / 60000)
    const childName = childMap[item.childId] || '孩子'

    // 60分钟提醒
    if (minutesLeft >= 55 && minutesLeft <= 65) {
      const sent = await alreadySent(userId, 'depart_60', timeZone, item.id)
      if (!sent) {
        const sent60 = await sendPushToUser(userId, {
          title: `🏃 ${childName} ${item.label} 1小时后`,
          body: item.items.length
            ? `记得带：${item.items.join('、')}`
            : '记得准时出发',
          url: '/',
          tag: `depart_60_${item.id}`,
          urgent: false,
        })
        if (sent60 > 0) {
          await logPush(userId, 'depart_60', item.id)
        }
      }
    }

    // 30分钟紧急提醒
    if (minutesLeft >= 25 && minutesLeft <= 35) {
      const sent = await alreadySent(userId, 'depart_30', timeZone, item.id)
      if (!sent) {
        const sent30 = await sendPushToUser(userId, {
          title: `⚡ ${childName} ${item.label} 30分钟后出发！`,
          body: item.items.length
            ? `最后确认：${item.items.map(i => `${i} □`).join('  ')}`
            : '该出发了！',
          url: '/',
          tag: `depart_30_${item.id}`,
          urgent: true,
          actions: [{ action: 'ready', title: '已经好了 ✓' }],
        })
        if (sent30 > 0) {
          await logPush(userId, 'depart_30', item.id)
        }
      }
    }
  }
}

// ────────────────────────────────────────
// 主入口
// ────────────────────────────────────────
// 替换 notify/route.ts 里的 GET 函数
// 在文件顶部加：
// import { getUserLocation, isMorningReportTime, isEveningReportTime } from '@/lib/geofence'

export async function GET() {
  try {
    const users = await getAllSubscribedUsers()

    if (!users.length) {
      return NextResponse.json({ ok: true, message: '没有订阅用户' })
    }

    const tasks: string[] = []

    for (const userId of users) {
      try {
        // 获取用户位置和时区
        const userLocation = await getUserLocation(userId)
        const timezone = userLocation.timezone

        // 按用户时区判断时间
        const isMorning = isMorningReportTime(timezone)
        const isEvening = isEveningReportTime(timezone)

        // 晨报（用户时区 6:30）
        if (isMorning) {
          await sendMorningReport(userId, timezone)
          tasks.push(`morning:${userId.slice(0,8)}(${userLocation.city})`)
        }

        // 晚报（用户时区 21:00）
        if (isEvening) {
          await sendEveningReminder(userId, timezone)
          tasks.push(`evening:${userId.slice(0,8)}(${userLocation.city})`)
        }

        // 出发提醒（每小时检查）
        await sendDepartureReminders(userId, timezone)
        tasks.push(`departure:${userId.slice(0,8)}`)

      } catch (e: any) {
        console.error(`用户${userId.slice(0,8)}推送失败:`, e?.message)
      }
    }

    return NextResponse.json({ ok: true, users: users.length, tasks })

  } catch (e: any) {
    console.error('notify 错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
