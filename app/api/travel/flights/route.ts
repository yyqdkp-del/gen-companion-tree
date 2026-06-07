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

  const origin = String(body.origin ?? '').trim()
  const destination = String(body.destination ?? '').trim()
  const depart_date = String(body.depart_date ?? '').trim()
  const return_date = body.return_date != null ? String(body.return_date).trim() : ''
  const passengers = (body.passengers as { adults?: number; children?: number }) || {}

  if (!origin || !destination || !depart_date) {
    return NextResponse.json({ ok: false, error: '缺少必要参数' }, { status: 400 })
  }

  const prompt = `
请为以下行程给出智能机票购买建议（基于你的知识，给出实用策略；搜索链接须为真实可访问的 URL 格式）：

出发地：${origin}
目的地：${destination}
出发日期：${depart_date}
${return_date ? `返回日期：${return_date}` : '单程'}
乘客：${passengers?.adults ?? 1} 大人${passengers?.children ? `，${passengers.children} 儿童` : ''}

请输出以下 JSON（仅输出 JSON）：
{
  "search_links": [
    {
      "platform": "平台名称",
      "url": "搜索链接（直接可点击）",
      "description": "平台特点",
      "tip": "在此平台购票的建议"
    }
  ],
  "airlines": [
    {
      "name": "航空公司",
      "type": "直飞/经停",
      "duration": "飞行时长",
      "price_range": "价格区间参考",
      "pros": "优点",
      "cons": "缺点",
      "kid_friendly": true
    }
  ],
  "booking_strategy": {
    "best_time_to_buy": "最佳购票时机",
    "cheapest_days": "最便宜的出行日",
    "price_alert_tip": "价格提醒建议",
    "flexible_date_tip": "日期灵活性建议"
  },
  "money_saving_tips": [
    "省钱技巧1",
    "省钱技巧2",
    "省钱技巧3"
  ],
  "with_kids_tips": "带孩子乘机建议（如有儿童）",
  "baggage_tips": "行李建议",
  "comparison_table": [
    {
      "option": "方案名称（如「最便宜」「最快」「最舒适」）",
      "airline": "航空公司",
      "price": "价格参考",
      "duration": "总时长",
      "stops": "经停次数",
      "recommended_for": "适合人群"
    }
  ]
}

搜索链接要使用真实的平台搜索 URL 格式，包括：
- Google Flights: https://www.google.com/travel/flights?q=...
- Skyscanner: https://www.skyscanner.com/transport/flights/...
- Trip.com: https://www.trip.com/flights/...
- AirAsia: https://www.airasia.com/（如适用）
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
      max_tokens: 2000,
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

  const result = parseClaudeJson(rawText)
  if (!result || typeof result !== 'object') {
    return NextResponse.json({ ok: false, error: '分析失败，请重试' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...(result as Record<string, unknown>) })
}
