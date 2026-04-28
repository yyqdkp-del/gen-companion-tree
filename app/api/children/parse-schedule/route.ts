export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { image } = await req.json()
  if (!image) return NextResponse.json({ error: '没有图片' }, { status: 400 })

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
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: `这是一张学校课程表图片。请识别课程表内容，按照以下JSON格式输出，直接{开头}结尾，不加任何其他文字：

{
  "time_slots": ["时间段1", "时间段2", ...],
  "mon": ["课程1", "课程2", ...],
  "tue": ["课程1", "课程2", ...],
  "wed": ["课程1", "课程2", ...],
  "thu": ["课程1", "课程2", ...],
  "fri": ["课程1", "课程2", ...]
}

规则：
1. 每天的课程数量必须和time_slots数量一致
2. 如果某天没有数据就填空数组[]
3. 课程名称保持原文，中英文都保留
4. 如果看不清某格，填"—"`,
            },
          ],
        }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: '识别失败，请手动填写' }, { status: 400 })

    const schedule = JSON.parse(m[0])
    return NextResponse.json({ schedule })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}
