export const dynamic = 'force-dynamic'
// app/api/email/parse/route.ts
// 统一邮件解析入口：Make.com webhook + Gmail MCP定时扫描 都走这里

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ Claude邮件解析Prompt ══════════════════════════════════════
function buildEmailPrompt(email: EmailInput, familyContext: string): string {
  return `你是日安，专为清迈陪读家庭服务的AI管家。

## 家庭档案
${familyContext}

## 收到一封邮件
发件人：${email.from}
主题：${email.subject}
时间：${email.date}
正文：
${email.body}

## 你的任务

### 第一步：判断邮件类型
分析这封邮件属于哪种类型：
- school_notification（学校通知：活动/假期/课表/成绩/缴费/家长会）
- school_urgent（学校紧急：健康通报/安全事件/临时停课）
- visa_compliance（签证移民相关）
- medical（医疗健康）
- finance（账单/缴费/保险）
- shopping（购物/快递）
- other（其他）
- spam（垃圾邮件，不处理）

### 第二步：提取所有有价值的信息

严格只输出JSON，不加其他文字：
{
  "email_type": "school_notification|school_urgent|visa_compliance|medical|finance|shopping|other|spam",
  "is_school_related": true|false,
  "confidence": 0.0-1.0,
  "language": "zh|en|th",
  "summary": "一句话摘要（闺蜜语气）",
  
  "events": [
    {
      "title": "事件标题",
      "category": "activity|exam|holiday|payment|meeting|health|other",
      "date_start": "YYYY-MM-DD或null",
      "date_end": "YYYY-MM-DD或null",
      "time": "HH:MM或null",
      "location": "地点或null",
      "description": "详细描述",
      "requires_action": "妈妈需要做什么（具体行动）",
      "requires_items": ["需要带/准备的物品"],
      "requires_payment": 金额数字或null,
      "payment_deadline": "YYYY-MM-DD或null",
      "deadline": "YYYY-MM-DD或null",
      "priority": 1|2|3
    }
  ],
  
  "todos": [
    {
      "title": "待办标题",
      "priority": "red|orange|yellow|green",
      "category": "education|compliance|wealth|medical|logistics|social",
      "due_date": "YYYY-MM-DD或null",
      "ai_draft": "AI起草的回复草稿（如果需要回复）或null",
      "ai_action_type": "send_email|pay|book|buy|fill_form|sign|null",
      "one_tap_ready": true|false,
      "benefit": "现在行动的好处（三级提醒用）",
      "reminder_days": [90, 30, 7]或null
    }
  ],

  "child_updates": {
    "has_update": true|false,
    "schedule_add": {
      "title": "",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "location": "",
      "requires_action": "",
      "requires_items": []
    },
    "packing_needs": [
      {"item": "", "event_date": "YYYY-MM-DD", "category": "buy|find|prepare|wear", "need_buy": true}
    ],
    "health_alert": null
  },

  "hotspot": {
    "create": true|false,
    "urgency": "urgent|important|lifestyle",
    "category": "education|safety|health|finance",
    "summary": "闺蜜语气的热点摘要",
    "relevance_reason": "为什么和这个家庭有关",
    "action_available": true|false,
    "action_type": "reply_email|pay|calendar|null"
  },

  "reply_needed": true|false,
  "reply_draft": "如果需要回复，这里是AI起草的完整回复草稿",
  "reply_to": "${email.from}",
  "reply_subject": "Re: ${email.subject}"
}

## 判断规则
- 学校域名邮件 → is_school_related = true
- 涉及日期的活动 → 写入 events
- 需要妈妈行动的 → 写入 todos，one_tap_ready = true
- 需要回复的学校邮件 → reply_needed = true，生成草稿
- 紧急事项（priority=3）→ hotspot.urgency = urgent
- 垃圾邮件 → email_type = spam，其余字段空
- 今天日期：${new Date().toLocaleDateString('zh-CN')}`
}

// ══ 类型定义 ═════════════════════════════════════════════════
type EmailInput = {
  from: string
  subject: string
  body: string
  date: string
  message_id?: string
  thread_id?: string
  labels?: string[]
  source: 'make' | 'mcp_scan'
}

// ══ 检查邮件是否已处理（去重）═══════════════════════════════
async function isAlreadyProcessed(supabase: any, messageId: string): Promise<boolean> {
  if (!messageId) return false
  const { data } = await supabase
    .from('processed_emails')
    .select('id')
    .eq('message_id', messageId)
    .single()
  return !!data
}

// ══ 记录已处理邮件 ═══════════════════════════════════════════
async function markAsProcessed(supabase: any, email: EmailInput, result: any) {
  await supabase.from('processed_emails').insert({
    message_id: email.message_id || `${email.from}_${email.date}`,
    from_email: email.from,
    subject: email.subject,
    email_type: result.email_type,
    is_school_related: result.is_school_related,
    processed_at: new Date().toISOString(),
    todos_created: result.todos?.length || 0,
    events_created: result.events?.length || 0,
    source: email.source,
  })
}

// ══ 获取家庭档案 ═════════════════════════════════════════════
async function getFamilyContext(supabase: any): Promise<string> {
  try {
    const [profile, children, places] = await Promise.all([
      supabase.from('family_profile').select('*').limit(1),
      supabase.from('children').select('id, name, school_name, school_email_domain, grade').limit(5),
      supabase.from('family_places').select('label, name').limit(10),
    ])
    return JSON.stringify({
      profile: profile.data?.[0] || {},
      children: children.data || [],
      places: places.data || [],
    })
  } catch { return '{}' }
}

// ══ 判断是否是学校邮件（快速预判，节省Claude token）════════
function quickSchoolCheck(email: EmailInput, childrenDomains: string[]): boolean {
  const fromLower = email.from.toLowerCase()
  const subjectLower = email.subject.toLowerCase()

  // 已知学校域名
  if (childrenDomains.some(d => d && fromLower.includes(d.toLowerCase()))) return true

  // 通用学校关键词
  const schoolKeywords = [
    'school', 'academy', 'college', 'kindergarten', 'nursery',
    'lanna', 'prem', 'maerim', 'international',
    '学校', '幼儿园', '通知', '家长', 'parent', 'student'
  ]
  return schoolKeywords.some(k => fromLower.includes(k) || subjectLower.includes(k))
}

// ══ 触发Make.com日历写入 ════════════════════════════════════
async function triggerCalendar(event: any) {
  if (!MAKE_WEBHOOK_URL || !event.date_start) return
  try {
    const start = new Date(event.date_start + (event.time ? `T${event.time}:00` : 'T09:00:00'))
    const end = new Date(start)
    end.setHours(end.getHours() + 2)
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'calendar',
        title: event.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        description: [
          event.description,
          event.requires_action ? `行动：${event.requires_action}` : null,
          event.requires_items?.length ? `携带：${event.requires_items.join('、')}` : null,
          event.requires_payment ? `缴费：${event.requires_payment}铢` : null,
        ].filter(Boolean).join('\n'),
        location: event.location || '清迈',
        dimension: 'education',
      }),
    })
  } catch (err) { console.error('Calendar trigger error:', err) }
}

// ══ 核心：把解析结果写入三珠 ═════════════════════════════════
async function syncEmailToThreeDrops(supabase: any, parsed: any, email: EmailInput) {
  const familyId = 'default'
  const today = new Date().toISOString().split('T')[0]

  // 获取孩子ID
  const { data: children } = await supabase.from('children').select('id, name').limit(5)
  const childId = children?.[0]?.id || null

  // ── 1. 写入校历事件 ──────────────────────────────────────
  for (const event of (parsed.events || [])) {
    if (!event.title) continue

    // 写入 child_school_calendar
    if (childId && parsed.is_school_related) {
      await supabase.from('child_school_calendar').insert({
        child_id: childId,
        event_type: event.category || 'activity',
        title: event.title,
        date_start: event.date_start || today,
        date_end: event.date_end || event.date_start || today,
        description: event.description,
        requires_action: event.requires_action,
        requires_items: event.requires_items || [],
        requires_payment: event.requires_payment || null,
        source: 'email',
        confidence: parsed.confidence || 0.9,
      })
    }

    // 触发Make日历
    await triggerCalendar(event)
  }

  // ── 2. 写入待办 todo_items ───────────────────────────────
  for (const todo of (parsed.todos || [])) {
    if (!todo.title) continue

    const { data: todoItem } = await supabase.from('todo_items').insert({
      family_id: familyId,
      title: todo.title,
      description: `来自邮件：${email.subject}`,
      category: todo.category || 'education',
      priority: todo.priority || 'yellow',
      status: 'pending',
      due_date: todo.due_date || null,
      source: 'email',
      ai_draft: todo.ai_draft || null,
      ai_action_type: todo.ai_action_type || null,
      one_tap_ready: todo.one_tap_ready || false,
      ai_action_data: {
        reply_to: parsed.reply_to,
        reply_subject: parsed.reply_subject,
        email_source: email.message_id,
      },
    }).select().single()

    // 三级提醒链
    if (todoItem && todo.due_date && todo.reminder_days) {
      const reminderInserts = todo.reminder_days.map((days: number) => ({
        todo_id: todoItem.id,
        family_id: familyId,
        level: days >= 30 ? 1 : days >= 7 ? 2 : 3,
        trigger_days_before: days,
        trigger_date: new Date(new Date(todo.due_date).getTime() - days * 86400000).toISOString().split('T')[0],
        status: 'pending',
        benefit_description: todo.benefit || '提前处理更从容',
      }))
      await supabase.from('reminder_chains').insert(reminderInserts)
    }
  }

  // ── 3. 更新孩子状态 child_daily_log ─────────────────────
  if (childId && parsed.child_updates?.has_update) {
    const cu = parsed.child_updates

    // 新增校历事件
    if (cu.schedule_add?.title) {
      await supabase.from('child_school_calendar').insert({
        child_id: childId,
        event_type: 'activity',
        title: cu.schedule_add.title,
        date_start: cu.schedule_add.date || today,
        description: cu.schedule_add.requires_action,
        requires_action: cu.schedule_add.requires_action,
        requires_items: cu.schedule_add.requires_items || [],
        source: 'email',
      })
    }

    // 健康预警
    if (cu.health_alert) {
      const { data: existing } = await supabase
        .from('child_daily_log').select('id')
        .eq('child_id', childId).eq('date', today).single()
      if (existing) {
        await supabase.from('child_daily_log').update({
          health_notes: cu.health_alert,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('child_daily_log').insert({
          child_id: childId,
          date: today,
          health_notes: cu.health_alert,
        })
      }
    }

    // 携带清单
    for (const need of (cu.packing_needs || [])) {
      if (!need.event_date || !need.item) continue
      const newItem = {
        name: need.item,
        category: need.category || 'prepare',
        status: 'pending',
        need_buy: need.need_buy || false,
        reminder_15d_sent: false,
        reminder_7d_sent: false,
        reminder_1d_sent: false,
        reminder_day_sent: false,
      }
      const { data: existing } = await supabase
        .from('packing_lists').select('id, items')
        .eq('child_id', childId).eq('date', need.event_date).single()
      if (existing) {
        const items = Array.isArray(existing.items) ? existing.items : []
        if (!items.some((i: any) => i.name === need.item)) {
          await supabase.from('packing_lists').update({ items: [...items, newItem] }).eq('id', existing.id)
        }
      } else {
        await supabase.from('packing_lists').insert({
          child_id: childId,
          date: need.event_date,
          items: [newItem],
        })
      }
    }
  }

  // ── 4. 写入热点 hotspot_items ────────────────────────────
  if (parsed.hotspot?.create) {
    await supabase.from('hotspot_items').insert({
      family_id: familyId,
      category: parsed.hotspot.category || 'education',
      urgency: parsed.hotspot.urgency || 'important',
      title: `📧 ${email.subject}`,
      summary: parsed.hotspot.summary || parsed.summary,
      relevance_reason: parsed.hotspot.relevance_reason || '学校来信',
      action_available: parsed.hotspot.action_available || false,
      action_type: parsed.hotspot.action_type || null,
      action_data: {
        reply_draft: parsed.reply_draft,
        reply_to: parsed.reply_to,
        reply_subject: parsed.reply_subject,
        message_id: email.message_id,
      },
      status: 'unread',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  // ── 5. 记录邮件学校通信历史 ─────────────────────────────
  await supabase.from('child_school_comms').insert({
    child_id: childId,
    email_from: email.from,
    email_subject: email.subject,
    email_date: email.date,
    email_type: parsed.email_type,
    summary: parsed.summary,
    reply_needed: parsed.reply_needed || false,
    reply_draft: parsed.reply_draft || null,
    processed_at: new Date().toISOString(),
    source: email.source,
  }).catch(() => {}) // 表不存在时静默失败，不影响主流程
}

// ══ Claude解析邮件 ═══════════════════════════════════════════
async function parseEmailWithClaude(email: EmailInput, familyContext: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: buildEmailPrompt(email, familyContext)
      }],
    }),
  })
  const data = await response.json()
  const raw = data.content?.[0]?.text || '{}'
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
}

// ══════════════════════════════════════════════════════════════
// POST 处理器（Make.com webhook + MCP扫描 共用）
// ══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // ── 支持单封邮件或批量（MCP扫描可能一次发多封）──────
    const emails: EmailInput[] = Array.isArray(body) ? body : [body]
    const results = []

    // 获取孩子学校域名（用于快速预判）
    const { data: children } = await supabase
      .from('children').select('school_email_domain').limit(5)
    const domains = (children || []).map((c: any) => c.school_email_domain).filter(Boolean)

    // 获取家庭档案（只查一次）
    const familyContext = await getFamilyContext(supabase)

    for (const email of emails) {
      try {
        // 去重检查
        if (email.message_id) {
          const already = await isAlreadyProcessed(supabase, email.message_id)
          if (already) {
            console.log('邮件已处理，跳过:', email.subject)
            results.push({ skipped: true, subject: email.subject })
            continue
          }
        }

        // 快速判断：是否值得送给Claude
        const looksImportant = quickSchoolCheck(email, domains) ||
          email.subject.includes('invoice') || email.subject.includes('payment') ||
          email.subject.includes('urgent') || email.subject.includes('紧急') ||
          email.subject.includes('通知') || email.subject.includes('缴费')

        // 垃圾邮件直接跳过（节省token）
        const spamIndicators = ['unsubscribe', 'newsletter', 'promotion', 'deal', 'offer']
        const isSpam = spamIndicators.some(s =>
          email.subject.toLowerCase().includes(s) ||
          email.body.toLowerCase().includes(s)
        ) && !looksImportant

        if (isSpam) {
          console.log('疑似垃圾邮件，跳过:', email.subject)
          results.push({ spam: true, subject: email.subject })
          continue
        }

        // Claude解析
        console.log('解析邮件:', email.subject)
        const parsed = await parseEmailWithClaude(email, familyContext)
        console.log('解析结果类型:', parsed.email_type, '置信度:', parsed.confidence)

        if (parsed.email_type === 'spam' || parsed.confidence < 0.3) {
          results.push({ spam: true, subject: email.subject })
          continue
        }

        // 写入三珠
        await syncEmailToThreeDrops(supabase, parsed, email)

        // 记录已处理
        await markAsProcessed(supabase, email, parsed)

        results.push({
          ok: true,
          subject: email.subject,
          type: parsed.email_type,
          todos_created: parsed.todos?.length || 0,
          events_created: parsed.events?.length || 0,
          reply_needed: parsed.reply_needed,
          summary: parsed.summary,
        })

      } catch (emailErr: any) {
        console.error('单封邮件处理失败:', email.subject, emailErr.message)
        results.push({ error: emailErr.message, subject: email.subject })
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results })

  } catch (e: any) {
    console.error('EMAIL PARSE ERROR:', e?.message || e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
