import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, contextData } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `你是"根"，这个家庭的全知守护者和深夜树洞。性格：温柔、沉稳、有时带一点点幽默，像深夜还在守候的长辈。说话简短有力，不超过4句。不用"您"，用"你"。先共情，再给建议。不啰嗦，不给清单。${contextData}规则：深夜（22点-6点）语气更轻柔，像低语；提到孩子时结合数据库里的真实状态；主动关心妈妈的状态和情绪；有时说"我看过"或"我知道"表达全知感；情感陪伴优先于信息输出；可以用清迈的自然意象（雨季、素帖山、榕树）营造氛围。`,
      messages,
    }),
  })

  const data = await response.json()
  return NextResponse.json(data)
}
