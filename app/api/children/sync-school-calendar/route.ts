export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { geminiGenerateContentUrl } from '@/lib/ai/models'

const GEMINI_URL = geminiGenerateContentUrl()

type CalendarEvent = {
  title: string
  date_start: string
  date_end?: string
  event_type?: string
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const s = v.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return s
}

function normalizeEventType(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (t === 'term' || t === 'holiday' || t === 'exam' || t === 'activity') return t
  if (t === 'event') return 'activity'
  return 'activity'
}

function parseEventsJson(text: string): CalendarEvent[] {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (Array.isArray(parsed.events)) return parsed.events
    } catch {
      /* fall through */
    }
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* ignore */
    }
  }
  return []
}

async function callGemini(
  prompt: string,
  opts?: { search?: boolean; maxOutputTokens?: number; timeoutMs?: number },
): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) throw new Error('GOOGLE_AI_API_KEY not configured')

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: opts?.maxOutputTokens ?? 1000,
    },
  }
  if (opts?.search) {
    body.tools = [{ google_search: {} }]
  }

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts?.timeoutMs ?? 30000),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText
    throw new Error(`Gemini error: ${msg}`)
  }

  const parts = data.candidates?.[0]?.content?.parts || []
  return parts.map((p: { text?: string }) => p.text || '').join('\n').trim()
}

async function fetchCalendarFromWebsite(
  websiteUrl: string,
  schoolName: string,
): Promise<CalendarEvent[]> {
  let url = websiteUrl.trim()
  if (!url) return []
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  let html = ''
  try {
    const pageResponse = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GenCompanionTree/1.0)' },
    })
    if (!pageResponse.ok) return []
    html = await pageResponse.text()
  } catch (e) {
    console.warn('[sync-calendar] website fetch failed', e)
    return []
  }

  const prompt = `从以下学校网页内容中提取2026年校历信息。

学校：${schoolName}
网页内容（部分）：
${html.slice(0, 5000)}

只提取以下类型的日期：
- 学期开始/结束日期（term）
- 放假日期（holiday）
- 考试周（exam）
- 重要活动（activity，如家长会、毕业典礼）

不要提取：
- 每周课程安排
- 课外活动时间表
- 日常作息时间

返回JSON：
{
  "events": [
    {
      "title": "事件名称（中文）",
      "date_start": "YYYY-MM-DD",
      "date_end": "YYYY-MM-DD",
      "event_type": "term|holiday|exam|activity"
    }
  ]
}

如果网页没有校历信息，返回 {"events": []}`

  try {
    const text = await callGemini(prompt, { maxOutputTokens: 1000 })
    return parseEventsJson(text)
  } catch (e) {
    console.warn('[sync-calendar] website Gemini parse failed', e)
    return []
  }
}

async function searchCalendarOnline(schoolName: string): Promise<CalendarEvent[]> {
  const prompt = `Search: "${schoolName}" academic calendar 2026 term dates holidays Thailand

Return JSON only with school term dates, holidays, exam periods.
Format: {"events": [{"title": "...", "date_start": "YYYY-MM-DD", "date_end": "YYYY-MM-DD", "event_type": "term|holiday|exam|activity"}]}
If not found: {"events": []}`

  try {
    const text = await callGemini(prompt, { search: true, maxOutputTokens: 800, timeoutMs: 15000 })
    return parseEventsJson(text)
  } catch (e) {
    console.warn('[sync-calendar] search Gemini failed', e)
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(req)
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const childId = String(body.childId || body.child_id || '').trim()
    const schoolName = String(body.schoolName || body.school_name || '').trim()
    const schoolWebsite = String(body.schoolWebsite || body.school_website || '').trim()

    if (!childId || !schoolName) {
      return NextResponse.json({ ok: false, error: 'missing params' })
    }

    const supabase = getServiceSupabase()
    const user_id = user.id

    const { data: child } = await supabase
      .from('children')
      .select('id, grade, school_website')
      .eq('id', childId)
      .eq('user_id', user_id)
      .maybeSingle()

    if (!child) {
      return NextResponse.json({ ok: false, error: 'Child not found' }, { status: 404 })
    }

    const website = schoolWebsite || child.school_website || ''

    console.log('[sync-calendar] start', schoolName, website || 'no website')

    let events: CalendarEvent[] = []

    if (website) {
      events = await fetchCalendarFromWebsite(website, schoolName)
      console.log('[sync-calendar] from website:', events.length, 'events')
    }

    if (events.length === 0) {
      events = await searchCalendarOnline(schoolName)
      console.log('[sync-calendar] from search:', events.length, 'events')
    }

    if (events.length === 0) {
      return NextResponse.json({
        ok: true,
        success: true,
        events: 0,
        message: '暂未找到校历，请在学校官网查询后手动添加',
      })
    }

    const validEvents = events
      .map((e) => {
        const title = typeof e.title === 'string' ? e.title.trim() : ''
        const date_start = normalizeDate(e.date_start)
        if (!title || !date_start) return null
        const date_end = normalizeDate(e.date_end) || date_start
        return {
          child_id: childId,
          user_id,
          title,
          date_start,
          date_end,
          event_type: normalizeEventType(e.event_type),
          source: website ? 'school_website' : 'auto_search',
        }
      })
      .filter(Boolean) as {
        child_id: string
        user_id: string
        title: string
        date_start: string
        date_end: string
        event_type: string
        source: string
      }[]

    if (!validEvents.length) {
      return NextResponse.json({
        ok: true,
        success: true,
        events: 0,
        message: '暂未找到校历，请在学校官网查询后手动添加',
      })
    }

    const dateStarts = [...new Set(validEvents.map((e) => e.date_start))]
    const { data: existingRows, error: existingError } = await supabase
      .from('child_school_calendar')
      .select('date_start, title')
      .eq('child_id', childId)
      .in('date_start', dateStarts)

    if (existingError) {
      console.error('[sync-calendar] lookup failed', existingError.message)
      return NextResponse.json({ ok: false, error: existingError.message })
    }

    const existingKeys = new Set(
      (existingRows || []).map((r) => `${r.date_start}\0${r.title}`),
    )
    const toInsert = validEvents.filter(
      (e) => !existingKeys.has(`${e.date_start}\0${e.title}`),
    )

    let count = 0
    if (toInsert.length) {
      const { data: inserted, error: insertError } = await supabase
        .from('child_school_calendar')
        .insert(toInsert)
        .select('id')

      if (insertError) {
        console.error('[sync-calendar] insert failed', insertError.message)
        return NextResponse.json({ ok: false, error: insertError.message })
      }
      count = inserted?.length ?? toInsert.length
    }

    console.log('[sync-calendar] saved', count, 'events')

    return NextResponse.json({
      ok: true,
      success: true,
      events: count,
      message: count > 0 ? `已同步 ${count} 个校历事件` : '校历已是最新，无新增事件',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[sync-calendar]', message)
    return NextResponse.json({ ok: false, error: message })
  }
}
