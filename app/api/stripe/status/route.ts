import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { isProWhitelistedEmail } from '@/lib/auth/proWhitelist'
import { getServiceSupabase } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (isProWhitelistedEmail(user.email)) {
    return NextResponse.json({
      is_pro: true,
      plan: 'pro',
      status: 'active',
      current_period_end: null,
      cancel_at_period_end: false,
      whitelisted: true,
    })
  }

  const supabase = getServiceSupabase()
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('family_profile').select('is_pro').eq('user_id', user.id).maybeSingle(),
  ])

  const subPro = data?.status === 'active' && data?.plan === 'pro'
  const profilePro = profile?.is_pro === true
  const isPro = subPro || profilePro

  return NextResponse.json({
    is_pro: isPro,
    plan: data?.plan || 'free',
    status: data?.status || 'inactive',
    current_period_end: data?.current_period_end,
    cancel_at_period_end: data?.cancel_at_period_end,
  })
}
