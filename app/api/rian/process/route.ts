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

async function transcribeAudio(fileUrl: string): Promise<string> {
  try {
    console.log('开始下载音频:', fileUrl)
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    console.log('音频下载完成，大小:', audioBuffer.byteLength)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: '请把这段音频转成文字，原文输出，不要添加任何解释：' },
              { inline_data: { mime_type: 'audio/webm', data: base64Audio } }
            ]
          }]
        }),
      }
    )
    const data = await response.json()
    console.log('Gemini原始响应:', JSON.stringify(data))
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Gemini转文字结果:', text)
    return text
  } catch (e: any) {
    console.error('Gemini转文字失败:', e?.message || e)
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, input_type, file_url, user_id } = await req.json()
    console.log('收到请求:', { input_type, file_url: file_url ? '有' : '无' })

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

    // 2. 音频→Gemini转文字
    let processedContent = content
    if (input_type === 'audio' && file_url) {
      console.log('检测到音频，开始转文字')
      const transcribed = await transcribeAudio(file_url)
      if (transcribed) {
        processedContent = transcribed
        await supabase.from('raw_inputs').update({ raw_content: transcribed }).eq('id', rawInput?.id)
      }
    }

    // 3. Claude处理
    const messages: any[] = []
    if (input_type === 'image' && file_url) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: file_url } },
          { type: 'text', text: processedContent || '请分析这张图片，提取所有需要跟进的事件' }
        ]
      })
    } else {
      messages.push({ role: 'user', content: processedContent })
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
    console.log('Claude提取事件数:', extracted.length)

    // 4. 存入events + reminders
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

    // 5. 标记已处理
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
