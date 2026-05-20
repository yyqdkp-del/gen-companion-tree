export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { sendPushToUser } from '@/lib/push'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
