import { NextRequest, NextResponse } from 'next/server'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// 识别用户意图并触发对应执行
async function executeAction(question: string, context: string): Promise<string | null> {
  const q = question.toLowerCase()
  
  // 解析事件信息
  const titleMatch = context.match(/事件：(.+?)\n/)
  const title = titleMatch?.[1] || '日程事项'
  const descMatch = context.match(/详情：(.+)/)
  const desc = descMatch?.[1] || ''
  
  // 解析出发时间
  const departMatch = desc.match(/建议出发：(.+?)(?:\n|$)/)
  const departTime = departMatch?.[1] || ''

  // 日历写入
  if (q.includes('加入日历') || q.includes('写入日历') || q.includes('日历')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // 解析时间（如果有出发时间则用，否则默认明天9点）
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
        title: title,
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
        title: title,
        message: `日安提醒：${title}，请确认你是否有空配合。`,
      }),
    })
    return 'spouse'
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const { question, context, history } = await req.json()

    // 先尝试执行操作
    const actionType = await executeAction(question, context)

    const messages = [
      ...history.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      { role: 'user', content: question }
    ]

    // 根据执行结果调整system prompt
    let systemPrompt = `你是日安，清迈家庭全能管家。当前处理的事件背景：${context}。用简洁中文回答，直接给行动建议，不超过100字。`
    
    if (actionType === 'calendar') {
      systemPrompt += `\n\n用户刚才要求加入日历，你已经成功调用Make.com写入Google Calendar了。回复时直接说"已帮你写入Google日历，届时会提醒你"，不要说"我将"或"我会"，要说"已完成"。`
    } else if (actionType === 'email') {
      systemPrompt += `\n\n用户刚才要求发邮件，你已经成功通过Make.com触发邮件草稿了。回复时直接说"邮件草稿已生成，Make.com正在处理发送"。`
    } else if (actionType === 'spouse') {
      systemPrompt += `\n\n用户刚才要求通知配偶，你已经成功触发通知了。回复时直接说"已通过Make.com发送通知给配偶"。`
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
