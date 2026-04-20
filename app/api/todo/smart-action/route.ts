export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 读取家庭档案 ══
async function getFamilyData(userId: string, needed: string[]) {
  const result: any = {}
  await Promise.all(needed.map(async (field) => {
    switch (field) {
      case 'passport': case 'visa': case 'medical': case 'address': case 'insurance':
        const { data: profile } = await supabase.from('family_profile').select('*').eq('user_id', userId)
        result.profile = profile || []
        break
      case 'children':
        const { data: children } = await supabase.from('children').select('*').eq('user_id', userId)
        result.children = children || []
        break
      case 'places':
        const { data: places } = await supabase.from('family_places').select('*').eq('user_id', userId)
        result.places = places || []
        break
      case 'habits':
        const { data: habits } = await supabase.from('family_habits').select('*').eq('user_id', userId)
        result.habits = habits || []
        break
      case 'finance':
        const { data: docs } = await supabase.from('family_documents').select('*').eq('user_id', userId)
        result.documents = docs || []
        break
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
          body: JSON.stringify({ type: 'email', to: action.data?.email_to, subject: action.data?.email_subject, body: action.data?.email_body, user_id: userId }),
        })
        return { ok: true, message: '邮件已发送' }
      case 'calendar':
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'calendar', title: action.data?.calendar_title, start_time: `${action.data?.calendar_date}T${action.data?.calendar_time || '09:00'}:00`, end_time: `${action.data?.calendar_date}T${action.data?.calendar_time || '11:00'}:00`, location: action.data?.calendar_location, user_id: userId }),
        })
        return { ok: true, message: '已加入日历' }
      default:
        return { ok: true, message: '动作已记录' }
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ══ Prompt ══
function buildPrompt(todo: any, brainInstruction: any, familyData: any, grokResult: string): string {
  const dimensionGuides: Record<string, string> = {
    compliance: '签证/证件：核对护照有效期、签证类型到期日、材料清单、移民局地址导航、排队时间、携带清单、费用缴费方式、机构电话',
    medical: '医疗：推荐科室医院、地址电话导航、携带物品、三语问诊描述、过敏史用药、等待时间、预约电话',
    education: '学校：学校联系方式、回复邮件草稿、材料清单、缴费方式、家长会日历、携带清单',
    wealth: '财务：实时汇率、最优缴费渠道、缴费步骤、实际金额含手续费、截止风险',
    mobility: '出行：路况AQI、最优出发时间、导航直链、顺路事项、护照签证检查、交通方式',
    logistics: '采购：购买渠道价格对比、最近店铺导航、购物清单、代购渠道',
    estate: '房产：物业联系方式、缴费账号、维修推荐、沟通模板',
    social: '社交：餐厅活动推荐、礼品购买、三语祝福语、预算建议',
    selfcare: '自我：课程社群推荐、计划表、习惯提醒',
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

严格只输出JSON，不加任何其他文字：
{ 
  "summary": "2-3句话总结最重要的实时信息",
  "primary_action_index": 0,
  "primary_action_reason": "根据截止时间和任务进度，说明为什么现在最该做这一步，一句话，面向妈妈说话",
  "checklist": [{"item": "名称", "status": "ready|missing|optional", "note": "说明"}],
  "actions": [
    {
      "type": "navigate|call|email|whatsapp|calendar|download_pdf|open_url|pay|buy",
      "label": "按钮文字",
      "data": {
        "url": "链接",
        "destination": "目的地",
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
        "channel": "lazada|shopee"
      }
    }
  ],
  "draft": "草稿文字",
  "depart_suggestion": "建议出发时间",
  "cost_estimate": "预估费用",
  "risk_warnings": ["风险1"],
  "carry_items": ["携带物品1"]
}

今天日期：${new Date().toLocaleDateString('zh-CN')}
actions最多5个，选最重要的。
primary_action_index 是 actions 数组里现在最该执行的那个的下标，根据截止时间和任务紧迫程度判断。
primary_action_reason 解释为什么现在先做这个，一句话，用"你"称呼妈妈，口语化。`
}

// ══ 主处理函数 ══
export async function POST(req: NextRequest) {
  try {
    const { todo_id, user_id, execute_action } = await req.json()

    if (!todo_id || !user_id) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 })
    }

    if (execute_action) {
      return NextResponse.json(await executeAction(execute_action, user_id))
    }

    const { data: todo, error: todoError } = await supabase
      .from('todo_items').select('*').eq('id', todo_id).eq('user_id', user_id).single()
    if (todoError || !todo) {
      return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
    }

    const brainInstruction = todo.ai_action_data?.brain_instruction || {}
    const grokResult = todo.ai_action_data?.grok_result || ''

    const familyData = await getFamilyData(user_id, brainInstruction.family_data_needed || [])

    // 直接调用 Anthropic API，不用 streamObject
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: buildPrompt(todo, brainInstruction, familyData, grokResult) }],
      }),
    })

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text || '{}'

    let executionPack: any = {}
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) executionPack = JSON.parse(match[0])
    } catch (e) {
      console.error('JSON parse failed:', e)
    }

    // PDF 数据填充
   if (executionPack.actions) {
  executionPack.actions = executionPack.actions.map((action: any) => {
    if (action.type === 'download_pdf' && action.data?.pdf_type) {
      action.data.pdf_data = buildPDFData(action.data.pdf_type, familyData)
    }
    // 补全 navigate url
    if (action.type === 'navigate' && action.data?.destination && !action.data?.url) {
      action.data.url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.data.destination)}`
    }
    return action
  })
}

    // 存库
    const existingData = todo.ai_action_data || {}
    await supabase.from('todo_items').update({
      ai_action_data: {
        ...existingData,
        execution_pack: executionPack,
        prepared_at: new Date().toISOString(),
      }
    }).eq('id', todo_id).eq('user_id', user_id)

    console.log('存库完成:', todo_id)
    return NextResponse.json({ ok: true, execution_pack: executionPack })

  } catch (e: any) {
    console.error('Smart action error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
