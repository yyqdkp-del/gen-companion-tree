import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function resolveSubscriptionUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const meta = subscription.metadata?.user_id
  if (meta) return meta
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()
  return data?.user_id ?? null
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stripe/webhook] signature error:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.user_id
        if (!userId) {
          console.error('[stripe/webhook] checkout.session.completed missing user_id metadata')
          break
        }

        const cust = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: cust ?? undefined,
            stripe_subscription_id: subId ?? undefined,
            plan: 'pro',
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )

        await supabase.from('family_profile')
          .update({ is_pro: true, updated_at: new Date().toISOString() })
          .eq('user_id', userId)

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveSubscriptionUserId(subscription)
        if (!userId) {
          console.error('[stripe/webhook] subscription.updated: could not resolve user_id', subscription.id)
          break
        }

        const isActive =
          subscription.status === 'active' || subscription.status === 'trialing'
        // Stripe REST 仍返回 current_period_end，但 typings 在未展开字段时可能不包含；运行时保留兼容
        const periodUnix = (subscription as unknown as { current_period_end?: number }).current_period_end
        const periodEnd = typeof periodUnix === 'number'
          ? new Date(periodUnix * 1000).toISOString()
          : null

        await supabase.from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: periodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            stripe_subscription_id: subscription.id,
            plan: isActive ? 'pro' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        await supabase.from('family_profile')
          .update({
            is_pro: isActive,
            pro_expires_at: isActive ? periodEnd : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = await resolveSubscriptionUserId(subscription)
        await supabase.from('subscriptions')
          .update({
            status: 'cancelled',
            plan: 'free',
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (userId) {
          await supabase.from('family_profile')
            .update({
              is_pro: false,
              pro_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
        }

        break
      }

      default:
        break
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stripe/webhook] handler error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
