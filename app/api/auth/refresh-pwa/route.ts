export const dynamic = 'force-dynamic'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
  try {
    const { data: cred, error: credError } = await adminSupabase
      .from('user_line_credentials')
      .select('fake_email, fake_password')
      .eq('user_id', userId)
      .single()

    if (credError || !cred) {
      return NextResponse.json({ error: 'credentials not found' }, { status: 404 })
    }

    const { data, error } = await adminSupabase.auth.signInWithPassword({
      email: cred.fake_email,
      password: cred.fake_password,
    })

    if (error || !data.session) {
      return NextResponse.json({ error: 'sign in failed' }, { status: 500 })
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
