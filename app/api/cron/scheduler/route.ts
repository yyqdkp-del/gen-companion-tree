export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function assertCronSecret(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  const secret =
    req.headers.get('x-cron-secret') ||
    req.nextUrl.searchParams.get('secret') ||
    bearer
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

/** 城市名 → UTC 偏移小时（固定偏移，不含夏令时自动切换） */
const CITY_TIMEZONES: Record<string, number> = {
  清迈: 7,
  chiang_mai: 7,
  chiangmai: 7,
  thailand: 7,
  曼谷: 7,
  bangkok: 7,
  新加坡: 8,
  singapore: 8,
  吉隆坡: 8,
  kuala_lumpur: 8,
  kualalumpur: 8,
  malaysia: 8,
  多伦多: -4,
  toronto: -4,
  温哥华: -7,
  vancouver: -7,
  纽约: -4,
  new_york: -4,
  newyork: -4,
  洛杉矶: -7,
  los_angeles: -7,
  losangeles: -7,
  悉尼: 10,
  sydney: 10,
  墨尔本: 10,
  melbourne: 10,
  伦敦: 1,
  london: 1,
  里斯本: 0,
  lisbon: 0,
  柏林: 1,
  berlin: 1,
  阿姆斯特丹: 1,
  amsterdam: 1,
  香港: 8,
  hong_kong: 8,
  hongkong: 8,
  巴厘岛: 8,
  bali: 8,
  普吉: 7,
  phuket: 7,
  芭提雅: 7,
  pattaya: 7,
}

const PATROL_HOURS = [7, 14, 20]
const WINDOW_MINUTES = 30

function resolveUtcOffset(cityRaw: string | null | undefined): number {
  const cityLower = (cityRaw || '').toLowerCase().trim()
  if (!cityLower) return 7
  for (const [key, offset] of Object.entries(CITY_TIMEZONES)) {
    if (cityLower.includes(key.toLowerCase())) return offset
  }
  return 7
}

function isPatrolWindowForOffset(utcOffset: number, now: Date): boolean {
  const utcHour = now.getUTCHours()
  const utcMinute = now.getUTCMinutes()
  const localTotalMinutes = ((utcHour + utcOffset) * 60 + utcMinute + 24 * 60) % (24 * 60)
  return PATROL_HOURS.some((targetHour) => {
    const targetMinutes = targetHour * 60
    const diffMinutes = Math.abs(localTotalMinutes - targetMinutes)
    return diffMinutes <= WINDOW_MINUTES
  })
}

async function listAuthUserIds(): Promise<string[]> {
  const ids: string[] = []
  let page = 1
  const perPage = 100
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('listUsers failed:', error.message)
      break
    }
    const batch = data?.users?.map((u) => u.id) || []
    ids.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }
  return ids
}

async function getUserIdsDueForPatrol(now: Date): Promise<string[]> {
  const userIds = await listAuthUserIds()
  if (!userIds.length) return []

  const { data: profiles, error } = await supabase
    .from('family_profile')
    .select('user_id, resident_city, resident_city_custom')
    .in('user_id', userIds)

  if (error) {
    console.error('family_profile fetch failed:', error.message)
    return []
  }

  const profileByUser = new Map(
    (profiles || []).map((p) => [p.user_id, p]),
  )

  const due: string[] = []
  for (const userId of userIds) {
    const profile = profileByUser.get(userId)
    const city =
      profile?.resident_city === 'other'
        ? profile?.resident_city_custom
        : profile?.resident_city
    const offset = resolveUtcOffset(city)
    if (isPatrolWindowForOffset(offset, now)) due.push(userId)
  }
  return due
}

async function trigger(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.CRON_SECRET) {
      headers.Authorization = `Bearer ${process.env.CRON_SECRET}`
      headers['x-cron-secret'] = process.env.CRON_SECRET
    }
    const res = await fetch(`${APP_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.status
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`${path} 触发失败:`, msg)
    return 0
  }
}

export async function GET(req: NextRequest) {
  const cronDenied = assertCronSecret(req)
  if (cronDenied) return cronDenied

  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMin = now.getUTCMinutes()
  const tasks: string[] = []

  // 按用户本地时区：早 7 / 下午 2 / 晚 8（±30 分钟）
  const patrolUserIds = await getUserIdsDueForPatrol(now)
  if (patrolUserIds.length) {
    await Promise.allSettled(
      patrolUserIds.map((userId) =>
        trigger('/api/base/patrol', 'POST', {
          user_id: userId,
          trigger_type: 'cron_tz',
        }),
      ),
    )
    tasks.push(`patrol_tz:${patrolUserIds.length}`)
  }

  // worker / notify / reminders：UTC 23:00 批次（约等于东南亚清晨，与原先单次 cron 对齐）
  if (utcHour === 23 && utcMin < 10) {
    await trigger('/api/rian/worker')
    tasks.push('worker')
    await trigger('/api/cron/notify')
    tasks.push('notify')
    await trigger('/api/cron/reminders')
    tasks.push('reminders')
  }

  // Gmail 扫描：UTC 00:00（清迈约 07:00）
  if (utcHour === 0 && utcMin < 10) {
    await trigger('/api/cron/gmail-scan')
    tasks.push('gmail_scan')
  }

  // prepare-actions：UTC 02:00（清迈约 09:00）
  if (utcHour === 2 && utcMin < 10) {
    await trigger('/api/cron/prepare-actions')
    tasks.push('prepare_actions')
  }

  return NextResponse.json({
    ok: true,
    time: now.toISOString(),
    tasks,
    patrol_users: patrolUserIds.length,
  })
}
