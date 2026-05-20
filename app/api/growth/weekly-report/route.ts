export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const child_id = typeof body.child_id === 'string' ? body.child_id : ''
  if (!child_id) {
    return NextResponse.json({ error: '缺少 child_id' }, { status: 400 })
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', child_id)
    .eq('user_id', user.id)
    .single()

  if (!child) {
    return NextResponse.json({ error: '孩子不存在' }, { status: 404 })
  }

  const { data: todos } = await supabase
    .from('todo_items')
    .select('title, completed_at, priority')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString())
    .limit(20)

  const { data: hanziSessions } = await supabase
    .from('chinese_sessions')
    .select('input_text, input_type, result')
    .eq('user_id', user.id)
    .gte('learned_at', weekStart.toISOString())
    .lte('learned_at', weekEnd.toISOString())
    .limit(10)

  const prompt = `你是一个专门帮海外华人家庭写给国内长辈的成长周报助手。

孩子信息：
- 姓名：${child.name}
- 年龄/年级：${child.grade || '未填写'}

本周完成的家庭事项（${todos?.length || 0}条）：
${todos?.map(t => `- ${t.title}`).join('\n') || '暂无记录'}

本周学习的汉字（${hanziSessions?.length || 0}个）：
${hanziSessions?.filter(s => s.input_type === 'hanzi').map(s => s.input_text).join('、') || '暂无'}

请生成一份温暖的成长周报，要求：
1. 用孩子第一人称口吻写，像孩子在给爷爷奶奶写信
2. 语言温暖、简洁，不超过150字
3. 提到1-2个具体的本周成就或有趣的事
4. 结尾有一句撒娇的话
5. 如果没有记录，编写一段温暖的问候

只返回JSON，不要其他文字：
{
  "letter": "孩子口吻的信件内容",
  "achievements": ["成就1", "成就2"],
  "week_summary": "一句话总结本周",
  "child_name": "${child.name}"
}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  let content: Record<string, unknown> = {}
  try {
    content = JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    content = {
      letter: text,
      achievements: [],
      week_summary: '本周成长记录',
      child_name: child.name,
    }
  }

  const shareToken = crypto.randomBytes(16).toString('hex')
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const { data: existing } = await supabase
    .from('growth_reports')
    .select('id')
    .eq('user_id', user.id)
    .eq('child_id', child_id)
    .eq('week_start', weekStartStr)
    .maybeSingle()

  let reportId: string

  if (existing) {
    const { data: updated } = await supabase
      .from('growth_reports')
      .update({
        content,
        share_token: shareToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single()
    reportId = updated?.id || existing.id
  } else {
    const { data: created } = await supabase
      .from('growth_reports')
      .insert({
        user_id: user.id,
        child_id,
        week_start: weekStartStr,
        week_end: weekEndStr,
        content,
        share_token: shareToken,
        token_expires_at: tokenExpiresAt.toISOString(),
      })
      .select('id')
      .single()
    reportId = created?.id || ''
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app'
  ).replace(/\/$/, '')
  const shareUrl = `${baseUrl}/grandparent/${shareToken}`

  return NextResponse.json({
    ok: true,
    report_id: reportId,
    content,
    share_url: shareUrl,
    share_token: shareToken,
    expires_at: tokenExpiresAt.toISOString(),
  })
}
