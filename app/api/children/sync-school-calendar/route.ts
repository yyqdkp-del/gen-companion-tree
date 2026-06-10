export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { geminiGenerateContentUrl } from '@/lib/ai/models'
import {
  buildCalendarPrompt,
  detectSchool,
  generateDefaultCalendar,
  type CalendarEventRow,
  type SchoolProfile,
} from '@/lib/school/schoolDetector'

const GEMINI_URL = geminiGenerateContentUrl()
const CALENDAR_YEAR = 2026

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

function parseEventsJson(text: string): CalendarEventRow[] {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed.events)) return parsed.events
  } catch {
    /* fall through */
  }
  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (Array.isArray(parsed.events)) return parsed.events
    } catch {
      /* ignore */
    }
  }
  return []
}

async function fetchFromWebsite(
  url: string,
  schoolName: string,
  profile: SchoolProfile | null,
): Promise<CalendarEventRow[]> {
  let websiteUrl = url.trim()
  if (!websiteUrl) return []
  if (!/^https?:\/\//i.test(websiteUrl)) {
    websiteUrl = `https://${websiteUrl}`
  }

  try {
    const pageResponse = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GenCompanionTree/1.0)' },
    })

    if (!pageResponse.ok) return []

    const html = await pageResponse.text()
    const prompt = profile
      ? buildCalendarPrompt(profile, CALENDAR_YEAR)
      : `从网页提取 "${schoolName}" 学校${CALENDAR_YEAR}学年校历日期（学期/假期/考试/活动，不要每周课程表），返回JSON：{"events":[{"title":"...","date_start":"YYYY-MM-DD","date_end":"YYYY-MM-DD","event_type":"term|holiday|exam|activity"}]}`

    const key = process.env.GOOGLE_AI_API_KEY
    if (!key) throw new Error('GOOGLE_AI_API_KEY not configured')

    const response = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${prompt}\n\n网页内容：\n${html.slice(0, 8000)}` }],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 1500 },
      }),
      signal: AbortSignal.timeout(20000),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const msg = data?.error?.message || response.statusText
      throw new Error(msg)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return parseEventsJson(text)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'website fetch failed'
    console.log('[sync-calendar] website fetch failed:', message)
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
      .select('id, school_website')
      .eq('id', childId)
      .eq('user_id', user_id)
      .maybeSingle()

    if (!child) {
      return NextResponse.json({ ok: false, error: 'Child not found' }, { status: 404 })
    }

    console.log('[sync-calendar] start', schoolName)

    const schoolProfile = detectSchool(schoolName)
    const websiteUrl =
      schoolWebsite || child.school_website || schoolProfile?.website || ''

    let events: CalendarEventRow[] = []
    let usedWebsite = false
    let usedDefault = false

    if (websiteUrl) {
      console.log('[sync-calendar] fetching from website:', websiteUrl)
      events = await fetchFromWebsite(websiteUrl, schoolName, schoolProfile)
      usedWebsite = events.length > 0
      console.log('[sync-calendar] from website:', events.length, 'events')
    }

    if (events.length === 0 && schoolProfile) {
      console.log('[sync-calendar] generating default calendar for', schoolProfile.curriculum)
      events = generateDefaultCalendar(schoolProfile, CALENDAR_YEAR)
      usedDefault = events.length > 0
    }

    if (events.length === 0) {
      return NextResponse.json({
        ok: true,
        success: true,
        events: 0,
        curriculum: schoolProfile?.curriculum ?? null,
        message: schoolProfile
          ? `已识别为${schoolProfile.curriculum}学制学校，请填写官网获取准确校历`
          : '请填写学校官网地址以获取校历',
      })
    }

    const source = usedWebsite
      ? 'school_website'
      : usedDefault
        ? 'auto_generated'
        : 'auto_search'

    const validEvents = events
      .map((event) => {
        const title = typeof event.title === 'string' ? event.title.trim() : ''
        const date_start = normalizeDate(event.date_start)
        if (!title || !date_start) return null
        const date_end = normalizeDate(event.date_end) || date_start
        return {
          child_id: childId,
          user_id,
          title,
          date_start,
          date_end,
          event_type: normalizeEventType(event.event_type),
          source,
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
      curriculum: schoolProfile?.curriculum ?? null,
      source: usedWebsite ? 'school_website' : 'auto_generated',
      message: count > 0
        ? `已同步 ${count} 个校历事件`
        : '校历已是最新，无新增事件',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[sync-calendar]', message)
    return NextResponse.json({ ok: false, error: message })
  }
}
