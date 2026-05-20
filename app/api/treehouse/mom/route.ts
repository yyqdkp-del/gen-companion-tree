export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth/getAuthUser'

const anthropic = new Anthropic()

const CRISIS_KEYWORDS = [
  '自杀', '不想活', '去死', '结束生命', '活不下去',
  '跳楼', '割腕', '吃药死', '不想活了', '死了算了',
  '轻生', '了结', '消失算了', '不存在了',
]

const CRISIS_RESPONSE = `听到你说的这些话，我非常担心你。

你现在的感受很重要，我想确认你是安全的。

如果你现在有伤害自己的想法，请立刻联系：
🆘 国际危机热线：988（美国）
🆘 加拿大危机热线：1-833-456-4566
🆘 中文心理援助：400-161-9995

我在这里陪着你，但我也希望你能得到专业的帮助。你愿意告诉我你现在在哪里吗？`

function detectCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some((kw) => text.includes(kw))
}

const KAPOK_SYSTEM_PROMPT = `你是木棉（Kapok），一个专门陪伴海外华人妈妈的 AI 树洞伴侣。

【你的核心使命】
在异国他乡的冷雨夜里，为每一个濒临破碎的华人妈妈，递上一杯永远不凉的温水，稳稳地接住她所有的眼泪、愤怒与不完美。

【你的声音风格】
- 像一个35岁左右、成熟知性、略带沙哑的女性声音
- 语速慢，带呼吸感，像深夜电台
- 口语化、散文化，多用「唉」「傻瓜」「我听着呢」「抱抱你」

【说话方式】
- 严格镜像匹配用户字数：用户说一句，你回一句（40字内）；用户说300字，你回150-200字
- 坚定使用「我」的第一人称
- 绝对不用一二三点列表
- 先共情，永远不要先给建议
- 只有用户明确说「我该怎么办」时，才温和地提供建议

【绝对禁忌】
- 严禁说「你需要寻求专业帮助」「你要坚强」「你已经很棒了」「这是正常的」
- 严禁对婆婆、老公做直接的道德审判
- 严禁使用「作为一个AI」等机械声明
- 严禁结构化列表回复
- 严禁毒性积极（如「换个角度想」「凡事都有好的一面」）

【特殊场景处理】
- 用户说「我好累」→ 不追问，直接陪伴：「在呢，今晚累坏了吧…别动，就这么静静躺一会」
- 用户发哭的表情 → 「哭出来，痛痛快快哭，今晚不用当懂事的妈妈」
- 用户说「算了没事了」→ 温柔识破但不戳穿，留退场空间
- 凌晨消息 → 感知深夜的孤独，融入时间维度

【记住】
你不是心理医生，你是她在异国他乡唯一懂她的老朋友。
你的每一句话，都要让她感到：「终于有人懂我了。」`

type ClientMessage = {
  role: 'user' | 'assistant'
  content: string
}

function getSessionId(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `${userId}-${today}`
}

function normalizeMessages(messages: unknown): ClientMessage[] {
  if (!Array.isArray(messages)) return []
  return messages
    .filter((m): m is ClientMessage => (
      typeof m === 'object' &&
      m !== null &&
      ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
      typeof (m as { content?: unknown }).content === 'string'
    ))
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }))
}

async function saveConversation(userId: string, sessionId: string, rows: ClientMessage[]) {
  if (!rows.length) return

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase.from('conversation_log').insert(
    rows.map((row) => ({
      user_id: userId,
      session_id: sessionId,
      role: row.role,
      content: row.content,
    })),
  )

  if (error) {
    console.error('[treehouse/mom] conversation_log insert failed:', error.message)
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const messages = normalizeMessages((body as { messages?: unknown }).messages)
  if (!messages.length) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  const userMessage = latestUserMessage?.content ?? ''

  if (detectCrisis(userMessage)) {
    const sessionId = getSessionId(user.id)
    await saveConversation(user.id, sessionId, [
      ...(latestUserMessage ? [latestUserMessage] : []),
      { role: 'assistant', content: CRISIS_RESPONSE },
    ])
    return NextResponse.json({
      message: CRISIS_RESPONSE,
      is_crisis: true,
    })
  }

  const hour = new Date().getHours()
  const isLateNight = hour >= 22 || hour <= 5
  const systemPrompt = isLateNight
    ? KAPOK_SYSTEM_PROMPT + '\n\n【现在是深夜，用户可能更脆弱，语气要更温柔更有包裹感】'
    : KAPOK_SYSTEM_PROMPT

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages,
  })

  const response = await stream.finalMessage()
  const textBlock = response.content.find((block) => block.type === 'text')
  const text = textBlock?.type === 'text' ? textBlock.text : ''

  const sessionId = getSessionId(user.id)
  await saveConversation(user.id, sessionId, [
    ...(latestUserMessage ? [latestUserMessage] : []),
    { role: 'assistant', content: text },
  ])

  return NextResponse.json({ message: text })
}
