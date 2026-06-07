import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const CALLBACK_BRIDGE = '/auth/callback-bridge'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  console.log('[callback] received:', {
    hasCode: !!code,
    codeLength: code?.length,
    error: oauthError,
    hasTokenHash: !!token_hash,
    type,
    origin,
    fullUrl: request.url.slice(0, 200),
  })

  if (oauthError) {
    console.log('[callback] OAuth error from provider:', oauthError)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(oauthError)}`)
  }

  let response = NextResponse.redirect(new URL(CALLBACK_BRIDGE, request.url))
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
          console.log('[callback] setAll cookies:', cookiesToSet.map((c) => c.name))
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
    console.log('[callback] attempting code exchange...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    console.log('[callback] exchange result:', {
      hasSession: !!data?.session,
      userId: data?.session?.user?.id ?? null,
      error: exchangeError?.message ?? null,
    })

    if (exchangeError) {
      console.error('[callback] exchange failed:', exchangeError)
      const msg = encodeURIComponent(exchangeError.message)
      return NextResponse.redirect(`${origin}/auth?error=exchange_failed&msg=${msg}`)
    }

    console.log('[callback] success, redirecting to:', CALLBACK_BRIDGE)
    return response
  }

  // Line magiclink / email OTP
  if (token_hash && type) {
    console.log('[callback] attempting verifyOtp...', { type })
    const { data, error: otpError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'invite' | 'recovery' | 'email_change' | 'magiclink',
    })

    console.log('[callback] verifyOtp result:', {
      hasSession: !!data?.session,
      userId: data?.session?.user?.id ?? null,
      error: otpError?.message ?? null,
    })

    if (otpError) {
      console.error('[callback] verifyOtp failed:', otpError)
      const msg = encodeURIComponent(otpError.message)
      return NextResponse.redirect(`${origin}/auth?error=exchange_failed&msg=${msg}`)
    }

    console.log('[callback] verifyOtp success, redirecting to:', CALLBACK_BRIDGE)
    return response
  }

  console.log('[callback] no code received, params:', Object.fromEntries(searchParams))
  return NextResponse.redirect(`${origin}/auth?error=no_code`)
}
