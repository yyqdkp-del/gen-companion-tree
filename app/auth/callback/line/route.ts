import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/auth?error=line_failed', req.url))
  }

  try {
    // 1. 换 token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://gen-companion-tree.vercel.app/auth/callback/line',
        client_id: process.env.LINE_CLIENT_ID!,
        client_secret: process.env.LINE_CLIENT_SECRET!,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access token')

    // 2. 拿用户资料
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()
    const fakeEmail = `line_${profile.userId}@line.user`
    const password = `line_${profile.userId}_${process.env.LINE_CLIENT_SECRET?.slice(0, 8)}`

    // 3. 创建或获取用户
    const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.displayName,
        avatar_url: profile.pictureUrl,
        provider: 'line',
        line_user_id: profile.userId,
      },
    })

    // 新用户建档
    if (!createError && createData.user) {
      await adminSupabase.from('family_profile').insert({
        user_id: createData.user.id,
        member_name: profile.displayName,
        member_role: 'admin',
      })
      await adminSupabase.from('user_consents').insert({
        user_id: createData.user.id,
        privacy_agreed: true,
        ai_training_agreed: false,
        version: '1.0',
      })
    }

    // 4. 获取 session
    const signInRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email: fakeEmail, password }),
    })
    const session = await signInRes.json()
    if (!session.access_token) throw new Error('No session')

    // 5. 确认 uid
    const isNewUser = !createError && createData?.user
    const uid = session.user?.id || createData?.user?.id || ''
    if (!uid) throw new Error('No user id')

    // 6. 存 LINE 凭据（用于 PWA 重建 session）
    await adminSupabase.from('user_line_credentials').upsert({
      user_id: uid,
      fake_email: fakeEmail,
      fake_password: password,
    }, { onConflict: 'user_id' })

    // 7. 存临时 code（5分钟有效）
    const tempCode = crypto.randomUUID()
    await adminSupabase.from('auth_temp_codes').insert({
      code: tempCode,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user_id: uid,
      expires_at: new Date(Date.now() + 300000).toISOString(),
    })

    // 8. 跳转
    const redirectUrl = new URL('/auth/pwa-bridge', req.url)
redirectUrl.searchParams.set('auth_code', tempCode)
redirectUrl.searchParams.set('redirect', isNewUser ? '/profile' : '/')
redirectUrl.searchParams.set('show_install', '1')
return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Line callback error:', err)
    return NextResponse.redirect(new URL('/auth?error=line_failed', req.url))
  }
}
