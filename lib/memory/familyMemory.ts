import type { SupabaseClient } from '@supabase/supabase-js'

export interface FamilyMemory {
  childPatterns: {
    forgetItems: Array<{
      item: string
      course: string
      forgetCount: number
      lastForgotten: string
    }>
    tiredDays: string[]
    healthTrend: 'improving' | 'stable' | 'declining'
    averageEnergy: number
  }
  familyRhythm: {
    todoCompletionHour: number
    preferredPaymentDay: number
    activeWeekdays: string[]
  }
  momPreferences: {
    interestedTopics: string[]
    ignoredTopics: string[]
    languageStyle: 'formal' | 'casual'
  }
  packingMemory: Array<{
    item: string
    course: string
    confidence: number
    isHighRisk: boolean
  }>
}

const DOW_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

type PackingRow = {
  item_name: string
  course: string | null
  forget_count: number
  confirm_count?: number
  confidence: number
  last_forgotten: string | null
  is_active: boolean
}

type DailyLogRow = {
  date: string
  health_status: string | null
  mood_status: string | null
  energy?: number | null
}

type TodoRow = {
  category: string | null
  completed_at: string | null
  created_at: string
  due_date?: string | null
}

type HabitRow = {
  created_at: string
}

function analyzeActiveWeekdays(habits: HabitRow[], todos: TodoRow[]): string[] {
  const dayCounts = new Map<number, number>()

  for (const h of habits) {
    const d = new Date(h.created_at).getDay()
    dayCounts.set(d, (dayCounts.get(d) || 0) + 1)
  }
  for (const t of todos) {
    if (!t.completed_at) continue
    const d = new Date(t.completed_at).getDay()
    dayCounts.set(d, (dayCounts.get(d) || 0) + 1)
  }

  return Array.from(dayCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dow]) => DOW_ZH[dow])
}

function analyzePreferredPaymentDay(todos: TodoRow[]): number {
  const wealthDays: number[] = []
  for (const t of todos) {
    if (t.category !== 'wealth' && t.category !== 'finance') continue
    const ref = t.completed_at || t.due_date
    if (!ref) continue
    const day = new Date(ref).getDate()
    if (day >= 1 && day <= 28) wealthDays.push(day)
  }
  if (wealthDays.length === 0) return 15
  return Math.round(wealthDays.reduce((a, b) => a + b, 0) / wealthDays.length)
}

function emptyChildPatterns(): FamilyMemory['childPatterns'] {
  return {
    forgetItems: [],
    tiredDays: [],
    healthTrend: 'stable',
    averageEnergy: 70,
  }
}

export async function getFamilyMemory(
  userId: string,
  childId: string,
  supabase: SupabaseClient,
): Promise<FamilyMemory> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  const childPackingPromise = childId
    ? supabase
      .from('family_packing_memory')
      .select('item_name, course, forget_count, confirm_count, confidence, last_forgotten, is_active')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('forget_count', { ascending: false })
      .limit(20)
    : Promise.resolve({ data: [] as PackingRow[] })

  const childDailyLogPromise = childId
    ? supabase
      .from('child_daily_log')
      .select('date, health_status, mood_status, energy')
      .eq('child_id', childId)
      .gte('date', thirtyDaysAgoStr)
      .order('date', { ascending: false })
    : Promise.resolve({ data: [] as DailyLogRow[] })

  const [
    packingResult,
    dailyLogResult,
    todoResult,
    interestResult,
    habitResult,
  ] = await Promise.all([
    childPackingPromise,
    childDailyLogPromise,
    supabase
      .from('todo_items')
      .select('category, completed_at, created_at, due_date')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('created_at', thirtyDaysAgoIso)
      .limit(50),
    supabase
      .from('interest_weights')
      .select('topic, weight')
      .eq('user_id', userId)
      .order('weight', { ascending: false }),
    supabase
      .from('user_habits')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgoIso)
      .limit(100),
  ])

  const packing = (packingResult.data || []) as PackingRow[]
  const dailyLogs = (dailyLogResult.data || []) as DailyLogRow[]
  const todos = (todoResult.data || []) as TodoRow[]
  const interests = interestResult.data || []
  const habits = (habitResult.data || []) as HabitRow[]

  const forgetItems = packing
    .filter((p) => (p.forget_count || 0) > 0)
    .map((p) => ({
      item: p.item_name,
      course: p.course || '',
      forgetCount: p.forget_count,
      lastForgotten: p.last_forgotten || '',
    }))

  const tiredDayMap = new Map<string, number>()
  for (const log of dailyLogs) {
    const isTired = log.health_status === 'sick'
      || log.mood_status === 'tired'
      || log.mood_status === 'anxious'
      || log.mood_status === 'upset'
    if (!isTired) continue
    const dow = new Date(`${log.date.slice(0, 10)}T12:00:00`).getDay()
    const label = DOW_ZH[dow]
    tiredDayMap.set(label, (tiredDayMap.get(label) || 0) + 1)
  }
  const tiredDays = Array.from(tiredDayMap.entries())
    .filter(([, count]) => count >= 2)
    .map(([day]) => day)

  const recentHealth = dailyLogs.slice(0, 7)
  const olderHealth = dailyLogs.slice(7, 14)
  const recentSick = recentHealth.filter((l) => l.health_status === 'sick').length
  const olderSick = olderHealth.filter((l) => l.health_status === 'sick').length
  const healthTrend = recentSick < olderSick
    ? 'improving'
    : recentSick > olderSick
      ? 'declining'
      : 'stable'

  const energySamples = dailyLogs
    .map((l) => l.energy)
    .filter((e): e is number => typeof e === 'number' && !Number.isNaN(e))
  const averageEnergy = energySamples.length > 0
    ? Math.round(energySamples.reduce((a, b) => a + b, 0) / energySamples.length)
    : 70

  const completionHours = todos
    .filter((t) => t.completed_at)
    .map((t) => new Date(t.completed_at!).getHours())
  const todoCompletionHour = completionHours.length > 0
    ? Math.round(completionHours.reduce((a, b) => a + b, 0) / completionHours.length)
    : 21

  const interestedTopics = interests
    .filter((i) => (i.weight ?? 0) >= 50)
    .map((i) => i.topic)
  const ignoredTopics = interests
    .filter((i) => (i.weight ?? 0) > 0 && (i.weight ?? 0) < 20)
    .map((i) => i.topic)

  return {
    childPatterns: childId
      ? { forgetItems, tiredDays, healthTrend, averageEnergy }
      : emptyChildPatterns(),
    familyRhythm: {
      todoCompletionHour,
      preferredPaymentDay: analyzePreferredPaymentDay(todos),
      activeWeekdays: analyzeActiveWeekdays(habits, todos),
    },
    momPreferences: {
      interestedTopics,
      ignoredTopics,
      languageStyle: 'casual',
    },
    packingMemory: packing.map((p) => ({
      item: p.item_name,
      course: p.course || '',
      confidence: p.confidence ?? 0.7,
      isHighRisk: (p.forget_count || 0) > 0,
    })),
  }
}

export function formatMemoryForClaude(memory: FamilyMemory): string {
  const parts: string[] = []

  if (memory.childPatterns.forgetItems.length > 0) {
    const items = memory.childPatterns.forgetItems
      .slice(0, 3)
      .map((i) => `${i.course ? `${i.course}课的` : ''}${i.item}（忘带${i.forgetCount}次）`)
      .join('、')
    parts.push(`孩子容易忘带：${items}`)
  }

  if (memory.childPatterns.tiredDays.length > 0) {
    parts.push(`孩子${memory.childPatterns.tiredDays.join('和')}容易疲惫`)
  }

  if (memory.childPatterns.healthTrend !== 'stable') {
    parts.push(`近期健康趋势：${memory.childPatterns.healthTrend === 'improving' ? '好转' : '需留意'}`)
  }

  if (memory.familyRhythm.todoCompletionHour) {
    parts.push(`妈妈通常在${memory.familyRhythm.todoCompletionHour}点左右处理待办`)
  }

  if (memory.familyRhythm.activeWeekdays.length > 0) {
    parts.push(`妈妈常在${memory.familyRhythm.activeWeekdays.join('、')}处理事务`)
  }

  if (memory.momPreferences.interestedTopics.length > 0) {
    parts.push(`关注：${memory.momPreferences.interestedTopics.slice(0, 3).join('、')}`)
  }

  if (memory.packingMemory.filter((p) => p.isHighRisk).length > 0) {
    const risky = memory.packingMemory
      .filter((p) => p.isHighRisk)
      .slice(0, 2)
      .map((p) => p.item)
      .join('、')
    parts.push(`高风险携带物品：${risky}`)
  }

  if (parts.length === 0) return ''

  return `【根对这个家庭的了解】\n${parts.join('\n')}`
}
