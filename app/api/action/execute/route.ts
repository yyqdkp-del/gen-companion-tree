export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
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
  mobility:   ['children', 'places', 'passport'],
  medical:    ['children', 'medical', 'places'],
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
  mobility:   '出行：路况AQI、最优出发时间、导航直链、顺路事项、护照签证检查、交通方式',
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
        "calendar_location": "地点",
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
}`

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
    }
  }))
  return result
}

// ══ 读取表格模板 ══
async function getFormTemplates(formTypes: string[]) {
  if (!formTypes.length) return []
  const { data } = await supabase
    .from('form_templates')
    .select('*')
    .in('form_type', formTypes)
  return data || []
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

// ══ 补全 actions ══
function enrichActions(actions: any[], familyData: any, formTemplates: any[]): any[] {
  return (actions || []).map((action: any) => {
    // 表格预填
    if (action.type === 'download_pdf' && action.data?.form_type) {
      const template = formTemplates.find(t => t.form_type === action.data.form_type)
      if (template) {
        const profile = familyData.profile?.[0] || {}
        const prefilled: Record<string, string> = {}
        for (const [field, source] of Object.entries(template.field_mapping || {})) {
          const [table, col] = (source as string).split('.')
          if (table === 'family_profile') prefilled[field] = profile[col] || ''
          if (table === 'family_places') {
            const primary = familyData.places?.find((p: any) => p.is_primary)
            prefilled[field] = primary?.[col] || ''
          }
        }
        action.data.form_name = template.form_name
        action.data.official_url = template.official_url
        action.data.download_url = template.download_url
        action.data.prefilled_fields = prefilled
      }
    }
    // 补全导航链接
    if (action.type === 'navigate' && action.data?.destination && !action.data?.url) {
      action.data.url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.data.destination)}`
    }
    return action
  })
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

// ══ 构建 TODO Prompt ══
function buildTodoPrompt(todo: any, brainInstruction: any, familyData: any): string {
  const dimension = brainInstruction?.dimension || 'education'
  return `你是日安执行引擎，为清迈陪读家庭生成一键执行包。

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
  return `你是日安执行引擎，为清迈陪读家庭生成孩子活动一键执行包。

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
  return `你是日安执行引擎，为清迈陪读家庭生成热点资讯一键执行包。

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
actions最多3个，不要过度。
如果这条热点需要妈妈采取行动，在summary末尾说明。`
}

// ══ 执行具体动作（Make.com）══
async function performAction(action: any, userId: string) {
  const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''
  if (!MAKE_WEBHOOK_URL) return { ok: false, error: 'No webhook' }
  try {
    switch (action.type) {
      case 'email':
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            to: action.data?.email_to,
            subject: action.data?.email_subject,
            body: action.data?.email_body,
            user_id: userId,
          }),
        })
        return { ok: true, message: '邮件已发送' }
      case 'calendar':
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'calendar',
            title: action.data?.calendar_title,
            start_time: `${action.data?.calendar_date}T${action.data?.calendar_time || '09:00'}:00`,
            end_time: `${action.data?.calendar_date}T${action.data?.calendar_time || '11:00'}:00`,
            location: action.data?.calendar_location,
            user_id: userId,
          }),
        })
        return { ok: true, message: '已加入日历' }
      default:
        return { ok: true, message: '动作已记录' }
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ══ 主入口 ══
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      source_type,
      source_id,
      user_id,
      // 兼容旧版
      todo_id,
      execute_action,
      perform_action,
      // 额外数据
      event_data,
      child_name,
    } = body

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 })
    }

    // ── 执行具体动作（Make.com）──
    if (execute_action || perform_action) {
      const action = execute_action || perform_action
      const result = await performAction(action, user_id)
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
      .eq('user_id', user_id)
      .eq('source_type', resolvedSourceType)
      .eq('source_id', resolvedSourceId)
      .eq('status', 'pending')
      .single()

    if (cached) {
      const ageHours = (Date.now() - new Date(cached.created_at).getTime()) / 3600000
      if (ageHours < 6) {
        return NextResponse.json({
          ok: true,
          execution_pack: cached.execution_pack,
          action_queue_id: cached.id,
          cached: true,
        })
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
        .eq('user_id', user_id)
        .single()

      if (error || !todo) {
        return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
      }

      title = todo.title
      category = todo.category || 'other'
      urgencyLevel = todo.priority === 'red' ? 3 : todo.priority === 'orange' ? 2 : 1

      const brainInstruction = todo.ai_action_data?.brain_instruction || {}
      const needed = brainInstruction.family_data_needed ||
        DIMENSION_DATA_NEEDED[brainInstruction.dimension || 'education'] || []
      const familyData = await getFamilyData(user_id, needed)
      const prompt = buildTodoPrompt(todo, brainInstruction, familyData)
      executionPack = await callClaude(prompt)

      // 提取需要的表格类型
      const formTypes = (executionPack.actions || [])
        .filter((a: any) => a.type === 'download_pdf' && a.data?.form_type)
        .map((a: any) => a.data.form_type)
      const formTemplates = await getFormTemplates(formTypes)
      executionPack.actions = enrichActions(executionPack.actions, familyData, formTemplates)

      // 同步更新 todo_items（向后兼容）
      await supabase.from('todo_items').update({
        ai_action_data: {
          ...todo.ai_action_data,
          execution_pack: executionPack,
          prepared_at: new Date().toISOString(),
        }
      }).eq('id', resolvedSourceId).eq('user_id', user_id)
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

      title = event.title
      category = event.event_type || 'activity'
      urgencyLevel = event.requires_payment ? 2 : 1

      const dimension = EVENT_TYPE_DIMENSION[event.event_type || 'other'] || 'education'
      const needed = DIMENSION_DATA_NEEDED[dimension] || ['children', 'places']
      const familyData = await getFamilyData(user_id, needed)
      const prompt = buildSchedulePrompt(event, child_name || '孩子', dimension, familyData)
      executionPack = await callClaude(prompt)

      const formTypes = (executionPack.actions || [])
        .filter((a: any) => a.type === 'download_pdf' && a.data?.form_type)
        .map((a: any) => a.data.form_type)
      const formTemplates = await getFormTemplates(formTypes)
      executionPack.actions = enrichActions(executionPack.actions, familyData, formTemplates)

      // 存入 child_school_calendar
      await supabase.from('child_school_calendar').update({
        ai_action_data: {
          execution_pack: executionPack,
          prepared_at: new Date().toISOString(),
        }
      }).eq('id', resolvedSourceId)
    }

    // ── HOTSPOT 分支 ──
    else if (resolvedSourceType === 'hotspot') {
      const { data: hotspot, error } = await supabase
        .from('hotspot_items')
        .select('*')
        .eq('id', resolvedSourceId)
        .single()

      if (error || !hotspot) {
        return NextResponse.json({ ok: false, error: 'Hotspot not found' }, { status: 404 })
      }

      title = hotspot.title
      category = hotspot.category || 'lifestyle'
      urgencyLevel = hotspot.urgency === 'urgent' ? 3 : hotspot.urgency === 'important' ? 2 : 1

      const familyData = await getFamilyData(user_id, ['children', 'places'])
      const prompt = buildHotspotPrompt(hotspot, familyData)
      executionPack = await callClaude(prompt)
      executionPack.actions = enrichActions(executionPack.actions || [], familyData, [])
    }

    else {
      return NextResponse.json({ ok: false, error: `Unknown source_type: ${resolvedSourceType}` }, { status: 400 })
    }

    // ── 写入 action_queue ──
    const actionQueueId = await upsertActionQueue(
      user_id,
      resolvedSourceType,
      resolvedSourceId,
      title,
      category,
      urgencyLevel,
      executionPack
    )

    return NextResponse.json({
      ok: true,
      execution_pack: executionPack,
      action_queue_id: actionQueueId,
    })

  } catch (e: any) {
    console.error('Action execute error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
