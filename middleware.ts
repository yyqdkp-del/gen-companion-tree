import { updateSession } from '@/lib/supabase/middleware'
import { isAdminEmail } from '@/lib/admin/constants'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { response, user } = await updateSession(request)

  const isAdminRoute = pathname.startsWith('/admin')
  if (isAdminRoute) {
    if (!user || !isAdminEmail(user.email)) {
      const url = new URL('/auth', request.url)
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
    const url = new URL('/auth', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
