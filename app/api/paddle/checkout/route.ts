import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { PADDLE_PLANS, getPaddlePlanIds, type PaddlePlanKey } from '@/lib/paddle/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let planKey: PaddlePlanKey = 'pro'
  try {
    const body = await req.json()
    if (body?.plan && body.plan in PADDLE_PLANS) {
      planKey = body.plan as PaddlePlanKey
    }
  } catch {
    // 无 body 时默认 pro
  }

  const { priceId, productId } = getPaddlePlanIds()
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')

  return NextResponse.json({
    priceId,
    productId,
    userId: user.id,
    email: user.email,
    plan: planKey,
    successUrl: `${baseUrl}/profile?upgrade=success`,
    cancelUrl: `${baseUrl}/upgrade`,
  })
}
