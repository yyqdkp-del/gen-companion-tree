export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 9维度分类 ══
const DIMENSION_MAP: Record<string, string[]> = {
  compliance: ['签证', '护照', '驾照', '税务', '合同', '保险', '移民', '公证', '报到', '续签'],
  estate: ['房产', '物业', '水电', '保养', '维修', '家政', '搬家', '装修', '安防'],
  logistics: ['购物', '采购', '快递', '包裹', '食谱', '库存', '药品', '消耗'],
  education: ['学校', '课表', '成绩', '作业', '考试', '兴趣班', '留学', '奖学金', '中文'],
  social: ['生日', '婚礼', '葬礼', '礼物', '聚会', '派对', '亲友', '配偶', '纪念'],
  wealth: ['账单', '银行', '贷款', '投资', '保险', '退订', '理财', '信用卡', '财务'],
  medical: ['看病', '医院', '复诊', '体检', '药', '疫苗', '手术', '诊断', '处方'],
  mobility: ['机票', '酒店', '旅行', '签证', '出行', '路书', '行程', '导航'],
  selfcare: ['睡眠', '冥想', '运动', '学习', '书单', '影单', '自我', '成长'],
}

// ══ 识别事件维度 ══
function detectDimension(text: string): string {
  for (const [dim, keywords] of Object.entries(DIMENSION_MAP)) {
    if (keywords.some(k => text.includes(k))) return dim
  }
  return 'other'
}

// ══ 识别文件类型 ══
function detectDocumentType(content: string): string {
  if (content.includes('护照') || content.includes('passport') || content.includes('PASSPORT')) return 'passport'
  if (content.includes('签证') || content.includes('visa') || content.includes('VISA')) return 'visa'
  if (content.includes('诊断') || content.includes('处方') || content.includes('病历') || content.includes('就诊')) return 'medical'
  if (content.includes('课表') || content.includes('课程') || content.includes('成绩') || content.includes('学校')) return 'education'
  if (content.includes('账单') || content.includes('收据') || content.includes('发票') || content.includes('消费')) return 'bill'
  if (content.includes('合同') || content.includes('协议') || content.includes('条款')) return 'contract'
  if (content.includes('体检') || content.includes('检查报告') || content.includes('血压') || content.includes('血糖')) return 'health_report'
  return 'general'
}

// ══ 更新家庭档案 ══
async function updateFamilyProfile(supabase: any, docType: string, extracted: any[], user_id: string | null) {
  if (docType === 'passport' || docType === 'visa') {
    for (const e of extracted) {
      if (e.who) {
        await supabase.from('family_profile').upsert({
          user_id: user_id || null,
          member_name: e.who,
          ...(docType === 'passport' ? {
            passport_expiry: e.due_date || null,
            notes: e.notes || null,
          } : {
            visa_expiry: e.due_date || null,
            visa_type: e.category || null,
          }),
        }, { onConflict: 'member_name' })
      }
    }
  }

  if (docType === 'medical') {
    for (const e of extracted) {
      await supabase.from('family_profile').upsert({
        user_id: user_id || null,
        member_name: e.who || '家庭成员',
        chronic_conditions: e.notes || null,
      }, { onConflict: 'member_name' })
    }
  }
}

// ══ 自动发Make.com（非阻塞） ══
async function triggerMake(events: any[], input_type: string) {
  if (!MAKE_WEBHOOK_URL) return

  for (const e of events) {
    const dimension = detectDimension(e.title + (e.notes || '') + (e.claude_advice || ''))

    // 所有有due_date的事件自动写入日历
    if (e.due_date) {
      const startTime = new Date(e.due_date)
      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + 2)

      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'calendar',
          title: e.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          description: [
            e.claude_advice,
            e.action_items?.join('、'),
            e.carry_items ? `携带：${e.carry_items.join('、')}` : null,
            e.warnings?.join('、'),
          ].filter(Boolean).join('\n'),
          location: '清迈',
          dimension,
        }),
      }).catch(err => console.error('Make calendar error:', err))
    }

    // 紧急事件（priority=3）额外发通知
    if (e.priority === 3) {
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'urgent_alert',
          title: e.title,
          message: e.claude_advice || e.notes,
          dimension,
          who: e.who,
        }),
      }).catch(err => console.error('Make urgent error:', err))
    }

    // 证件类自动触发合规检查
    if (dimension === 'compliance') {
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'compliance_check',
          title: e.title,
          due_date: e.due_date,
          who: e.who,
          notes: e.notes,
        }),
      }).catch(err => console.error('Make compliance error:', err))
    }

    // 教育类自动同步课表
    if (dimension === 'education') {
      fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'education_sync',
          title: e.title,
          who: e.who,
          due_date: e.due_date,
          notes: e.notes,
        }),
      }).catch(err => console.error('Make education error:', err))
    }
  }
}

// ══ 识别用户意图并触发对应执行（保留原有逻辑） ══
async function executeAction(question: string, context: string): Promise<string | null> {
  const q = question.toLowerCase()

  const titleMatch = context.match(/事件：(.+?)\n/)
  const title = titleMatch?.[1] || '日程事项'
  const descMatch = context.match(/详情：(.+)/)
  const desc = descMatch?.[1] || ''

  const departMatch = desc.match(/建议出发：(.+?)(?:\n|$)/)
  const departTime = departMatch?.[1] || ''

  // 日历写入
  if (q.includes('加入日历') || q.includes('写入日历') || q.includes('日历')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    let startTime = new Date(tomorrow)
    startTime.setHours(9, 0, 0, 0)

    if (departTime) {
      const timeMatch = departTime.match(/(\d+):(\d+)/)
      if (timeMatch) {
        startTime.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0)
      }
    }

    const endTime = new Date(startTime)
    endTime.setHours(endTime.getHours() + 2)

    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'calendar',
        title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        description: desc.replace(/\n/g, ' '),
        location: '清迈',
      }),
    })
    return 'calendar'
  }

  // 发邮件
  if (q.includes('发邮件') || q.includes('邮件草稿') || q.includes('联系银行') || q.includes('发信')) {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        subject: `关于${title}的确认`,
        body: `您好，\n\n我将于近日办理${title}相关事宜，请问需要提前预约吗？所需材料是否有最新要求？\n\n谢谢`,
      }),
    })
    return 'email'
  }

  // 通知配偶
  if (q.includes('通知') || q.includes('配偶') || q.includes('先生') || q.includes('太太')) {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'notify_spouse',
        title,
        message: `日安提醒：${title}，请确认你是否有空配合。`,
      }),
    })
    return 'spouse'
  }

  // 生成材料清单
  if (q.includes('材料') || q.includes('清单') || q.includes('需要什么') || q.includes('准备什么')) {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'generate_checklist',
        title,
        description: desc,
        dimension: detectDimension(title + desc),
      }),
    })
    return 'checklist'
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const { question, context, history, event_data, user_id } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // 先尝试执行操作
    const actionType = await executeAction(question, context)

    // 如果有事件数据传入，自动触发Make.com
    if (event_data?.length > 0) {
      const docType = detectDocumentType(context)
      await updateFamilyProfile(supabase, docType, event_data, user_id || null)
      triggerMake(event_data, 'chat') // 非阻塞
    }

    const messages = [
      ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      { role: 'user', content: question }
    ]

    let systemPrompt = `你是日安，清迈家庭全能管家。
当前处理的事件背景：${context}

你的职责：
1. 直接执行，不复述信息
2. 每个建议都是具体的行动，不是描述
3. 识别需要预填的表格和材料，列出清单
4. 主动发现关联事项（证件/日程/家人）
5. 用简洁中文回答，不超过150字`

    if (actionType === 'calendar') {
      systemPrompt += `\n\n已成功调用Make.com写入Google Calendar。直接说"✅ 已写入日历，届时提醒"，然后补充一个下一步行动建议。`
    } else if (actionType === 'email') {
      systemPrompt += `\n\n已成功触发邮件草稿。直接说"✅ 邮件草稿已生成"，然后补充需要确认的信息。`
    } else if (actionType === 'spouse') {
      systemPrompt += `\n\n已成功发送配偶通知。直接说"✅ 已通知配偶"，然后说明下一步。`
    } else if (actionType === 'checklist') {
      systemPrompt += `\n\n已触发材料清单生成。直接列出3-5个最关键的材料，格式：✅已有 ⚠️需确认 ❌需获取。`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text || '抱歉，无法获取建议'
    return NextResponse.json({ reply, action: actionType })
  } catch (e: any) {
    console.error('CHAT ERROR:', e?.message || e)
    return NextResponse.json({ reply: '网络异常，请稍后再试' }, { status: 500 })
  }
}
