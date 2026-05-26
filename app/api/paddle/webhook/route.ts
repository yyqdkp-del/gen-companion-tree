import { NextRequest, NextResponse } from 'next/server'
import { EventName, type EventEntity } from '@paddle/paddle-node-sdk'
import { createClient } from '@supabase/supabase-js'
import { getPaddle } from '@/lib/paddle/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** 通过订阅 ID 反查 user_id；webhook 未携带 customData 时使用 */
async function resolveUserIdBySubscriptionId(subId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('paddle_subscription_id', subId)
    .maybeSingle()
  return (data?.user_id as string | undefined) ?? null
}

function extractUserId(customData: unknown): string | null {
  if (!customData || typeof customData !== 'object') return null
  const obj = customData as Record<string, unknown>
  const raw = obj.user_id ?? obj.userId
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[paddle/webhook] PADDLE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const signature = req.headers.get('paddle-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: EventEntity
  try {
    event = await getPaddle().webhooks.unmarshal(rawBody, webhookSecret, signature)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[paddle/webhook] signature error:', msg)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionTrialing: {
        const sub = event.data
        const userId = extractUserId(sub.customData) || (await resolveUserIdBySubscriptionId(sub.id))
        if (!userId) {
          console.error('[paddle/webhook] cannot resolve user_id for subscription', sub.id)
          break
        }

        const isActive = sub.status === 'active' || sub.status === 'trialing'
        const periodEnd = sub.currentBillingPeriod?.endsAt ?? null

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            paddle_subscription_id: sub.id,
            paddle_customer_id: sub.customerId,
            plan: 'pro',
            status: isActive ? 'active' : sub.status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )

        await supabase.from('family_profile')
          .update({
            is_pro: isActive,
            pro_expires_at: isActive ? periodEnd : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        break
      }

      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionPastDue: {
        const sub = event.data
        const userId = extractUserId(sub.customData) || (await resolveUserIdBySubscriptionId(sub.id))
        if (!userId) break

        const isActive = sub.status === 'active' || sub.status === 'trialing'
        const periodEnd = sub.currentBillingPeriod?.endsAt ?? null

        await supabase.from('subscriptions')
          .update({
            status: sub.status,
            current_period_end: periodEnd,
            cancel_at_period_end: Boolean(sub.scheduledChange?.action === 'cancel'),
            plan: isActive ? 'pro' : 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', sub.id)

        await supabase.from('family_profile')
          .update({
            is_pro: isActive,
            pro_expires_at: isActive ? periodEnd : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        break
      }

      case EventName.SubscriptionPaused:
      case EventName.SubscriptionCanceled: {
        const sub = event.data
        const userId = extractUserId(sub.customData) || (await resolveUserIdBySubscriptionId(sub.id))

        await supabase.from('subscriptions')
          .update({
            status: event.eventType === EventName.SubscriptionPaused ? 'paused' : 'cancelled',
            plan: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', sub.id)

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
        // 其它事件（transaction.* / customer.* 等）当前不处理
        break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[paddle/webhook] handler error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
