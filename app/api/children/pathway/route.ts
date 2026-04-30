export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'

async function generateAndSave(body: any, authHeader: string) {
  const { child, activities, achievements, assessment, vision, childId } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
${activities?.length ? activities.map((a: any) => `- ${a.name}（${a.category}）`).join('\n') : '暂无课外活动记录'}

【荣誉奖项】
${achievements?.length ? achievements.map((a: any) => `- ${a.title}（${a.level}级别）`).join('\n') : '暂无记录'}

【中文水平】
${assessment ? JSON.stringify(assessment) : '暂无测评记录'}

请严格按以下JSON结构返回，直接以{开头以}结尾，不加任何其他文字、注释或代码块标记：

{
  "profile_scores": {
    "academic": 0到100之间的整数,
    "spike_depth": 0到100之间的整数,
    "leadership": 0到100之间的整数,
    "language": 0到100之间的整数,
    "community": 0到100之间的整数,
    "diversity": 0到100之间的整数
  },
  "profile_summary": "20字以内的一句话总结",
  "narrative": "3到5句话的申请故事主线，感性有力",
  "strengths": ["优势描述1", "优势描述2"],
  "gaps": ["缺口描述1", "缺口描述2"],
  "risks": ["风险描述1", "风险描述2"],
  "roadmap": [
    {
      "period": "时间段描述",
      "priority": "high",
      "actions": [
        {
          "action": "具体行动描述",
          "reason": "重要原因",
          "resource": "清迈可用资源",
          "tier": 1到4之间的整数
        }
      ]
    }
  ],
  "this_semester": [
    {
      "action": "本学期最重要的具体行动",
      "why": "申请价值说明",
      "urgency": "high"
    }
  ]
}

要求：
- roadmap最多3个时间段，每个时间段最多3个actions
- this_semester最多3条
- tier字段必须是1、2、3、4中的一个整数
- urgency字段必须是high或medium
- priority字段必须是high、medium或low
- 所有整数字段不能有引号
- 语言亲切自然，结合清迈本地资源`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: '你只输出合法的JSON对象，不加任何其他内容、注释或markdown代码块标记。',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''

    // 提取JSON，去掉可能的markdown代码块
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('no JSON in response', raw.slice(0, 300))
      return
    }

    const reportData = JSON.parse(match[0])

    const { error: insertError } = await supabase.from('pathway_reports').insert({
      child_id: childId,
      user_id: uid,
      profile_scores: reportData.profile_scores,
      narrative: reportData.narrative,
      gaps: reportData.gaps,
      roadmap: reportData.roadmap,
      this_semester: reportData.this_semester,
    })

    if (insertError) {
      console.error('insert error', insertError)
    } else {
      console.log('pathway report saved successfully', { childId, uid })
    }

  } catch (e: any) {
    console.error('generateAndSave error', e?.message || e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const authHeader = req.headers.get('authorization') || ''

  if (!body.child || !body.vision) {
    return NextResponse.json({ error: '缺少必要数据' }, { status: 400 })
  }

  waitUntil(generateAndSave(body, authHeader))

  return NextResponse.json({ status: 'processing' })
}
