export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || '',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function sendPushToUser(userId: string, payload: {
  title: string
  body: string
  url?: string
  urgent?: boolean
  tag?: string
  actions?: { action: string; title: string }[]
}) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)

  if (!subs?.length) return 0

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify(payload)
      )
      sent++
    } catch (e: any) {
      console.error('推送失败:', e?.message)
      // 订阅过期，删除
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

export async function POST(req: NextRequest) {
  try {
    const { user_id, title, body, url, urgent, tag, actions } = await req.json()

    if (!user_id || !title || !body) {
      return NextResponse.json({ ok: false, error: '缺少参数' }, { status: 400 })
    }

    const sent = await sendPushToUser(user_id, { title, body, url, urgent, tag, actions })

    return NextResponse.json({ ok: true, sent })

  } catch (e: any) {
    console.error('发送推送错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
