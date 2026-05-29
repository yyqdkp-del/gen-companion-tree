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

function getWeekBounds(now = new Date()) {
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return {
    weekStart,
    weekEnd,
    weekStartStr: weekStart.toISOString().split('T')[0],
    weekEndStr: weekEnd.toISOString().split('T')[0],
  }
}

async function fetchWeekTodos(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  childId?: string,
) {
  let query = supabase
    .from('todo_items')
    .select('title, completed_at, priority, child_id')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString())
    .limit(20)

  if (childId) {
    query = query.or(`child_id.eq.${childId},child_id.is.null`)
  }

  const { data } = await query
  return data || []
}

async function fetchWeekHanzi(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  childId: string,
) {
  const { data: hanziSessions } = await supabase
    .from('chinese_sessions')
    .select('input_text, input_type, result')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .gte('learned_at', weekStart.toISOString())
    .lte('learned_at', weekEnd.toISOString())
    .limit(10)

  return (
    hanziSessions
      ?.filter((s) => s.input_type === 'hanzi')
      .map((s) => s.input_text)
      .filter(Boolean) as string[]
  ) || []
}

async function fetchActiveChildren(userId: string) {
  const { data } = await supabase
    .from('children')
    .select('id, name, grade, birthdate')
    .eq('user_id', userId)
    .or('status.eq.active,status.is.null')
    .order('created_at', { ascending: true })
  return data || []
}

function childAgeLabel(child: { birthdate?: string | null; grade?: string | null }) {
  if (child.birthdate) {
    const birth = new Date(child.birthdate as string)
    if (!Number.isNaN(birth.getTime())) {
      const age = Math.floor(
        (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
      if (age > 0 && age < 25) return String(age)
    }
  }
  if (child.grade) return String(child.grade)
  return ''
}

async function callClaudeLetter(prompt: string, maxTokens = 800) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return text.replace(/^["「]|["」]$/g, '').trim()
}

async function persistReport(
  userId: string,
  childId: string | null,
  weekStartStr: string,
  weekEndStr: string,
  content: Record<string, unknown>,
) {
  const shareToken = crypto.randomBytes(16).toString('hex')
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  let existingQuery = supabase
    .from('growth_reports')
    .select('id')
    .eq('user_id', userId)
    .eq('week_start', weekStartStr)

  existingQuery = childId
    ? existingQuery.eq('child_id', childId)
    : existingQuery.is('child_id', null)

  const { data: existing } = await existingQuery.maybeSingle()

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
        user_id: userId,
        child_id: childId,
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

  return { reportId, shareUrl, shareToken, tokenExpiresAt }
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const family = body.family === true
  const child_id = typeof body.child_id === 'string' ? body.child_id : ''

  const { weekStart, weekEnd, weekStartStr, weekEndStr } = getWeekBounds()

  if (family) {
    const children = await fetchActiveChildren(user.id)

    if (!children.length) {
      return NextResponse.json({ error: '暂无孩子档案' }, { status: 404 })
    }

    const todos = await fetchWeekTodos(user.id, weekStart, weekEnd)
    const todoList = todos.map((t) => t.title).filter(Boolean) as string[]

    const childrenData = await Promise.all(
      children.map(async (child) => {
        const hanzi = await fetchWeekHanzi(user.id, weekStart, weekEnd, child.id)
        return {
          id: child.id,
          name: child.name as string,
          grade: (child.grade as string) || childAgeLabel(child),
          hanzi,
        }
      }),
    )

    const totalHanzi = childrenData.reduce((n, c) => n + c.hanzi.length, 0)
    const hasRealData = totalHanzi > 0 || todoList.length > 0

    if (!hasRealData) {
      return NextResponse.json({
        error: 'no_data',
        message: '本周暂无学习记录，请先记录孩子的学习和生活',
        week_summary: '本周暂无记录',
        content: {
          letter: '',
          no_data: true,
          family: true,
        },
      })
    }

    const familyPrompt = `请用妈妈的口吻给爷爷奶奶写一封家庭周报。

${childrenData.map((c) =>
  `${c.name}（${c.grade || '—'}）本周学了：${c.hanzi.length > 0 ? c.hanzi.join('、') : '暂无汉字记录'}`,
).join('\n')}

本周家庭完成的事：
${todoList.slice(0, 5).map((t) => `- ${t}`).join('\n') || '暂无'}

要求：温暖亲切，分别提到每个孩子，200字左右，结尾表达思念。不要标题，直接输出信件正文。`

    const letter = await callClaudeLetter(familyPrompt, 1000)

    const achievements: string[] = []
    childrenData.forEach((c) => {
      if (c.hanzi.length > 0) {
        achievements.push(
          `${c.name}学了 ${c.hanzi.length} 个汉字：${c.hanzi.slice(0, 5).join('、')}${c.hanzi.length > 5 ? ' 等' : ''}`,
        )
      }
    })
    todoList.slice(0, 4).forEach((title) => achievements.push(title))

    const childNames = childrenData.map((c) => c.name).join('、')
    const content: Record<string, unknown> = {
      letter: letter || '',
      achievements,
      week_summary: `本周${childNames}共学了 ${totalHanzi} 个字，完成了 ${todoList.length} 件事`,
      child_name: childNames,
      family: true,
      children: childrenData.map((c) => ({
        id: c.id,
        name: c.name,
        hanzi_count: c.hanzi.length,
        hanzi: c.hanzi,
      })),
    }

    const { reportId, shareUrl, shareToken, tokenExpiresAt } = await persistReport(
      user.id,
      null,
      weekStartStr,
      weekEndStr,
      content,
    )

    return NextResponse.json({
      ok: true,
      report_id: reportId,
      content,
      share_url: shareUrl,
      share_token: shareToken,
      expires_at: tokenExpiresAt.toISOString(),
      family: true,
    })
  }

  if (!child_id) {
    return NextResponse.json({ error: '缺少 child_id' }, { status: 400 })
  }

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', child_id)
    .eq('user_id', user.id)
    .single()

  if (!child) {
    return NextResponse.json({ error: '孩子不存在' }, { status: 404 })
  }

  const todos = await fetchWeekTodos(user.id, weekStart, weekEnd, child_id)
  const hanziList = await fetchWeekHanzi(user.id, weekStart, weekEnd, child_id)
  const todoList = todos.map((t) => t.title).filter(Boolean) as string[]
  const hasRealData = hanziList.length > 0 || todoList.length > 0

  const childName = child.name as string
  const childAge = childAgeLabel(child)

  if (!hasRealData) {
    return NextResponse.json({
      error: 'no_data',
      message: '本周暂无学习记录，请先记录孩子的学习和生活',
      week_summary: '本周暂无记录',
      content: {
        letter: '',
        no_data: true,
        child_name: childName,
      },
    })
  }

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

  const letter = await callClaudeLetter(prompt)

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
    letter: letter || '',
    achievements,
    week_summary:
      hanziList.length > 0 || todoList.length > 0
        ? `${childName}这周学了 ${hanziList.length} 个字，完成了 ${todoList.length} 件事`
        : `${childName}本周的成长记录`,
    child_name: childName,
    family: false,
  }

  const { reportId, shareUrl, shareToken, tokenExpiresAt } = await persistReport(
    user.id,
    child_id,
    weekStartStr,
    weekEndStr,
    content,
  )

  return NextResponse.json({
    ok: true,
    report_id: reportId,
    content,
    share_url: shareUrl,
    share_token: shareToken,
    expires_at: tokenExpiresAt.toISOString(),
    family: false,
  })
}
