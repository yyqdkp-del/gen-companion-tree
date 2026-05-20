export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const child_id =
    typeof (body as { child_id?: unknown }).child_id === 'string'
      ? (body as { child_id: string }).child_id.trim()
      : ''
  const title =
    typeof (body as { title?: unknown }).title === 'string' ? (body as { title: string }).title.trim() : ''
  const content =
    typeof (body as { content?: unknown }).content === 'string' ? (body as { content: string }).content.trim() : ''
  const photo_url_raw = (body as { photo_url?: unknown }).photo_url
  const photo_url =
    typeof photo_url_raw === 'string' && photo_url_raw.trim() ? photo_url_raw.trim() : null
  const moment_date_raw = (body as { moment_date?: unknown }).moment_date
  const moment_date =
    typeof moment_date_raw === 'string' && moment_date_raw.trim()
      ? moment_date_raw.trim().slice(0, 10)
      : new Date().toISOString().split('T')[0]

  let tags: string[] = []
  const rawTags = (body as { tags?: unknown }).tags
  if (Array.isArray(rawTags)) tags = rawTags.filter((t): t is string => typeof t === 'string').slice(0, 16)

  if (!child_id || !title) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )

  const { data: childRow, error: childErr } = await supabase
    .from('children')
    .select('id')
    .eq('id', child_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (childErr || !childRow) {
    return NextResponse.json({ error: '未找到该孩子或无权限' }, { status: 404 })
  }

  const { data, error: dbError } = await supabase
    .from('growth_moments')
    .insert({
      user_id: user.id,
      child_id,
      title,
      content: content || '',
      photo_url,
      moment_date,
      tags: tags.length ? tags : [],
    })
    .select()
    .single()

  if (dbError) {
    console.error('[growth/moments] insert:', dbError)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, moment: data })
}
