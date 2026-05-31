import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import {
  FREE_LIMITS,
  checkLimit,
  recordUsage,
  type LimitFeature,
} from '@/lib/limits/usage'

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feature = (req.nextUrl.searchParams.get('feature') || 'hanzi_decode') as LimitFeature
  const result = await checkLimit(user.id, feature, user.email)

  if (result.is_pro) {
    return NextResponse.json({ allowed: true, is_pro: true, remaining: 999 })
  }

  const limit = FREE_LIMITS[feature] ?? 3
  const used = limit - result.remaining

  return NextResponse.json({
    allowed: result.allowed,
    is_pro: false,
    used,
    limit,
    remaining: result.remaining,
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let feature = 'hanzi_decode'
  try {
    const body = await req.json()
    if (body?.feature) feature = body.feature
  } catch {
    // default feature
  }

  await recordUsage(user.id, feature)
  return NextResponse.json({ ok: true })
}
