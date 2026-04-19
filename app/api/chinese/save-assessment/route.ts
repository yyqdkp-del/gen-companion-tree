import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.get('authorization')?.replace('Bearer ', '') || ''
  )
  await supabase.from('assessments').insert({
    user_id: user?.id || null,
    child_name: body.child_name,
    child_age: body.child_age,
    level: body.level,
    standard_level: body.standard_level,
    answers: body.answers,
    report: body.report,
    source: 'chinese',
  })
  return NextResponse.json({ ok: true })
}
