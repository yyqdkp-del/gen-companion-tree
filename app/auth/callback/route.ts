import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeAuthNext } from '@/lib/auth/authNextPath'

type SessionCookie = { name: string; value: string; options?: Record<string, unknown> }

function redirectWithSessionCookies(
  origin: string,
  next: string | null,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  sessionCookies: SessionCookie[],
): NextResponse {
  const dest = sanitizeAuthNext(next ?? '/')
  const response = NextResponse.redirect(
    new URL(dest === '/' ? '/' : dest, origin).toString(),
  )

  if (sessionCookies.length > 0) {
    sessionCookies.forEach(({ name, value, options }) => {
      response.cookies.set(
        name,
        value,
        options as Parameters<typeof response.cookies.set>[2],
      )
    })
  } else {
    cookieStore.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    })
  }

  return response
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next')

  console.log('[callback] received:', {
    hasCode: !!code,
    codeLength: code?.length,
    error: oauthError,
    hasTokenHash: !!token_hash,
    type,
    next,
    origin,
    fullUrl: request.url.slice(0, 200),
  })

  if (oauthError) {
    console.log('[callback] OAuth error from provider:', oauthError)
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(oauthError)}`)
  }

  const cookieStore = await cookies()
  const sessionCookies: SessionCookie[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: SessionCookie[]) {
          console.log('[callback] setAll cookies:', cookiesToSet.map((c) => c.name))
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            sessionCookies.push({ name, value, options })
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

    if (!data.session) {
      console.error('[callback] exchange succeeded but no session')
      return NextResponse.redirect(`${origin}/auth?error=session`)
    }

    const dest = sanitizeAuthNext(next ?? '/')
    console.log('[callback] success, redirecting to:', dest)
    return redirectWithSessionCookies(origin, next, cookieStore, sessionCookies)
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

    if (!data.session) {
      console.error('[callback] verifyOtp succeeded but no session')
      return NextResponse.redirect(`${origin}/auth?error=session`)
    }

    const dest = sanitizeAuthNext(next ?? '/')
    console.log('[callback] verifyOtp success, redirecting to:', dest)
    return redirectWithSessionCookies(origin, next, cookieStore, sessionCookies)
  }

  console.log('[callback] no code received, params:', Object.fromEntries(searchParams))
  return NextResponse.redirect(`${origin}/auth?error=no_code`)
}
