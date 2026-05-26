import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'


export async function GET(req: NextRequest) {
  const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
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
    // 每次 LINE 登录都生成一个高熵随机密码：
    //   - 老代码用 `line_${userId}_${LINE_CLIENT_SECRET.slice(0,8)}` 是确定性的，
    //     攻击者若拿到 LINE_CLIENT_SECRET 即可拼出任意 LINE 用户的伪密码。
    //   - 新代码每次旋转，仅在本次请求内有效；存储到 user_line_credentials
    //     仅供 /api/auth/refresh-pwa 在 PWA 冷启动时重新签发 session。
    const password = randomBytes(32).toString('base64url')

    // 3. 创建或获取用户；存在则旋转密码以便后续 signInWithPassword 命中
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

    const isNewUser = !createError && Boolean(createData?.user)
    let uid: string = createData?.user?.id || ''

    if (!isNewUser) {
      // 老用户：从 user_line_credentials 反查 user_id，再轮换密码到 auth.users
      const { data: existingCred } = await adminSupabase
        .from('user_line_credentials')
        .select('user_id')
        .eq('fake_email', fakeEmail)
        .maybeSingle()
      if (existingCred?.user_id) {
        uid = existingCred.user_id
        const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(uid, { password })
        if (updateErr) {
          console.error('LINE password rotation failed:', updateErr.message)
          throw new Error('Password rotation failed')
        }
      } else {
        // 边缘情况：auth.users 里有但 user_line_credentials 缺失（旧确定性密码迁移期）。
        // 此时无法定位 user_id，直接报错让用户重试或联系支持。
        throw new Error('LINE user exists but credentials missing; cannot rotate password')
      }
    }

    if (isNewUser && createData?.user) {
      // 新用户建档
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

    // 4. 获取 session（用本次生成的密码登录）
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

    // 5. 最终 uid 取 session 优先
    uid = session.user?.id || uid
    if (!uid) throw new Error('No user id')

    // 6. 存 LINE 凭据（用于 PWA 冷启动重建 session）
    // 注意：fake_password 此处仍以明文存储，因为 /api/auth/refresh-pwa
    // 需要原密码调用 signInWithPassword。它每次 LINE 登录都会被新随机值覆盖。
    // 后续应升级为存 refresh_token 或专用 LINE→Supabase 交换流程，彻底消除明文。
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
