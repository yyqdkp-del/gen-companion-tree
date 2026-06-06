export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import {
  isScheduleIntelligenceFresh,
  refreshScheduleIntelligence,
  type WeeklyScheduleIntelligence,
} from '@/lib/ai/scheduleIntelligence'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { childId?: string; force?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }

  const childId = body.childId
  if (!childId) {
    return NextResponse.json({ error: '缺少 childId' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: child, error: childErr } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (childErr || !child) {
    return NextResponse.json({ error: '未找到孩子' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('child_profiles')
    .select('class_schedule, schedule_intelligence')
    .eq('child_id', childId)
    .maybeSingle()

  const classSchedule = (profile?.class_schedule as Record<string, unknown>) || {}
  const cached = profile?.schedule_intelligence as WeeklyScheduleIntelligence | null | undefined

  if (!body.force && isScheduleIntelligenceFresh(cached, classSchedule)) {
    return NextResponse.json({ intelligence: cached, cached: true })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI 服务未配置' }, { status: 500 })
  }

  const intelligence = await refreshScheduleIntelligence({
    userId: user.id,
    childId,
    classSchedule,
    force: body.force,
    supabase,
  })

  if (!intelligence) {
    return NextResponse.json({ error: '分析失败' }, { status: 500 })
  }

  return NextResponse.json({ intelligence, cached: false })
}
