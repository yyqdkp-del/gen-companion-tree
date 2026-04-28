export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { child, activities, achievements, assessment, vision } = await req.json()

  if (!child || !vision) {
    return NextResponse.json({ error: '缺少必要数据' }, { status: 400 })
  }

  const prompt = `你是一位顶尖的国际升学规划专家，有20年帮助海外华人家庭孩子申请美高、英国独立学校和欧美T50大学的经验。

请根据以下信息，为这个孩子生成一份完整的升学规划报告。

【孩子基本信息】
姓名：${child.name}
年级：${child.grade || '未知'}
学校：${child.school_name || child.school || '国际学校'}
语言：${(child.languages || []).join('、') || '未知'}
当前所在地：清迈，泰国

【妈妈的愿景】
期待孩子成为：${vision.vision_statement}
目标路径：${vision.target_school_type}
核心期待：${(vision.priorities || []).join('、')}
主要担忧：${(vision.concerns || []).join('、')}

【现有课外活动】
${activities?.length ? activities.map((a: any) => `- ${a.name}（${a.category}，每周${a.days?.join('/')}）`).join('\n') : '暂无课外活动记录'}

【荣誉奖项】
${achievements?.length ? achievements.map((a: any) => `- ${a.title}（${a.level}级别，${a.date}）`).join('\n') : '暂无记录'}

【中文水平】
${assessment ? JSON.stringify(assessment) : '暂无测评记录'}

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
  "narrative": "基于现有信息，这个孩子的申请故事主线是什么（3-5句话，要感性有力）",
  "strengths": ["优势1", "优势2"],
  "gaps": ["缺口1（加具体说明）", "缺口2", "缺口3"],
  "risks": ["风险1（加时间节点）", "风险2"],
  "roadmap": [
    {
      "period": "时间段（如：现在-G1）",
      "priority": "high/medium/low",
      "actions": [
        {
          "action": "具体行动",
          "reason": "为什么重要（一句话）",
          "resource": "清迈可用的具体资源（机构名+地点）",
          "tier": 数字1-4
        }
      ]
    }
  ],
  "this_semester": [
    {
      "action": "本学期最重要的事（具体可执行）",
      "why": "申请价值说明",
      "urgency": "high/medium"
    }
  ],
  "key_deadlines": [
    {
      "event": "重要节点",
      "date": "时间",
      "note": "备注"
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
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: '分析失败，请重试' }, { status: 400 })

    const report = JSON.parse(match[0])
    return NextResponse.json({ report })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}
