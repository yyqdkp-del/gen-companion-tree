export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 读取家庭档案（按需读取）══
async function getFamilyData(userId: string, needed: string[]) {
  const result: any = {}
  await Promise.all(needed.map(async (field) => {
    switch (field) {
      case 'passport':
      case 'visa':
      case 'medical':
      case 'address':
      case 'insurance':
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

// ══ Grok实时搜索（多关键词并行）══
async function grokSearch(keywords: string[]): Promise<string> {
  if (!keywords.length) return ''
  try {
    const query = keywords.join('、') + '，请提供最新实时信息，重点关注清迈本地情况'
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [
          {
            role: 'system',
            content: '你是清迈本地情报员。用中文简洁回答，提供实时准确信息，包括地址、电话、营业时间、最新政策、价格等具体数据。'
          },
          { role: 'user', content: query }
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

// ══ 9维度执行包生成提示词 ══
function buildExecutionPrompt(
  todo: any,
  brainInstruction: any,
  familyData: any,
  grokResult: string
): string {
  const dimensionGuides: Record<string, string> = {
    compliance: `
签证/护照/证件类处理指南：
- 核对护照有效期（需大于6个月）
- 核对当前签证类型和到期日
- 列出完整材料清单（标注已有/缺失）
- 提供TM.7或对应表格预填数据
- 给出移民局地址+导航链接
- 估算排队时间和建议出发时间
- 生成携带清单
- 提示费用和缴费方式
- 必须包含一个 call 动作，提供机构官方电话`,

    medical: `
医疗/健康类处理指南：
- 推荐对应科室和医院
- 提供医院地址+电话+导航链接
- 列出就诊携带物品（医保/护照/既往记录）
- 生成三语问诊单（中/英/泰关键症状描述）
- 提示过敏史和用药记录
- 估算等待时间
- 建议出发时间
- 必须包含一个 call 动作，提供医院预约电话`,

    education: `
学校/教育类处理指南：
- 确认学校联系方式
- 生成回复邮件草稿（中英双语）
- 列出需要准备的材料/文件
- 提示缴费金额和方式
- 加入家长会/活动日历
- 生成孩子携带清单`,

    wealth: `
财务/账单类处理指南：
- 显示实时汇率（泰铢/人民币/美元）
- 对比最优缴费/汇款渠道
- 列出缴费步骤
- 计算实际金额（含手续费）
- 提示截止日期风险
- 记录到家庭财务`,

    mobility: `
出行/交通类处理指南：
- 显示实时路况和AQI
- 推算最优出发时间
- 提供目的地导航直链
- 列出顺路可办事项
- 检查护照/签证（如需出境）
- 生成行程携带清单
- 推荐交通方式（开车/Grab/公交）`,

    logistics: `
采购/物流类处理指南：
- 对比清迈购买渠道和价格
- 推荐最近的超市/店铺+导航
- 生成购物清单（按店铺分组）
- 提示代购渠道和运费
- 顺路采购聚合
- 预算计算`,

    estate: `
房产/物业类处理指南：
- 提供物业/房东联系方式
- 缴费方式和账号
- 推荐维修工/家政（清迈华人圈）
- 维修记录存档
- 水电度数记录
- 生成沟通模板`,

    social: `
社交/礼赠类处理指南：
- 推荐清迈适合场合的餐厅/活动
- 礼品推荐和购买链接
- 生成祝福语（中/泰/英三语）
- 日历提醒
- 预算建议
- 预订联系方式`,

    selfcare: `
自我成长类处理指南：
- 推荐清迈相关课程/社群
- 生成计划表
- 设置习惯提醒
- 资源链接
- 鼓励语`,
  }

  const dimension = brainInstruction?.dimension || 'other'
  const guide = dimensionGuides[dimension] || '提供全面的行动建议和执行步骤'

  return `你是日安执行引擎，负责为用户生成完整的一键执行包。

## 待办事项
标题：${todo.title}
维度：${dimension}
意图：${brainInstruction?.intent || todo.title}
背景：${brainInstruction?.context || todo.description || ''}
涉及人：${brainInstruction?.who || ''}
截止日期：${brainInstruction?.due_date || '未设定'}

## 家庭档案
${JSON.stringify(familyData, null, 2)}

## Grok实时搜索结果
${grokResult || '暂无实时信息'}

## 处理指南
${guide}

## 输出规则
严格只输出JSON，不加任何其他文字：
{
  "summary": "根帮你查了：2-3句话总结最重要的实时信息",
  "checklist": [
    {
      "item": "材料/步骤名称",
      "status": "ready|missing|optional",
      "note": "补充说明",
      "action": "buy|print|prepare|download|null"
    }
  ],
  "actions": [
    {
      "type": "navigate|call|email|whatsapp|calendar|download_pdf|open_url|pay|buy",
      "label": "按钮显示文字",
      "data": {
        "url": "链接（导航/网站）",
        "destination": "目的地名称（导航用）",
        "phone": "电话号码（call/whatsapp用，包含国家代码，如+6653123456）",
        "email_to": "收件人",
        "email_subject": "邮件主题",
        "email_body": "邮件正文",
        "calendar_title": "日历标题",
        "calendar_date": "YYYY-MM-DD",
        "calendar_time": "HH:MM",
        "calendar_location": "地点",
        "pdf_type": "TM7|medical_form|school_letter",
        "pdf_data": {},
        "message": "WhatsApp消息内容",
        "note": "付款说明（pay用）",
        "item": "商品名称（buy用）",
        "channel": "lazada|shopee（buy用）"
      }
    }
  ],
  "draft": "主要文字草稿（邮件正文/WhatsApp消息/问诊描述）",
  "depart_suggestion": "建议出发时间和方式",
  "cost_estimate": "预计费用（如适用）",
  "risk_warnings": ["风险提示1", "风险提示2"],
  "carry_items": ["携带物品1", "物品2"]
}

## 动作类型说明（重要！每个动作都必须提供完整data）
- navigate: 导航，data必须包含destination（中文地点名）和url（Google Maps完整链接，格式：https://www.google.com/maps/search/?api=1&query=XXX）
- call: 打电话，data必须包含phone（完整号码含国家代码，如+6653123456）。有实体地点/机构的事项都应包含此动作
- email: 发邮件，data必须包含email_to/email_subject/email_body（完整邮件内容）
- whatsapp: WhatsApp，data必须包含phone和message
- calendar: 加日历，data必须包含calendar_title/calendar_date（YYYY-MM-DD）/calendar_time（HH:MM）/calendar_location
- download_pdf: 下载/预填表格，data必须包含pdf_type和pdf_data（含official_url）
- open_url: 打开网站，data必须包含url（完整https链接）
- pay: 付款提示，data需要note说明缴费方式
- buy: 购买，data需要item商品名和channel（lazada或shopee）

## 示例动作（护照续签场景）
[
  {"type":"navigate","label":"导航至中国驻清迈总领事馆","data":{"destination":"中国驻清迈总领事馆","url":"https://www.google.com/maps/search/?api=1&query=%E4%B8%AD%E5%9B%BD%E9%A9%BB%E6%B8%85%E8%BF%88%E6%80%BB%E9%A2%86%E4%BA%8B%E9%A6%86"}},
  {"type":"call","label":"致电领馆确认材料","data":{"phone":"+6653276125"}},
  {"type":"calendar","label":"预约办理时间","data":{"calendar_title":"护照续签-中国领馆","calendar_date":"2024-04-11","calendar_time":"08:30","calendar_location":"中国驻清迈总领事馆"}},
  {"type":"navigate","label":"导航至附近证件照拍摄","data":{"destination":"证件照 清迈 photo studio","url":"https://www.google.com/maps/search/?api=1&query=%E8%AF%81%E4%BB%B6%E7%85%A7+%E6%B8%85%E8%BF%88"}},
  {"type":"open_url","label":"查看领馆官网须知","data":{"url":"http://chiangmai.chineseconsulate.org"}}
]

今天日期：${new Date().toLocaleDateString('zh-CN')}`
}

// ══ PDF预填数据生成 ══
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
          phone: '',
          email: '',
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
          current_medications: '',
        }
      }
    default:
      return {}
  }
}

// ══ 执行动作（Make.com）══
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
            to: action.data.email_to,
            subject: action.data.email_subject,
            body: action.data.email_body,
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
            title: action.data.calendar_title,
            start_time: `${action.data.calendar_date}T${action.data.calendar_time || '09:00'}:00`,
            end_time: `${action.data.calendar_date}T${action.data.calendar_time || '11:00'}:00`,
            location: action.data.calendar_location,
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

// ══ 主处理函数 ══
export async function POST(req: NextRequest) {
  try {
    const { todo_id, user_id, execute_action } = await req.json()

    if (!todo_id || !user_id) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 })
    }

    if (execute_action) {
      const result = await executeAction(execute_action, user_id)
      return NextResponse.json(result)
    }

    const { data: todo, error: todoError } = await supabase
      .from('todo_items').select('*').eq('id', todo_id).eq('user_id', user_id).single()
    if (todoError || !todo) {
      return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
    }

    const brainInstruction = todo.ai_action_data?.brain_instruction || {}
    const searchKeywords = brainInstruction.search_keywords || []
    const familyDataNeeded = brainInstruction.family_data_needed || []

    const [grokResult, familyData] = await Promise.all([
      grokSearch(searchKeywords),
      getFamilyData(user_id, familyDataNeeded),
    ])

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        stream: true,
        messages: [{ role: 'user', content: buildExecutionPrompt(todo, brainInstruction, familyData, grokResult) }],
      }),
    })

    const encoder = new TextEncoder()
    let fullText = ''

    const stream = new ReadableStream({
      async start(controller) {
        const reader = claudeRes.body!.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

          for (const line of lines) {
            const data = line.replace('data: ', '')
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const text = parsed.delta?.text || ''
              if (text) {
                fullText += text
                controller.enqueue(encoder.encode(text))
              }
            } catch {}
          }
        }

        // stream 结束后存库
        try {
          const cleaned = fullText.replace(/```json|```/g, '').trim()
          const executionPack = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || '{}')
          // PDF 数据填充
          if (executionPack.actions) {
            executionPack.actions = executionPack.actions.map((action: any) => {
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
              execution_pack: executionPack,
              prepared_at: new Date().toISOString(),
            }
          }).eq('id', todo_id).eq('user_id', user_id)
          console.log('存库完成:', todo_id)
        } catch (e) {
          console.error('存库失败:', e)
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Grok-Searched': String(searchKeywords.length > 0),
      }
    })

  } catch (e: any) {
    console.error('Smart action error:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

