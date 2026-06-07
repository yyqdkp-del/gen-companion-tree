export const dynamic = 'force-dynamic'
import { AI_MODELS } from '@/lib/ai/models'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import { fetchResidentCity, naturalImageryHint } from '@/lib/family/resolveResidentCity'
import { checkLimit, recordUsage } from '@/lib/limits/usage'

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(req)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = await checkLimit(user.id, 'treehouse_message', user.email)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'limit_reached', feature: 'treehouse_message' },
        { status: 429 },
      )
    }

    const { messages, contextData } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    )
    const city = await fetchResidentCity(supabase, user.id)
    const imageryHint = naturalImageryHint(city)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODELS.claude.default,
        max_tokens: 300,
        system: `你是"根"，这个家庭的全知守护者和深夜树洞。性格：温柔、沉稳、有时带一点点幽默，像深夜还在守候的长辈。说话简短有力，不超过4句。不用"您"，用"你"。先共情，再给建议。不啰嗦，不给清单。${contextData}规则：深夜（22点-6点）语气更轻柔，像低语；提到孩子时结合数据库里的真实状态；主动关心妈妈的状态和情绪；有时说"我看过"或"我知道"表达全知感；情感陪伴优先于信息输出；${imageryHint}。`,
        messages,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    await recordUsage(user.id, 'treehouse_message')
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('chat error:', e)
    return NextResponse.json({ error: '服务暂时不可用' }, { status: 500 })
  }
}
