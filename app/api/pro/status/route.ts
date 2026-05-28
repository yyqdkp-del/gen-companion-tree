export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { getServiceSupabase } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getAuthUser(req)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceSupabase()

    const { data: profile } = await supabase
      .from('family_profile')
      .select('is_pro')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile?.is_pro) {
      return NextResponse.json({ is_pro: true })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    const isPro = sub?.status === 'active'
    return NextResponse.json({ is_pro: isPro })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 },
    )
  }
}

