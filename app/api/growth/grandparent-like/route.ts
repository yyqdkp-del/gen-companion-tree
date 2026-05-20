export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 400 })

  const { data: report } = await supabase
    .from('growth_reports')
    .select('id, user_id, grandparent_likes, content')
    .eq('share_token', token)
    .gt('token_expires_at', new Date().toISOString())
    .single()

  if (!report) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await supabase
    .from('growth_reports')
    .update({ grandparent_likes: (report.grandparent_likes || 0) + 1 })
    .eq('id', report.id)

  const childName =
    (report.content as { child_name?: string })?.child_name || '宝宝'
  await supabase.from('hotspot_items').insert({
    user_id: report.user_id,
    category: 'mom',
    urgency: 'lifestyle',
    title: `爷爷奶奶给${childName}点赞了 ❤️`,
    summary: `国内的家人看了${childName}的成长周报，给宝宝送出了爱心！快去看看吧～`,
    relevance_reason: '来自国内长辈的温暖回应',
    action_available: false,
    status: 'unread',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return NextResponse.json({ ok: true })
}
