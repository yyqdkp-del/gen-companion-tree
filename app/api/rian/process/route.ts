export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 工具定义 ══
const TOOLS = [
  {
    name: 'add_todo',
    description: '添加需要妈妈主动行动的待办事项。只有真正需要妈妈做某件事（缴费/预约/申请/购买/签字）才调用。纯日历事件不要调用这个。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '待办标题，简洁清楚' },
        dimension: { type: 'string', enum: ['compliance', 'estate', 'logistics', 'education', 'social', 'wealth', 'medical', 'mobility', 'selfcare'] },
        who: { type: 'string', description: '涉及的家庭成员' },
        due_date: { type: 'string', description: 'ISO格式截止日期，如2026-05-01' },
        priority: { type: 'number', enum: [1, 2, 3], description: '1=普通(30天以上) 2=重要(8-30天) 3=紧急(7天内或证件医疗)' },
        notes: { type: 'string', description: '补充说明' },
        claude_advice: { type: 'string', description: '日安的完整行动建议，具体可执行' },
        action_items: { type: 'array', items: { type: 'string' }, description: '具体行动步骤' },
        carry_items: { type: 'array', items: { type: 'string' }, description: '需要携带的物品' },
        warnings: { type: 'array', items: { type: 'string' }, description: '风险提示' },
        search_keywords: { type: 'array', items: { type: 'string' }, description: '办理时需要实时搜索的关键词' },
        ai_draft: { type: 'string', description: '如果需要发邮件/消息，预先生成的草稿' },
      },
      required: ['title', 'priority', 'dimension']
    }
  },
  {
    name: 'add_schedule',
    description: '添加孩子的校历事件/日程。适用于：运动会、家长会、考试、假期、校外活动、兴趣班等。这些事件存入校历，不进待办。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '事件标题' },
        child_name: { type: 'string', description: '哪个孩子的事件' },
        date_start: { type: 'string', description: 'ISO格式开始日期' },
        date_end: { type: 'string', description: 'ISO格式结束日期，单日事件同start' },
        event_type: { type: 'string', enum: ['activity', 'exam', 'holiday', 'meeting', 'class', 'trip', 'other'] },
        location: { type: 'string', description: '地点' },
        description: { type: 'string', description: '详情' },
        requires_action: { type: 'string', description: '妈妈需要做什么准备，没有则null' },
        requires_items: { type: 'array', items: { type: 'string' }, description: '需要携带的物品' },
        requires_payment: { type: 'number', description: '需要缴费金额，没有则null' },
      },
      required: ['title', 'date_start', 'event_type']
    }
  },
  {
    name: 'add_health',
    description: '记录孩子的健康/医疗信息。适用于：就诊记录、诊断结果、用药记录、复诊安排、疫苗接种。病历图片一定要调用这个。',
    input_schema: {
      type: 'object',
      properties: {
        child_name: { type: 'string', description: '哪个孩子' },
        date: { type: 'string', description: '就诊/发生日期' },
        type: { type: 'string', enum: ['visit', 'diagnosis', 'medication', 'vaccine', 'checkup', 'emergency', 'other'] },
        description: { type: 'string', description: '详细描述，包含诊断结果' },
        doctor_name: { type: 'string', description: '医生姓名' },
        hospital: { type: 'string', description: '医院/诊所名称' },
        follow_up_date: { type: 'string', description: '复诊日期，有则填' },
        notes: { type: 'string', description: '注意事项、用药说明' },
        current_status: { type: 'string', enum: ['normal', 'sick', 'recovering'], description: '当前健康状态' },
        medication_taken: { type: 'boolean', description: '是否在用药' },
      },
      required: ['type', 'description']
    }
  },
  {
    name: 'add_document',
    description: '记录家庭重要证件/文件。适用于：护照、签证、驾照、保险、合同等有到期日期的文件。自动设置到期提醒。',
    input_schema: {
      type: 'object',
      properties: {
        member_name: { type: 'string', description: '证件所属人' },
        doc_type: { type: 'string', enum: ['passport', 'visa', 'insurance', 'license', 'contract', 'id', 'other'] },
        title: { type: 'string', description: '文件名称' },
        expiry_date: { type: 'string', description: '到期日期' },
        notes: { type: 'string', description: '补充信息' },
      },
      required: ['doc_type', 'title']
    }
  },
  {
    name: 'add_shopping',
    description: '添加需要购买或准备的物品。适用于：需要买的东西、活动前需要准备的物品、药品补充等。',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '物品名称' },
              category: { type: 'string', enum: ['buy', 'prepare', 'find', 'wear'] },
              need_buy: { type: 'boolean' },
              event_date: { type: 'string', description: '需要在哪天前准备好' },
              for_child: { type: 'string', description: '为哪个孩子准备' },
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
    description: '设置提醒。适用于：定时提醒、每日提醒（如用药）、重要日期前提醒。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '提醒内容' },
        trigger_date: { type: 'string', description: '触发日期' },
        trigger_time: { type: 'string', description: '触发时间，如09:00' },
        repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'], description: '重复频率' },
        message: { type: 'string', description: '提醒消息内容' },
        related_todo_title: { type: 'string', description: '关联的待办事项标题' },
      },
      required: ['title', 'trigger_date']
    }
  },
  {
    name: 'update_child_status',
    description: '更新孩子今日状态。适用于：提到孩子心情、健康、睡眠、今天发生的事。',
    input_schema: {
      type: 'object',
      properties: {
        child_name: { type: 'string', description: '哪个孩子' },
        health_status: { type: 'string', enum: ['normal', 'sick', 'recovering'], description: '健康状态' },
        health_notes: { type: 'string', description: '健康描述' },
        mood_status: { type: 'string', enum: ['happy', 'calm', 'anxious', 'upset'], description: '心情状态' },
        mood_notes: { type: 'string', description: '心情描述' },
        sleep_start: { type: 'string', description: '睡觉时间 如22:00' },
        sleep_end: { type: 'string', description: '起床时间 如07:00' },
        medication_taken: { type: 'boolean', description: '是否用药' },
        notable: { type: 'string', description: '今天值得记录的事' },
      },
      required: ['child_name']
    }
  },
  {
    name: 'learn_pattern',
    description: '记录家庭习惯和行为规律。当发现重复模式、消费习惯、兴趣偏好时调用。帮助系统更好地了解这个家庭。',
    input_schema: {
      type: 'object',
      properties: {
        pattern_type: { type: 'string', enum: ['消费', '医疗', '出行', '社交', '教育', '饮食', '运动', '其他'] },
        description: { type: 'string', description: '规律描述' },
        cycle_days: { type: 'number', description: '周期天数，如每7天一次填7' },
        interest_signals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              weight_delta: { type: 'number', description: '兴趣权重增加值1-5' },
              signal_type: { type: 'string', enum: ['mention', 'question', 'action'] }
            }
          }
        },
      },
      required: ['pattern_type', 'description']
    }
  },
]

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

// ══ Grok 实时搜索 ══
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
          { role: 'system', content: '你是清迈本地情报员。用中文简洁回答，提供实时信息，100字以内。' },
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

// ══ 查询家庭档案 ══
async function getFamilyContext(supabase: any, userId: string): Promise<string> {
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
    weather: ['出门', '外出', '天气', '下雨', '台风', '雾霾', '空气'],
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
  if (matched.includes('medical')) parts.push('各大医院排队等待时间')
  if (matched.includes('weather')) parts.push('今明两天天气预报、空气质量')
  if (matched.includes('traffic')) parts.push('清迈主要道路交通状况')
  if (matched.includes('visa')) parts.push('清迈移民局最新政策、排队情况')
  if (matched.includes('school')) parts.push('清迈学校最新通知')
  return parts.join('')
}

// ══ 执行工具调用 ══
async function executeTool(
  supabase: any,
  toolName: string,
  input: any,
  userId: string,
  rawInputId: string | null,
  childrenData: any[]
): Promise<string | null> {

  const today = new Date().toISOString().split('T')[0]

  // 根据孩子名字找 child_id
  const findChildId = (name?: string) => {
    if (!name) return childrenData?.[0]?.id || null
    const found = childrenData.find((c: any) =>
      c.name?.includes(name) || name?.includes(c.name)
    )
    return found?.id || childrenData?.[0]?.id || null
  }

  switch (toolName) {

    case 'add_todo': {
      const priority = input.priority === 3 ? 'red' : input.priority === 2 ? 'orange' : 'yellow'
      const childId = findChildId(input.who)

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
        one_tap_ready: true,
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

      // 异步预热 Grok
      if (todo?.id && input.search_keywords?.length) {
        ;(async () => {
          try {
            const grokResult = await grokSearch(input.search_keywords.join('，') + '，清迈本地最新情况')
            if (grokResult) {
              const { data: existing } = await supabase.from('todo_items').select('ai_action_data').eq('id', todo.id).single()
              await supabase.from('todo_items').update({
                ai_action_data: { ...(existing?.ai_action_data || {}), grok_result: grokResult }
              }).eq('id', todo.id)
            }
          } catch (e) { console.error('Grok预热失败:', e) }
        })()
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

      // 如果有需要妈妈行动的，同时生成待办
      if (input.requires_action || input.requires_payment) {
        await supabase.from('todo_items').insert({
          user_id: userId,
          title: `${input.title} - ${input.requires_action || '缴费'}`,
          category: 'education',
          priority: 'orange',
          status: 'pending',
          due_date: input.date_start,
          source: 'rian',
          one_tap_ready: true,
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

      // 更新当日健康状态
      if (input.current_status) {
        const { data: existing } = await supabase
          .from('child_daily_log')
          .select('id')
          .eq('child_id', childId)
          .eq('date', today)
          .single()
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

      // 复诊日期自动生成待办
      if (input.follow_up_date) {
        await supabase.from('todo_items').insert({
          user_id: userId,
          title: `复诊预约`,
          description: `${input.hospital || ''}${input.doctor_name ? ' - ' + input.doctor_name : ''}`,
          category: 'medical',
          priority: 'orange',
          status: 'pending',
          due_date: input.follow_up_date,
          source: 'rian',
          one_tap_ready: true,
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

      // 证件到期自动生成待办
      if (input.expiry_date) {
        await supabase.from('todo_items').insert({
          user_id: userId,
          title: `${input.title}到期续签`,
          category: 'compliance',
          priority: 'orange',
          status: 'pending',
          due_date: input.expiry_date,
          source: 'rian',
          one_tap_ready: true,
        })
      }
      return null
    }

    case 'add_shopping': {
      const childId = findChildId()
      for (const item of (input.items || [])) {
        const targetDate = item.event_date || today
        const childIdForItem = item.for_child ? findChildId(item.for_child) : childId
        const newItem = {
          name: item.name,
          category: item.category || 'prepare',
          status: 'pending',
          need_buy: item.need_buy || false,
        }
        const { data: existing } = await supabase
          .from('packing_lists')
          .select('id, items')
          .eq('child_id', childIdForItem)
          .eq('date', targetDate)
          .eq('user_id', userId)
          .single()
        if (existing) {
          const items = Array.isArray(existing.items) ? existing.items : []
          if (!items.some((i: any) => i.name === item.name)) {
            await supabase.from('packing_lists').update({ items: [...items, newItem] }).eq('id', existing.id)
          }
        } else {
          await supabase.from('packing_lists').insert({
            child_id: childIdForItem, user_id: userId,
            date: targetDate, items: [newItem],
          })
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
      }).catch(() => {
        // reminders 表结构可能不同，忽略错误
      })
      return null
    }

    case 'update_child_status': {
      const childId = findChildId(input.child_name)
      const { data: existing } = await supabase
        .from('child_daily_log')
        .select('id, notable_events')
        .eq('child_id', childId)
        .eq('date', today)
        .single()

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
        await supabase.from('child_daily_log').insert({
          child_id: childId, user_id: userId, date: today, ...updateData
        })
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

      // 更新兴趣权重
      for (const sig of (input.interest_signals || [])) {
        const { data: existing } = await supabase
          .from('interest_weights')
          .select('*')
          .eq('user_id', userId)
          .eq('topic', sig.topic)
          .single()
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

// ══ 主处理函数 ══
export async function POST(req: NextRequest) {
  try {
    const { content, input_type, file_url, user_id: body_user_id } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const activeUserId = body_user_id
    if (!activeUserId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Missing User Context' }, { status: 401 })
    }

    // 1. 存入 raw_inputs
    const { data: rawInput } = await supabase.from('raw_inputs').insert({
      user_id: activeUserId,
      input_type,
      raw_content: content,
      file_url: file_url || null,
      processed: false,
    }).select().single()

    // 2. 音频转文字
    let processedContent = content
    if (input_type === 'audio' && file_url) {
      const transcribed = await transcribeAudio(file_url)
      if (transcribed) {
        processedContent = transcribed
        await supabase.from('raw_inputs').update({ raw_content: transcribed }).eq('id', rawInput?.id)
      }
    }

    // 3. 并行：家庭档案 + Grok搜索
    const grokQuery = buildGrokQuery(processedContent || '')
    const [familyContext, grokInfo] = await Promise.all([
      getFamilyContext(supabase, activeUserId),
      grokQuery ? grokSearch(grokQuery) : Promise.resolve(''),
    ])

    // 获取孩子数据（用于 executeTool）
    const { data: childrenData } = await supabase
      .from('children')
      .select('id, name')
      .eq('user_id', activeUserId)

    // 4. 构建消息
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

    // 5. Claude 全智能分析
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
        system: `你是日安，清迈陪读家庭的全能AI管家。

## 家庭档案
${familyContext}

## 实时外部信息
${grokInfo || '暂无实时信息'}

## 你的工作方式
仔细分析用户的输入（文字/图片/语音转文字），理解其中所有需要跟进的信息，然后调用合适的工具记录。

## 工具使用原则
- 可以同时调用多个工具，每个工具处理不同的事情
- 一张校历图片可能需要调用10次 add_schedule + 2次 add_todo + 1次 add_shopping
- 一张病历可能需要调用 add_health + update_child_status + add_reminder（复诊提醒）
- 不确定的信息不要猜测，只记录明确的内容
- 图片中的每一个日期/事件都要单独调用工具记录，不要合并

## 图片处理
- 校历：识别每一行，每个事件单独调用 add_schedule
- 病历：调用 add_health 记录诊断，调用 update_child_status 更新状态
- 账单：调用 add_todo 设置缴费待办
- 通知：判断是否需要回复，是否有截止日期

今天日期：${new Date().toLocaleDateString('zh-CN')}`,
        messages,
        tools: TOOLS,
        tool_choice: { type: 'auto' },
      }),
    })

    const data = await response.json()
    console.log('Claude stop_reason:', data.stop_reason)

    // 6. 执行所有工具调用
    const toolUses = data.content?.filter((c: any) => c.type === 'tool_use') || []
    console.log(`Claude调用了 ${toolUses.length} 个工具`)

    const todoIds: string[] = []
    for (const toolUse of toolUses) {
      console.log(`执行工具: ${toolUse.name}`, JSON.stringify(toolUse.input).slice(0, 100))
      const todoId = await executeTool(
        supabase, toolUse.name, toolUse.input,
        activeUserId, rawInput?.id || null, childrenData || []
      )
      if (todoId) todoIds.push(todoId)
    }

    // 7. 标记已处理
    await supabase.from('raw_inputs').update({
      processed: true,
      extracted_events: toolUses.map((t: any) => ({ tool: t.name, input: t.input })),
    }).eq('id', rawInput?.id).eq('user_id', activeUserId)

    return NextResponse.json({
      ok: true,
      tools_called: toolUses.length,
      tool_names: toolUses.map((t: any) => t.name),
      todo_ids: todoIds,
    })

  } catch (e: any) {
    console.error('PROCESS ERROR:', e?.message || e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
