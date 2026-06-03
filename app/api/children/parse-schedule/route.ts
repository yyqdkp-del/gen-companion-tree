export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { isPlaceholderSubject } from '@/lib/schedule/placeholderSubject'
import { createClient } from '@supabase/supabase-js'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
const TIME_RE = /^(\d{1,2}):([0-5]\d)$/
const CATEGORY_SET = new Set(['class', 'life', 'break', 'transition', 'activity'] as const)
type ScheduleCategory = 'class' | 'life' | 'break' | 'transition' | 'activity'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

type ScheduleEntry = {
  time: string
  subject: string
  name_zh?: string
  category?: ScheduleCategory
}

type ScheduleByDay = Record<(typeof DAYS)[number], ScheduleEntry[]>

function emptySchedule(): ScheduleByDay {
  return { mon: [], tue: [], wed: [], thu: [], fri: [] }
}

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

function normalizeCategory(v: unknown): ScheduleCategory | undefined {
  const s = String(v || '').trim().toLowerCase()
  return CATEGORY_SET.has(s as ScheduleCategory) ? (s as ScheduleCategory) : undefined
}

function cleanDayEntries(raw: unknown, withSemantic = false): ScheduleEntry[] {
  if (!Array.isArray(raw)) return []

  const out: ScheduleEntry[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const obj = entry as { time?: unknown; subject?: unknown; name_zh?: unknown; category?: unknown }
    const time = normalizeTime(obj.time)
    const subject = normalizeSubject(obj.subject)
    if (!time || !subject) continue

    const item: ScheduleEntry = { time, subject }
    if (withSemantic) {
      const name_zh = String(obj.name_zh || '').trim()
      const category = normalizeCategory(obj.category)
      if (name_zh) item.name_zh = name_zh
      if (category) item.category = category
    }
    out.push(item)
  }
  return out
}

/** 解析 Claude 返回：支持 {"mon":[...]} 或 {"days":{"mon":[...]}} */
function normalizeSchedule(raw: unknown, withSemantic = false): ScheduleByDay {
  const out = emptySchedule()
  if (!raw || typeof raw !== 'object') return out

  const root = raw as Record<string, unknown>
  const daysObj =
    root.days && typeof root.days === 'object' && !Array.isArray(root.days)
      ? (root.days as Record<string, unknown>)
      : root

  for (const d of DAYS) {
    const dayRaw = daysObj[d]
    if (Array.isArray(dayRaw)) {
      out[d] = cleanDayEntries(dayRaw, withSemantic)
    } else if (dayRaw && typeof dayRaw === 'object' && !Array.isArray(dayRaw)) {
      out[d] = cleanDayEntries((dayRaw as { schedule?: unknown }).schedule, withSemantic)
    }
  }
  return out
}

function inferSchoolTimes(schedule: ScheduleByDay): {
  school_start_time: string | null
  school_end_time: string | null
} {
  let schoolStart: string | null = null
  let schoolEnd: string | null = null

  for (const d of DAYS) {
    const entries = schedule[d]
    if (!entries.length) continue
    if (!schoolStart) schoolStart = entries[0].time
    schoolEnd = entries[entries.length - 1].time
  }

  return { school_start_time: schoolStart, school_end_time: schoolEnd }
}

function createAuthedSupabase(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '') || ''
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: token ? { Authorization: `Bearer ${token}` } : {} } },
  )
}

type ClaudeCallResult = { text: string; stop_reason?: string; ok: boolean }

async function callClaude(body: object, label: string): Promise<ClaudeCallResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  console.error(`[parse-schedule] ${label} status:`, response.status, data.stop_reason ?? '')

  if (!response.ok) {
    console.error(`[parse-schedule] ${label} error:`, JSON.stringify(data).slice(0, 2000))
  }

  return {
    ok: response.ok,
    text: data.content?.[0]?.text || '',
    stop_reason: data.stop_reason,
  }
}

function parseClaudeJson(raw: string, label: string): unknown | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) {
    console.error(`[parse-schedule] ${label}: no JSON block`)
    return null
  }
  try {
    return JSON.parse(m[0])
  } catch (jsonErr) {
    console.error(`[parse-schedule] ${label} JSON.parse failed:`, jsonErr)
    console.error(`[parse-schedule] ${label} raw preview:`, raw.slice(0, 500))
    return null
  }
}

/** 第一步：Vision 只识别 time + subject */
async function callVision(image: string): Promise<ScheduleByDay | null> {
  const result = await callClaude({
    model: CLAUDE_MODEL,
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
          text: `这是一张学校课表图片。请提取所有课程信息，
只返回 JSON 数组，格式：
[{"time":"08:00","subject":"P.E."},...]
每天用星期作为 key：
{"mon":[...],"tue":[...],...}
只返回 JSON，不要任何解释`,
        },
      ],
    }],
  }, 'vision')

  if (!result.ok) return null
  if (result.stop_reason === 'max_tokens') {
    console.error('[parse-schedule] vision WARNING: truncated at max_tokens')
  }

  const parsed = parseClaudeJson(result.text, 'vision')
  if (!parsed) return null

  const schedule = normalizeSchedule(parsed, false)
  const total = DAYS.reduce((n, d) => n + schedule[d].length, 0)
  if (total === 0) {
    console.error('[parse-schedule] vision: no entries extracted')
    return null
  }
  return schedule
}

/** 第二步：语义理解，补充 name_zh + category */
async function callSemantic(step1: ScheduleByDay): Promise<ScheduleByDay | null> {
  const inputJson = JSON.stringify(step1)

  const result = await callClaude({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `以下是国际学校课表数据，请为每个 subject 补充：
- name_zh：中文简称2-6字
- category：class（正式课）/life（生活事项）/break（休息）/transition（接送过渡）/activity（活动）

返回相同结构，每个条目加上 name_zh 和 category 字段
只返回 JSON

${inputJson}`,
    }],
  }, 'semantic')

  if (!result.ok) return null
  if (result.stop_reason === 'max_tokens') {
    console.error('[parse-schedule] semantic WARNING: truncated at max_tokens')
  }

  const parsed = parseClaudeJson(result.text, 'semantic')
  if (!parsed) return null
  return normalizeSchedule(parsed, true)
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
    const step1 = await callVision(image)
    if (!step1) {
      return NextResponse.json({ error: '识别失败，请重试' }, { status: 400 })
    }

    console.error('[parse-schedule] step1 entries:', DAYS.reduce((n, d) => n + step1[d].length, 0))

    const step2 = await callSemantic(step1)
    const schedule = step2 ?? step1

    if (!step2) {
      console.error('[parse-schedule] step2 failed, using step1 only')
    }

    const { school_start_time, school_end_time } = inferSchoolTimes(schedule)

    const supabase = createAuthedSupabase(req)

    const { error: profileError } = await supabase
      .from('child_profiles')
      .upsert(
        { user_id: user.id, child_id: childId, class_schedule: schedule },
        { onConflict: 'child_id' },
      )

    if (profileError) {
      console.error('[parse-schedule] child_profiles upsert failed:', profileError.message)
    }

    if (school_start_time || school_end_time) {
      const childUpdate: { school_start_time?: string; school_end_time?: string } = {}
      if (school_start_time) childUpdate.school_start_time = school_start_time
      if (school_end_time) childUpdate.school_end_time = school_end_time

      const { error: childError } = await supabase
        .from('children')
        .update(childUpdate)
        .eq('id', childId)
        .eq('user_id', user.id)

      if (childError) {
        console.error('[parse-schedule] children update failed:', childError.message)
      }
    }

    return NextResponse.json({ schedule, school_start_time, school_end_time })

  } catch (e: unknown) {
    console.error('[parse-schedule] unhandled error:', e)
    const message = e instanceof Error ? e.message : '服务器错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
