import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { getPaddle } from '@/lib/paddle/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.email?.trim()
  if (!email) {
    return NextResponse.json({ url: '/upgrade' })
  }

  try {
    const paddle = getPaddle()
    const customers = paddle.customers.list({ email: [email] })
    const page = await customers.next()
    const customer = page[0]

    if (!customer) {
      return NextResponse.json({ url: '/upgrade' })
    }

    const portalSession = await paddle.customerPortalSessions.create(customer.id, [])

    return NextResponse.json({ url: portalSession.urls.general.overview })
  } catch (e) {
    console.error('[paddle/portal]', e instanceof Error ? e.message : e)
    return NextResponse.json({ url: '/upgrade' })
  }
}
