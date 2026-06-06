export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import {
  buildLetterPrompt,
  buildMoments,
  childAgeFromBirthdate,
  fetchActiveChildren,
  gatherChildWeekData,
  getWeekBounds,
  getWeekLabel,
  hasWeekData,
} from '@/lib/growth/weeklyReportData'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const anthropic = new Anthropic()

async function callClaudeLetter(prompt: string, maxTokens = 1500) {
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
  const weekLabel = getWeekLabel()

  if (family) {
    const children = await fetchActiveChildren(user.id)
    if (!children.length) {
      return NextResponse.json({ error: '暂无孩子档案' }, { status: 404 })
    }

    const childrenData = await Promise.all(
      children.map(async (child) => {
        const data = await gatherChildWeekData(
          user.id,
          child.id,
          weekStart,
          weekEnd,
          weekStartStr,
          weekEndStr,
        )
        return {
          id: child.id,
          name: child.name as string,
          grade: (child.grade as string) || '',
          age: childAgeFromBirthdate(child.birthdate as string | null),
          data,
        }
      }),
    )

    const hasRealData = childrenData.some((c) => hasWeekData(c.data))
    if (!hasRealData) {
      return NextResponse.json({
        error: 'no_data',
        message: '本周暂无记录，先去学一个汉字或完成一个待办吧',
        week_summary: '成长家书 · 本周暂无记录',
        content: {
          letter: '',
          no_data: true,
          family: true,
          week_label: weekLabel,
        },
      })
    }

    const familyPrompt = `你是一位在泰国陪读的华人妈妈，正在给国内的爷爷奶奶/外公外婆写一封家庭成长家书。

${childrenData.map((c) => {
  const ageLine = c.age != null ? `${c.age}岁` : '年龄未填'
  return `
【${c.name}】${ageLine}，${c.grade || '年级未填'}
- 学校活动：${c.data.events.join('；') || '暂无'}
- 学了汉字：${c.data.hanzi.join('、') || '暂无'}
- 这周状态：${c.data.moodTrend}
- 课外活动：${c.data.activities.join('、') || '暂无'}`
}).join('\n')}

本周家庭完成的事：${childrenData.flatMap((c) => c.data.todos).slice(0, 6).join('、') || '暂无'}

请写一封200-250字的家书：
- 语气温柔真实，分别提到每个孩子
- 必须有一个具体生活细节和妈妈自己的感受
- 结尾表达对家人的思念
- 不要冰冷清单式表述
- 要让爷爷奶奶读完想视频通话

请直接输出家书正文，不要标题。`

    const letter = await callClaudeLetter(familyPrompt, 1500)
    const achievements = childrenData.flatMap((c) => buildMoments(c.data))
    const childNames = childrenData.map((c) => c.name).join('、')

    const content: Record<string, unknown> = {
      letter: letter || '',
      achievements,
      week_summary: `成长家书 · ${childNames}的本周`,
      week_label: weekLabel,
      child_name: childNames,
      family: true,
      children: childrenData.map((c) => ({
        id: c.id,
        name: c.name,
        hanzi_count: c.data.hanzi.length,
        hanzi: c.data.hanzi,
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

  const childName = child.name as string
  const childAge = childAgeFromBirthdate(child.birthdate as string | null)
  const grade = (child.grade as string) || ''
  const weekData = await gatherChildWeekData(
    user.id,
    child_id,
    weekStart,
    weekEnd,
    weekStartStr,
    weekEndStr,
  )

  if (!hasWeekData(weekData)) {
    return NextResponse.json({
      error: 'no_data',
      message: '本周暂无记录，先去学一个汉字或完成一个待办吧',
      week_summary: `成长家书 · ${childName}的本周暂无记录`,
      content: {
        letter: '',
        no_data: true,
        child_name: childName,
        week_label: weekLabel,
      },
    })
  }

  const prompt = buildLetterPrompt({
    name: childName,
    age: childAge,
    grade,
    data: weekData,
  })

  const letter = await callClaudeLetter(prompt, 1500)
  const achievements = buildMoments(weekData)

  const content: Record<string, unknown> = {
    letter: letter || '',
    achievements,
    week_summary: `成长家书 · ${childName}的本周`,
    week_label: weekLabel,
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
