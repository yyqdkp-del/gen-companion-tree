export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/assertAdmin'
import { getAdminSupabase } from '@/lib/admin/supabase'

export async function POST(req: NextRequest) {
  const { error } = await assertAdmin(req)
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const user_id = typeof body.user_id === 'string' ? body.user_id : ''
  const is_pro = body.is_pro === true

  if (!user_id) {
    return NextResponse.json({ error: '缺少 user_id' }, { status: 400 })
  }

  const supabase = getAdminSupabase()

  const { error: updateError } = await supabase
    .from('family_profile')
    .update({
      is_pro,
      pro_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, user_id, is_pro })
}
