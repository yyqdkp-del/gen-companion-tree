import { NextRequest, NextResponse } from 'next/server'

const FALLBACK_DATA = {
  level: 'R3', level_desc: '句子理解期',
  standard_level: '初等三级',
  standard_desc: '能读简单句，理解基本语义，开始出现抗拒',
  insight: '孩子正处于中文学习的关键突破期，已经有了基础，只差一把钥匙。',
  blockpoint: '汉字对孩子来说还是符号，还没变成有意义的画面和故事。',
  action: '今晚用「休」字和孩子玩一个游戏：让他猜这个字在说什么故事。',
  local_line: '清迈的孩子每天看见榕树，「休」就是人靠着树——字就是画。',
  feature_rec: '从汉字拆解器开始，每天一个字，让汉字从符号变成故事。',
  cta: '领取你的专属学习路线图，开启第一个汉字故事 🌿'
}

const SYSTEM_PROMPT = `你是根·中文顾问，为清迈陪读家庭服务。
请根据问卷答案生成个性化报告。
严格且仅输出纯JSON格式，不要包含json标记或其他多余文字。
语气：温暖、专业、像妈妈朋友一样，绝不说教。
JSON结构：
{"level":"R1/R2/R3/R4/R5","level_desc":"级别名称","standard_level":"如：初等一级","standard_desc":"该等级一句话描述","insight":"现状洞察","blockpoint":"核心卡点","action":"本周核心行动","local_line":"清迈本地金句","feature_rec":"产品功能推荐","cta":"行动召唤"}
R级别对照《国际中文教育中文水平等级标准》：
R1=初等一级：认字<50，零基础，汉字完全陌生，以口语输入为主
R2=初等二级：认字50-200，能认常用字，拼音依赖强，书写极弱
R3=初等三级：认字200-500，能读简单句，理解基本语义，开始抗拒写作
R4=中等四级：认字500+，能读段落，口语强于书面，词汇量遇到瓶颈
R5=中等五级：阅读流畅，书面表达弱，中英切换频繁，写作词穷`

export async function POST(req: NextRequest) {
  const { answers } = await req.json()
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `用户问卷答案：${JSON.stringify(answers)}` }],
      }),
    })
    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    console.log('原始返回:', raw.slice(0, 300))
    const cleaned = raw
      .replace(/```json|```/g, '')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
      .trim()
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ ...FALLBACK_DATA, _debug: 'no json found' })
    return NextResponse.json(JSON.parse(m[0]))
  } catch (e: any) {
    console.error('ASSESS ERROR:', e?.message || e)
    return NextResponse.json(FALLBACK_DATA)
  }
}
