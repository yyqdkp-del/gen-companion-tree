export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { geminiGenerateContentUrl } from '@/lib/ai/models'

const GEMINI_URL = geminiGenerateContentUrl()

type CalendarRow = {
  title: string
  date_start: string
  date_end?: string
  type?: string
}

type ActivityRow = {
  title: string
  date?: string
  description?: string
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  )
}

function parseJsonArray<T>(raw: string): T[] | null {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const s = v.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return s
}

async function callGeminiSearch(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) throw new Error('GOOGLE_AI_API_KEY not configured')

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText
    throw new Error(`Gemini error: ${msg}`)
  }

  const parts = data.candidates?.[0]?.content?.parts || []
  return parts.map((p: { text?: string }) => p.text || '').join('\n').trim()
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthUser(req)
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const child_id = typeof body.child_id === 'string' ? body.child_id.trim() : ''
    const user_id = typeof body.user_id === 'string' ? body.user_id.trim() : ''
    const school_name = typeof body.school_name === 'string' ? body.school_name.trim() : ''
    const grade = typeof body.grade === 'string' ? body.grade.trim() : ''

    if (!child_id || !user_id || !school_name) {
      return NextResponse.json({ success: false, error: 'Missing child_id, user_id, or school_name' })
    }

    if (user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getServiceSupabase()

    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('id', child_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (!child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentSync } = await supabase
      .from('child_school_calendar')
      .select('id')
      .eq('child_id', child_id)
      .eq('source', 'school_auto_sync')
      .gte('created_at', sevenDaysAgo)
      .limit(1)

    if (recentSync?.length) {
      return NextResponse.json({ skipped: true })
    }

    const gradeHint = grade ? `，年级：${grade}` : ''

    const calendarPrompt = `搜索 "${school_name}" 学校官方网站，找出：
1. 当前学年学期开始/结束日期
2. 所有公共假期和学校假期
3. 考试周日期
4. 家长日/开放日
请先判断学校所在国家和城市，用当地语言+英文搜索。${gradeHint}
只返回 JSON 数组，不要 markdown，每项：{ "title": string, "date_start": "YYYY-MM-DD", "date_end": "YYYY-MM-DD", "type": "holiday"|"exam"|"event"|"term" }`

    const activitiesPrompt = `搜索 "${school_name}" 近30天内发布的学校活动和通知，包括：
运动会、表演、募捐、家长会、校外活动。${gradeHint}
只返回 JSON 数组，不要 markdown，每项：{ "title": string, "date": "YYYY-MM-DD", "description": string }`

    const [calendarRaw, activitiesRaw] = await Promise.all([
      callGeminiSearch(calendarPrompt),
      callGeminiSearch(activitiesPrompt),
    ])

    const calendarParsed = parseJsonArray<CalendarRow>(calendarRaw)
    const activitiesParsed = parseJsonArray<ActivityRow>(activitiesRaw)

    if (!calendarParsed && !activitiesParsed) {
      console.error('sync-school-calendar: failed to parse Gemini JSON', {
        calendarRaw: calendarRaw.slice(0, 500),
        activitiesRaw: activitiesRaw.slice(0, 500),
      })
      return NextResponse.json({ success: false, error: 'Failed to parse Gemini response' })
    }

    const calendarRows = (calendarParsed || [])
      .map((row) => {
        const title = typeof row.title === 'string' ? row.title.trim() : ''
        const date_start = normalizeDate(row.date_start)
        if (!title || !date_start) return null
        const date_end = normalizeDate(row.date_end) || date_start
        const event_type = ['holiday', 'exam', 'event', 'term'].includes(row.type || '')
          ? row.type
          : 'event'
        return {
          child_id,
          user_id,
          title,
          date_start,
          date_end,
          event_type,
          source: 'school_auto_sync',
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

    let calendar_count = 0
    if (calendarRows.length) {
      const dateStarts = [...new Set(calendarRows.map((r) => r.date_start))]
      const { data: existingRows, error: existingError } = await supabase
        .from('child_school_calendar')
        .select('date_start, title')
        .eq('child_id', child_id)
        .in('date_start', dateStarts)

      if (existingError) {
        console.error('sync-school-calendar: calendar lookup', existingError.message)
        return NextResponse.json({ success: false, error: existingError.message })
      }

      const existingKeys = new Set(
        (existingRows || []).map((r) => `${r.date_start}\0${r.title}`),
      )
      const toInsert = calendarRows.filter(
        (r) => !existingKeys.has(`${r.date_start}\0${r.title}`),
      )

      if (toInsert.length) {
        const { data: inserted, error: calError } = await supabase
          .from('child_school_calendar')
          .insert(toInsert)
          .select('id')

        if (calError) {
          console.error('sync-school-calendar: calendar insert', calError.message)
          return NextResponse.json({ success: false, error: calError.message })
        }
        calendar_count = inserted?.length ?? toInsert.length
      }
    }

    const todoRows = (activitiesParsed || [])
      .map((row) => {
        const title = typeof row.title === 'string' ? row.title.trim() : ''
        const due_date = normalizeDate(row.date)
        if (!title || !due_date) return null
        const description = typeof row.description === 'string' ? row.description.trim() : ''
        return {
          user_id,
          child_id,
          title,
          due_date,
          description: description || null,
          source: 'school_auto',
          status: 'pending',
          priority: 'yellow',
          category: 'education',
        }
      })
      .filter(Boolean) as {
        user_id: string
        child_id: string
        title: string
        due_date: string
        description: string | null
        source: string
        status: string
        priority: string
        category: string
      }[]

    let todo_count = 0
    if (todoRows.length) {
      const { data: inserted, error: todoError } = await supabase
        .from('todo_items')
        .insert(todoRows)
        .select('id')

      if (todoError) {
        console.error('sync-school-calendar: todo insert', todoError.message)
        return NextResponse.json({
          success: true,
          calendar_count,
          todo_count: 0,
          warning: todoError.message,
        })
      }
      todo_count = inserted?.length ?? todoRows.length
    }

    return NextResponse.json({
      success: true,
      calendar_count,
      todo_count,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('sync-school-calendar:', message)
    return NextResponse.json({ success: false, error: message })
  }
}
