export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/google/oauth'
import { saveGoogleToken } from '@/lib/google/tokenStore'

function profileRedirect(req: NextRequest, query: string) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')
  return NextResponse.redirect(`${origin}/profile${query}`)
}

export async function GET(req: NextRequest) {
  const oauthErr = req.nextUrl.searchParams.get('error')
  if (oauthErr) {
    return profileRedirect(req, `?error=${encodeURIComponent(oauthErr)}`)
  }

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  if (!code) {
    return profileRedirect(req, '?error=no_code')
  }

  let service: string
  let userId: string
  try {
    const raw = Buffer.from(state ?? '', 'base64').toString('utf8')
    const idx = raw.indexOf(':')
    if (idx < 1) throw new Error('bad_state')
    service = raw.slice(0, idx)
    userId = raw.slice(idx + 1)
    if (!userId || (service !== 'gmail' && service !== 'calendar')) throw new Error('bad_state')
  } catch {
    return profileRedirect(req, '?error=invalid_state')
  }

  try {
    const tokens = await exchangeCode(code)
    const expiry = new Date(Date.now() + tokens.expires_in * 1000)
    await saveGoogleToken(userId, service as 'gmail' | 'calendar', tokens.access_token, tokens.refresh_token, expiry)
  } catch (e: any) {
    return profileRedirect(req, `?error=${encodeURIComponent(e?.message || 'oauth_failed')}`)
  }

  return profileRedirect(req, `?connected=${encodeURIComponent(service)}`)
}
