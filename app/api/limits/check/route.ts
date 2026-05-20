import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { getServiceSupabase } from '@/lib/supabase/service'

const FREE_LIMITS = {
  hanzi_decode: 3,
  weekly_report_share: 0,
} as const

type LimitFeature = keyof typeof FREE_LIMITS

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feature = (req.nextUrl.searchParams.get('feature') || 'hanzi_decode') as LimitFeature
  const today = new Date().toISOString().split('T')[0]
  const supabase = getServiceSupabase()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const isPro = sub?.status === 'active' && sub?.plan === 'pro'

  if (isPro) {
    return NextResponse.json({ allowed: true, is_pro: true, remaining: 999 })
  }

  const { count } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', `${feature}_used`)
    .gte('created_at', today)

  const limit = FREE_LIMITS[feature] ?? 3
  const used = count || 0
  const remaining = Math.max(0, limit - used)

  return NextResponse.json({
    allowed: remaining > 0,
    is_pro: false,
    used,
    limit,
    remaining,
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let feature = 'hanzi_decode'
  try {
    const body = await req.json()
    if (body?.feature) feature = body.feature
  } catch {
    // default feature
  }

  const supabase = getServiceSupabase()
  await supabase.from('analytics_events').insert({
    user_id: user.id,
    event_type: `${feature}_used`,
    page: '/api/limits',
    session_id: 'limit_check',
  })

  return NextResponse.json({ ok: true })
}
