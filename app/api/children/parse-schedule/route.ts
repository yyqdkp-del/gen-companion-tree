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

type LegacyEntry = { time: string; subject: string; name_zh?: string; category?: ScheduleCategory; description?: string }

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
    const obj = entry as { time?: unknown; subject?: unknown; name_zh?: unknown; category?: unknown; description?: unknown }
    const time = normalizeTime(obj.time)
    const subject = normalizeSubject(obj.subject)
    if (!time || !subject) continue
    const category = normalizeCategory(obj.category)
    const description = normalizeDescription(obj.description)
    const name_zh = normalizeDescription(obj.name_zh) ?? undefined
    out.push({ time, subject, category, ...(name_zh ? { name_zh } : {}), ...(description ? { description } : {}) })
  }
  return out
}

type ClaudeDay = {
  schedule?: unknown
  school_start?: unknown
  school_end?: unknown
}

type ClaudeResponse = {
  days?: Record<string, ClaudeDay>
  summary?: unknown
}

function cleanClaude(raw: unknown): {
  schedule: Record<string, LegacyEntry[]>
  school_start_time: string | null
  school_end_time: string | null
} {
  const out: Record<string, LegacyEntry[]> = {}
  for (const d of DAYS) out[d] = []

  if (!raw || typeof raw !== 'object') {
    return { schedule: out, school_start_time: null, school_end_time: null }
  }

  const input = raw as ClaudeResponse
  const daysObj = (input.days && typeof input.days === 'object') ? input.days : {}

  let schoolStart: string | null = null
  let schoolEnd: string | null = null

  for (const d of DAYS) {
    const day = (daysObj as any)[d] as ClaudeDay | undefined
    const entries = cleanDayEntries(day?.schedule)
    out[d] = entries

    if (!schoolStart) {
      const t = normalizeTime((day as any)?.school_start)
      if (t) schoolStart = t
    }
    if (!schoolEnd) {
      const t = normalizeTime((day as any)?.school_end)
      if (t) schoolEnd = t
    }
  }

  return { schedule: out, school_start_time: schoolStart, school_end_time: schoolEnd }
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

  let image: string | undefined
  let childId: string | undefined
  try {
    const body = await req.json()
    image = body.image
    childId = body.childId
  } catch (parseBodyErr) {
    console.error('[parse-schedule] req.json failed:', parseBodyErr)
    return NextResponse.json({ error: '请求体解析失败' }, { status: 400 })
  }

  if (!image) return NextResponse.json({ error: '没有图片' }, { status: 400 })
  if (!childId) return NextResponse.json({ error: '缺少 childId' }, { status: 400 })

  console.error('[parse-schedule] start', { userId: user.id, childId, imageLen: image.length })

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
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: `你是一个了解孩子日常的智能助手。请分析这份课表，识别时间和科目。

返回 JSON，直接以 { 开头 } 结尾，不要输出任何其他文字。

{
  "days": {
    "mon": {
      "schedule": [
        {
          "time": "08:00",
          "subject": "Science Curriculum Learning",
          "name_zh": "科学课",
          "category": "class",
          "description": "自然科学学习"
        }
      ],
      "school_start": "08:00",
      "school_end": "15:00"
    },
    "tue": { "schedule": [], "school_start": "08:00", "school_end": "15:00" },
    "wed": { "schedule": [], "school_start": "08:00", "school_end": "15:00" },
    "thu": { "schedule": [], "school_start": "08:00", "school_end": "15:00" },
    "fri": { "schedule": [], "school_start": "08:00", "school_end": "15:00" }
  },
  "summary": "简要描述学校类型和作息时间"
}

category 分类规则：
- class：正式学科课程（数学、英语、科学等）
- life：生活事件（午餐、点心、午休等）
- break：课间休息、户外活动
- transition：接送、过渡时间
- activity：课外活动、兴趣班

规则：
1. time 使用 24 小时制 HH:MM
2. 每天 schedule 必须按 time 从早到晚排列
3. subject 保持原文，中英文都保留
4. 看不清的格填 "—"
5. school_start/school_end 尽量从表中推断（无法确定可留空字符串）
6. name_zh 是该课程的中文简称（2-6个字），即使课程名是英文缩写或拼写错误也要给出合理的中文名称，例如 E.L.A. → 英语语言艺术，Cicence → 科学，Redding → 阅读`,
            },
          ],
        }],
      }),
    })

    console.error('[parse-schedule] anthropic status:', response.status, response.statusText)

    const data = await response.json()
    if (!response.ok) {
      console.error('[parse-schedule] anthropic error body:', JSON.stringify(data).slice(0, 2000))
    }

    const raw = data.content?.[0]?.text || ''
    console.error('[parse-schedule] claude raw length:', raw.length, 'stop_reason:', data.stop_reason)
    if (data.stop_reason === 'max_tokens') {
      console.error('[parse-schedule] WARNING: response truncated at max_tokens, JSON may be invalid')
    }
    console.error('[parse-schedule] claude raw preview:', raw.slice(0, 500), '...tail:', raw.slice(-200))

    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) {
      console.error('[parse-schedule] no JSON block in claude response')
      return NextResponse.json({ error: '识别失败，请手动填写' }, { status: 400 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(m[0])
    } catch (jsonErr) {
      console.error('[parse-schedule] JSON.parse failed:', jsonErr)
      console.error('[parse-schedule] JSON.parse failed, raw:', raw.slice(0, 500))
      return NextResponse.json({ error: '识别失败，请重试' }, { status: 400 })
    }

    const cleaned = cleanClaude(parsed)
    console.error('[parse-schedule] cleaned summary:', {
      daysWithEntries: DAYS.filter((d) => (cleaned.schedule[d]?.length ?? 0) > 0),
      school_start_time: cleaned.school_start_time,
      school_end_time: cleaned.school_end_time,
    })

    const supabase = createAuthedSupabase(req)

    const { error: profileError } = await supabase
      .from('child_profiles')
      .upsert(
        {
          user_id: user.id,
          child_id: childId,
          class_schedule: cleaned.schedule,
        },
        { onConflict: 'child_id' },
      )

    if (profileError) {
      console.error('[parse-schedule] child_profiles upsert failed:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        childId,
        userId: user.id,
      })
    }

    if (cleaned.school_start_time || cleaned.school_end_time) {
      const childUpdate: { school_start_time?: string; school_end_time?: string } = {}
      if (cleaned.school_start_time) childUpdate.school_start_time = cleaned.school_start_time
      if (cleaned.school_end_time) childUpdate.school_end_time = cleaned.school_end_time

      const { error: childError } = await supabase
        .from('children')
        .update(childUpdate)
        .eq('id', childId)
        .eq('user_id', user.id)

      if (childError) {
        console.error('[parse-schedule] children update failed:', {
          message: childError.message,
          code: childError.code,
          details: childError.details,
          hint: childError.hint,
          childId,
          userId: user.id,
        })
      }
    }

    return NextResponse.json({
      schedule: cleaned.schedule,
      school_start_time: cleaned.school_start_time,
      school_end_time: cleaned.school_end_time,
    })

  } catch (e: unknown) {
    console.error('[parse-schedule] unhandled error:', e)
    if (e instanceof Error) {
      console.error('[parse-schedule] error name:', e.name, 'message:', e.message, 'stack:', e.stack)
    }
    const message = e instanceof Error ? e.message : '服务器错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
