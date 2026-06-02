export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { isPlaceholderSubject } from '@/lib/schedule/placeholderSubject'
import { createClient } from '@supabase/supabase-js'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
const TIME_RE = /^(\d{1,2}):([0-5]\d)$/
const CATEGORY_SET = new Set(['class', 'life', 'break', 'transition', 'activity'] as const)
type ScheduleCategory = 'class' | 'life' | 'break' | 'transition' | 'activity'

function normalizeTime(v: unknown): string | null {
  const t = String(v || '').trim()
  if (!TIME_RE.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  if (h > 23) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizeSubject(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s || isPlaceholderSubject(s)) return null
  return s
}

function normalizeCategory(v: unknown): ScheduleCategory {
  const s = String(v || '').trim().toLowerCase()
  return (CATEGORY_SET.has(s as any) ? (s as ScheduleCategory) : 'class')
}

function normalizeDescription(v: unknown): string | null {
  const s = String(v || '').trim()
  return s ? s : null
}

type LegacyEntry = { time: string; subject: string; category?: ScheduleCategory; description?: string }

function cleanDayEntries(raw: unknown): LegacyEntry[] {
  if (!Array.isArray(raw)) return []

  const out: LegacyEntry[] = []
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
    const obj = entry as { time?: unknown; subject?: unknown; category?: unknown; description?: unknown }
    const time = normalizeTime(obj.time)
    const subject = normalizeSubject(obj.subject)
    if (!time || !subject) continue
    const category = normalizeCategory(obj.category)
    const description = normalizeDescription(obj.description)
    out.push({ time, subject, category, ...(description ? { description } : {}) })
  }
  return out
}

type ClaudeDay = {
  schedule?: unknown
  school_start?: unknown
  school_end?: unknown
  key_transitions?: unknown
  tonight_prep?: unknown
}

type ClaudeResponse = {
  days?: Record<string, ClaudeDay>
  summary?: unknown
}

function cleanClaude(raw: unknown): {
  schedule: Record<string, LegacyEntry[]>
  school_start_time: string | null
  school_end_time: string | null
  schedule_summary: string | null
} {
  const out: Record<string, LegacyEntry[]> = {}
  for (const d of DAYS) out[d] = []

  if (!raw || typeof raw !== 'object') {
    return { schedule: out, school_start_time: null, school_end_time: null, schedule_summary: null }
  }

  const input = raw as ClaudeResponse
  const daysObj = (input.days && typeof input.days === 'object') ? input.days : {}

  let schoolStart: string | null = null
  let schoolEnd: string | null = null

  for (const d of DAYS) {
    const day = (daysObj as any)[d] as ClaudeDay | undefined
    const entries = cleanDayEntries(day?.schedule)
    out[d] = entries

    // 从任意一天取到第一份有效 school_start/end 即可（通常一周一致）
    if (!schoolStart) {
      const t = normalizeTime((day as any)?.school_start)
      if (t) schoolStart = t
    }
    if (!schoolEnd) {
      const t = normalizeTime((day as any)?.school_end)
      if (t) schoolEnd = t
    }
  }

  const schedule_summary = normalizeDescription(input.summary)
  return { schedule: out, school_start_time: schoolStart, school_end_time: schoolEnd, schedule_summary }
}

function createAuthedSupabase(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\\s+/i, '') || ''
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: token ? { Authorization: `Bearer ${token}` } : {} } },
  )
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { image, childId } = await req.json()
  if (!image) return NextResponse.json({ error: '没有图片' }, { status: 400 })
  if (!childId) return NextResponse.json({ error: '缺少 childId' }, { status: 400 })

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
  text: `你是一个了解孩子日常的智能助手。
请分析这份课表，不只是识别时间和科目，而是真正理解这个孩子的一天。

返回 JSON，直接以 { 开头 } 结尾，不要输出任何其他文字。

{
  "days": {
    "mon": {
      "schedule": [
        {
          "time": "07:50",
          "subject": "Pick up",
          "category": "transition",
          "description": "上学接送时间"
        }
      ],
      "school_start": "08:00",
      "school_end": "13:15",
      "key_transitions": [
        { "time": "07:50", "event": "到校", "type": "arrival" },
        { "time": "13:15", "event": "放学", "type": "departure" }
      ],
      "tonight_prep": [
        "检查明天的书包",
        "准备体育课装备"
      ]
    }
  },
  "summary": "这是一所国际学校，上课时间07:50-13:15，下午有课外活动时间"
}

category 分类规则：
- class：正式学科课程（数学、英语、科学等）
- life：生活事件（午餐、点心、午休等）
- break：课间休息、户外活动
- transition：接送、过渡时间
- activity：课外活动、兴趣班

规则：
1. time 使用 24 小时制 HH:MM（例如 8:00 也可以，但务必能明确分钟）
2. 每天 schedule 必须按 time 从早到晚排列
3. subject 保持原文，中英文都保留
4. 看不清的格填 "—"
5. school_start/school_end 尽量从表中推断出来（如果无法确定可留空字符串）`,
            },
          ],
        }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return NextResponse.json({ error: '识别失败，请手动填写' }, { status: 400 })

    const cleaned = cleanClaude(JSON.parse(m[0]))

    const supabase = createAuthedSupabase(req)
    await supabase
      .from('child_profiles')
      .upsert(
        {
          user_id: user.id,
          child_id: childId,
          class_schedule: cleaned.schedule,
          school_start_time: cleaned.school_start_time,
          // 新增字段：school_end_time（DB 需存在）
          school_end_time: cleaned.school_end_time,
          // 新增字段：schedule_summary（DB 需存在）
          schedule_summary: cleaned.schedule_summary,
        } as any,
        { onConflict: 'child_id' },
      )

    return NextResponse.json({
      schedule: cleaned.schedule,
      school_start_time: cleaned.school_start_time,
      school_end_time: cleaned.school_end_time,
      schedule_summary: cleaned.schedule_summary,
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500 })
  }
}
