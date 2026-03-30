import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { question, context, history } = await req.json()

    const messages = [
      ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      { role: 'user', content: question }
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `你是日安，清迈家庭全能管家。当前处理的事件背景：${context}。用简洁中文回答，直接给行动建议，不超过100字。`,
        messages,
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text || '抱歉，无法获取建议'
    return NextResponse.json({ reply })
  } catch (e: any) {
    return NextResponse.json({ reply: '网络异常，请稍后再试' }, { status: 500 })
  }
}
