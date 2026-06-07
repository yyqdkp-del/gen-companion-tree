import { createClient } from '@supabase/supabase-js'
import { CalendarService } from '@/lib/services/CalendarService'
import { ScheduleService } from '@/lib/services/ScheduleService'
import { TodoService, type TodoDimension } from '@/lib/services/TodoService'
import { AI_MODELS, geminiGenerateContentUrl } from '@/lib/ai/models'
import { getUserLocation } from '@/lib/geofence'
import { getTodayStr, getTodayStrInTimeZone } from '@/lib/date/localDate'
import {
  buildRootVisionContext,
  detectDocumentType,
  fetchImageForVision,
  processDocument,
  type RootVisionAction,
  type RootVisionResult,
} from '@/lib/ai/rootVision'
import { autoArchive, type AutoArchiveResult } from '@/lib/ai/autoArchive'
import { executeArchive } from '@/lib/ai/executeArchive'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

// ══ 工具定义（精简，降低 Claude 输入体积）══
const TOOLS = [
  {
    name: 'add_todo',
    description: '妈妈须主动办的事：缴费/预约/购买/签字。纯校历勿用。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        dimension: { type: 'string', enum: ['compliance', 'estate', 'logistics', 'education', 'social', 'wealth', 'medical', 'mobility', 'selfcare'] },
        who: { type: 'string' },
        due_date: { type: 'string' },
        repeat: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'weekdays'] },
        priority: { type: 'number', enum: [1, 2, 3], description: '1远 2中 3急' },
        notes: { type: 'string' },
        claude_advice: { type: 'string' },
        action_items: { type: 'array', items: { type: 'string' } },
        carry_items: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        search_keywords: { type: 'array', items: { type: 'string' } },
        ai_draft: { type: 'string' },
      },
      required: ['title', 'priority', 'dimension'],
    },
  },
  {
    name: 'add_schedule',
    description: '孩子校历。trip/activity 自动待办；有缴费填 requires_payment。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        child_name: { type: 'string' },
        date_start: { type: 'string', description: 'YYYY-MM-DD' },
        date_end: { type: 'string' },
        event_type: { type: 'string', enum: ['activity', 'exam', 'holiday', 'meeting', 'class', 'trip', 'other'] },
        location: { type: 'string' },
        description: { type: 'string' },
        requires_action: { type: 'string' },
        requires_items: { type: 'array', items: { type: 'string' } },
        requires_payment: { type: 'number' },
      },
      required: ['title', 'date_start', 'event_type'],
    },
  },
  {
    name: 'add_health',
    description: '病历/健康记录；图片必调。',
    input_schema: {
      type: 'object',
      properties: {
        child_name: { type: 'string' },
        date: { type: 'string' },
        type: { type: 'string', enum: ['visit', 'diagnosis', 'medication', 'vaccine', 'checkup', 'emergency', 'other'] },
        description: { type: 'string' },
        doctor_name: { type: 'string' },
        hospital: { type: 'string' },
        follow_up_date: { type: 'string' },
        notes: { type: 'string' },
        current_status: { type: 'string', enum: ['normal', 'sick', 'recovering'] },
        medication_taken: { type: 'boolean' },
      },
      required: ['type', 'description'],
    },
  },
  {
    name: 'add_document',
    description: '证件/签证/保险到期。',
    input_schema: {
      type: 'object',
      properties: {
        member_name: { type: 'string' },
        doc_type: { type: 'string', enum: ['passport', 'visa', 'insurance', 'license', 'contract', 'id', 'other'] },
        title: { type: 'string' },
        expiry_date: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['doc_type', 'title'],
    },
  },
  {
    name: 'add_shopping',
    description: '要买或要准备的物品。',
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
            required: ['name', 'need_buy'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'add_reminder',
    description: '定时/重复提醒。',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        trigger_date: { type: 'string', description: 'YYYY-MM-DD' },
        trigger_time: { type: 'string' },
        repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
        message: { type: 'string' },
      },
      required: ['title', 'trigger_date'],
    },
  },
  {
    name: 'update_child_status',
    description: '孩子今日健康/心情/睡眠。',
    input_schema: {
      type: 'object',
      properties: {
        child_name: { type: 'string', description: '必填' },
        health_status: { type: 'string', enum: ['normal', 'sick', 'recovering'] },
        health_notes: { type: 'string' },
        mood_status: { type: 'string', enum: ['happy', 'calm', 'anxious', 'upset'] },
        mood_notes: { type: 'string' },
        sleep_start: { type: 'string' },
        sleep_end: { type: 'string' },
        medication_taken: { type: 'boolean' },
        notable: { type: 'string' },
      },
      required: ['child_name'],
    },
  },
  {
    name: 'learn_pattern',
    description: '家庭习惯/兴趣规律。',
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
              signal_type: { type: 'string', enum: ['mention', 'question', 'action'] },
            },
          },
        },
      },
      required: ['pattern_type', 'description'],
    },
  },
]

// ══ Gemini 语音转文字 ══
async function transcribeAudio(fileUrl: string): Promise<string> {
  try {
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const response = await fetch(
      geminiGenerateContentUrl(process.env.GOOGLE_AI_API_KEY),
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
async function grokSearch(query: string, city = ''): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const systemPrompt = city
      ? `你是${city}本地情报员。用中文简洁回答，100字以内。`
      : '你是本地情报员。用中文简洁回答，100字以内。'
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [
          { role: 'system', content: systemPrompt },
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

type JobContext = {
  profile: { visa_type?: string; member_nationality?: string; resident_city?: string } | null
  children: { id: string; name: string; grade?: string; school_name?: string }[]
  todos: { title: string; due_date?: string; priority?: string }[]
}

async function loadJobContext(userId: string): Promise<JobContext> {
  const [profileRes, childrenRes, todosRes] = await Promise.all([
    supabase.from('family_profile').select('visa_type,member_nationality,resident_city').eq('user_id', userId).maybeSingle(),
    supabase.from('children').select('id,name,grade,school_name').eq('user_id', userId).limit(3),
    supabase.from('todo_items').select('title,due_date,priority').eq('user_id', userId).eq('status', 'pending').limit(5),
  ])
  return {
    profile: profileRes.data,
    children: childrenRes.data || [],
    todos: todosRes.data || [],
  }
}

/** system 用短上下文，控制在约 80 字内 */
function compactFamilySnippet(ctx: JobContext, today: string): string {
  const kids = ctx.children.map((c) => c.name).filter(Boolean).join('/') || '无'
  const visa = ctx.profile?.visa_type || ''
  return `孩:${kids}|待:${ctx.todos.length}|签:${visa}|今:${today}`
}

function buildWorkerSystemPrompt(ctx: JobContext, today: string): string {
  const snippet = compactFamilySnippet(ctx, today)
  return `日安管家。${snippet}。校历add_schedule(trip/activity自动待办)；须妈妈办add_todo；病历add_health；购物add_shopping；状态update_child_status。多工具可并行。`
}

// ══ Grok 触发判断 ══
function buildGrokQuery(content: string, city = ''): string | null {
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
  const prefix = city ? `今天${city}最新情况：` : '本地最新情况：'
  const parts = [prefix]
  if (matched.includes('medical')) parts.push('各大医院排队时间')
  if (matched.includes('weather')) parts.push('今明天气预报、空气质量')
  if (matched.includes('traffic')) parts.push('主要道路交通状况')
  if (matched.includes('visa')) parts.push('移民局最新政策、排队情况')
  if (matched.includes('school')) parts.push('学校最新通知')
  return parts.join('')
}

// ══ 触发 Make webhook ══
async function triggerMake(toolName: string, input: any, city = '') {
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
          location: input.location || city || '',
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
  childrenData: any[],
  today: string,
  city = '',
): Promise<string | null> {

  const findChildId = (name?: string) => {
    if (!name) return childrenData?.[0]?.id || null
    const found = childrenData.find((c: any) => c.name?.includes(name) || name?.includes(c.name))
    return found?.id || childrenData?.[0]?.id || null
  }

  switch (toolName) {

    case 'add_todo': {
      const priority = input.priority === 3 ? 'red' : input.priority === 2 ? 'orange' : 'yellow'
      const repeatAllowed = ['daily', 'weekly', 'monthly', 'weekdays'] as const
      const repeat =
        typeof input.repeat === 'string' && repeatAllowed.includes(input.repeat as (typeof repeatAllowed)[number])
          ? input.repeat
          : null
      const aiActionTypeMap: Record<string, string> = {
        compliance: 'fill_form', wealth: 'pay', medical: 'book',
        logistics: 'buy', mobility: 'navigate', social: 'whatsapp',
        estate: 'pay', education: 'send_email', selfcare: 'calendar',
      }

      const createResult = await TodoService.create({
        userId,
        title: input.title,
        description: input.claude_advice,
        dimension: input.dimension as TodoDimension,
        priority: priority as 'red' | 'orange' | 'yellow',
        dueDate: input.due_date || undefined,
        repeat: repeat || undefined,
        source: 'rian',
        sourceRefId: rawInputId || undefined,
        aiDraft: input.ai_draft || undefined,
        aiActionType: aiActionTypeMap[input.dimension] || undefined,
        aiActionData: {
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
          },
        },
        oneTapReady: false,
        client: supabase,
      })
      const todo = createResult.ok && createResult.id ? { id: createResult.id } : null

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

      await triggerMake(toolName, input, city)
      return todo?.id || null
    }

    case 'add_schedule': {
      const childId = findChildId(input.child_name)
      if (!childId) {
        console.warn('add_schedule: no child found, skipping')
        return null
      }
      await CalendarService.upsertEvent({
        userId,
        childId,
        title: input.title,
        dateStart: input.date_start,
        dateEnd: input.date_end || input.date_start,
        description: input.description || undefined,
        requiresActionText: input.requires_action || null,
        requiresItems: input.requires_items || [],
        requiresPayment: input.requires_payment || null,
        eventType: input.event_type || 'activity',
        source: 'rian',
        client: supabase,
      })
      // trip/activity 类型额外生成提醒待办
      if (input.event_type === 'trip' || input.event_type === 'activity') {
        await TodoService.create({
          userId,
          title: `📅 ${input.title}`,
          dueDate: input.date_start || undefined,
          dimension: 'education',
          priority: 'yellow',
          description: input.description || '',
          source: 'rian',
          client: supabase,
        })
      }
      // 只有明确需要缴费才生成待办
      if (input.requires_payment && input.requires_payment > 0) {
        await TodoService.create({
          userId,
          title: `${input.title} - 缴费 ฿${input.requires_payment}`,
          dimension: 'wealth',
          priority: 'orange',
          dueDate: input.date_start,
          source: 'rian',
          oneTapReady: false,
          client: supabase,
        })
      }
      await triggerMake(toolName, input, city)
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
        await TodoService.create({
          userId,
          title: `复诊预约${input.hospital ? ` - ${input.hospital}` : ''}`,
          dimension: 'medical',
          priority: 'orange',
          dueDate: input.follow_up_date,
          source: 'rian',
          oneTapReady: false,
          client: supabase,
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
        await TodoService.create({
          userId,
          title: `${input.title}到期续签`,
          dimension: 'compliance',
          priority: 'orange',
          dueDate: input.expiry_date,
          source: 'rian',
          oneTapReady: false,
          client: supabase,
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
      void Promise.resolve(
        supabase.from('reminders').insert({
          user_id: userId,
          title: input.title,
          trigger_date: input.trigger_date,
          message: input.message || input.title,
          status: 'pending',
        }),
      ).catch((e) => console.warn('silent catch:', e))
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
      const cycleDays = input.cycle_days as number | undefined
      const description = String(input.description || '')
      const notes = cycleDays
        ? `${description}（周期约${cycleDays}天）`.trim()
        : description

      await supabase.from('family_habits').insert({
        user_id: userId,
        habit_type: input.pattern_type,
        pattern_type: input.pattern_type,
        notes,
      })
      for (const sig of (input.interest_signals || [])) {
        const { data: existing } = await supabase.from('interest_weights').select('*').eq('user_id', userId).eq('topic', sig.topic).single()
        if (existing) {
          await supabase.from('interest_weights').update({
            weight: Math.min(100, existing.weight + (sig.weight_delta || 1)),
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id)
        } else {
          await supabase.from('interest_weights').insert({
            user_id: userId,
            topic: sig.topic,
            weight: 10 + (sig.weight_delta || 1),
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
async function preheatGrok(todoIds: string[], toolUses: any[], city = '') {
  const todoTools = toolUses.filter(t => t.name === 'add_todo')
  const locationSuffix = city ? `，${city}本地最新情况` : '，本地最新情况'
  for (let i = 0; i < todoTools.length; i++) {
    const todoId = todoIds[i]
    const keywords = todoTools[i].input.search_keywords
    if (!todoId || !keywords?.length) continue
    try {
      const grokResult = await grokSearch(keywords.join('，') + locationSuffix, city)
      if (!grokResult) continue
      const { data: todo } = await supabase.from('todo_items').select('ai_action_data').eq('id', todoId).single()
      await supabase.from('todo_items').update({
        ai_action_data: { ...(todo?.ai_action_data || {}), grok_result: grokResult },
        one_tap_ready: true, // 预热完成，一键办可用
      }).eq('id', todoId)
    } catch (e) { console.error('Grok预热失败:', e) }
  }
}

function isSchoolParsing(inputType: string, processedContent: string, toolUses: any[]) {
  if (inputType !== 'image' && inputType !== 'document') return false

  const text = `${processedContent || ''} ${toolUses.map((tool: any) => `${tool.name} ${tool.input?.title || ''} ${tool.input?.description || ''}`).join(' ')}`.toLowerCase()
  return toolUses.some((tool: any) => tool.name === 'add_schedule') ||
    ['school', 'academy', '校', '学校', '家长会', 'field trip', 'exam', 'term', 'class', 'classdojo', 'dojo', 'class story', 'portfolio'].some((keyword) => text.includes(keyword))
}

function buildSchoolParsingSummary(toolUses: any[]) {
  const titles = toolUses
    .map((tool: any) => tool.input?.title || tool.input?.description)
    .filter(Boolean)
    .slice(0, 3)

  return titles.length
    ? `学校通知解析：${titles.join('、')}`
    : '学校通知图片解析'
}

async function recordSchoolParsingHistory(userId: string, jobId: string, inputType: string, processedContent: string, toolUses: any[], todosCreated: number) {
  if (!isSchoolParsing(inputType, processedContent, toolUses)) return

  const { error } = await supabase.from('processed_emails').insert({
    user_id: userId,
    message_id: `raw_input_${jobId}`,
    subject: buildSchoolParsingSummary(toolUses),
    email_type: 'school',
    is_school_related: true,
    processed_at: new Date().toISOString(),
    todos_created: todosCreated,
    events_created: toolUses.filter((tool: any) => tool.name === 'add_schedule').length,
    source: 'school_upload',
  })

  if (error) {
    console.error('学校解析历史记录失败:', error.message)
  }
}

/** 根的眼睛 → 写入建议动作 */
async function executeRootVisionActions(
  actions: RootVisionAction[],
  userId: string,
  jobId: string,
  childrenData: any[],
  today: string,
  city: string,
): Promise<string[]> {
  const todoIds: string[] = []
  const childId = childrenData?.[0]?.id

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'save_schedule': {
          if (!childId || !action.data) break
          await ScheduleService.save(
            childId,
            userId,
            action.data as Record<string, unknown[]>,
            'rian',
            { enrich: false, client: supabase },
          )
          break
        }

        case 'add_todo': {
          const t = action.data as { action?: string; deadline?: string; required?: string }
          const id = await executeTool('add_todo', {
            title: t?.action || action.label,
            dimension: 'education',
            priority: 2,
            due_date: t?.deadline || undefined,
            notes: t?.required || undefined,
            claude_advice: action.label,
          }, userId, jobId, childrenData, today, city)
          if (id) todoIds.push(id)
          break
        }

        case 'save_medical': {
          const med = action.data as {
            diagnosis?: Record<string, unknown>
            medications?: unknown[]
            followup?: Record<string, unknown>
          }
          const d = med?.diagnosis || {}
          const follow = med?.followup || {}
          await executeTool('add_health', {
            type: 'visit',
            description: String(d.diagnosis || action.label),
            doctor_name: d.doctor ? String(d.doctor) : undefined,
            hospital: d.hospital ? String(d.hospital) : undefined,
            date: d.date ? String(d.date) : today,
            follow_up_date: follow.followupDate ? String(follow.followupDate) : undefined,
            notes: [
              med.medications?.length ? `药物 ${med.medications.length} 种` : '',
              follow.instructions ? String(follow.instructions) : '',
            ].filter(Boolean).join('；') || undefined,
          }, userId, jobId, childrenData, today, city)
          break
        }

        case 'save_document': {
          const doc = action.data as Record<string, unknown>
          await executeTool('add_document', {
            doc_type: String(doc.type || 'passport'),
            title: String(doc.name || action.label),
            member_name: doc.name ? String(doc.name) : undefined,
            expiry_date: doc.expiryDate ? String(doc.expiryDate) : undefined,
            notes: doc.passportNumber ? `证件号 ${doc.passportNumber}` : undefined,
          }, userId, jobId, childrenData, today, city)
          break
        }

        case 'add_reminder':
        case 'add_payment_reminder': {
          const payload = action.data as Record<string, unknown>
          const triggerDate =
            String(payload.followupDate || payload.expiryDate || payload.date || today).slice(0, 10)
          await executeTool('add_reminder', {
            title: action.label,
            trigger_date: triggerDate,
            message: String(payload.instructions || payload.total || action.label),
          }, userId, jobId, childrenData, today, city)
          break
        }

        default:
          console.warn('[rootVision] unknown action type:', action.type)
      }
    } catch (e) {
      console.error('[rootVision] action failed:', action.type, e)
    }
  }

  return todoIds
}

// ══ 处理单个 job ══
export async function processJob(job: any) {
  const { id: jobId, user_id: userId, input_type, raw_content, file_url } = job

  try {
    const [, loc, jobCtx] = await Promise.all([
      supabase.from('raw_inputs').update({ status: 'processing' }).eq('id', jobId),
      getUserLocation(userId).catch(() => null),
      loadJobContext(userId),
    ])
    const today = loc ? getTodayStrInTimeZone(loc.timezone) : getTodayStr()
    const childrenData = jobCtx.children
    const city = loc?.city || jobCtx.profile?.resident_city || ''

    let processedContent = raw_content
    if (input_type === 'audio' && file_url) {
      const transcribed = await transcribeAudio(file_url)
      if (transcribed) {
        processedContent = transcribed
        void supabase.from('raw_inputs').update({ raw_content: transcribed }).eq('id', jobId)
      }
    }

    let rootVisionResult: RootVisionResult | null = null
    let rootVisionTodoIds: string[] = []
    let archivePending: AutoArchiveResult | null = null
    let autoArchived = false

    if ((input_type === 'image' || input_type === 'document') && file_url && process.env.GOOGLE_AI_API_KEY) {
      try {
        const { base64, mimeType } = await fetchImageForVision(file_url)
        const activeChildId = childrenData?.[0]?.id

        const detection = await detectDocumentType(base64, mimeType)
        rootVisionResult = await processDocument(base64, mimeType, detection)

        const archiveResult = await autoArchive(
          detection,
          rootVisionResult.data,
          userId,
          activeChildId,
        )

        if (archiveResult.requiresConfirm) {
          archivePending = archiveResult
          rootVisionResult = {
            ...rootVisionResult,
            summary: archiveResult.summary,
          }
          console.log('[rootVision] pending confirm:', archiveResult.archiveType, archiveResult.summary)
        } else {
          await executeArchive(archiveResult, userId)
          autoArchived = true
          rootVisionResult = {
            ...rootVisionResult,
            summary: archiveResult.summary,
          }
          console.log('[rootVision] auto archived:', archiveResult.archiveType, archiveResult.summary)
        }
      } catch (e) {
        console.error('[rootVision] auto archive failed:', e)
      }
    }

    if (
      rootVisionResult &&
      !archivePending &&
      !autoArchived &&
      rootVisionResult.actions.length > 0
    ) {
      try {
        rootVisionTodoIds = await executeRootVisionActions(
          rootVisionResult.actions,
          userId,
          jobId,
          childrenData,
          today,
          city,
        )
      } catch (e) {
        console.error('[rootVision] executeRootVisionActions failed:', e)
      }
    }

    const visionContext = rootVisionResult ? `\n\n${buildRootVisionContext(rootVisionResult)}` : ''
    const archiveContext = archivePending
      ? `\n\n【待确认归档】${archivePending.summary}。请告知用户确认保存或选择孩子，不要重复写入数据库。`
      : autoArchived && rootVisionResult
        ? `\n\n【已自动归档】${rootVisionResult.summary}`
        : ''

    const messages: any[] = []
    if (input_type === 'image' && file_url) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: file_url } },
          {
            type: 'text',
            text: `${rootVisionResult?.summary || processedContent || '提取事件/日程/健康，逐条调工具'}${visionContext}${archiveContext}\n\n请根据根的眼睛结构化结果补充或确认待办/校历/健康记录，逐条调工具。`,
          },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: `${processedContent || ''}${visionContext}${archiveContext}`.trim() || processedContent,
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODELS.claude.default,
        max_tokens: 800,
        system: buildWorkerSystemPrompt(jobCtx, today),
        messages,
        tools: TOOLS,
        tool_choice: { type: 'auto' },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Claude API error:', response.status, data)
      await supabase.from('raw_inputs').update({
        status: 'failed',
        processed: false,
      }).eq('id', jobId)
      return
    }
    const toolUses = data.content?.filter((c: any) => c.type === 'tool_use') || []

    const todoIdResults = await Promise.all(
      toolUses.map((toolUse: { name: string; input: any }) =>
        executeTool(toolUse.name, toolUse.input, userId, jobId, childrenData, today, city),
      ),
    )
    const todoIds = [
      ...rootVisionTodoIds,
      ...todoIdResults.filter((id): id is string => Boolean(id)),
    ]

    void recordSchoolParsingHistory(userId, jobId, input_type, processedContent || '', toolUses, todoIds.length)
    void preheatGrok(todoIds, toolUses, city).catch((e) => console.error('预热失败:', e))

    await supabase.from('raw_inputs').update({
      processed: true,
      status: 'done',
      completed_at: new Date().toISOString(),
      extracted_events: [
        ...(archivePending
          ? [{
              tool: 'confirm_archive',
              input: archivePending,
              actions: [
                { label: '确认保存', type: 'confirm' },
                { label: '选择孩子', type: 'select_child' },
              ],
            }]
          : []),
        ...(autoArchived && rootVisionResult
          ? [{ tool: 'archived', input: { summary: rootVisionResult.summary, docType: rootVisionResult.docType } }]
          : []),
        ...(rootVisionResult && !archivePending && !autoArchived
          ? [{ tool: 'root_vision', input: rootVisionResult }]
          : []),
        ...toolUses.map((t: any) => ({ tool: t.name, input: t.input })),
      ],
    }).eq('id', jobId)

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

/** /api/rian/process 写入 raw_inputs 后直接调用，不经过 HTTP / cron secret */
export async function runProcessJobById(jobId: string): Promise<boolean> {
  const { data: job } = await supabase
    .from('raw_inputs')
    .select('*')
    .eq('id', jobId)
    .single()
  if (!job) {
    console.warn('runProcessJobById: job not found', jobId)
    return false
  }
  if (job.status !== 'queued') {
    console.warn('runProcessJobById: skip non-queued', jobId, job.status)
    return false
  }
  await processJob(job)
  return true
}

/** cron worker：批量消费 queued 队列 */
export async function drainQueuedJobs(limit = 3) {
  const { data: jobs } = await supabase
    .from('raw_inputs')
    .select('*')
    .eq('status', 'queued')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!jobs?.length) return [] as any[]

  for (const job of jobs) {
    await processJob(job)
  }
  return jobs
}
