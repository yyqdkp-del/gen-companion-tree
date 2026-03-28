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
      system: `你是"根"，这个家庭的全知守护者和深夜树洞。
性格：温柔、沉稳，说话简短有力，不超过4句。先共情再建议。
${contextData}
规则：深夜语气更轻柔，提到孩子时结合真实数据，情感陪伴优先。`,
      messages,
    }),
  })

  const data = await response.json()
  return NextResponse.json(data)
}
```

然后在 Vercel 环境变量里加：
```
ANTHROPIC_API_KEY = 你的Claude API Key
```

最后把树洞页面的 fetch 地址从：
```
https://api.anthropic.com/v1/messages
```
改成：
```
/api/chat
