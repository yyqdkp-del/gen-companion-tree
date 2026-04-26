export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const FALLBACK_DATA = {
  level: 'R3',
  level_desc: '句子理解期',
  standard_level: '初等三级',
  standard_desc: '能读简单句，理解基本语义，开始出现抗拒',
  insight: '孩子正处于中文学习的关键突破期，已经有了基础，只差一把钥匙。',
  blockpoint: '汉字对孩子来说还是符号，还没变成有意义的画面和故事。',
  action: '今晚用「休」字和孩子玩一个游戏：让他猜这个字在说什么故事。',
  local_line: '清迈的孩子每天看见榕树，「休」就是人靠着树——字就是画。',
  feature_rec: '从汉字拆解器开始，每天一个字，让汉字从符号变成故事。',
  cta: '领取你的专属学习路线图，开启第一个汉字故事 🌿',
  _is_fallback: true,
}

const SYSTEM_PROMPT = `你是根·中文顾问，为海外华人陪读家庭服务。
根据问卷答案生成个性化报告。
只输出纯JSON，不加任何其他文字或标记。
语气：温暖、专业、像妈妈朋友一样，绝不说教。

JSON结构（所有字段必填，不能为空字符串）：
{
  "level": "R1到R5之一",
  "level_desc": "级别名称（4-6字）",
  "standard_level": "如：初等一级",
  "standard_desc": "该等级一句话描述",
  "insight": "现状洞察（2-3句，温暖）",
  "blockpoint": "核心卡点（1-2句，具体）",
  "action": "本周核心行动（1句，可操作）",
  "local_line": "结合孩子所在城市的真实生活场景金句，禁止套用其他城市",
  "feature_rec": "产品功能推荐（1-2句）",
  "cta": "行动召唤（15字以内）"
}

R级别对照：
R1 = 认字<50，汉字完全陌生，以口语输入为主
R2 = 认字50-200，能认常用字，拼音依赖强，书写极弱
R3 = 认字200-500，能读简单句，理解基本语义，开始抗拒写作
R4 = 认字500+，能读段落，口语强于书面，词汇量遇瓶颈
R5 = 阅读流畅，书面表达弱，中英切换频繁，写作词穷`

// 确定性预判级别，减少模型自由发挥
function inferLevel(answers: Record<string, string>): string {
  const charCount = answers['q6'] || ''
  const reading   = answers['q4'] || ''

  if (charCount.includes('50个以下') || reading.includes('基本不会读')) return 'R1'
  if (charCount.includes('50－200'))  return 'R2'
  if (charCount.includes('200－500')) return 'R3'
  if (charCount.includes('500个以上') && reading.includes('完全没问题')) return 'R5'
  if (charCount.includes('500个以上')) return 'R4'
  return 'R3'
}

export async function POST(req: NextRequest) {
  // 输入校验
  let answers: Record<string, string>
  let geofence: { city?: string; country?: string } | null = null

  try {
    const body = await req.json()
    answers  = body.answers
    geofence = body.geofence || null
  } catch {
    return NextResponse.json({ ...FALLBACK_DATA }, { status: 400 })
  }

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ ...FALLBACK_DATA }, { status: 400 })
  }

  // 本地化上下文：直接用围栏传来的城市，不在服务端重新计算
  const localCtx = geofence?.city
    ? `孩子所在城市：${geofence.city}（${geofence.country || ''}）。
local_line 字段必须结合 ${geofence.city} 的真实生活场景，
比如当地的自然环境、学校文化、社区生活，禁止套用其他城市的场景。`
    : `孩子所在城市：清迈（泰国）。local_line 请结合清迈榕树、山林、国际学校的生活场景。`

  const inferredLevel = inferLevel(answers)

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
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `问卷答案：${JSON.stringify(answers)}

${localCtx}

初步判断级别：${inferredLevel}，请据此生成报告，如判断有偏差请自行调整。`,
        }],
      }),
    })

    // HTTP 层错误检查
    if (!response.ok) {
      console.error('Anthropic API error:', response.status, response.statusText)
      return NextResponse.json({ ...FALLBACK_DATA })
    }

    const data = await response.json()
    const raw: string = data.content?.[0]?.text || ''

    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) {
      console.warn('ASSESS: no JSON found, raw:', raw.slice(0, 200))
      return NextResponse.json({ ...FALLBACK_DATA })
    }

    try {
      const parsed = JSON.parse(m[0])
      return NextResponse.json({ ...parsed, _is_fallback: false })
    } catch {
      console.warn('ASSESS: JSON.parse failed, match:', m[0].slice(0, 200))
      return NextResponse.json({ ...FALLBACK_DATA })
    }

  } catch (e: any) {
    console.error('ASSESS ERROR:', e?.message || e)
    return NextResponse.json({ ...FALLBACK_DATA })
  }
}
