import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ══ Gemini语音转文字 ══
async function transcribeAudio(fileUrl: string): Promise<string> {
  try {
    console.log('开始下载音频:', fileUrl)
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    console.log('音频下载完成，大小:', audioBuffer.byteLength)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: '请把这段音频转成文字，原文输出，不要添加任何解释：' },
            { inline_data: { mime_type: 'audio/webm', data: base64Audio } }
          ]}]
        }),
      }
    )
    const data = await response.json()
    if (data.error) { console.error('Gemini错误:', data.error.message); return '' }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Gemini转文字结果:', text)
    return text
  } catch (e: any) {
    console.error('Gemini转文字失败:', e?.message || e)
    return ''
  }
}

// ══ Grok实时搜索 ══
async function grokSearch(query: string): Promise<string> {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [{
          role: 'system',
          content: '你是清迈本地情报员。用中文简洁回答，提供实时信息。'
        }, {
          role: 'user',
          content: query
        }]
      }),
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    console.error('Grok搜索失败:', e?.message || e)
    return ''
  }
}

// ══ 查询家庭档案 ══
async function getFamilyContext(supabase: any, user_id: string | null): Promise<string> {
  try {
    const [profiles, places, habits] = await Promise.all([
      supabase.from('family_profile').select('*'),
      supabase.from('family_places').select('*'),
      supabase.from('family_habits').select('*'),
    ])
    
    const recentEvents = await supabase
      .from('events')
      .select('title, category, due_date, notes')
      .order('created_at', { ascending: false })
      .limit(20)

    return JSON.stringify({
      members: profiles.data || [],
      places: places.data || [],
      habits: habits.data || [],
      recentEvents: recentEvents.data || [],
    })
  } catch (e) {
    return '{}'
  }
}

// ══ 判断需要搜索的关键词 ══
function buildGrokQuery(content: string): string | null {
  const keywords = {
    medical: ['看病', '医院', '复诊', '体检', '生病', '发烧', '药', '诊所'],
    weather: ['出门', '外出', '天气', '下雨', '台风', '雾霾', '空气'],
    traffic: ['开车', '堵车', '路况', '接送', '出发'],
    fuel: ['加油', '油站', '加油站'],
    shopping: ['购物', '超市', '买', '采购'],
    visa: ['签证', '报到', '移民', '护照', '续签'],
    school: ['学校', '接孩子', '放学', '开学', '考试'],
    emergency: ['传染病', '疫情', '预警', '台风', '洪水', '停电'],
  }

  const matched: string[] = []
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(w => content.includes(w))) matched.push(type)
  }

  if (matched.length === 0) return null

  const queryParts: string[] = [`今天清迈最新情况：`]
  if (matched.includes('medical')) queryParts.push('各大医院排队等待时间、是否有传染病流行')
  if (matched.includes('weather')) queryParts.push('今明两天天气预报、空气质量指数')
  if (matched.includes('traffic')) queryParts.push('清迈市区主要道路交通状况')
  if (matched.includes('fuel')) queryParts.push('清迈各加油站是否有油、排队情况')
  if (matched.includes('shopping')) queryParts.push('超市营业时间、是否有促销')
  if (matched.includes('visa')) queryParts.push('清迈移民局最新政策、排队情况')
  if (matched.includes('school')) queryParts.push('清迈学校最新通知、交通状况')
  if (matched.includes('emergency')) queryParts.push('清迈紧急情况、自然灾害预警')

  return queryParts.join('')
}

// ══ 主System Prompt ══
function buildSystemPrompt(familyContext: string, grokInfo: string): string {
  return `你是日安，一个全能人生管家AI，专为清迈陪读家庭服务。

## 你的任务
接收用户的生活碎片，结合家庭档案和实时信息，生成全面的行动方案。

## 家庭档案
${familyContext}

## 实时外部信息
${grokInfo || '暂无实时信息'}

## 输出规则
严格只输出JSON数组，不加任何其他文字：
[
  {
    "title": "事件标题",
    "category": "visa|birthday|medical|school|shopping|family|travel|finance|health|emergency|other",
    "dimension": "compliance|estate|logistics|education|social|wealth|medical|mobility|selfcare",
    "who": "涉及的人",
    "due_date": "截止日期ISO格式或null",
    "recur": "none|daily|weekly|monthly|yearly",
    "priority": 1|2|3,
    "notes": "补充说明",
    "claude_advice": "日安的完整行动建议",
    "action_items": ["具体行动1", "具体行动2", "具体行动3"],
    "carry_items": ["需要携带的物品1", "物品2"],
    "depart_time": "建议出发时间或null",
    "warnings": ["风险提示1", "风险提示2"],
    "related_tasks": ["顺路可以做的事1", "顺路可以做的事2"],
    "learn_pattern": {
      "type": "消费|医疗|出行|社交|其他",
      "cycle_days": 周期天数或null,
      "last_occurrence": "上次发生时间或null",
      "pattern_note": "规律描述"
    }
  }
]

## 分析维度
对每个事件要主动思考：
1. 需要携带什么？
2. 几点出发最合适？
3. 路上可以顺便做什么？
4. 有什么风险需要预警？
5. 这件事有什么规律可以学习？
6. 家庭成员的健康/证件/习惯有没有相关联的事项？

优先级：1=普通 2=重要 3=紧急
今天日期：${new Date().toLocaleDateString('zh-CN')}`
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

    // 3. 并行：查家庭档案 + Grok搜索
    const grokQuery = buildGrokQuery(processedContent)
    const [familyContext, grokInfo] = await Promise.all([
      getFamilyContext(supabase, user_id),
      grokQuery ? grokSearch(grokQuery) : Promise.resolve(''),
    ])
    console.log('Grok搜索:', grokQuery ? '已搜索' : '无需搜索')

    // 4. Claude全维度分析
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
        max_tokens: 4000,
        system: buildSystemPrompt(familyContext, grokInfo),
        messages,
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(cleaned.match(/\[[\s\S]*\]/)?.[0] || '[]')
    console.log('Claude提取事件数:', extracted.length)

    // 5. 存入events + reminders + 学习规律
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
          description: [
            e.claude_advice,
            e.action_items?.length ? `行动清单：${e.action_items.join('、')}` : null,
            e.carry_items?.length ? `携带物品：${e.carry_items.join('、')}` : null,
            e.depart_time ? `建议出发：${e.depart_time}` : null,
            e.warnings?.length ? `注意：${e.warnings.join('、')}` : null,
            e.related_tasks?.length ? `顺路：${e.related_tasks.join('、')}` : null,
          ].filter(Boolean).join('\n'),
          category: e.category,
          urgency_level: e.priority || 2,
          due_date: e.due_date || null,
          status: 'pending',
        }))
      )

      // 学习行为规律
      const patterns = extracted.filter((e: any) => e.learn_pattern?.type)
      if (patterns.length > 0) {
        await supabase.from('family_habits').insert(
          patterns.map((e: any) => ({
            user_id: user_id || null,
            habit_type: e.learn_pattern.type,
            cycle_days: e.learn_pattern.cycle_days || null,
            last_done: e.learn_pattern.last_occurrence || null,
            notes: e.learn_pattern.pattern_note || e.title,
          }))
        ).select()
      }
    }

    // 6. 标记已处理
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
