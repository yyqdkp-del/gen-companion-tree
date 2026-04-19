import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Google OAuth
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/auth?error=callback_failed', req.url))
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Line magiclink
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    if (error) {
      return NextResponse.redirect(new URL('/auth?error=callback_failed', req.url))
    }
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.redirect(new URL('/auth?error=no_code', req.url))
}
