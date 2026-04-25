export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 工具定义 ══
const TOOLS = [
  {
    name: 'add_todo',
    description: '添加需要妈妈主动行动的待办事项。只有真正需要妈妈做某件事（缴费/预约/申请/购买/签字）才调用。纯日历事件、纯信息记录不要调用这个。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '待办标题，简洁清楚' },
        dimension: { type: 'string', enum: ['compliance', 'estate', 'logistics', 'education', 'social', 'wealth', 'medical', 'mobility', 'selfcare'] },
        who: { type: 'string', description: '涉及的家庭成员' },
        due_date: { type: 'string', description: 'ISO格式截止日期' },
        priority: { type: 'number', enum: [1, 2, 3], description: '1=普通(30天以上) 2=重要(8-30天) 3=紧急(7天内)' },
        notes: { type: 'string' },
        claude_advice: { type: 'string', description: '日安的完整行动建议，具体可执行，站在妈妈角度' },
        action_items: { type: 'array', items: { type: 'string' } },
        carry_items: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        search_keywords: { type: 'array', items: { type: 'string' }, description: '办理时需要实时搜索的关键词，3-5个精准词' },
        ai_draft: { type: 'string', description: '如需发邮件/消息，预先生成的草稿' },
      },
      required: ['title', 'priority', 'dimension']
    }
  },
  {
    name: 'add_schedule',
    description: '添加孩子的校历事件。适用于：运动会、家长会、考试、假期、校外活动、兴趣班。这些存入校历，不进待办。只有明确需要缴费才同时生成待办。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        child_name: { type: 'string' },
        date_start: { type: 'string', description: 'ISO格式日期 如2026-05-01' },
        date_end: { type: 'string' },
        event_type: { type: 'string', enum: ['activity', 'exam', 'holiday', 'meeting', 'class', 'trip', 'other'] },
        location: { type: 'string' },
        description: { type: 'string' },
        requires_action: { type: 'string', description: '妈妈需要做什么，没有填null' },
        requires_items: { type: 'array', items: { type: 'string' } },
        requires_payment: { type: 'number', description: '缴费金额，没有填null' },
      },
      required: ['title', 'date_start', 'event_type']
    }
  },
  {
    name: 'add_health',
    description: '记录孩子健康/医疗信息。病历图片必须调用。',
    input_schema: {
      type: 'object',
      properties: {
        child_name: { type: 'string' },
        date: { type: 'string' },
        type: { type: 'string', enum: ['visit', 'diagnosis', 'medication', 'vaccine', 'checkup', 'emergency', 'other'] },
        description: { type: 'string' },
        doctor_name: { type: 'string' },
        hospital: { type: 'string' },
        follow_up_date: { type: 'string', description: '复诊日期，有则填' },
        notes: { type: 'string' },
        current_status: { type: 'string', enum: ['normal', 'sick', 'recovering'] },
        medication_taken: { type: 'boolean' },
      },
      required: ['type', 'description']
    }
  },
  {
    name: 'add_document',
    description: '记录家庭重要证件/文件到期信息。护照、签证、保险、驾照等。',
    input_schema: {
      type: 'object',
      properties: {
        member_name: { type: 'string' },
        doc_type: { type: 'string', enum: ['passport', 'visa', 'insurance', 'license', 'contract', 'id', 'other'] },
        title: { type: 'string' },
        expiry_date: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['doc_type', 'title']
    }
  },
  {
    name: 'add_shopping',
    description: '添加需要购买或准备的物品。',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              category: { type: 'string', enum: ['buy', 'prepare', 'find', 'wear'] },
              need_buy: { type: 'boolean' },
              event_date: { type: 'string' },
              for_child: { type: 'string' },
            },
            required: ['name', 'need_buy']
          }
        },
      },
      required: ['items']
    }
  },
  {
    name: 'add_reminder',
    description: '设置提醒。定时提醒、每日提醒（用药）、重要日期前提醒。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        trigger_date: { type: 'string' },
        trigger_time: { type: 'string' },
        repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
        message: { type: 'string' },
      },
      required: ['title', 'trigger_date']
    }
  },
  {
    name: 'update_child_status',
    description: '更新孩子今日状态。提到孩子心情、健康、睡眠时调用。',
    input_schema: {
      type: 'object',
      properties: {
        child_name: { type: 'string' },
        health_status: { type: 'string', enum: ['normal', 'sick', 'recovering'] },
        health_notes: { type: 'string' },
        mood_status: { type: 'string', enum: ['happy', 'calm', 'anxious', 'upset'] },
        mood_notes: { type: 'string' },
        sleep_start: { type: 'string' },
        sleep_end: { type: 'string' },
        medication_taken: { type: 'boolean' },
        notable: { type: 'string' },
      },
      required: ['child_name']
    }
  },
  {
    name: 'learn_pattern',
    description: '记录家庭习惯和行为规律。发现重复模式、兴趣偏好时调用。',
    input_schema: {
      type: 'object',
      properties: {
        pattern_type: { type: 'string', enum: ['消费', '医疗', '出行', '社交', '教育', '饮食', '运动', '其他'] },
        description: { type: 'string' },
        cycle_days: { type: 'number' },
        interest_signals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              weight_delta: { type: 'number' },
              signal_type: { type: 'string', enum: ['mention', 'question', 'action'] }
            }
          }
        },
      },
      required: ['pattern_type', 'description']
    }
  },
]

// ══ Gemini 语音转文字 ══
async function transcribeAudio(fileUrl: string): Promise<string> {
  try {
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (e: any) {
    console.error('Gemini转文字失败:', e?.message)
    return ''
  }
}

// ══ Grok 搜索 ══
async function grokSearch(query: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [
          { role: 'system', content: '你是清迈本地情报员。用中文简洁回答，100字以内。' },
          { role: 'user', content: query }
        ]
      }),
    })
    clearTimeout(timeout)
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    console.error('Grok搜索失败:', e?.message)
    return ''
  }
}

// ══ 家庭档案 ══
async function getFamilyContext(userId: string): Promise<string> {
  try {
    const [children, recentTodos, recentLogs, habits, interests, places] = await Promise.all([
      supabase.from('children').select('*').eq('user_id', userId),
      supabase.from('todo_items').select('title,category,priority,status,due_date').eq('user_id', userId).neq('status', 'done').order('created_at', { ascending: false }).limit(10),
      supabase.from('child_daily_log').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(3),
      supabase.from('family_habits').select('*').eq('user_id', userId).limit(10),
      supabase.from('interest_weights').select('topic, weight').eq('user_id', userId).order('weight', { ascending: false }).limit(10),
      supabase.from('family_places').select('name, city').eq('user_id', userId).limit(10),
    ])
    return JSON.stringify({
      children: children.data || [],
      currentTodos: recentTodos.data || [],
      recentChildLogs: recentLogs.data || [],
      habits: habits.data || [],
      interests: interests.data || [],
      places: places.data || [],
    })
  } catch (e) { return '{}' }
}

// ══ Grok 触发判断 ══
function buildGrokQuery(content: string): string | null {
  const keywords: Record<string, string[]> = {
    medical: ['看病', '医院', '复诊', '体检', '生病', '发烧', '药', '诊所'],
    weather: ['出门', '外出', '天气', '下雨', '台风'],
    traffic: ['开车', '堵车', '路况', '接送', '出发'],
    visa: ['签证', '报到', '移民', '护照', '续签'],
    school: ['学校', '接孩子', '放学', '开学', '考试'],
  }
  const matched: string[] = []
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(w => content.includes(w))) matched.push(type)
  }
  if (!matched.length) return null
  const parts = ['今天清迈最新情况：']
  if (matched.includes('medical')) parts.push('各大医院排队时间')
  if (matched.includes('weather')) parts.push('今明天气预报、空气质量')
  if (matched.includes('traffic')) parts.push('主要道路交通状况')
  if (matched.includes('visa')) parts.push('移民局最新政策、排队情况')
  if (matched.includes('school')) parts.push('学校最新通知')
  return parts.join('')
}

// ══ 触发 Make webhook ══
async function triggerMake(toolName: string, input: any) {
  if (!MAKE_WEBHOOK_URL) return
  try {
    if (toolName === 'add_schedule' && input.date_start) {
      const startTime = new Date(input.date_start)
      const endTime = new Date(input.date_end || input.date_start)
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'calendar',
          title: input.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          description: input.description,
          location: input.location || '清迈',
        }),
      })
    }
    if (toolName === 'add_todo' && input.priority === 3) {
      await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'urgent_alert',
          title: input.title,
          message: input.claude_advice,
          due_date: input.due_date,
        }),
      })
    }
  } catch (e) { console.error('Make webhook error:', e) }
}

// ══ 执行工具调用 ══
async function executeTool(
  toolName: string,
  input: any,
  userId: string,
  rawInputId: string,
  childrenData: any[]
): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0]

  const findChildId = (name?: string) => {
    if (!name) return childrenData?.[0]?.id || null
    const found = childrenData.find((c: any) => c.name?.includes(name) || name?.includes(c.name))
    return found?.id || childrenData?.[0]?.id || null
  }

  switch (toolName) {

    case 'add_todo': {
      const priority = input.priority === 3 ? 'red' : input.priority === 2 ? 'orange' : 'yellow'
      const aiActionTypeMap: Record<string, string> = {
        compliance: 'fill_form', wealth: 'pay', medical: 'book',
        logistics: 'buy', mobility: 'navigate', social: 'whatsapp',
        estate: 'pay', education: 'send_email', selfcare: 'calendar',
      }

      const { data: todo } = await supabase.from('todo_items').insert({
        user_id: userId,
        title: input.title,
        description: input.claude_advice,
        category: input.dimension,
        priority,
        status: 'pending',
        due_date: input.due_date || null,
        source: 'rian',
        source_ref_id: rawInputId,
        ai_draft: input.ai_draft || null,
        ai_action_type: aiActionTypeMap[input.dimension] || null,
        ai_action_data: {
          action_items: input.action_items,
          carry_items: input.carry_items,
          warnings: input.warnings,
          brain_instruction: {
            dimension: input.dimension,
            intent: input.title,
            context: input.claude_advice,
            search_keywords: input.search_keywords || [],
            who: input.who,
            due_date: input.due_date,
          }
        },
        one_tap_ready: false, // 先设false，预热完成后改true
      }).select().single()

      // 三级提醒链
      if (todo && input.due_date) {
        const daysLeft = Math.ceil((new Date(input.due_date).getTime() - Date.now()) / 86400000)
        const reminderDays = daysLeft > 30 ? 90 : daysLeft > 7 ? 30 : null
        if (reminderDays) {
          await supabase.from('reminder_chains').insert([
            { todo_id: todo.id, user_id: userId, level: 1, trigger_days_before: reminderDays, status: 'pending' },
            { todo_id: todo.id, user_id: userId, level: 2, trigger_days_before: 7, status: 'pending' },
            { todo_id: todo.id, user_id: userId, level: 3, trigger_days_before: 1, status: 'pending' },
          ])
        }
      }

      await triggerMake(toolName, input)
      return todo?.id || null
    }

    case 'add_schedule': {
      const childId = findChildId(input.child_name)
      await supabase.from('child_school_calendar').insert({
        child_id: childId,
        user_id: userId,
        event_type: input.event_type || 'activity',
        title: input.title,
        date_start: input.date_start,
        date_end: input.date_end || input.date_start,
        description: input.description || null,
        requires_action: input.requires_action || null,
        requires_items: input.requires_items || [],
        requires_payment: input.requires_payment || null,
        source: 'rian',
      })
      // 只有明确需要缴费才生成待办
      if (input.requires_payment && input.requires_payment > 0) {
        await supabase.from('todo_items').insert({
          user_id: userId,
          title: `${input.title} - 缴费 ฿${input.requires_payment}`,
          category: 'wealth',
          priority: 'orange',
          status: 'pending',
          due_date: input.date_start,
          source: 'rian',
          one_tap_ready: false,
        })
      }
      await triggerMake(toolName, input)
      return null
    }

    case 'add_health': {
      const childId = findChildId(input.child_name)
      await supabase.from('child_health_records').insert({
        child_id: childId,
        user_id: userId,
        date: input.date || today,
        type: input.type,
        description: input.description,
        doctor_name: input.doctor_name || null,
        hospital: input.hospital || null,
        follow_up_date: input.follow_up_date || null,
        notes: input.notes || null,
      })
      if (input.current_status) {
        const { data: existing } = await supabase.from('child_daily_log').select('id').eq('child_id', childId).eq('date', today).single()
        if (existing) {
          await supabase.from('child_daily_log').update({
            health_status: input.current_status,
            health_notes: input.description,
            medication_taken: input.medication_taken || false,
          }).eq('id', existing.id)
        } else {
          await supabase.from('child_daily_log').insert({
            child_id: childId, user_id: userId, date: today,
            health_status: input.current_status,
            health_notes: input.description,
            medication_taken: input.medication_taken || false,
          })
        }
      }
      // 复诊自动生成待办
      if (input.follow_up_date) {
        await supabase.from('todo_items').insert({
          user_id: userId,
          title: `复诊预约${input.hospital ? ' - ' + input.hospital : ''}`,
          category: 'medical',
          priority: 'orange',
          status: 'pending',
          due_date: input.follow_up_date,
          source: 'rian',
          one_tap_ready: false,
        })
      }
      return null
    }

    case 'add_document': {
      await supabase.from('family_documents').insert({
        user_id: userId,
        member_name: input.member_name || null,
        doc_type: input.doc_type,
        title: input.title,
        expiry_date: input.expiry_date || null,
        reminder_days_before: [90, 30, 7],
        metadata: { notes: input.notes },
      })
      if (input.expiry_date) {
        await supabase.from('todo_items').insert({
          user_id: userId,
          title: `${input.title}到期续签`,
          category: 'compliance',
          priority: 'orange',
          status: 'pending',
          due_date: input.expiry_date,
          source: 'rian',
          one_tap_ready: false,
        })
      }
      return null
    }

    case 'add_shopping': {
      const childId = findChildId()
      for (const item of (input.items || [])) {
        const targetDate = item.event_date || today
        const childIdForItem = item.for_child ? findChildId(item.for_child) : childId
        const newItem = { name: item.name, category: item.category || 'prepare', status: 'pending', need_buy: item.need_buy || false }
        const { data: existing } = await supabase.from('packing_lists').select('id, items').eq('child_id', childIdForItem).eq('date', targetDate).eq('user_id', userId).single()
        if (existing) {
          const items = Array.isArray(existing.items) ? existing.items : []
          if (!items.some((i: any) => i.name === item.name)) {
            await supabase.from('packing_lists').update({ items: [...items, newItem] }).eq('id', existing.id)
          }
        } else {
          await supabase.from('packing_lists').insert({ child_id: childIdForItem, user_id: userId, date: targetDate, items: [newItem] })
        }
      }
      return null
    }

    case 'add_reminder': {
      await supabase.from('reminders').insert({
        user_id: userId,
        title: input.title,
        trigger_date: input.trigger_date,
        message: input.message || input.title,
        status: 'pending',
      }).catch(() => {})
      return null
    }

    case 'update_child_status': {
      const childId = findChildId(input.child_name)
      const { data: existing } = await supabase.from('child_daily_log').select('id, notable_events').eq('child_id', childId).eq('date', today).single()
      const updateData: any = { updated_at: new Date().toISOString() }
      if (input.health_status) { updateData.health_status = input.health_status; updateData.health_notes = input.health_notes }
      if (input.mood_status) { updateData.mood_status = input.mood_status; updateData.mood_notes = input.mood_notes }
      if (input.sleep_start) updateData.sleep_start = input.sleep_start
      if (input.sleep_end) updateData.sleep_end = input.sleep_end
      if (input.medication_taken !== undefined) updateData.medication_taken = input.medication_taken
      if (input.notable) updateData.notable_events = [...(existing?.notable_events || []), input.notable]
      if (existing) {
        await supabase.from('child_daily_log').update(updateData).eq('id', existing.id)
      } else {
        await supabase.from('child_daily_log').insert({ child_id: childId, user_id: userId, date: today, ...updateData })
      }
      return null
    }

    case 'learn_pattern': {
      await supabase.from('family_habits').insert({
        user_id: userId,
        habit_type: input.pattern_type,
        cycle_days: input.cycle_days || null,
        notes: input.description,
      })
      for (const sig of (input.interest_signals || [])) {
        const { data: existing } = await supabase.from('interest_weights').select('*').eq('user_id', userId).eq('topic', sig.topic).single()
        if (existing) {
          await supabase.from('interest_weights').update({
            weight: Math.min(100, existing.weight + (sig.weight_delta || 1)),
            signal_count: existing.signal_count + 1,
            last_signal_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          await supabase.from('interest_weights').insert({
            user_id: userId, topic: sig.topic,
            weight: 10 + (sig.weight_delta || 1),
            signal_count: 1, last_signal_at: new Date().toISOString(),
          })
        }
      }
      return null
    }

    default:
      console.warn('未知工具:', toolName)
      return null
  }
}

// ══ 预热 Grok ══
async function preheatGrok(todoIds: string[], toolUses: any[]) {
  const todoTools = toolUses.filter(t => t.name === 'add_todo')
  for (let i = 0; i < todoTools.length; i++) {
    const todoId = todoIds[i]
    const keywords = todoTools[i].input.search_keywords
    if (!todoId || !keywords?.length) continue
    try {
      const grokResult = await grokSearch(keywords.join('，') + '，清迈本地最新情况')
      if (!grokResult) continue
      const { data: todo } = await supabase.from('todo_items').select('ai_action_data').eq('id', todoId).single()
      await supabase.from('todo_items').update({
        ai_action_data: { ...(todo?.ai_action_data || {}), grok_result: grokResult },
        one_tap_ready: true, // 预热完成，一键办可用
      }).eq('id', todoId)
    } catch (e) { console.error('Grok预热失败:', e) }
  }
}

// ══ 处理单个 job ══
async function processJob(job: any) {
  const { id: jobId, user_id: userId, input_type, raw_content, file_url } = job
  const today = new Date().toISOString().split('T')[0]

  try {
    // 标记处理中
    await supabase.from('raw_inputs').update({ status: 'processing' }).eq('id', jobId)

    // 音频转文字
    let processedContent = raw_content
    if (input_type === 'audio' && file_url) {
      const transcribed = await transcribeAudio(file_url)
      if (transcribed) {
        processedContent = transcribed
        await supabase.from('raw_inputs').update({ raw_content: transcribed }).eq('id', jobId)
      }
    }

    // 并行：家庭档案 + Grok搜索
    const grokQuery = buildGrokQuery(processedContent || '')
    const [familyContext, grokInfo] = await Promise.all([
      getFamilyContext(userId),
      grokQuery ? grokSearch(grokQuery) : Promise.resolve(''),
    ])

    const { data: childrenData } = await supabase.from('children').select('id, name').eq('user_id', userId)

    // 构建消息
    const messages: any[] = []
    if (input_type === 'image' && file_url) {
      messages.push({
        role: 'user', content: [
          { type: 'image', source: { type: 'url', url: file_url } },
          { type: 'text', text: processedContent || '请分析这张图片，提取所有需要跟进的事件、日程、健康信息等' }
        ]
      })
    } else {
      messages.push({ role: 'user', content: processedContent })
    }

    // Claude 全智能分析
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: `你是日安，清迈陪读家庭的全能AI管家。你了解这个家庭，站在妈妈的角度思考和行动。

## 家庭档案
${familyContext}

## 实时外部信息
${grokInfo || '暂无'}

## 你的工作方式
分析用户输入，调用合适的工具记录信息。可以同时调用多个工具。

## 关键原则
- 校历事件用 add_schedule，不要用 add_todo。除非需要缴费才同时调用 add_todo
- 病历用 add_health，复诊日期自动生成提醒
- 需要购买的物品用 add_shopping
- 只有妈妈真正需要做某件事才用 add_todo
- 图片中每个事件单独调用工具，不合并
- claude_advice 要站在妈妈角度，具体实用，像闺蜜建议一样

## 图片处理
- 校历：每一行一个 add_schedule，识别所有日期和事件
- 病历：add_health 记录诊断 + update_child_status 更新状态
- 账单：add_todo 设置缴费待办
- 通知：判断是否需要回复或行动

今天日期：${new Date().toLocaleDateString('zh-CN')}`,
        messages,
        tools: TOOLS,
        tool_choice: { type: 'auto' },
      }),
    })

    const data = await response.json()
    const toolUses = data.content?.filter((c: any) => c.type === 'tool_use') || []
    console.log(`Job ${jobId}: Claude调用了 ${toolUses.length} 个工具: ${toolUses.map((t: any) => t.name).join(', ')}`)

    // 执行所有工具
    const todoIds: string[] = []
    for (const toolUse of toolUses) {
      const todoId = await executeTool(toolUse.name, toolUse.input, userId, jobId, childrenData || [])
      if (todoId) todoIds.push(todoId)
    }

    // 异步预热 Grok（后台跑，不阻塞完成标记）
    preheatGrok(todoIds, toolUses).catch(e => console.error('预热失败:', e))

    // 标记完成
    await supabase.from('raw_inputs').update({
      processed: true,
      status: 'done',
      completed_at: new Date().toISOString(),
      extracted_events: toolUses.map((t: any) => ({ tool: t.name, input: t.input })),
    }).eq('id', jobId)

    console.log(`Job ${jobId} 完成，生成 ${todoIds.length} 个待办`)

  } catch (e: any) {
    console.error(`Job ${jobId} 失败:`, e?.message)
    const { data: job } = await supabase.from('raw_inputs').select('retry_count').eq('id', jobId).single()
    const retryCount = (job?.retry_count || 0) + 1
    await supabase.from('raw_inputs').update({
      status: retryCount >= 3 ? 'failed' : 'queued', // 失败3次才放弃
      error_message: e?.message,
      retry_count: retryCount,
    }).eq('id', jobId)
  }
}

// ══ Worker 主入口 ══
export async function GET() {
  try {
    // 取待处理的 jobs（queued 状态，每次最多处理3个）
    const { data: jobs } = await supabase
      .from('raw_inputs')
      .select('*')
      .eq('status', 'queued')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(3)

    if (!jobs?.length) {
      return NextResponse.json({ ok: true, processed: 0, message: '队列为空' })
    }

    console.log(`Worker 开始处理 ${jobs.length} 个 jobs`)

    // 逐个处理（避免并发超时）
    for (const job of jobs) {
      await processJob(job)
    }

    return NextResponse.json({
      ok: true,
      processed: jobs.length,
      job_ids: jobs.map(j => j.id),
    })

  } catch (e: any) {
    console.error('Worker 错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
