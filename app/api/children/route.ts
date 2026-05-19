export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ ok: false, error: 'Missing child name' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data, error } = await supabase
    .from('children')
    .insert({
      user_id: user.id,
      name,
      emoji: typeof body.emoji === 'string' ? body.emoji : '🌟',
      grade: typeof body.grade === 'string' ? body.grade : null,
      school_name: typeof body.school_name === 'string' ? body.school_name : null,
      energy: 75,
      progress: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[api/children] insert failed:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, child_id: data?.id })
}
