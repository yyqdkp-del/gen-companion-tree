import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAdminEmail } from '@/lib/admin/constants'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 静态资源和API全部放行
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const isAdminRoute = pathname.startsWith('/admin')

  let response = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response = NextResponse.next({ request: { headers: req.headers } })
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isAdminRoute) {
    if (!user || !isAdminEmail(user.email)) {
      const url = new URL('/auth', req.url)
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    return response
  }

  const protectedPrefixes = ['/profile', '/children', '/vehicles', '/travel']
  const needsAuth = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  if (needsAuth && !user) {
    const url = new URL('/auth', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-512.png).*)'],
}
