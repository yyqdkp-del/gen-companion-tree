export const dynamic = 'force-dynamic'
import { AI_MODELS } from '@/lib/ai/models'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'

function parseClaudeJson(rawText: string): unknown {
  const cleaned = rawText.replace(/```json|```/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const destination = String(body.destination ?? '').trim()
  const departure = String(body.departure ?? '').trim()
  const start_date = String(body.start_date ?? '').trim()
  const end_date = String(body.end_date ?? '').trim()
  const travelers = (body.travelers as { adults?: number; children?: number }) || {}
  const budget = body.budget != null ? String(body.budget) : ''
  const preferences = Array.isArray(body.preferences) ? body.preferences : []
  const child_ages = Array.isArray(body.child_ages) ? body.child_ages.map((x: unknown) => Number(x)).filter((n) => !Number.isNaN(n)) : []

  if (!destination || !start_date || !end_date) {
    return NextResponse.json({ ok: false, error: '缺少目的地或日期' }, { status: 400 })
  }

  const prompt = `
你是专业的海外华人家庭旅行顾问。请为以下行程规划一份完整的旅行方案：

出发地：${departure || '未填'}
目的地：${destination}
日期：${start_date} 至 ${end_date}
出行人：${travelers?.adults ?? 2} 大人，${travelers?.children ?? 0} 小孩
${child_ages.length ? `孩子年龄：${child_ages.join('、')}岁` : ''}
${budget ? `预算：${budget}` : ''}
${preferences.length ? `偏好：${preferences.join('、')}` : ''}

请输出以下 JSON 格式（仅输出 JSON，不要其他文字）：
{
  "summary": "行程概述（2-3句话）",
  "duration": "X天Y夜",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "当天主题",
      "morning": "上午安排",
      "afternoon": "下午安排",
      "evening": "晚上安排",
      "meals": ["早餐推荐", "午餐推荐", "晚餐推荐"],
      "tips": "当天注意事项"
    }
  ],
  "packing_list": {
    "documents": ["护照", "签证", "保险单"],
    "clothing": ["建议携带的衣物"],
    "kids": ["孩子专用物品（如有）"],
    "others": ["其他必备物品"]
  },
  "budget_breakdown": {
    "flights": "机票预算参考",
    "hotel": "住宿预算参考",
    "food": "餐饮预算参考",
    "activities": "活动预算参考",
    "total": "总预算参考"
  },
  "useful_info": {
    "visa": "签证信息",
    "currency": "货币与汇率",
    "weather": "天气建议",
    "transport": "当地交通",
    "emergency": "紧急联系（当地报警、医疗电话）"
  },
  "kid_friendly_tips": "亲子出行特别提示（如有孩子）"
}
`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODELS.claude.default,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json().catch(() => ({}))
  const rawText = data.content?.[0]?.text || ''
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: data.error?.message || 'AI 请求失败' },
      { status: 500 },
    )
  }

  const plan = parseClaudeJson(rawText)
  if (!plan || typeof plan !== 'object') {
    return NextResponse.json({ ok: false, error: '规划生成失败，请重试' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, plan })
}
