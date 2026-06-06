export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { normalizeRequiresItems } from '@/lib/packing/packingPreferences'
import { dedupeScheduleEntries } from '@/lib/schedule/dedupeScheduleEntries'
import { isPlaceholderSubject } from '@/lib/schedule/placeholderSubject'
import { applyScheduleTimeValidation, type ParseWarning } from '@/lib/schedule/validateScheduleTime'
import { validateScheduleStructure, type ScheduleValidationWarning } from '@/lib/schedule/validateScheduleStructure'
import { processSchedule } from '@/lib/ai/rootVision'
import { createClient } from '@supabase/supabase-js'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
const DAY_KEY_ALIASES: Record<string, (typeof DAYS)[number]> = {
  mon: 'mon', monday: 'mon',
  tue: 'tue', tuesday: 'tue',
  wed: 'wed', wednesday: 'wed',
  thu: 'thu', thursday: 'thu',
  fri: 'fri', friday: 'fri',
}
const CATEGORY_SET = new Set(['class', 'life', 'break', 'transition', 'activity'] as const)
type ScheduleCategory = 'class' | 'life' | 'break' | 'transition' | 'activity'

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

type VisionMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
const VISION_MEDIA_TYPES = new Set<VisionMediaType>(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

type TimeDirection = 'left' | 'top' | 'right' | 'bottom'
type DayDirection = 'top' | 'left' | 'bottom' | 'right'

type ScheduleStats = {
  timeDirection: TimeDirection
  dayDirection: DayDirection
  days: number
  timeSlots: number
  orientation: 'landscape' | 'portrait'
}

type ScheduleEntry = {
  time: string
  subject: string
  name_zh?: string
  category?: ScheduleCategory
  requires_items?: string[]
}

type ScheduleByDay = Record<(typeof DAYS)[number], ScheduleEntry[]>

function prepareVisionImageInput(image: string, mediaTypeHint?: string): {
  data: string
  media_type: VisionMediaType
  hasDataUrlPrefix: boolean
} {
  let raw = image.trim()
  let media_type: VisionMediaType = 'image/jpeg'
  let hasDataUrlPrefix = false

  const dataUrl = raw.match(/^data:(image\/[a-z+]+);base64,(.+)$/i)
  if (dataUrl) {
    hasDataUrlPrefix = true
    const mt = dataUrl[1].toLowerCase()
    if (VISION_MEDIA_TYPES.has(mt as VisionMediaType)) media_type = mt as VisionMediaType
    raw = dataUrl[2]
  } else if (mediaTypeHint && VISION_MEDIA_TYPES.has(mediaTypeHint as VisionMediaType)) {
    media_type = mediaTypeHint as VisionMediaType
  }

  const data = raw.replace(/\s/g, '')

  if (!dataUrl && !mediaTypeHint) {
    if (data.startsWith('iVBORw0KGgo')) media_type = 'image/png'
    else if (data.startsWith('R0lGOD')) media_type = 'image/gif'
    else if (data.startsWith('UklGR')) media_type = 'image/webp'
    else if (data.startsWith('/9j/')) media_type = 'image/jpeg'
  }

  return { data, media_type, hasDataUrlPrefix }
}

function emptySchedule(): ScheduleByDay {
  return { mon: [], tue: [], wed: [], thu: [], fri: [] }
}

function normalizeTime(v: unknown): string | null {
  const t = String(v || '').trim()
  const timeStr = t.includes('-') ? t.split('-')[0].trim() : t
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h > 23 || m > 59) return null
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
    const obj = entry as {
      time?: unknown
      subject?: unknown
      name_zh?: unknown
      category?: unknown
      requires_items?: unknown
    }
    const time = normalizeTime(obj.time)
    const subject = normalizeSubject(obj.subject)
    if (!time || !subject) continue

    const item: ScheduleEntry = { time, subject }
    if (withSemantic) {
      const name_zh = String(obj.name_zh || '').trim()
      const category = normalizeCategory(obj.category)
      const requires_items = normalizeRequiresItems(obj.requires_items)
      if (name_zh) item.name_zh = name_zh
      if (category) item.category = category
      if (requires_items.length) item.requires_items = requires_items
    }
    out.push(item)
  }
  return out
}

function resolveDayKey(key: string): (typeof DAYS)[number] | null {
  return DAY_KEY_ALIASES[key.trim().toLowerCase()] ?? null
}

function normalizeSchedule(raw: unknown, withSemantic = false): ScheduleByDay {
  const out = emptySchedule()
  if (!raw) return out

  if (Array.isArray(raw)) {
    out.mon = dedupeScheduleEntries(cleanDayEntries(raw, withSemantic))
    return out
  }

  if (typeof raw !== 'object') return out

  const root = raw as Record<string, unknown>
  const daysObj =
    root.days && typeof root.days === 'object' && !Array.isArray(root.days)
      ? (root.days as Record<string, unknown>)
      : root

  for (const [key, dayRaw] of Object.entries(daysObj)) {
    const day = resolveDayKey(key)
    if (!day) continue

    if (Array.isArray(dayRaw)) {
      out[day] = dedupeScheduleEntries(cleanDayEntries(dayRaw, withSemantic))
    } else if (dayRaw && typeof dayRaw === 'object' && !Array.isArray(dayRaw)) {
      out[day] = dedupeScheduleEntries(cleanDayEntries((dayRaw as { schedule?: unknown }).schedule, withSemantic))
    }
  }
  return out
}

function countRawDayEntries(daysObj: Record<string, unknown>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [key, dayRaw] of Object.entries(daysObj)) {
    if (Array.isArray(dayRaw)) counts[key] = dayRaw.length
    else if (dayRaw && typeof dayRaw === 'object') counts[key] = Array.isArray((dayRaw as { schedule?: unknown }).schedule) ? ((dayRaw as { schedule: unknown[] }).schedule.length) : 0
    else counts[key] = 0
  }
  return counts
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

function countScheduleEntries(schedule: ScheduleByDay): number {
  return DAYS.reduce((n, d) => n + schedule[d].length, 0)
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
  const trimmed = raw.trim()

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // continue
    }
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      // fall through
    }
  }

  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) {
    const arr = raw.match(/\[[\s\S]*\]/)
    if (arr) {
      try {
        return JSON.parse(arr[0])
      } catch (jsonErr) {
        console.error(`[parse-schedule] ${label} array JSON.parse failed:`, jsonErr)
      }
    }
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

function defaultStats(): ScheduleStats {
  return {
    timeDirection: 'left',
    dayDirection: 'top',
    days: 5,
    timeSlots: 14,
    orientation: 'landscape',
  }
}

const TIME_DIRECTIONS = new Set<TimeDirection>(['left', 'top', 'right', 'bottom'])
const DAY_DIRECTIONS = new Set<DayDirection>(['top', 'left', 'bottom', 'right'])

function parseStats(raw: unknown): ScheduleStats | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const days = parseInt(String(obj.days ?? ''), 10)
  const timeSlots = parseInt(String(obj.timeSlots ?? obj.time_slots ?? obj.lessonsPerDay ?? ''), 10)
  const orientationRaw = String(obj.orientation || '').trim().toLowerCase()
  const orientation = orientationRaw === 'portrait' ? 'portrait' : 'landscape'
  const timeDir = String(obj.timeDirection ?? obj.time_direction ?? 'left').trim().toLowerCase()
  const dayDir = String(obj.dayDirection ?? obj.day_direction ?? 'top').trim().toLowerCase()

  if (!Number.isFinite(days) || days < 1 || days > 7) return null
  if (!Number.isFinite(timeSlots) || timeSlots < 1 || timeSlots > 30) return null

  const timeDirection = TIME_DIRECTIONS.has(timeDir as TimeDirection)
    ? (timeDir as TimeDirection)
    : 'left'
  const dayDirection = DAY_DIRECTIONS.has(dayDir as DayDirection)
    ? (dayDir as DayDirection)
    : 'top'

  return { timeDirection, dayDirection, days, timeSlots, orientation }
}

/** 语义理解，补充 name_zh + category（enrichSchedule） */
async function enrichSchedule(step1: ScheduleByDay): Promise<ScheduleByDay | null> {
  const totalEntries = countScheduleEntries(step1)
  console.error('[parse-schedule] enrich start, entries:', totalEntries)

  const inputJson = JSON.stringify(step1)

  const result = await callClaude({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `以下是国际学校课表数据，请为每个 subject 补充：
- name_zh：中文简称2-6字
- category：见下方分类规则
- requires_items：需要携带物品的中文数组（可选）

对每个课程条目，判断 category：
- class：真实学科课程（Math/Science/ELA/Thai 等）
- activity：课外活动/特色课（Stack/Art/Music/PE/Swimming 等）
- transition：过渡性安排（Pick up/Drop off/Morning Routine 等）
- break：休息时间（Snack/Lunch/Rest Time/Recess 等）

请为每个条目加上 category 字段。
transition 和 break 类别的条目，妈妈不需要在课程提醒里看到，
但需要保留在完整课表里供时间线参考。

对需要携带物品的课程，添加 requires_items 字段（中文数组）。
根据课程常识判断，例如：
- P.E./体育 → ["运动服", "运动鞋"]
- Swimming/游泳 → ["泳衣", "泳镜", "毛巾"]
- Art/美术 → ["美术围裙"]
- Music/音乐（有乐器） → 根据具体乐器判断
- 普通学科课 → 不加或空数组
只加有把握的，不确定留空数组

返回相同结构，每个条目加上 name_zh、category、requires_items 字段
只返回 JSON

${inputJson}`,
    }],
  }, 'semantic')

  const enrichRaw = result.text
  console.error('[parse-schedule] enrich raw FULL:', enrichRaw?.slice(0, 1000))

  if (!result.ok) return null
  if (result.stop_reason === 'max_tokens') {
    console.error('[parse-schedule] enrich WARNING: truncated at max_tokens')
  }

  const parsed = parseClaudeJson(enrichRaw, 'semantic')
  if (!parsed) {
    console.error('[parse-schedule] enrich parse failed')
    return null
  }

  const enriched = normalizeSchedule(parsed, true)
  console.error('[parse-schedule] enrich success, sample:', JSON.stringify(enriched.mon?.slice(0, 2)))
  return enriched
}

function finalizeSchedule(raw: ScheduleByDay): {
  schedule: ScheduleByDay
  parse_warnings: ParseWarning[]
  school_start_time: string | null
  school_end_time: string | null
} {
  const { schedule, parse_warnings } = applyScheduleTimeValidation(raw, DAYS)
  const deduped = {} as ScheduleByDay
  for (const d of DAYS) {
    deduped[d] = dedupeScheduleEntries(schedule[d] || [])
  }
  const { school_start_time, school_end_time } = inferSchoolTimes(deduped)
  return { schedule: deduped, parse_warnings, school_start_time, school_end_time }
}

async function persistSchedule(
  req: NextRequest,
  userId: string,
  childId: string,
  schedule: ScheduleByDay,
  school_start_time: string | null,
  school_end_time: string | null,
) {
  const supabase = createAuthedSupabase(req)

  const { error: profileError } = await supabase
    .from('child_profiles')
    .upsert(
      { user_id: userId, child_id: childId, class_schedule: schedule },
      { onConflict: 'child_id' },
    )

  if (profileError) {
    console.error('[parse-schedule] child_profiles upsert failed:', profileError.message)
    throw new Error(profileError.message)
  }

  if (school_start_time || school_end_time) {
    const childUpdate: { school_start_time?: string; school_end_time?: string } = {}
    if (school_start_time) childUpdate.school_start_time = school_start_time
    if (school_end_time) childUpdate.school_end_time = school_end_time

    const { error: childError } = await supabase
      .from('children')
      .update(childUpdate)
      .eq('id', childId)
      .eq('user_id', userId)

    if (childError) {
      console.error('[parse-schedule] children update failed:', childError.message)
    }
  }
}

async function runParsePipeline(image: string, mediaTypeHint?: string): Promise<{
  schedule: ScheduleByDay
  parse_warnings: ParseWarning[]
  validation_warnings: ScheduleValidationWarning[]
  school_start_time: string | null
  school_end_time: string | null
  stats: ScheduleStats
  rootVision?: { docType: string; confidence: number; summary: string }
} | null> {
  const { data: imageData, media_type, hasDataUrlPrefix } = prepareVisionImageInput(image, mediaTypeHint)

  if (!imageData || imageData.length < 100) {
    console.error('[parse-schedule] vision image invalid:', {
      base64Len: imageData?.length ?? 0,
      media_type,
      hasDataUrlPrefix,
    })
    return null
  }

  console.error('[parse-schedule] vision image payload:', {
    media_type,
    base64Len: imageData.length,
    hasDataUrlPrefix,
    mediaTypeHint: mediaTypeHint ?? null,
    base64Prefix: imageData.slice(0, 32),
  })

  const scheduleData = await processSchedule(imageData, media_type)
  console.error('[parse-schedule] rootVision schedule days:', Object.fromEntries(
    DAYS.map((d) => [d, Array.isArray(scheduleData[d]) ? scheduleData[d].length : 0]),
  ))

  const step1 = normalizeSchedule(scheduleData, false)
  if (countScheduleEntries(step1) === 0) {
    console.error('[parse-schedule] rootVision schedule empty after normalize')
    return null
  }

  console.error('[parse-schedule] step1 entries:', countScheduleEntries(step1))

  const step2 = await enrichSchedule(step1)
  const enriched = step2 ?? step1
  if (!step2) {
    console.error('[parse-schedule] enrich failed, using step1 only')
  }

  const finalized = finalizeSchedule(enriched)
  const validation_warnings = validateScheduleStructure(finalized.schedule)
  return {
    ...finalized,
    validation_warnings,
    stats: defaultStats(),
    rootVision: {
      docType: 'schedule',
      confidence: 1,
      summary: '我看到了一张课表，已帮你整理好每天的课程',
    },
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let image: string | undefined
  let childId: string | undefined
  let mediaType: string | undefined
  let save = false
  let scheduleInput: unknown
  try {
    const body = await req.json()
    image = body.image
    childId = body.childId
    mediaType = body.mediaType
    save = body.save === true
    scheduleInput = body.schedule
  } catch (parseBodyErr) {
    console.error('[parse-schedule] req.json failed:', parseBodyErr)
    return NextResponse.json({ error: '请求体解析失败' }, { status: 400 })
  }

  if (!childId) return NextResponse.json({ error: '缺少 childId' }, { status: 400 })

  console.error('[parse-schedule] start', { userId: user.id, childId, save, hasImage: !!image, hasSchedule: !!scheduleInput })

  try {
    if (scheduleInput && save) {
      const normalized = normalizeSchedule(scheduleInput, true)
      const finalized = finalizeSchedule(normalized)
      if (countScheduleEntries(finalized.schedule) === 0) {
        return NextResponse.json({ error: '课表为空，无法保存' }, { status: 400 })
      }
      const validation_warnings = validateScheduleStructure(finalized.schedule)
      await persistSchedule(req, user.id, childId, finalized.schedule, finalized.school_start_time, finalized.school_end_time)
      return NextResponse.json({
        schedule: finalized.schedule,
        school_start_time: finalized.school_start_time,
        school_end_time: finalized.school_end_time,
        parse_warnings: finalized.parse_warnings,
        validation_warnings,
        saved: true,
      })
    }

    if (!image) return NextResponse.json({ error: '没有图片' }, { status: 400 })

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_AI_API_KEY not configured' },
        { status: 500 },
      )
    }

    const parsed = await runParsePipeline(image, mediaType)
    if (!parsed) {
      return NextResponse.json({ error: '识别失败，请重试' }, { status: 400 })
    }

    if (countScheduleEntries(parsed.schedule) === 0) {
      return NextResponse.json({ error: '未识别到有效课程' }, { status: 400 })
    }

    if (save) {
      await persistSchedule(req, user.id, childId, parsed.schedule, parsed.school_start_time, parsed.school_end_time)
    }

    return NextResponse.json({
      schedule: parsed.schedule,
      school_start_time: parsed.school_start_time,
      school_end_time: parsed.school_end_time,
      parse_warnings: parsed.parse_warnings,
      validation_warnings: parsed.validation_warnings,
      stats: parsed.stats,
      rootVision: parsed.rootVision,
      saved: save,
    })

  } catch (e: unknown) {
    console.error('[parse-schedule] unhandled error:', e)
    const message = e instanceof Error ? e.message : '服务器错误'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
