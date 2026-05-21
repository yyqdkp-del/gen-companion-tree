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

  const childName = child.name as string
  let childAge = ''
  if (child.birthdate) {
    const birth = new Date(child.birthdate as string)
    if (!Number.isNaN(birth.getTime())) {
      const age = Math.floor(
        (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
      if (age > 0 && age < 25) childAge = String(age)
    }
  }
  if (!childAge && child.grade) childAge = String(child.grade)

  const hanziList =
    hanziSessions
      ?.filter((s) => s.input_type === 'hanzi')
      .map((s) => s.input_text)
      .filter(Boolean) as string[] || []
  const todoList = todos?.map((t) => t.title).filter(Boolean) as string[] || []

  const prompt = `你是一位海外华人妈妈，正在给国内的爷爷奶奶写本周孩子的成长记录。

孩子信息：${childName}，${childAge || ''}岁
本周学习的汉字：${hanziList.join('、') || '暂无记录'}
本周完成的事情：${todoList.join('、') || '暂无记录'}

请用妈妈的口吻写，不要假装是孩子写信。
要求：
1. 开头是妈妈对爷奶说话，不是「亲爱的爷爷奶奶，我是XXX」
2. 描述1-2个具体的真实学习瞬间，要有画面感
3. 说一件让妈妈感动或惊喜的小事
4. 结尾表达孩子对爷奶的想念（简短，不煽情）
5. 整体不超过150字，像一条微信消息
6. 语气自然、口语化，像真实的妈妈在说话

示例风格：
「爸妈，这周Noah学了「飞」字，学完自己张开手臂跑了一圈，说自己是飞鸟。我当时差点笑出声。他现在每天主动要学一个字，说想给你们写信。这周一共学了10个，「鱼」字写得最好看，因为想起跟爷爷钓鱼。他说等见到你们要亲自念给你们听。」

请直接输出信件内容，不要任何标题或格式。`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const letter = text.replace(/^["「]|["」]$/g, '').trim()

  const achievements: string[] = []
  if (hanziList.length > 0) {
    achievements.push(
      hanziList.length <= 5
        ? `学了 ${hanziList.length} 个汉字：${hanziList.join('、')}`
        : `学了 ${hanziList.length} 个汉字，包括 ${hanziList.slice(0, 5).join('、')} 等`,
    )
  }
  todoList.slice(0, 4).forEach((title) => achievements.push(title))

  const content: Record<string, unknown> = {
    letter: letter || '爸妈，这周孩子过得很好，想你们了。',
    achievements,
    week_summary:
      hanziList.length > 0 || todoList.length > 0
        ? `${childName}这周学了 ${hanziList.length} 个字，完成了 ${todoList.length} 件事`
        : `${childName}本周的成长记录`,
    child_name: childName,
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
