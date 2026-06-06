import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DOW_KEY_BY_NUM: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
}

const MOOD_ZH: Record<string, string> = {
  happy: '开心',
  calm: '平静',
  anxious: '焦虑',
  upset: '低落',
}

const HEALTH_ZH: Record<string, string> = {
  normal: '健康',
  recovering: '恢复中',
  sick: '生病',
}

export function getWeekBounds(now = new Date()) {
  const dayOfWeek = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return {
    weekStart,
    weekEnd,
    weekStartStr: weekStart.toISOString().split('T')[0],
    weekEndStr: weekEnd.toISOString().split('T')[0],
  }
}

export function getWeekLabel(now = new Date()): string {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const week = Math.ceil(now.getDate() / 7)
  return `${year}年${month}月 第${week}周`
}

export function childAgeFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const md = now.getMonth() - birth.getMonth()
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age -= 1
  return age > 0 && age < 25 ? age : null
}

function normalizeActDays(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      return Array.isArray(j) ? j.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }
  return []
}

function weekDayKeys(weekStart: Date): string[] {
  const keys = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    keys.add(DOW_KEY_BY_NUM[d.getDay()])
  }
  return [...keys]
}

function parseHanziChar(session: { input_text?: string | null; result?: unknown }): string | null {
  let r = session.result
  if (typeof r === 'string') {
    try { r = JSON.parse(r) } catch { /* keep string */ }
  }
  if (r && typeof r === 'object' && 'char' in r) {
    const ch = String((r as { char?: string }).char || '').trim()
    if (ch) return ch
  }
  const text = String(session.input_text || '').trim()
  return text || null
}

export type ChildWeekData = {
  events: string[]
  todos: string[]
  hanzi: string[]
  moodTrend: string
  healthSummary: string
  activities: string[]
}

export async function fetchWeekTodos(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  childId?: string,
) {
  let query = supabase
    .from('todo_items')
    .select('title, completed_at, priority, child_id')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString())
    .limit(20)

  if (childId) {
    query = query.or(`child_id.eq.${childId},child_id.is.null`)
  }

  const { data } = await query
  return (data || []).map((t) => String(t.title || '').trim()).filter(Boolean)
}

export async function fetchWeekHanzi(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  childId: string,
) {
  const { data: sessions } = await supabase
    .from('chinese_sessions')
    .select('input_text, input_type, result')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .gte('learned_at', weekStart.toISOString())
    .lte('learned_at', weekEnd.toISOString())
    .limit(20)

  const chars = new Set<string>()
  for (const s of sessions || []) {
    if (s.input_type !== 'hanzi') continue
    const ch = parseHanziChar(s)
    if (ch) chars.add(ch)
  }
  return [...chars]
}

export async function fetchWeekCalendarEvents(
  userId: string,
  childId: string,
  weekStartStr: string,
  weekEndStr: string,
) {
  const { data } = await supabase
    .from('child_school_calendar')
    .select('title, date_start')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .gte('date_start', weekStartStr)
    .lte('date_start', weekEndStr)
    .limit(15)

  return (data || [])
    .map((e) => {
      const title = String(e.title || '').trim()
      if (!title) return ''
      const d = e.date_start ? String(e.date_start).slice(5).replace('-', '/') : ''
      return d ? `${d} ${title}` : title
    })
    .filter(Boolean)
}

export async function fetchWeekDailyLogs(
  userId: string,
  childId: string,
  weekStartStr: string,
  weekEndStr: string,
) {
  const { data } = await supabase
    .from('child_daily_log')
    .select('health_status, mood_status, date')
    .eq('user_id', userId)
    .eq('child_id', childId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)

  return data || []
}

export function summarizeMoodTrend(
  logs: { mood_status?: string | null }[],
): string {
  const counts: Record<string, number> = {}
  for (const log of logs) {
    const m = String(log.mood_status || '').trim()
    if (!m) continue
    counts[m] = (counts[m] || 0) + 1
  }
  const parts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n}天${MOOD_ZH[k] || k}`)
  return parts.length ? parts.join('、') : '本周暂无心情记录'
}

export function summarizeHealth(
  logs: { health_status?: string | null }[],
): string {
  const counts: Record<string, number> = {}
  for (const log of logs) {
    const h = String(log.health_status || '').trim()
    if (!h) continue
    counts[h] = (counts[h] || 0) + 1
  }
  if (!Object.keys(counts).length) return '本周暂无健康记录'
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  const label = HEALTH_ZH[dominant[0]] || dominant[0]
  const total = logs.filter((l) => l.health_status).length
  return total > 0 ? `本周多数时间${label}（共记录 ${total} 天）` : '本周暂无健康记录'
}

export async function fetchWeekActivities(
  userId: string,
  childId: string,
  weekStart: Date,
) {
  const dayKeys = weekDayKeys(weekStart)
  const [{ data: profile }, { data: tableActs }] = await Promise.all([
    supabase.from('child_profiles').select('activities').eq('child_id', childId).maybeSingle(),
    supabase.from('child_activities')
      .select('name, days, start_time, is_active')
      .eq('child_id', childId)
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  const names = new Set<string>()

  const profileActs = Array.isArray(profile?.activities) ? profile.activities : []
  for (const a of profileActs) {
    const act = a as { name?: string; title?: string; days?: unknown; day?: string; day_of_week?: string }
    const dayList = normalizeActDays(act.days)
    const matches = dayKeys.some((k) =>
      act.day_of_week === k || act.day === k || dayList.includes(k),
    )
    if (matches) {
      const name = String(act.name || act.title || '').trim()
      if (name) names.add(name)
    }
  }

  for (const a of tableActs || []) {
    const dayList = normalizeActDays(a.days)
    if (dayKeys.some((k) => dayList.includes(k))) {
      const name = String(a.name || '').trim()
      if (name) names.add(name)
    }
  }

  return [...names]
}

export async function gatherChildWeekData(
  userId: string,
  childId: string,
  weekStart: Date,
  weekEnd: Date,
  weekStartStr: string,
  weekEndStr: string,
): Promise<ChildWeekData> {
  const [todos, hanzi, events, logs, activities] = await Promise.all([
    fetchWeekTodos(userId, weekStart, weekEnd, childId),
    fetchWeekHanzi(userId, weekStart, weekEnd, childId),
    fetchWeekCalendarEvents(userId, childId, weekStartStr, weekEndStr),
    fetchWeekDailyLogs(userId, childId, weekStartStr, weekEndStr),
    fetchWeekActivities(userId, childId, weekStart),
  ])

  return {
    events,
    todos,
    hanzi,
    moodTrend: summarizeMoodTrend(logs),
    healthSummary: summarizeHealth(logs),
    activities,
  }
}

export function hasWeekData(data: ChildWeekData): boolean {
  return (
    data.todos.length > 0
    || data.hanzi.length > 0
    || data.events.length > 0
    || data.activities.length > 0
    || data.moodTrend !== '本周暂无心情记录'
    || data.healthSummary !== '本周暂无健康记录'
  )
}

export function buildLetterPrompt(params: {
  name: string
  age: number | null
  grade: string
  data: ChildWeekData
}) {
  const { name, age, grade, data } = params
  const ageLine = age != null ? `${age}岁` : '年龄未填'
  const gradeLine = grade || '年级未填'

  return `你是一位在泰国陪读的华人妈妈，正在给国内的爷爷奶奶/外公外婆写一封本周家书。

孩子信息：${name}，${ageLine}，${gradeLine}

本周数据：
- 学校活动：${data.events.length ? data.events.join('；') : '暂无记录'}
- 完成的事：${data.todos.length ? data.todos.join('、') : '暂无记录'}
- 学了汉字：${data.hanzi.length ? data.hanzi.join('、') : '暂无记录'}
- 这周状态：${data.moodTrend}；健康：${data.healthSummary}
- 课外活动：${data.activities.length ? data.activities.join('、') : '暂无记录'}

请写一封150-200字的家书：
- 语气：温柔、真实、有画面感
- 必须有一个具体的生活细节（不是清单）
- 必须有一句妈妈自己的感受
- 结尾：对家人的思念
- 不要写「本周完成了X件待办」这种冰冷的表述
- 要让爷爷奶奶读完想视频通话

请直接输出家书正文，不要标题或格式。`
}

export function buildMoments(data: ChildWeekData): string[] {
  const moments: string[] = []
  if (data.hanzi.length) {
    moments.push(`学了 ${data.hanzi.length} 个汉字：${data.hanzi.slice(0, 6).join('、')}${data.hanzi.length > 6 ? ' 等' : ''}`)
  }
  data.events.slice(0, 3).forEach((e) => moments.push(e))
  data.activities.slice(0, 2).forEach((a) => moments.push(`参加了 ${a}`))
  if (data.moodTrend !== '本周暂无心情记录') moments.push(data.moodTrend)
  data.todos.slice(0, 3).forEach((t) => moments.push(t))
  return moments.slice(0, 8)
}

export async function fetchActiveChildren(userId: string) {
  const { data } = await supabase
    .from('children')
    .select('id, name, grade, birthdate')
    .eq('user_id', userId)
    .or('status.eq.active,status.is.null')
    .order('created_at', { ascending: true })
  return data || []
}
