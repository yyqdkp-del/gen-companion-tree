import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { answers } = await req.json()

  const SYSTEM_PROMPT = `你是根·中文AI顾问，为清迈陪读家庭服务。
请根据问卷答案生成个性化报告。
严格且仅输出纯JSON格式，不要包含json标记或其他多余文字。
语气：温暖、专业、像妈妈朋友一样，绝不说教。
JSON结构：{"level":"R1/R2/R3/R4/R5","level_desc":"级别名称","insight":"现状洞察","blockpoint":"核心卡点","action":"本周核心行动","local_line":"清迈本地金句","feature_rec":"产品功能推荐","cta":"行动召唤"}
R级别：R1认字<50，R2认字50-200，R3认字200-500能读但抗拒，R4认字500+愿读但词穷，R5流畅阅读但书面表达弱`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `用户问卷答案：${JSON.stringify(answers)}` }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text?.replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(text))
  } catch {
    return NextResponse.json({
      level: 'R3', level_desc: '句子理解期',
      insight: '孩子正处于中文学习的关键突破期，已经有了基础，只差一把钥匙。',
      blockpoint: '汉字对孩子来说还是符号，还没变成有意义的画面和故事。',
      action: '今晚用「休」字和孩子玩一个游戏：让他猜这个字在说什么故事。',
      local_line: '清迈的孩子每天看见榕树，「休」就是人靠着树——字就是画。',
      feature_rec: '从汉字拆解器开始，每天一个字，让汉字从符号变成故事。',
      cta: '领取你的专属学习路线图，开启第一个汉字故事 🌿'
    })
  }
}
