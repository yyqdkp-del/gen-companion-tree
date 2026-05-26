export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 关键字段最基本校验：防止脏数据写库
  if (!body?.level || typeof body.level !== 'string' || body.level.length > 10) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  if (body.child_name != null && (typeof body.child_name !== 'string' || body.child_name.length > 80)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }
  if (body.standard_level != null && (typeof body.standard_level !== 'string' || body.standard_level.length > 20)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { error } = await supabase.from('assessments').insert({
    user_id:        user.id,
    child_name:     body.child_name,
    child_age:      body.child_age,
    level:          body.level,
    standard_level: body.standard_level,
    answers:        body.answers,
    report:         body.report,
    source:         'chinese_assessment',
    geofence_id:    body.geofence_id || null,
  })

  if (error) {
    console.error('save-assessment failed:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
