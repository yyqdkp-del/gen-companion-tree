export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import { fetchResidentCity } from '@/lib/family/resolveResidentCity'

const ANON_IP_DAILY_LIMIT = 3
type AssessIpBucket = { day: string; count: number }
const anonymousAssessIp = new Map<string, AssessIpBucket>()

function assessFailed(message = '评估生成失败，请重试') {
  return NextResponse.json({
    error: message,
    _failed: true,
    message: '暂时无法生成评估报告，请稍后再试',
  }, { status: 500 })
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10)
}

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

/** 匿名：每 IP（UTC 日）限制次数；已通过 JWT 则不限 */
function consumeAnonymousAssessSlot(ip: string): boolean {
  const day = utcDay()
  if (anonymousAssessIp.size > 5000) {
    for (const [k, v] of anonymousAssessIp)
      if (v.day !== day) anonymousAssessIp.delete(k)
  }
  let b = anonymousAssessIp.get(ip)
  if (!b || b.day !== day) {
    b = { day, count: 0 }
    anonymousAssessIp.set(ip, b)
  }
  if (b.count >= ANON_IP_DAILY_LIMIT) return false
  b.count += 1
  return true
}

const SYSTEM_PROMPT = `你是根·中文顾问，为海外华人陪读家庭服务。
根据问卷答案生成个性化报告。
只输出纯JSON，不加任何其他文字或标记。
语气：温暖、专业、像妈妈朋友一样，绝不说教。

JSON结构（所有字段必填，不能为空字符串）：
{
  "level": "R1到R5之一",
  "level_desc": "级别名称（4-6字）",
  "standard_level": "如：初等一级",
  "standard_desc": "该等级一句话描述",
  "insight": "现状洞察（2-3句，温暖）",
  "blockpoint": "核心卡点（1-2句，具体）",
  "action": "本周核心行动（1句，可操作）",
  "local_line": "结合孩子所在城市的真实生活场景金句，禁止套用其他城市",
  "feature_rec": "产品功能推荐（1-2句）",
  "cta": "行动召唤（15字以内）"
}

重要：action 字段必须是一句完整的中文字符串，不能是对象或数组，例如：「本周每天睡前让孩子认读3个新字」，不能写成：{"main": "...", "game": "..."}

R级别对照：
R1 = 认字<50，汉字完全陌生，以口语输入为主
R2 = 认字50-200，能认常用字，拼音依赖强，书写极弱
R3 = 认字200-500，能读简单句，理解基本语义，开始抗拒写作
R4 = 认字500+，能读段落，口语强于书面，词汇量遇瓶颈
R5 = 阅读流畅，书面表达弱，中英切换频繁，写作词穷`

function inferLevel(answers: Record<string, string>): string {
  const charCount = answers['q6'] || ''
  const reading   = answers['q4'] || ''

  if (charCount.includes('50个以下') || reading.includes('基本不会读')) return 'R1'
  if (charCount.includes('50－200'))  return 'R2'
  if (charCount.includes('200－500')) return 'R3'
  if (charCount.includes('500个以上') && reading.includes('完全没问题')) return 'R5'
  if (charCount.includes('500个以上')) return 'R4'
  return 'R3'
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  const bearer = authHeader?.replace(/^Bearer\s+/i, '')?.trim()
  let authenticated = false
  if (bearer) {
    const { user, error } = await getAuthUser(req)
    authenticated = !!(user && !error)
  }
  if (!authenticated) {
    const ip = getClientIp(req)
    if (!consumeAnonymousAssessSlot(ip)) {
      return NextResponse.json(
        { error: '今日免费次数已用完，请登录后继续', _rate_limited: true },
        { status: 429 },
      )
    }
  }

  let answers: Record<string, string>
  let geofence: { city?: string; country?: string } | null = null

  try {
    const body = await req.json()
    answers  = body.answers
    geofence = body.geofence || null
  } catch {
    return NextResponse.json({ error: '请求格式错误', _failed: true }, { status: 400 })
  }

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: '缺少问卷答案', _failed: true }, { status: 400 })
  }

  let localCtx: string
  if (geofence?.city) {
    localCtx = `孩子所在城市：${geofence.city}（${geofence.country || ''}）。
local_line 字段必须结合 ${geofence.city} 的真实生活场景，
比如当地的自然环境、学校文化、社区生活，禁止套用其他城市的场景。`
  } else {
    let profileCity = ''
    if (authenticated) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      )
      const { user } = await getAuthUser(req)
      if (user) profileCity = await fetchResidentCity(supabase, user.id)
    }
    localCtx = profileCity
      ? `孩子所在城市：${profileCity}。local_line 请结合${profileCity}的真实生活场景。`
      : '孩子所在城市未填写。local_line 请结合海外华人陪读家庭的通用生活场景，不要默认某一具体城市。'
  }

  const inferredLevel = inferLevel(answers)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `问卷答案：${JSON.stringify(answers)}

${localCtx}

初步判断级别：${inferredLevel}，请据此生成报告，如判断有偏差请自行调整。`,
        }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, response.statusText)
      return assessFailed()
    }

    const data = await response.json()
    const raw: string = data.content?.[0]?.text || ''

    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) {
      console.warn('ASSESS: no JSON found, raw:', raw.slice(0, 200))
      return assessFailed()
    }

    try {
      const parsed = JSON.parse(m[0])
      return NextResponse.json({ ...parsed, _is_fallback: false })
    } catch {
      console.warn('ASSESS: JSON.parse failed, match:', m[0].slice(0, 200))
      return assessFailed()
    }

  } catch (e: any) {
    console.error('ASSESS ERROR:', e?.message || e)
    return assessFailed()
  }
}
