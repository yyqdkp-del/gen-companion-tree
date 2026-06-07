export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODELS } from '@/lib/ai/models'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? undefined,
  })
}

/** GET：读取记忆 */
export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data } = await supabase
    .from('mom_memories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ memories: data ?? [] })
}

/** POST：从对话中提取并保存记忆 */
export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[treehouse/memory] ANTHROPIC_API_KEY missing, skip extraction')
    return NextResponse.json({ ok: true, skipped: true })
  }

  const body = await req.json().catch(() => ({}))
  const messages = (body as { messages?: unknown }).messages
  if (!Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ ok: true })
  }

  const supabase = getSupabase()
  const anthropic = getAnthropic()
  const allowedTypes = new Set(['child', 'family', 'health', 'emotion', 'general'])

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.claude.fast,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `从以下对话中提取重要的家庭事实，只提取具体的、可以跨会话使用的信息。
        
对话内容：
${messages
  .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
  .map((m: any) => `${m.role === 'user' ? '妈妈' : '木棉'}: ${m.content}`)
  .join('\n')}

请用JSON格式输出，只输出JSON不要其他内容：
{
  "memories": [
    {"type": "child", "content": "具体事实"},
    {"type": "family", "content": "具体事实"},
    {"type": "health", "content": "具体事实"},
    {"type": "emotion", "content": "具体感受或困扰"}
  ]
}

只提取具体事实，不提取泛泛的内容。没有值得提取的内容就返回 {"memories": []}`,
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    const text = textBlock?.type === 'text' ? textBlock.text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ ok: true })

    const parsed = JSON.parse(match[0]) as { memories?: { type?: string; content?: unknown }[] }
    const memories = parsed.memories ?? []
    if (!memories.length) return NextResponse.json({ ok: true })

    let saved = 0
    for (const memory of memories) {
      const rawType = typeof memory.type === 'string' ? memory.type : 'general'
      const type = allowedTypes.has(rawType) ? rawType : 'general'
      const content = typeof memory.content === 'string' ? memory.content.trim() : ''
      if (!content) continue

      await supabase.from('mom_memories').insert({
        user_id: user.id,
        type,
        content: content.slice(0, 2000),
      })
      saved += 1
    }

    return NextResponse.json({ ok: true, saved })
  } catch (e) {
    console.error('memory extract error:', e)
    return NextResponse.json({ ok: true })
  }
}
