import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'no user_id' }, { status: 400 })

    const { data: cred, error: credError } = await adminSupabase
      .from('user_line_credentials')
      .select('fake_email, fake_password')
      .eq('user_id', user_id)
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
