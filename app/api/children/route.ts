export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export async function GET(_req: NextRequest) {
  const { user, error: authError } = await getAuthUser(_req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data, error } = await supabase
    .from('children')
    .select('id, name, emoji, nationality, passport_expiry, blood_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[api/children] select failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ children: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const rawName = body.name ?? body.child_name
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (!name) {
    return NextResponse.json({ error: '孩子姓名不能为空' }, { status: 400 })
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
      energy: null,
      progress: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[api/children] insert failed:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  if (data?.id) {
    const { error: profileError } = await supabase.from('child_profiles').upsert(
      {
        child_id: data.id,
        user_id: user.id,
        class_schedule: {},
        activities: [],
      },
      { onConflict: 'child_id' },
    )
    if (profileError) {
      console.warn('[api/children] child_profiles upsert failed:', profileError.message)
    }
  }

  return NextResponse.json({ ok: true, child_id: data?.id })
}
