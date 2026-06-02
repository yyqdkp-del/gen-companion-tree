export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function normalizeTime(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return TIME_RE.test(t) ? t : null
}

function normalizeSubject(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s : null
}

function cleanDayEntries(raw: unknown): Array<{ time: string; subject: string }> {
  if (!Array.isArray(raw)) return []

  const out: Array<{ time: string; subject: string }> = []
  for (const entry of raw) {
    // 旧格式数组：字符串（仅过滤空字符串；其余没有 time 则不入库）
    if (typeof entry === 'string') {
      const s = entry.trim()
      if (!s) continue
      // 允许 "HH:MM subject" 的字符串格式，转为对象
      const m = s.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
      if (!m) continue
      const time = normalizeTime(m[1])
      const subject = normalizeSubject(m[2])
      if (!time || !subject) continue
      out.push({ time, subject })
      continue
    }

    if (!entry || typeof entry !== 'object') continue
    const obj = entry as { time?: unknown; subject?: unknown }
    const time = normalizeTime(obj.time)
    const subject = normalizeSubject(obj.subject)
    if (!time || !subject) continue
    out.push({ time, subject })
  }
  return out
}

function cleanSchedule(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const next: Record<string, unknown> = { ...input }
  for (const d of DAYS) {
    next[d] = cleanDayEntries(input[d])
  }
  return next
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { image } = await req.json()
  if (!image) return NextResponse.json({ error: '没有图片' }, { status: 400 })

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
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            {
              type: 'text',
  text: `这是一张学校课程表图片。请仔细识别所有内容。

返回JSON，直接{开头}结尾，不加任何其他文字：

{
  "time_slots": ["07:50", "08:00", "08:15", ...],
  "mon": [
    {"time": "07:50", "subject": "早餐"},
    {"time": "08:00", "subject": "晨间例行程序"},
    ...
  ],
  "tue": [...],
  "wed": [...],
  "thu": [...],
  "fri": [...]
}

规则：
1. time_slots 只放时间，格式 HH:MM，从早到晚排列
2. 每天的课程必须从早到晚排列，第一条是早餐/晨间，最后一条是放学/取货
3. 每个课程必须有 time 和 subject 两个字段
4. subject 保持原文，中英文都保留
5. 看不清的格填 "—"
6. time_slots 和每天课程数量必须一致`,
            },
          ],
        }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: '识别失败，请手动填写' }, { status: 400 })

    const schedule = cleanSchedule(JSON.parse(m[0]))
    return NextResponse.json({ schedule })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}
