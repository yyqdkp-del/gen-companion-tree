import { updateSession } from '@/lib/supabase/middleware'
import { isAdminEmail } from '@/lib/admin/constants'
import { NextResponse, type NextRequest } from 'next/server'

// 1. 完全公开（不需要任何处理）
const PUBLIC_STATIC = [
  '/auth/callback',      // OAuth 回调，必须直接放行
  '/auth/callback-bridge',
  '/grandparent',        // 爷奶分享页
  '/api/realtime',       // 实时数据，无需鉴权
] as const

// 2. 游客可访问（刷新 token，但不强制登录）
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/learn',
  '/chinese',
  '/growth',
  '/treehouse',
  '/rian',
] as const

// 3. 需要登录（刷新 token + 未登录跳转 /auth）
const PROTECTED_ROUTES = [
  '/profile',
  '/children',
  '/vehicles',
  '/travel',
  '/upgrade',
] as const

// 4. 管理员（需要特定邮箱）
const ADMIN_ROUTES = ['/admin'] as const

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 完全公开：直接放行，不做任何处理
  if (PUBLIC_STATIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 刷新 token（所有非静态公开路由）
  const { response, user } = await updateSession(request)

  // 管理员路由
  if (ADMIN_ROUTES.some((p) => pathname.startsWith(p))) {
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // 受保护路由：未登录跳转
  if (matchesPrefix(pathname, PROTECTED_ROUTES)) {
    if (!user) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // PUBLIC_ROUTES 及其余路径：已刷新 token，不强制登录
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
