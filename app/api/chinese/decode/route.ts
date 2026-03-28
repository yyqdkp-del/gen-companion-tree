import { NextRequest, NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS })
}

export async function POST(req: NextRequest) {
  const { mode, char, sentence, keywords } = await req.json()
  let prompt = ''
  if (mode === 'hanzi') {
    prompt = `为汉字「${char}」生成JSON：{"pinyin":"","meaning":"","level":"R2","parts":[{"char":"","name":"","image":""}],"story":"","scene":"清迈场景","mom_questions":["问题1","问题2"],"extension":["词1","词2"],"chengyu":"","cy_story":""}`
  } else if (mode === 'chengyu') {
    prompt = `孩子说：「${sentence}」，生成成语教学JSON：{"original":"","issue":"","chengyu":"","pinyin":"","meaning":"","story":"","chiangmai_scene":"","mom_script":"","similar":["",""]}`
  } else if (mode === 'writing') {
    const kw = keywords ? `本周学的字：${keywords}` : ''
    prompt = `孩子口述：「${sentence}」${kw}，生成书面化JSON：{"original":"","draft":"","keywords_used":[""],"fill_blanks":"","mom_script":"","tips":""}`
  } else {
    return NextResponse.json({ error: '未知模式' }, { status: 400, headers: CORS })
  }
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
        max_tokens: 1500,
        system: '只输出JSON对象，不加任何其他文字，不用代码块包裹，直接{开头}结尾。',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 500, headers: CORS })
    const raw = (data?.content?.[0]?.text || '').trim()
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: '格式错误' }, { status: 500, headers: CORS })
    return NextResponse.json(JSON.parse(m[0]), { headers: CORS })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS })
  }
}
