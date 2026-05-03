export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
  try {
    const { subscription, user_id } = await req.json()

    if (!subscription || !user_id) {
      return NextResponse.json({ ok: false, error: '缺少参数' }, { status: 400 })
    }

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .eq('subscription->>endpoint', subscription.endpoint)
      .single()

    if (existing) {
      return NextResponse.json({ ok: true, message: '已存在' })
    }

    // 存入新订阅
    await supabase.from('push_subscriptions').insert({
      user_id,
      subscription,
    })

    return NextResponse.json({ ok: true, message: '订阅成功' })

  } catch (e: any) {
    console.error('订阅错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
  try {
    const { user_id } = await req.json()
    await supabase.from('push_subscriptions').delete().eq('user_id', user_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
