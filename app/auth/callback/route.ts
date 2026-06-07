import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  let response = NextResponse.redirect(new URL('/auth/callback-bridge', req.url))
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            response.cookies.set(
              name,
              value,
              options as Parameters<typeof response.cookies.set>[2],
            )
          })
        },
      },
    },
  )

  // Google OAuth
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/auth?error=callback_failed', req.url))
    }
    return response
  }

  // Line magiclink
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'invite' | 'recovery' | 'email_change' | 'magiclink',
    })
    if (error) {
      return NextResponse.redirect(new URL('/auth?error=callback_failed', req.url))
    }
    return response
  }

  return NextResponse.redirect(new URL('/auth?error=no_code', req.url))
}
