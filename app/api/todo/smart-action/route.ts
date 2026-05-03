export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ event_type → dimension 映射 ══
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

// ══ dimension → 预设 family_data_needed ══
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

// ══ 读取家庭档案 ══
async function getFamilyData(userId: string, needed: string[]) {
  const result: any = {}
  await Promise.all(needed.map(async (field) => {
    switch (field) {
      case 'passport': case 'visa': case 'medical': case 'address': case 'insurance': {
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

// ══ PDF 预填数据 ══
function buildPDFData(pdfType: string, familyData: any): any {
  const profile = familyData.profile?.[0] || {}
  switch (pdfType) {
    case 'TM7':
      return {
        form_name: 'TM.7 Application for Extension of Temporary Stay',
        fields: {
          full_name: profile.member_name || '',
          nationality: profile.member_nationality || '',
          passport_no: profile.passport_number || '',
          passport_expiry: profile.passport_expiry || '',
          visa_type: profile.visa_type || '',
          address_in_thailand: familyData.places?.find((p: any) => p.place_type === 'home')?.address || '',
        },
        download_url: 'https://www.immigration.go.th/content/tm7',
        official_url: 'https://www.immigration.go.th',
      }
    case 'medical_form':
      return {
        form_name: '就诊信息表',
        fields: {
          name: profile.member_name || '',
          blood_type: profile.blood_type || '',
          allergies: profile.allergies || '',
          chronic_conditions: profile.chronic_conditions || '',
        }
      }
    default:
      return {}
  }
}

// ══ 执行动作 Make.com ══
async function executeAction(action: any, userId: string) {
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

// ══ Prompt（待办）══
function buildTodoPrompt(todo: any, brainInstruction: any, familyData: any, grokResult: string): string {
  const dimensionGuides: Record<string, string> = {
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
  const dimension = brainInstruction?.dimension || 'other'
  return `你是日安执行引擎，为清迈陪读家庭生成一键执行包。

待办：${todo.title}
维度：${dimension}
意图：${brainInstruction?.intent || todo.title}
背景：${brainInstruction?.context || ''}
涉及人：${brainInstruction?.who || ''}
截止：${brainInstruction?.due_date || '未设定'}

家庭档案：${JSON.stringify(familyData)}
Grok实时信息：${grokResult || '暂无'}
处理指南：${dimensionGuides[dimension] || '提供全面行动建议'}

${EXECUTION_PACK_SCHEMA}

今天日期：${new Date().toLocaleDateString('zh-CN')}
actions最多5个，选最重要的。
primary_action_index 是 actions 数组里现在最该执行的那个的下标。
primary_action_reason 解释为什么现在先做这个，一句话，用"你"称呼妈妈，口语化。`
}

// ══ Prompt（孩子日程）══
function buildSchedulePrompt(event: any, childName: string, dimension: string, familyData: any): string {
  const dimensionGuides: Record<string, string> = {
    education: '学校活动：材料清单、携带物品、缴费方式、邮件回复草稿、日历提醒、学校联系方式',
    mobility:  '出行活动：出发时间建议、导航直链、路况、携带物品、交通方式、费用预估',
    medical:   '医疗：就诊材料、携带物品、医院导航电话、问诊描述、复诊提醒',
  }

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
处理指南：${dimensionGuides[dimension] || dimensionGuides.education}

${EXECUTION_PACK_SCHEMA}

今天日期：${new Date().toLocaleDateString('zh-CN')}
这是孩子直接参与的活动，actions围绕孩子需要准备的事情，不是家长自己的事。
carry_items 要包含所有需要带的物品，包括 requires_items 里的。
如有 requires_payment，必须包含缴费 action。
actions最多4个。`
}

// ══ 共用 execution_pack schema ══
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
        "pdf_type": "TM7|medical_form",
        "pdf_data": {"official_url": "", "download_url": ""}
      }
    }
  ],
  "draft": "草稿邮件或消息内容",
  "depart_suggestion": "建议出发时间",
  "cost_estimate": "预估费用",
  "risk_warnings": ["风险提示"],
  "carry_items": ["携带物品"]
}`

// ══ 调用 Claude ══
async function callClaude(prompt: string): Promise<any> {
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
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
  const data = await claudeRes.json()
  const rawText = data.content?.[0]?.text || '{}'
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : {}
  } catch {
    return {}
  }
}

// ══ 补全 actions ══
function enrichActions(actions: any[], familyData: any): any[] {
  return (actions || []).map((action: any) => {
    if (action.type === 'download_pdf' && action.data?.pdf_type) {
      action.data.pdf_data = buildPDFData(action.data.pdf_type, familyData)
    }
    if (action.type === 'navigate' && action.data?.destination && !action.data?.url) {
      action.data.url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.data.destination)}`
    }
    return action
  })
}

// ══ 主处理函数 ══
export async function POST(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
  try {
    const body = await req.json()
    const { todo_id, user_id, execute_action, schedule_event, child_name } = body

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 })
    }

    // ── 直接执行动作（Make.com）──
    if (execute_action) {
      return NextResponse.json(await executeAction(execute_action, user_id))
    }

    // ── 孩子日程分支 ──
    if (schedule_event) {
      const dimension = EVENT_TYPE_DIMENSION[schedule_event.event_type || 'other'] || 'education'
      const needed = DIMENSION_DATA_NEEDED[dimension] || ['children', 'places']
      const familyData = await getFamilyData(user_id, needed)

      const prompt = buildSchedulePrompt(schedule_event, child_name || '孩子', dimension, familyData)
      const executionPack = await callClaude(prompt)

      if (executionPack.actions) {
        executionPack.actions = enrichActions(executionPack.actions, familyData)
      }

      // 存入 child_school_calendar
      await supabase.from('child_school_calendar').update({
        ai_action_data: {
          execution_pack: executionPack,
          prepared_at: new Date().toISOString(),
        }
      }).eq('id', schedule_event.id)

      return NextResponse.json({ ok: true, execution_pack: executionPack })
    }

    // ── 待办分支 ──
    if (!todo_id) {
      return NextResponse.json({ ok: false, error: 'Missing todo_id or schedule_event' }, { status: 400 })
    }

    const { data: todo, error: todoError } = await supabase
      .from('todo_items').select('*').eq('id', todo_id).eq('user_id', user_id).single()
    if (todoError || !todo) {
      return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
    }

    // 有缓存直接返回
    if (todo.ai_action_data?.execution_pack && todo.ai_action_data?.prepared_at) {
      const preparedAt = new Date(todo.ai_action_data.prepared_at)
      const ageHours = (Date.now() - preparedAt.getTime()) / 3600000
      if (ageHours < 6) {
        return NextResponse.json({ ok: true, execution_pack: todo.ai_action_data.execution_pack, cached: true })
      }
    }

    const brainInstruction = todo.ai_action_data?.brain_instruction || {}
    const grokResult = todo.ai_action_data?.grok_result || ''
    const needed = brainInstruction.family_data_needed ||
      DIMENSION_DATA_NEEDED[brainInstruction.dimension || 'education'] || []
    const familyData = await getFamilyData(user_id, needed)

    const prompt = buildTodoPrompt(todo, brainInstruction, familyData, grokResult)
    const executionPack = await callClaude(prompt)

    if (executionPack.actions) {
      executionPack.actions = enrichActions(executionPack.actions, familyData)
    }

    await supabase.from('todo_items').update({
      ai_action_data: {
        ...todo.ai_action_data,
        execution_pack: executionPack,
        prepared_at: new Date().toISOString(),
      }
    }).eq('id', todo_id).eq('user_id', user_id)

    return NextResponse.json({ ok: true, execution_pack: executionPack })

  } catch (e: any) {
    console.error('Smart action error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
