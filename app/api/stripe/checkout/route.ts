import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { getStripe } from '@/lib/stripe/client'
import { getServiceSupabase } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    console.error('[stripe/checkout] STRIPE_PRO_PRICE_ID is not set')
    return NextResponse.json({ error: 'Billing not configured' }, { status: 500 })
  }

  let plan: string = 'pro'
  try {
    const body = await req.json()
    if (body?.plan === 'pro') plan = 'pro'
    else if (body?.plan != null && body?.plan !== 'pro') {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    }
  } catch {
    // 无 body 时默认 pro
  }

  if (plan !== 'pro') {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')

  const supabase = getServiceSupabase()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id

    const { error: upsertErr } = await supabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: 'free',
        status: 'inactive',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (upsertErr) console.error('[stripe/checkout] subscriptions upsert:', upsertErr)
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${baseUrl}/profile?upgrade=success`,
    cancel_url: `${baseUrl}/profile?upgrade=cancelled`,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
  })

  return NextResponse.json({ url: session.url })
}
