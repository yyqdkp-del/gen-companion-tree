export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app'

async function trigger(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  try {
    const res = await fetch(`${APP_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    console.log(`${path} → ${res.status}`)
    return res.status
  } catch (e: any) {
    console.error(`${path} 触发失败:`, e?.message)
    return 0
  }
}

export async function GET() {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMin = now.getUTCMinutes()
  const tasks: string[] = []

  // ── Worker 每分钟都跑（处理输入队列）──
  await trigger('/api/rian/worker')
  tasks.push('worker')

  // ── 提醒检查 每天早上 06:30 清迈 = UTC 23:30 ──
  if (utcHour === 23 && utcMin >= 28 && utcMin <= 32) {
    await trigger('/api/cron/reminders')
    tasks.push('reminders')
  }

  // ── 早安巡逻 06:30 清迈 = UTC 23:30 ──
  if (utcHour === 23 && utcMin >= 28 && utcMin <= 32) {
    await trigger('/api/base/patrol', 'POST', { trigger_type: 'cron_morning' })
    tasks.push('patrol_morning')
  }

  // ── 放学巡逻 14:30 清迈 = UTC 07:30 ──
  if (utcHour === 7 && utcMin >= 28 && utcMin <= 32) {
    await trigger('/api/base/patrol', 'POST', { trigger_type: 'cron_afternoon' })
    tasks.push('patrol_afternoon')
  }

  // ── 晚间巡逻 20:30 清迈 = UTC 13:30 ──
  if (utcHour === 13 && utcMin >= 28 && utcMin <= 32) {
    await trigger('/api/base/patrol', 'POST', { trigger_type: 'cron_evening' })
    tasks.push('patrol_evening')
  }

  // ── Gmail 扫描 每天 07:00 清迈 = UTC 00:00 ──
  if (utcHour === 0 && utcMin >= 0 && utcMin <= 2) {
    await trigger('/api/cron/gmail-scan')
    tasks.push('gmail_scan')
  }

  // ── prepare-actions 每天凌晨 09:00 清迈 = UTC 02:00 ──
  if (utcHour === 2 && utcMin >= 0 && utcMin <= 2) {
    await trigger('/api/cron/prepare-actions')
    tasks.push('prepare_actions')
  }

  console.log(`Scheduler ${now.toISOString()} 执行: ${tasks.join(', ')}`)

  return NextResponse.json({
    ok: true,
    time: now.toISOString(),
    tasks,
  })
}
