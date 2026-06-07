export const dynamic = 'force-dynamic'
// app/api/email/parse/route.ts
// 统一邮件解析入口：Make.com webhook + Gmail MCP定时扫描 都走这里

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addDaysToYmd, getTodayStr } from '@/lib/date/localDate'
import { fetchResidentCity } from '@/lib/family/resolveResidentCity'
import { AI_MODELS } from '@/lib/ai/models'
import { extractEmailWithAttachments } from '@/lib/email/gmailExtract'
import {
  extractFromAttachment,
  extractFromEmailBody,
  mergeExtractions,
} from '@/lib/email/pdfExtractor'
import { persistStructuredEmail } from '@/lib/email/syncStructuredEmail'
import {
  buildEmailExtractionFromClaude,
  persistEmailExtraction,
} from '@/lib/email/persistEmailExtraction'
import { getValidAccessToken } from '@/lib/google/tokenStore'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 结构化 Gmail + PDF 解析（Gemini，不存原文/附件）══════════════
async function processStructuredEmail(
  supabase: any,
  email: EmailInput,
  userId: string,
): Promise<{
  ok: true
  summary: string
  events_created: number
  todos_created: number
  has_attachments: boolean
} | null> {
  let extracted = {
    subject: email.subject,
    body: email.body,
    from: email.from,
    date: email.date,
    attachments: [] as Array<{ filename: string; mimeType: string; data: string }>,
  }

  if (email.source === 'mcp_scan' && email.message_id) {
    const token = await getValidAccessToken(userId, 'gmail')
    if (token) {
      try {
        extracted = await extractEmailWithAttachments(token, email.message_id)
      } catch (e) {
        console.warn('[email/parse] Gmail fetch failed, using payload body:', (e as Error).message)
      }
    }
  }

  const bodyExtraction = await extractFromEmailBody(extracted.body, extracted.subject)
  const attachmentExtractions = await Promise.all(
    extracted.attachments.map((att) =>
      extractFromAttachment(att.data, att.mimeType, att.filename, extracted.subject),
    ),
  )

  const merged = mergeExtractions([bodyExtraction, ...attachmentExtractions])
  const hasContent =
    merged.summaryParts.length > 0 ||
    merged.allEvents.length > 0 ||
    merged.allAmounts.length > 0 ||
    merged.allRequirements.length > 0

  if (!hasContent) return null

  const messageId = email.message_id || `${email.from}_${email.date}`
  const { eventsWritten, todosWritten } = await persistStructuredEmail(supabase, {
    userId,
    messageId,
    email: extracted,
    bodyExtraction,
    attachmentExtractions,
    merged,
  })

  return {
    ok: true,
    summary: merged.summaryParts.filter(Boolean).join('；') || extracted.subject,
    events_created: eventsWritten,
    todos_created: todosWritten,
    has_attachments: extracted.attachments.length > 0,
  }
}

// ══ Claude邮件解析Prompt ══════════════════════════════════════
function buildEmailPrompt(email: EmailInput, familyContext: string, city: string): string {
  const familyIntro = city ? `专为${city}陪读家庭` : '专为海外华人陪读家庭'
  return `你是日安，${familyIntro}服务的AI管家。

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

### ClassDojo / 家校平台
如果邮件来自 ClassDojo，识别：
- 老师发送的故事/作品（class story）
- 行为报告（behavior points）
- 老师留言（teacher message）
- 作业提醒
并提取为待办或校历事件

### 第二步：提取所有有价值的信息
对于每个事件，必须主动推断 requires_items（不要留空）：
- 体育课/运动会 → 运动鞋、水壶、运动服
- 游泳 → 泳衣、泳帽、毛巾
- 美术/手工 → 围裙、画笔
- 野餐/校外活动 → 午餐盒、饮料、防晒
- 考试 → 文具、准考证
- 家长会 → 无需携带
- 假期/活动通知 → 根据活动内容推断

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
  user_id?: string
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
    user_id: email.user_id || null,
    message_id: email.message_id || `${email.from}_${email.date}`,
    from_email: email.from,
    subject: result.summary || email.subject,
    email_type: result.is_school_related ? 'school' : result.email_type,
    is_school_related: result.is_school_related,
    processed_at: new Date().toISOString(),
    todos_created: result.todos?.length || 0,
    events_created: result.events?.length || 0,
    source: email.source,
  })
}

// ══ 获取家庭档案 ═════════════════════════════════════════════
async function getFamilyContext(supabase: any, userId: string): Promise<string> {
  if (!userId) return '{}'
  try {
    const [profile, children, places] = await Promise.all([
      supabase.from('family_profile').select('*').eq('user_id', userId).limit(1),
      supabase.from('children').select('id, name, school_name, school_email_domain, grade').eq('user_id', userId).limit(5),
      supabase.from('family_places').select('label, name').eq('user_id', userId).limit(10),
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
async function triggerCalendar(event: any, city = '') {
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
        location: event.location || city || '',
        dimension: 'education',
      }),
    })
  } catch (err) { console.error('Calendar trigger error:', err) }
}

// ══ 核心：把解析结果写入三珠 ═════════════════════════════════
async function syncEmailToThreeDrops(supabase: any, parsed: any, email: EmailInput, userId: string, city = '') {
  const uid = email.user_id || userId
  if (!uid) return

  const familyId = 'default'
  const today = getTodayStr()

  // 获取孩子 ID：仅该用户的子女（至多 5 人，默认取首位）
  const { data: children } = await supabase
    .from('children')
    .select('id, name, grade, school_name')
    .eq('user_id', uid)
    .limit(5)
  const childId = children?.[0]?.id || null

  // ── 1. 写入校历事件 ──────────────────────────────────────
  for (const event of (parsed.events || [])) {
    if (!event.title) continue

    // 写入 child_school_calendar
    if (childId && parsed.is_school_related) {
      await supabase.from('child_school_calendar').insert({
        user_id: uid,
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
    await triggerCalendar(event, city)
  }

  // ── 2. 写入待办 todo_items ───────────────────────────────
  for (const todo of (parsed.todos || [])) {
    if (!todo.title) continue

    const { data: todoItem } = await supabase.from('todo_items').insert({
      user_id: uid,
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
        user_id: uid,
        todo_id: todoItem.id,
        family_id: familyId,
        level: days >= 30 ? 1 : days >= 7 ? 2 : 3,
        trigger_days_before: days,
        trigger_date: addDaysToYmd(todo.due_date, -days),
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
        user_id: uid,
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
          user_id: uid,
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
          user_id: uid,
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
      user_id: uid,
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
    user_id: uid,
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
async function parseEmailWithClaude(email: EmailInput, familyContext: string, city: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODELS.claude.powerful,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: buildEmailPrompt(email, familyContext, city)
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
    const secret = req.headers.get('x-parse-secret') || req.headers.get('x-cron-secret')
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // ── 支持单封邮件或批量（MCP扫描可能一次发多封）──────
    const emails: EmailInput[] = Array.isArray(body) ? body : [body]
    const results = []

    for (const email of emails) {
      try {
        const userId = typeof email.user_id === 'string' ? email.user_id.trim() : ''
        if (!userId) {
          console.warn('邮件解析跳过：缺少 user_id', email.subject)
          results.push({ error: 'missing_user_id', subject: email.subject })
          continue
        }

        const { data: domainChildren } = await supabase
          .from('children')
          .select('school_email_domain')
          .eq('user_id', userId)
          .limit(20)
        const domains = (domainChildren || []).map((c: any) => c.school_email_domain).filter(Boolean)

        const familyContext = await getFamilyContext(supabase, userId)
        const city = await fetchResidentCity(supabase, userId)

        // 去重检查
        if (email.message_id) {
          const already = await isAlreadyProcessed(supabase, email.message_id)
          if (already) {
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
          results.push({ spam: true, subject: email.subject })
          continue
        }

        // ── 结构化 Gmail + PDF 解析（优先，不存原文/附件）──
        const structured = await processStructuredEmail(supabase, email, userId)
        if (structured) {
          results.push({
            ok: true,
            subject: email.subject,
            pipeline: 'structured',
            todos_created: structured.todos_created,
            events_created: structured.events_created,
            has_attachments: structured.has_attachments,
            summary: structured.summary,
          })
          continue
        }

        // ── 降级：Claude 全文解析（Make webhook 等无附件场景）──
        // Claude解析
        const parsed = await parseEmailWithClaude(email, familyContext, city)

        if (parsed.email_type === 'spam' || parsed.confidence < 0.3) {
          results.push({ spam: true, subject: email.subject })
          continue
        }

        // 写入统一邮件层
        const extraction = buildEmailExtractionFromClaude(parsed, email)
        const { eventsWritten, todosWritten } = await persistEmailExtraction(
          supabase,
          extraction,
          userId,
        )

        for (const event of parsed.events || []) {
          await triggerCalendar(event, city)
        }

        results.push({
          ok: true,
          subject: email.subject,
          pipeline: 'claude',
          todos_created: todosWritten,
          events_created: eventsWritten,
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
