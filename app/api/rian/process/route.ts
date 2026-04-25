export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { content, input_type, file_url, user_id: body_user_id } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const activeUserId = body_user_id
    if (!activeUserId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Missing User Context' }, { status: 401 })
    }

    // 立刻存入队列，不做任何处理
    const { data: job, error } = await supabase.from('raw_inputs').insert({
      user_id: activeUserId,
      input_type,
      raw_content: content,
      file_url: file_url || null,
      processed: false,
      status: 'queued',
    }).select().single()

    if (error) {
      console.error('存入队列失败:', error)
      return NextResponse.json({ ok: false, error: '存入失败' }, { status: 500 })
    }

    console.log(`已收到输入，job_id: ${job.id}, type: ${input_type}`)

    // 立刻返回，不等待处理
    return NextResponse.json({
      ok: true,
      job_id: job.id,
      status: 'queued',
      message: '根收到了，帮你整理中 🌱',
    })

  } catch (e: any) {
    console.error('PROCESS ERROR:', e?.message || e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
