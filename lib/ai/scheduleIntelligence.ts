import type { SupabaseClient } from '@supabase/supabase-js'

export interface CourseLoad {
  subject: string
  category: string
  loadScore: number
  loadReason: string
  recoveryValue: number
}

export interface DayLoad {
  day: string
  totalLoad: number
  peakHour: string
  recoveryTime: number
  summary: string
}

export interface WeeklyScheduleIntelligence {
  courses: CourseLoad[]
  days: DayLoad[]
  hardestDay: string
  easiestDay: string
  weekSummary: string
  parentTips: string[]
  lastAnalyzed: string
  scheduleHash?: string
}

export const SCHEDULE_INTELLIGENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const DAY_NAMES: Record<string, string> = {
  mon: '周一',
  tue: '周二',
  wed: '周三',
  thu: '周四',
  fri: '周五',
}

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

function inferChildAge(birthdate?: string | null, grade?: string): number {
  if (birthdate) {
    const birth = new Date(birthdate)
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date()
      let age = now.getFullYear() - birth.getFullYear()
      const md = now.getMonth() - birth.getMonth()
      if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age -= 1
      if (age > 0 && age < 25) return age
    }
  }
  const g = String(grade || '').toUpperCase()
  if (g.includes('K1')) return 4
  if (g.includes('K2')) return 5
  if (g.includes('K3') || g.includes('K')) return 6
  const m = g.match(/G?(\d+)/)
  if (m) return parseInt(m[1], 10) + 6
  return 8
}

export function hashClassSchedule(classSchedule: Record<string, unknown>): string {
  return JSON.stringify(classSchedule ?? {})
}

export function isScheduleIntelligenceFresh(
  cached: WeeklyScheduleIntelligence | null | undefined,
  classSchedule: Record<string, unknown>,
): boolean {
  if (!cached?.lastAnalyzed || !Array.isArray(cached.courses) || cached.courses.length === 0) {
    return false
  }
  if (cached.scheduleHash !== hashClassSchedule(classSchedule)) return false
  const age = Date.now() - new Date(cached.lastAnalyzed).getTime()
  return age >= 0 && age < SCHEDULE_INTELLIGENCE_TTL_MS
}

function stripJsonFences(text: string): string {
  return text.replace(/```json|```/g, '').trim()
}

function parseIntelligenceJson(raw: string): WeeklyScheduleIntelligence | null {
  const clean = stripJsonFences(raw)
  try {
    return JSON.parse(clean) as WeeklyScheduleIntelligence
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as WeeklyScheduleIntelligence
    } catch {
      return null
    }
  }
}

function emptyIntelligence(): WeeklyScheduleIntelligence {
  return {
    courses: [],
    days: [],
    hardestDay: '',
    easiestDay: '',
    weekSummary: '',
    parentTips: [],
    lastAnalyzed: new Date().toISOString(),
  }
}

function normalizeIntelligence(
  raw: WeeklyScheduleIntelligence,
  scheduleHash: string,
): WeeklyScheduleIntelligence {
  return {
    courses: Array.isArray(raw.courses) ? raw.courses : [],
    days: Array.isArray(raw.days) ? raw.days : [],
    hardestDay: String(raw.hardestDay || ''),
    easiestDay: String(raw.easiestDay || ''),
    weekSummary: String(raw.weekSummary || ''),
    parentTips: Array.isArray(raw.parentTips) ? raw.parentTips.map(String) : [],
    lastAnalyzed: new Date().toISOString(),
    scheduleHash,
  }
}

function buildSchedulePrompt(
  child: { name: string; age: number; grade: string; school_name: string },
  classSchedule: Record<string, unknown[]>,
): { prompt: string; hasClasses: boolean } {
  const daySchedules: string[] = []

  for (const [day, classes] of Object.entries(classSchedule)) {
    if (!Array.isArray(classes)) continue
    const realClasses = classes.filter((c) => {
      if (!c || typeof c !== 'object') return false
      const cat = String((c as { category?: string }).category || '').toLowerCase()
      return cat === 'class' || cat === 'activity' || cat === 'break'
    })
    if (realClasses.length > 0) {
      const label = DAY_NAMES[day] || day
      daySchedules.push(
        `${label}：` +
        realClasses
          .map((c) => {
            const row = c as { time?: string; subject?: string }
            return `${row.time || ''} ${row.subject || ''}`.trim()
          })
          .join('、'),
      )
    }
  }

  const hasClasses = daySchedules.length > 0
  const prompt = `你是一位专业的儿童教育心理学专家。

孩子信息：
- 姓名：${child.name}
- 年龄：${child.age}岁
- 年级：${child.grade || '未知'}
- 学校：${child.school_name || '未知'}（国际学校）
- 母语：中文，在海外上英文学校

本周课表：
${hasClasses ? daySchedules.join('\n') : '（暂无课表）'}

请从儿童发展心理学角度分析：

1. 每门课程对这个年龄段孩子的认知负荷
   考虑因素：
   - 该年龄的认知发展阶段
   - 语言难度（英文/泰文对华人孩子）
   - 课程类型（创意/逻辑/体力/社交）
   - 在一天中的位置（早上精力好 vs 下午疲惫）

2. 每天的整体负荷预测

3. 给妈妈的实用建议
   （接孩子时说什么、准备什么零食、什么时候做作业）

返回JSON：
{
  "courses": [
    {
      "subject": "Math",
      "category": "class",
      "loadScore": 1.2,
      "loadReason": "K3数学以游戏为主，但需要专注，中等负荷",
      "recoveryValue": 0
    }
  ],
  "days": [
    {
      "day": "mon",
      "totalLoad": 1.3,
      "peakHour": "10:00",
      "recoveryTime": 60,
      "summary": "周一有Math和ELA，整体中等"
    }
  ],
  "hardestDay": "wed",
  "easiestDay": "fri",
  "weekSummary": "本周整体适中，周三有PE+Thai+Math是最累的一天",
  "parentTips": [
    "周三接孩子时带点水果，他上了体育课加泰语课会很累"
  ]
}`

  return { prompt, hasClasses }
}

export async function analyzeScheduleIntelligence(
  child: {
    name: string
    age: number
    grade: string
    school_name: string
    birthdate?: string | null
  },
  classSchedule: Record<string, unknown[]>,
): Promise<WeeklyScheduleIntelligence> {
  const scheduleHash = hashClassSchedule(classSchedule)
  const age = child.age || inferChildAge(child.birthdate, child.grade)
  const { prompt, hasClasses } = buildSchedulePrompt(
    { ...child, age },
    classSchedule,
  )

  if (!hasClasses) {
    return { ...emptyIntelligence(), scheduleHash }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[scheduleIntelligence] ANTHROPIC_API_KEY not configured')
    return { ...emptyIntelligence(), scheduleHash }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('[scheduleIntelligence] API error:', JSON.stringify(data).slice(0, 500))
      return { ...emptyIntelligence(), scheduleHash }
    }

    const text = data.content?.[0]?.text || ''
    const parsed = parseIntelligenceJson(text)
    if (!parsed) {
      console.error('[scheduleIntelligence] JSON parse failed:', text.slice(0, 300))
      return { ...emptyIntelligence(), scheduleHash }
    }

    return normalizeIntelligence(parsed, scheduleHash)
  } catch (e) {
    console.error('[scheduleIntelligence] analyze failed:', e)
    return { ...emptyIntelligence(), scheduleHash }
  }
}

export function findCourseLoad(
  intelligence: WeeklyScheduleIntelligence | null | undefined,
  subject: string,
): CourseLoad | undefined {
  if (!intelligence?.courses?.length || !subject) return undefined
  const key = subject.trim()
  return intelligence.courses.find(
    (c) => c.subject === key || key.includes(c.subject) || c.subject.includes(key),
  )
}

export function getDayLoad(
  intelligence: WeeklyScheduleIntelligence | null | undefined,
  dayKey: string,
): DayLoad | undefined {
  return intelligence?.days?.find((d) => d.day === dayKey)
}

export function getPickupMomentSubtitle(
  intelligence: WeeklyScheduleIntelligence | null | undefined,
  dayKey: string,
): string | undefined {
  if (!intelligence) return undefined
  const parts: string[] = []
  const dayLoad = getDayLoad(intelligence, dayKey)
  if (dayLoad?.summary) parts.push(dayLoad.summary)
  if (intelligence.parentTips?.[0]) parts.push(intelligence.parentTips[0])
  return parts.length ? parts.join('\n') : undefined
}

type RefreshParams = {
  userId: string
  childId: string
  classSchedule: Record<string, unknown>
  force?: boolean
  supabase: SupabaseClient
}

export async function refreshScheduleIntelligence(params: RefreshParams): Promise<WeeklyScheduleIntelligence | null> {
  const { userId, childId, classSchedule, force, supabase } = params
  const schedule = classSchedule as Record<string, unknown[]>

  const [{ data: child }, { data: profile }] = await Promise.all([
    supabase.from('children').select('name, grade, school_name, birthdate').eq('id', childId).maybeSingle(),
    supabase.from('child_profiles').select('schedule_intelligence').eq('child_id', childId).maybeSingle(),
  ])

  if (!child) return null

  const cached = profile?.schedule_intelligence as WeeklyScheduleIntelligence | null | undefined
  if (!force && isScheduleIntelligenceFresh(cached, classSchedule)) {
    return cached ?? null
  }

  const intelligence = await analyzeScheduleIntelligence(
    {
      name: String(child.name || '孩子'),
      age: inferChildAge(child.birthdate as string | null | undefined, String(child.grade || '')),
      grade: String(child.grade || ''),
      school_name: String(child.school_name || ''),
      birthdate: child.birthdate as string | null | undefined,
    },
    schedule,
  )

  const { error } = await supabase.from('child_profiles').upsert(
    { user_id: userId, child_id: childId, schedule_intelligence: intelligence },
    { onConflict: 'child_id' },
  )

  if (error) {
    console.error('[scheduleIntelligence] save failed:', error.message)
  }

  return intelligence
}
