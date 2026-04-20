export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

const ExecutionPackSchema = z.object({
  summary: z.string(),
  checklist: z.array(z.object({
    item: z.string(),
    status: z.enum(['ready', 'missing', 'optional']),
    note: z.string().optional(),
    action: z.enum(['buy', 'print', 'prepare', 'download']).nullable().optional(),
  })),
  data: z.object({
  url: z.string().optional(),
  destination: z.string().optional(),
  phone: z.string().optional(),
  email_to: z.string().optional(),
  email_subject: z.string().optional(),
  email_body: z.string().optional(),
  calendar_title: z.string().optional(),
  calendar_date: z.string().optional(),
  calendar_time: z.string().optional(),
  calendar_location: z.string().optional(),
  pdf_type: z.string().optional(),
  message: z.string().optional(),
  note: z.string().optional(),
  item: z.string().optional(),
  channel: z.string().optional(),
  official_url: z.string().optional(),
}),
  draft: z.string().optional(),
  depart_suggestion: z.string().optional(),
  cost_estimate: z.string().optional(),
  risk_warnings: z.array(z.string()),
  carry_items: z.array(z.string()),
})

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

async function grokSearch(keywords: string[]): Promise<string> {
  if (!keywords.length) return ''
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [
          { role: 'system', content: '你是清迈本地情报员。用中文简洁回答，提供实时准确信息，包括地址、电话、营业时间、最新政策、价格等具体数据。' },
          { role: 'user', content: keywords.join('、') + '，请提供最新实时信息，重点关注清迈本地情况' }
        ],
      }),
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    console.error('Grok搜索失败:', e?.message)
    return ''
  }
}

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

async function executeAction(action: any, userId: string) {
  if (!MAKE_WEBHOOK_URL) return { ok: false, error: 'No webhook' }
  try {
    switch (action.type) {
      case 'email':
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', to: action.data.email_to, subject: action.data.email_subject, body: action.data.email_body, user_id: userId }),
        })
        return { ok: true, message: '邮件已发送' }
      case 'calendar':
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'calendar', title: action.data.calendar_title, start_time: `${action.data.calendar_date}T${action.data.calendar_time || '09:00'}:00`, end_time: `${action.data.calendar_date}T${action.data.calendar_time || '11:00'}:00`, location: action.data.calendar_location, user_id: userId }),
        })
        return { ok: true, message: '已加入日历' }
      default:
        return { ok: true, message: '动作已记录' }
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

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

规则：
- actions 最多5个，选最重要的
- navigate 必须包含 destination 和完整 Google Maps url
- call 必须包含完整国际电话号码
- email 必须包含 email_to、email_subject、email_body
- calendar 必须包含 calendar_title、calendar_date(YYYY-MM-DD)、calendar_time(HH:MM)
- 今天日期：${new Date().toLocaleDateString('zh-CN')}`
}

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
    const [grokResult, familyData] = await Promise.all([
      grokSearch(brainInstruction.search_keywords || []),
      getFamilyData(user_id, brainInstruction.family_data_needed || []),
    ])

    const result = streamObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: ExecutionPackSchema,
      maxTokens: 8000,
      prompt: buildPrompt(todo, brainInstruction, familyData, grokResult),
      onFinish: async ({ object }) => {
        if (!object) return
        const finalObject: any = JSON.parse(JSON.stringify(object))
        if (finalObject.actions) {
          finalObject.actions = finalObject.actions.map((action: any) => {
            if (action.type === 'download_pdf' && action.data?.pdf_type) {
              action.data.pdf_data = buildPDFData(action.data.pdf_type, familyData)
            }
            return action
          })
        }
        const existingData = todo.ai_action_data || {}
        await supabase.from('todo_items').update({
          ai_action_data: {
            ...existingData,
            execution_pack: finalObject,
            prepared_at: new Date().toISOString(),
          }
        }).eq('id', todo_id).eq('user_id', user_id)
        console.log('存库完成:', todo_id)
      }
    })

    return result.toTextStreamResponse()

  } catch (e: any) {
    console.error('Smart action error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
