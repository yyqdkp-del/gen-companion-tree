export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function generateAndSave(body: any, authHeader: string) {
  const { child, activities, achievements, assessment, vision, childId } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 从 token 解析 uid，失败则 uid 为 null，不阻断生成流程
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  const uid = user?.id || null

  const prompt = `你是一位顶尖的国际升学规划专家，有20年帮助海外华人家庭孩子申请美高、英国独立学校和欧美T50大学的经验。

请根据以下信息，为这个孩子生成一份完整的升学规划报告。

【孩子基本信息】
姓名：${child?.name}
年级：${child?.grade || '未知'}
学校：${child?.school_name || child?.school || '国际学校'}
语言：${(child?.languages || []).join('、') || '未知'}
当前所在地：清迈，泰国

【妈妈的愿景】
期待孩子成为：${vision?.vision_statement}
目标路径：${vision?.target_school_type}
核心期待：${(vision?.priorities || []).join('、')}
主要担忧：${(vision?.concerns || []).join('、')}

【现有课外活动】
${activities?.length ? activities.map((a: any) => `- ${a.name}（${a.category}，每周${a.days?.join('/')}）`).join('\n') : '暂无课外活动记录'}

【荣誉奖项】
${achievements?.length ? achievements.map((a: any) => `- ${a.title}（${a.level}级别，${a.date}）`).join('\n') : '暂无记录'}

【中文水平】
${assessment ? JSON.stringify(assessment) : '暂无测评记录'}

规划报告要求：
- roadmap 最多3个时间段，每个时间段最多3个actions
- this_semester 最多3条
- 语言亲切自然，像一位资深教育顾问在和妈妈对话
- 所有建议具体可执行，结合清迈本地资源

请用JSON格式返回，直接{开头}结尾，不加任何其他文字：

{
  "profile_scores": {
    "academic": 数字0-100,
    "spike_depth": 数字0-100,
    "leadership": 数字0-100,
    "language": 数字0-100,
    "community": 数字0-100,
    "diversity": 数字0-100
  },
  "profile_summary": "一句话总结孩子现在的画像（20字以内）",
  "narrative": "这个孩子的申请故事主线（3-5句话，感性有力）",
  "strengths": ["优势1", "优势2"],
  "gaps": ["缺口1", "缺口2"],
  "risks": ["风险1", "风险2"],
  "roadmap": [
    {
      "period": "时间段",
      "priority": "high/medium/low",
      "actions": [
        {
          "action": "具体行动",
          "reason": "为什么重要",
          "resource": "清迈可用资源",
          "tier": 数字1-4
        }
      ]
    }
  ],
  "this_semester": [
    {
      "action": "本学期最重要的事",
      "why": "价值说明",
      "urgency": "high/medium"
    }
  ]
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return

    const reportData = JSON.parse(match[0])

    await supabase.from('pathway_reports').insert({
      child_id: childId,
      user_id: uid,
      profile_scores: reportData.profile_scores,
      narrative: reportData.narrative,
      gaps: reportData.gaps,
      roadmap: reportData.roadmap,
      this_semester: reportData.this_semester,
    })

  } catch (e) {
    console.error('规划生成失败', e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const authHeader = req.headers.get('authorization') || ''

  if (!body.child || !body.vision) {
    return NextResponse.json({ error: '缺少必要数据' }, { status: 400 })
  }

  generateAndSave(body, authHeader).catch(console.error)

  return NextResponse.json({ status: 'processing' })
}
