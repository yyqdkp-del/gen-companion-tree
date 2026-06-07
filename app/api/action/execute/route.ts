export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { checkLimit, recordUsage } from '@/lib/limits/usage'
import { fetchFormTemplates, enrichActionsWithFormTemplates } from '@/lib/action/enrichPDF'
import { buildExecutionPackFromPlan, planAndExecute } from '@/lib/action/executionPlanner'
import { familyServicePromptLabel, resolveResidentCityFromFamilyData } from '@/lib/family/resolveResidentCity'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ══ 维度映射 ══
const EVENT_TYPE_DIMENSION: Record<string, string> = {
  exam:     'education',
  class:    'education',
  meeting:  'education',
  activity: 'education',
  trip:     'mobility',
  holiday:  'mobility',
  medical:  'medical',
  other:    'education',
}

const DIMENSION_DATA_NEEDED: Record<string, string[]> = {
  education:  ['children', 'places'],
  mobility:   ['children', 'places', 'passport', 'vehicles'],
  medical:    ['children', 'medical', 'places', 'health'],
  compliance: ['passport', 'visa', 'address'],
  wealth:     ['finance', 'places'],
  logistics:  ['places'],
  estate:     ['places', 'address'],
  social:     ['places'],
  selfcare:   ['habits'],
}

const DIMENSION_GUIDES: Record<string, string> = {
  compliance: '签证/证件：核对护照有效期、签证类型到期日、材料清单、移民局地址导航、排队时间、携带清单、费用缴费方式、机构电话',
  medical:    '医疗：推荐科室医院、地址电话导航、携带物品、三语问诊描述、过敏史用药、等待时间、预约电话',
  education:  '学校：学校联系方式、回复邮件草稿、材料清单、缴费方式、家长会日历、携带清单',
  wealth:     '财务：实时汇率、最优缴费渠道、缴费步骤、实际金额含手续费、截止风险',
  mobility:   '出行：路况AQI、最优出发时间、导航直链、顺路事项、护照签证检查、交通方式；车辆：年检/车险到期、事故理赔电话与材料',
  logistics:  '采购：购买渠道价格对比、最近店铺导航、购物清单、代购渠道',
  estate:     '房产：物业联系方式、缴费账号、维修推荐、沟通模板',
  social:     '社交：餐厅活动推荐、礼品购买、三语祝福语、预算建议',
  selfcare:   '自我：课程社群推荐、计划表、习惯提醒',
}

const EXECUTION_PACK_SCHEMA = `严格只输出JSON，不加任何其他文字：
{
  "summary": "2-3句话总结最重要的信息，闺蜜语气",
  "primary_action_index": 0,
  "primary_action_reason": "为什么现在先做这个，一句话，用你称呼妈妈",
  "checklist": [{"item": "名称", "status": "ready|missing|optional", "note": "说明"}],
  "actions": [
    {
      "type": "navigate|call|email|whatsapp|calendar|download_pdf|open_url|pay|buy",
      "label": "按钮文字",
      "data": {
        "url": "链接",
        "destination": "目的地名称",
        "phone": "电话含国家代码",
        "email_to": "收件人",
        "email_subject": "主题",
        "email_body": "正文",
        "calendar_title": "日历标题",
        "calendar_date": "YYYY-MM-DD",
        "calendar_time": "HH:MM",
        "calendar_end_time": "HH:MM（可选，默认开始+2小时）",
        "calendar_location": "地点",
        "start_time": "可选，ISO8601；若填则优先生效",
        "end_time": "可选，ISO8601",
        "description": "日程说明（可选）",
        "recurrence": "RRULE:FREQ=WEEKLY;BYDAY=WE（重复日程时填写，如每周三；无重复则省略）",
        "message": "消息内容",
        "note": "说明",
        "item": "商品名",
        "channel": "lazada|shopee",
        "form_type": "TM7|medical_form|school_form"
      }
    }
  ],
  "draft": "草稿邮件或消息内容",
  "depart_suggestion": "建议出发时间",
  "cost_estimate": "预估费用",
  "risk_warnings": ["风险提示"],
  "carry_items": ["携带物品"]
}
若日程为固定周期重复（如每周三游泳课），calendar 类 action 的 data 必须包含 recurrence（RRULE 单行字符串，如 RRULE:FREQ=WEEKLY;BYDAY=WE）。

【车辆与事故】若待办/意图涉及车险、交通事故、理赔、车辆年检：checklist 应覆盖现场安全、取证、报警保险、理赔材料；actions 含 call（保险/救援电话）、navigate（维修厂或警局）、download_pdf（理赔表若有 form_type）；可在 brain_instruction.family_data_needed 中加入 "vehicles" 以拉取车辆档案。

【旅行与机票】若涉及旅行、假期、酒店、机票：actions 应含 open_url，data.url 填 "/travel"（站内旅行规划页，相对路径即可）；checklist 含护照签证、机票酒店、保险等；可配合 calendar 记出行提醒。

【热点航班】若热点标题或摘要涉及航班、机票比价、订票：actions 必须包含 open_url，data.url 为 "/travel"。`

// ══ 读取家庭档案 ══
async function getFamilyData(userId: string, needed: string[]) {
  const result: any = {}
  await Promise.all(needed.map(async (field) => {
    switch (field) {
      case 'passport': case 'visa': case 'medical':
      case 'address': case 'insurance': {
        const { data } = await supabase.from('family_profile').select('*').eq('user_id', userId)
        result.profile = data || []
        break
      }
      case 'children': {
        const { data } = await supabase.from('children').select('*').eq('user_id', userId)
        result.children = data || []
        break
      }
      case 'places': {
        const { data } = await supabase.from('family_places').select('*').eq('user_id', userId)
        result.places = data || []
        break
      }
      case 'habits': {
        const { data } = await supabase.from('family_habits').select('*').eq('user_id', userId)
        result.habits = data || []
        break
      }
      case 'finance': {
        const { data } = await supabase.from('family_documents').select('*').eq('user_id', userId)
        result.documents = data || []
        break
      }
      case 'health': {
        const { data } = await supabase
          .from('child_health_records')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(5)
        result.childHealth = data || []
        break
      }
      case 'vehicles': {
        const { data } = await supabase.from('vehicles').select('*').eq('user_id', userId)
        result.vehicles = data || []
        break
      }
    }
  }))
  return result
}

// ══ 调用 Claude ══
async function callClaude(prompt: string): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const rawText = data.content?.[0]?.text || '{}'
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : {}
  } catch { return {} }
}

// ══ 写入 action_queue ══
async function upsertActionQueue(
  userId: string,
  sourceType: string,
  sourceId: string,
  title: string,
  category: string,
  urgencyLevel: number,
  executionPack: any
) {
  // 检查是否已有未过期的缓存
  const { data: existing } = await supabase
    .from('action_queue')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('status', 'pending')
    .single()

  if (existing) {
    const ageHours = (Date.now() - new Date(existing.created_at).getTime()) / 3600000
    if (ageHours < 6) return existing.id // 6小时内直接复用
    // 过期则更新
    await supabase.from('action_queue').update({
      execution_pack: executionPack,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
    return existing.id
  }

  // 新建
  const { data } = await supabase.from('action_queue').insert({
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    title,
    category,
    urgency_level: urgencyLevel,
    execution_pack: executionPack,
    status: 'pending',
  }).select('id').single()

  return data?.id
}

function executionResponseBody(
  executionPack: Record<string, unknown>,
  actionQueueId?: string,
  cached = false,
) {
  return {
    ok: true,
    autoCompleted: (executionPack.autoCompleted as string[]) || [],
    userActions: executionPack.userActions || [],
    nextStep: (executionPack.nextStep as string) || executionPack.primary_action_reason || '',
    execution_pack: executionPack,
    action_queue_id: actionQueueId,
    cached,
  }
}

// ══ 构建 TODO Prompt ══
function buildTodoPrompt(todo: any, brainInstruction: any, familyData: any): string {
  const dimension = brainInstruction?.dimension || 'education'
  const familyLabel = familyServicePromptLabel(resolveResidentCityFromFamilyData(familyData))
  return `你是日安执行引擎，${familyLabel}生成一键执行包。

待办：${todo.title}
维度：${dimension}
意图：${brainInstruction?.intent || todo.title}
背景：${brainInstruction?.context || ''}
涉及人：${brainInstruction?.who || ''}
截止：${brainInstruction?.due_date || '未设定'}
实时信息：${todo.ai_action_data?.grok_result || '暂无'}

家庭档案：${JSON.stringify(familyData)}
处理指南：${DIMENSION_GUIDES[dimension] || '提供全面行动建议'}

${EXECUTION_PACK_SCHEMA}

补充：车险/事故/理赔/年检、旅行/机票/酒店等场景须遵守 schema 末尾【车辆与事故】【旅行与机票】规则；open_url 去 /travel 时用 data.url: "/travel"。

今天日期：${new Date().toLocaleDateString('zh-CN')}
actions最多5个。primary_action_index 是最该先做的那个的下标。
primary_action_reason 用"你"称呼妈妈，口语化一句话。`
}

// ══ 构建 Schedule Prompt ══
function buildSchedulePrompt(
  event: any,
  childName: string,
  dimension: string,
  familyData: any
): string {
  const familyLabel = familyServicePromptLabel(resolveResidentCityFromFamilyData(familyData))
  return `你是日安执行引擎，${familyLabel}生成孩子活动一键执行包。

孩子：${childName}
活动：${event.title}
类型：${event.event_type || 'other'}
日期：${event.date_start}
描述：${event.description || '无'}
需要携带：${Array.isArray(event.requires_items) ? event.requires_items.join('、') : '无'}
需要缴费：${event.requires_payment ? `฿${event.requires_payment}` : '无'}
注意事项：${event.requires_action || '无'}

家庭档案：${JSON.stringify(familyData)}
处理指南：${DIMENSION_GUIDES[dimension] || DIMENSION_GUIDES.education}

${EXECUTION_PACK_SCHEMA}

今天日期：${new Date().toLocaleDateString('zh-CN')}
这是孩子直接参与的活动。actions围绕孩子需要准备的事。
carry_items必须包含requires_items里的所有物品。
如有requires_payment必须包含缴费action。
actions最多4个。`
}

// ══ 构建 Hotspot Prompt ══
function buildHotspotPrompt(hotspot: any, familyData: any): string {
  const familyLabel = familyServicePromptLabel(resolveResidentCityFromFamilyData(familyData))
  return `你是日安执行引擎，${familyLabel}生成热点资讯一键执行包。

热点标题：${hotspot.title}
类别：${hotspot.category}
紧急度：${hotspot.urgency}
摘要：${hotspot.summary}
与家庭的关联：${hotspot.relevance_reason || '无'}

家庭档案：${JSON.stringify(familyData)}

${EXECUTION_PACK_SCHEMA}

今天日期：${new Date().toLocaleDateString('zh-CN')}
这是外部资讯，actions应该是：
1. 查看详情/原文链接
2. 如果紧急，生成对应待办的导航/电话
3. 可以建议转为待办
若热点涉及航班、机票、比价、订票，必须包含 open_url，data.url 为 "/travel"。
actions最多3个，不要过度。
如果这条热点需要妈妈采取行动，在summary末尾说明。`
}

function buildCalendarStartEnd(action: any): { startISO: string; endISO: string } | null {
  const d = action?.data || {}
  if (d.start_time) {
    const startISO = String(d.start_time).trim()
    let endISO = d.end_time ? String(d.end_time).trim() : ''
    if (!endISO) {
      const ts = Date.parse(startISO)
      if (Number.isNaN(ts)) return null
      endISO = new Date(ts + 2 * 60 * 60 * 1000).toISOString()
    }
    return { startISO, endISO }
  }
  const date = d.calendar_date ? String(d.calendar_date).trim() : ''
  if (!date) return null
  const hm = (() => {
    const s = String(d.calendar_time ?? '09:00').trim()
    const m = /^(\d{1,2}):(\d{2})$/.exec(s)
    if (!m) return '09:00'
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  })()
  const startISO = `${date}T${hm}:00`
  if (d.calendar_end_time) {
    const em = (() => {
      const s = String(d.calendar_end_time).trim()
      const m = /^(\d{1,2}):(\d{2})$/.exec(s)
      if (!m) return '11:00'
      const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
      const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    })()
    return { startISO, endISO: `${date}T${em}:00` }
  }
  if (d.end_time) {
    return { startISO, endISO: String(d.end_time).trim() }
  }
  const naiveMs = Date.parse(`${startISO}+07:00`)
  if (Number.isNaN(naiveMs)) return null
  const endWall = new Date(naiveMs + 2 * 60 * 60 * 1000).toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok' })
  return { startISO, endISO: endWall.replace(' ', 'T') }
}

const MAKE_DRAFT_ONLY_RESPONSE = {
  ok: false,
  message: '自动执行功能暂未开放，已为你生成草稿',
  draft_only: true,
}

// ══ 执行具体动作（Gmail / Make.com）══
async function performAction(action: any, userId: string) {
  const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''
  try {
    switch (action.type) {
      case 'email': {
        const to = action.data?.email_to ?? action.data?.to
        const subject = action.data?.email_subject ?? action.data?.subject ?? ''
        const body = action.data?.email_body ?? action.data?.body ?? ''
        if (!to || !String(to).trim()) {
          return { ok: false, error: '缺少收件人' }
        }
        const { sendGmail } = await import('@/lib/google/gmail')
        const result = await sendGmail(userId, String(to).trim(), subject, body)
        if (result.success) {
          return { ok: true, message: '邮件已发送', messageId: result.messageId }
        }
        if (result.error?.includes('未授权')) {
          if (!MAKE_WEBHOOK_URL) {
            return MAKE_DRAFT_ONLY_RESPONSE
          }
          await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'email',
              to,
              subject,
              body,
              user_id: userId,
            }),
          })
          return { ok: true, message: '邮件请求已提交', fallback: true }
        }
        return { ok: false, error: result.error || '邮件发送失败' }
      }
      case 'calendar': {
        const se = buildCalendarStartEnd(action)
        if (!se) {
          return { ok: false, error: '缺少时间信息' }
        }
        const title = String(action.data?.calendar_title ?? action.data?.title ?? '日程').trim() || '日程'
        const description = action.data?.description ?? action.data?.note
        const location = action.data?.calendar_location ?? action.data?.location
        const recurrenceRaw = action.data?.recurrence
        const recurrence =
          typeof recurrenceRaw === 'string' && recurrenceRaw.trim()
            ? [recurrenceRaw.trim()]
            : Array.isArray(recurrenceRaw)
              ? recurrenceRaw.filter((x: unknown) => typeof x === 'string').map((x: string) => x.trim()).filter(Boolean)
              : undefined

        const { addCalendarEvent } = await import('@/lib/google/calendar')
        const result = await addCalendarEvent(userId, {
          title,
          startTime: se.startISO,
          endTime: se.endISO,
          location: location ? String(location) : undefined,
          description: description != null ? String(description) : undefined,
          timeZone: 'Asia/Bangkok',
          recurrence,
        })

        if (result.success) {
          return {
            ok: true,
            message: '已添加到 Google 日历',
            eventLink: result.htmlLink,
            eventId: result.eventId,
          }
        }
        if (result.error?.includes('未授权')) {
          if (!MAKE_WEBHOOK_URL) {
            return MAKE_DRAFT_ONLY_RESPONSE
          }
          await fetch(MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'calendar',
              title,
              start_time: se.startISO,
              end_time: se.endISO,
              location,
              user_id: userId,
            }),
          })
          return { ok: true, message: '日历请求已提交', fallback: true }
        }
        return { ok: false, error: result.error || '添加日历失败' }
      }
      default:
        console.warn('Unknown action type:', action?.type)
        return {
          ok: false,
          skipped: true,
          reason: `Unknown action type: ${action?.type ?? 'unknown'}`,
        }
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ══ 主入口 ══
export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  try {
    const body = await req.json()
    const {
      source_type,
      source_id,
      // 兼容旧版（user_id 已忽略，一律使用 JWT 中的 user.id）
      todo_id,
      execute_action,
      perform_action,
      // 额外数据
      event_data,
      child_name,
    } = body

    // ── 执行具体动作（Make.com）──
    if (execute_action || perform_action) {
      const action = execute_action || perform_action
      const result = await performAction(action, userId)
      return NextResponse.json(result)
    }

    // ── 统一 source_type 处理 ──
    const resolvedSourceType = source_type || (todo_id ? 'todo' : null)
    const resolvedSourceId = source_id || todo_id

    if (!resolvedSourceType || !resolvedSourceId) {
      return NextResponse.json({ ok: false, error: 'Missing source_type or source_id' }, { status: 400 })
    }

    // ── 检查 action_queue 缓存 ──
    const { data: cached } = await supabase
      .from('action_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', resolvedSourceType)
      .eq('source_id', resolvedSourceId)
      .eq('status', 'pending')
      .single()

    if (cached) {
      const ageHours = (Date.now() - new Date(cached.created_at).getTime()) / 3600000
      if (ageHours < 6) {
        return NextResponse.json(
          executionResponseBody(cached.execution_pack || {}, cached.id, true),
        )
      }
    }

    let executionPack: any = {}
    let title = ''
    let category = 'other'
    let urgencyLevel = 1

    // ── TODO 分支 ──
    if (resolvedSourceType === 'todo') {
      const { data: todo, error } = await supabase
        .from('todo_items')
        .select('*')
        .eq('id', resolvedSourceId)
        .eq('user_id', userId)
        .single()

      if (error || !todo) {
        return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
      }

      // 读 todo_items 预生成缓存
      const pack = todo.ai_action_data?.execution_pack
      const preparedAt = todo.ai_action_data?.prepared_at

      if (pack && preparedAt) {
        const ageHours = (Date.now() - new Date(preparedAt).getTime()) / 3600000
        if (ageHours < 6) {
          // 命中缓存，补写 action_queue 后直接返回
          const actionQueueId = await upsertActionQueue(
            userId,
            resolvedSourceType,
            resolvedSourceId,
            todo.title,
            todo.category || 'other',
            todo.priority === 'red' ? 3 : todo.priority === 'orange' ? 2 : 1,
            pack,
          )

          return NextResponse.json(
            executionResponseBody(pack, actionQueueId, true),
          )
        }
      }

      const oneTapLimit = await checkLimit(userId, 'one_tap', user.email)
      if (!oneTapLimit.allowed) {
        return NextResponse.json(
          { error: 'limit_reached', feature: 'one_tap' },
          { status: 429 },
        )
      }

      title = todo.title
      category = todo.category || 'other'
      urgencyLevel = todo.priority === 'red' ? 3 : todo.priority === 'orange' ? 2 : 1

      const brainInstruction = todo.ai_action_data?.brain_instruction || {}
      const dimension = brainInstruction.dimension || todo.category || 'estate'
      const needed = brainInstruction.family_data_needed ||
        DIMENSION_DATA_NEEDED[dimension] || ['places']
      const familyData = await getFamilyData(userId, needed)

      const planResult = await planAndExecute(supabase, todo, familyData, userId)
      executionPack = buildExecutionPackFromPlan(planResult)

      // 同步更新 todo_items（向后兼容）
      await supabase.from('todo_items').update({
        ai_action_data: {
          ...todo.ai_action_data,
          execution_pack: executionPack,
          prepared_at: new Date().toISOString(),
        }
      }).eq('id', resolvedSourceId).eq('user_id', userId)
    }

    // ── SCHEDULE 分支 ──
    else if (resolvedSourceType === 'schedule') {
      // 从数据库读或用传入的 event_data
      let event = event_data
      if (!event) {
        const { data } = await supabase
          .from('child_school_calendar')
          .select('*')
          .eq('id', resolvedSourceId)
          .single()
        event = data
      }

      if (!event) {
        return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 })
      }

      const scheduleLimit = await checkLimit(userId, 'one_tap', user.email)
      if (!scheduleLimit.allowed) {
        return NextResponse.json(
          { error: 'limit_reached', feature: 'one_tap' },
          { status: 429 },
        )
      }

      title = event.title
      category = event.event_type || 'activity'
      urgencyLevel = event.requires_payment ? 2 : 1

      const dimension = EVENT_TYPE_DIMENSION[event.event_type || 'other'] || 'education'
      const needed = DIMENSION_DATA_NEEDED[dimension] || ['children', 'places']
      const familyData = await getFamilyData(userId, needed)
      const prompt = buildSchedulePrompt(event, child_name || '孩子', dimension, familyData)
      executionPack = await callClaude(prompt)

      const formTypes = (executionPack.actions || [])
        .filter((a: any) => a.type === 'download_pdf' && a.data?.form_type)
        .map((a: any) => a.data.form_type)
      const formTemplates = await fetchFormTemplates(supabase, formTypes)
      executionPack.actions = enrichActionsWithFormTemplates(
        executionPack.actions,
        familyData,
        formTemplates,
        child_name || undefined,
      )

      // 存入 child_school_calendar
      await supabase.from('child_school_calendar').update({
        ai_action_data: {
          execution_pack: executionPack,
          prepared_at: new Date().toISOString(),
        }
      }).eq('id', resolvedSourceId).eq('user_id', userId)
    }

    // ── HOTSPOT 分支 ──
    else if (resolvedSourceType === 'hotspot') {
      const { data: hotspot, error } = await supabase
        .from('hotspot_items')
        .select('*')
        .eq('id', resolvedSourceId)
        .eq('user_id', userId)
        .single()

      if (error || !hotspot) {
        return NextResponse.json({ ok: false, error: 'Hotspot not found' }, { status: 404 })
      }

      const hotspotLimit = await checkLimit(userId, 'one_tap', user.email)
      if (!hotspotLimit.allowed) {
        return NextResponse.json(
          { error: 'limit_reached', feature: 'one_tap' },
          { status: 429 },
        )
      }

      title = hotspot.title
      category = hotspot.category || 'lifestyle'
      urgencyLevel = hotspot.urgency === 'urgent' ? 3 : hotspot.urgency === 'important' ? 2 : 1

      const familyData = await getFamilyData(userId, ['children', 'places'])
      const prompt = buildHotspotPrompt(hotspot, familyData)
      executionPack = await callClaude(prompt)
      executionPack.actions = enrichActionsWithFormTemplates(executionPack.actions || [], familyData, [])
    }

    else {
      return NextResponse.json({ ok: false, error: `Unknown source_type: ${resolvedSourceType}` }, { status: 400 })
    }

    // ── 写入 action_queue ──
    const actionQueueId = await upsertActionQueue(
      userId,
      resolvedSourceType,
      resolvedSourceId,
      title,
      category,
      urgencyLevel,
      executionPack
    )

    await recordUsage(userId, 'one_tap')

    return NextResponse.json(
      executionResponseBody(executionPack, actionQueueId),
    )

  } catch (e: any) {
    console.error('Action execute error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
