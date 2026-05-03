export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
  const { child_id, user_id } = await req.json()

  const today = new Date().toISOString().split('T')[0]
  const dow = new Date().getDay()
  const hour = new Date().getHours()

  const [{ data: child }, { data: logs }, { data: profile }, { data: events }] = await Promise.all([
    supabase.from('children').select('*').eq('id', child_id).single(),
    supabase.from('child_daily_log').select('*').eq('child_id', child_id).order('date', { ascending: false }).limit(7),
    supabase.from('child_profiles').select('class_schedule').eq('child_id', child_id).maybeSingle(),
    supabase.from('child_school_calendar').select('*').eq('child_id', child_id).eq('date_start', today),
  ])
  const dowKey = ['sun','mon','tue','wed','thu','fri','sat'][dow]
  const sched = profile?.class_schedule?.[dowKey] || []

  const prompt = `你是一个了解儿童生理节律的AI助手。根据以下信息，评估这个孩子当前时刻的精力值（0-100）。

孩子信息：${JSON.stringify(child)}
当前时间：${hour}点
近7天健康记录：${JSON.stringify(logs)}
今日课程表：${JSON.stringify(sched)}
今日特殊活动：${JSON.stringify(events)}

综合考虑：当前时间段自然节律、近期健康状况、今天课程强度、特殊活动影响。

只返回JSON格式：{"energy": 数字, "reason": "简短原因"}，不要其他内容。`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

  try {
    const text = data.content?.[0]?.text || '{}'
    const result = JSON.parse(text)
    await supabase.from('children').update({ energy: result.energy }).eq('id', child_id)
    return NextResponse.json({ ok: true, energy: result.energy, reason: result.reason })
  } catch {
    return NextResponse.json({ ok: false, energy: 75 })
  }
}
