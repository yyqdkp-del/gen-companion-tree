import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function sendPushToUser(userId: string, payload: {
  title: string
  body: string
  url?: string
  urgent?: boolean
  tag?: string
  actions?: { action: string; title: string }[]
}) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || '',
    process.env.VAPID_PUBLIC_KEY || '',
    process.env.VAPID_PRIVATE_KEY || ''
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)

  if (!subs?.length) return 0

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, JSON.stringify(payload))
      sent++
    } catch (e: any) {
      console.error('推送失败:', e?.message)
      if (e.statusCode === 410) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('subscription->>endpoint', sub.subscription.endpoint)
      }
    }
  }
  return sent
}
