import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `你是日安，一个全能人生管家AI。
用户会向你扔来各种生活碎片：语音转文字、照片描述、文件内容、随手记录。
你的任务是从中提取所有需要跟进的事件，结构化输出。
严格只输出JSON数组，不加任何其他文字：
[
  {
    "title": "事件标题",
    "category": "visa|birthday|medical|school|shopping|family|travel|finance|other",
    "who": "涉及的人（妈妈/孩子名/爸爸/婆婆/全家等）",
    "due_date": "截止日期（ISO格式，如无则null）",
    "recur": "none|daily|weekly|monthly|yearly",
    "priority": 1|2|3,
    "notes": "补充说明",
    "claude_advice": "日安给的一句建议或提醒"
  }
]
优先级规则：
1=普通（生活琐事）
2=重要（需要安排时间处理）
3=紧急（有截止日期或影响较大）
今天日期：${new Date().toLocaleDateString('zh-CN')}`

export async function POST(req: NextRequest) {
  try {
    const { content, input_type, file_url, user_id } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // 1. 存入raw_inputs
    const { data: rawInput } = await supabase.from('raw_inputs').insert({
      user_id: user_id || null,
      input_type,
      raw_content: content,
      file_url: file_url || null,
      processed: false,
    }).select().single()

    // 2. Claude处理
    const messages: any[] = []
    if (input_type === 'image' && file_url) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: file_url } },
          { type: 'text', text: content || '请分析这张图片，提取所有需要跟进的事件' }
        ]
      })
    } else {
      messages.push({ role: 'user', content })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(cleaned.match(/\[[\s\S]*\]/)?.[0] || '[]')

    // 3. 存入events表 + 生成reminders水珠
    if (extracted.length > 0) {
      await supabase.from('events').insert(
        extracted.map((e: any) => ({
          user_id: user_id || null,
          raw_input_id: rawInput?.id,
          title: e.title,
          category: e.category,
          who: e.who,
          due_date: e.due_date,
          recur: e.recur || 'none',
          priority: e.priority || 2,
          notes: e.notes,
          claude_advice: e.claude_advice,
          source: input_type,
        }))
      )

      await supabase.from('reminders').insert(
        extracted.map((e: any) => ({
          user_id: user_id || null,
          title: e.title,
          description: e.claude_advice || e.notes || null,
          category: e.category,
          urgency_level: e.priority || 2,
          due_date: e.due_date || null,
          status: 'pending',
        }))
      )
    }

    // 4. 标记已处理
    await supabase.from('raw_inputs').update({
      processed: true,
      extracted_events: extracted,
    }).eq('id', rawInput?.id)

    return NextResponse.json({ ok: true, events: extracted })
  } catch (e: any) {
    console.error('PROCESS ERROR:', e?.message || e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
