export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { checkLimit, recordUsage } from '@/lib/limits/usage'
import { isCachedRootDecisionValid } from '@/lib/action/decisionCache'
import { makeDecisionFast } from '@/lib/action/claudeDecision'
import { detectDimensionFromTitle, getDaysLeftForTodo } from '@/lib/action/instantDecision'
import { getExchangeRate } from '@/lib/action/exchangeForPlanner'
import type { FamilyContext } from '@/lib/action/rootBrain'
import { getUserLocation, type UserLocation } from '@/lib/intelligence/realtime'
import { getTodayWeather } from '@/lib/realtime/weather'
import { parseThbAmount } from '@/lib/realtime/exchangeRate'
import { FamilyService } from '@/lib/services/FamilyService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DEFAULT_LOCATION: UserLocation = {
  city: 'Bangkok',
  country: 'Thailand',
  timezone: 'Asia/Bangkok',
  lat: 13.75,
  lng: 100.5,
  source: 'default',
}

const DOW_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function gradeToAge(grade: string): number {
  const map: Record<string, number> = {
    K1: 4, K2: 5, K3: 6,
    G1: 7, G2: 8, G3: 9,
  }
  return map[grade.trim().toUpperCase()] || 6
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const todoId = String(body.source_id || body.todoId || '')
  if (!todoId) {
    return NextResponse.json({ ok: false, error: 'Missing source_id' }, { status: 400 })
  }

  const { data: todo, error } = await supabase
    .from('todo_items')
    .select('*')
    .eq('id', todoId)
    .eq('user_id', user.id)
    .single()

  if (error || !todo) {
    return NextResponse.json({ ok: false, error: 'Todo not found' }, { status: 404 })
  }

  const cacheCheck = isCachedRootDecisionValid(todo.ai_action_data)
  if (cacheCheck.valid && cacheCheck.decision) {
    return NextResponse.json({
      ok: true,
      decision: cacheCheck.decision,
      autoCompleted: [],
      fromCache: true,
    })
  }

  const oneTapLimit = await checkLimit(user.id, 'one_tap', user.email)
  if (!oneTapLimit.allowed) {
    return NextResponse.json(
      { error: 'limit_reached', feature: 'one_tap' },
      { status: 429 },
    )
  }

  const startTime = Date.now()
  console.log('[deep-analyze] start', todoId)

  try {
    const childId = String(todo.child_id || '')
    const aiExtra = (todo.ai_action_data || {}) as Record<string, unknown>
    const amount = (aiExtra.amount as number | undefined) ?? parseThbAmount(String(todo.title || ''))

    const [familyResult, weatherResult, exchangeResult, location] = await Promise.all([
      FamilyService.getData(user.id, {
        childId: childId || undefined,
        includeTodos: false,
        includeCalendar: false,
        client: supabase,
      }),
      getTodayWeather(undefined).catch(() => null),
      getExchangeRate().catch(() => null),
      getUserLocation(user.id, supabase).catch(() => DEFAULT_LOCATION),
    ])

    const child = familyResult.activeChild
    console.log('[deep-analyze] data loaded', Date.now() - startTime, 'ms')

    const dimension = String(todo.category || detectDimensionFromTitle(String(todo.title || '')))
    const daysLeft = getDaysLeftForTodo(todo.due_date as string | undefined)
    const now = new Date()

    const slimContext: FamilyContext = {
      mom: {
        city: location.city,
        country: location.country,
        language: 'zh',
        alone: true,
        timezone: location.timezone,
        coordinates: { lat: location.lat, lng: location.lng },
      },
      child: {
        name: child?.name || '',
        nameEn: child?.name || '',
        age: child?.grade ? gradeToAge(child.grade) : null,
        grade: child?.grade || '',
        school: child?.school_name || child?.school || '',
        teacherEmail: '',
        teacherName: '',
        todayClasses: [],
        healthStatus: 'normal',
      },
      todo: {
        id: String(todo.id),
        title: String(todo.title || ''),
        dimension,
        priority: (todo.priority as string) || null,
        dueDate: (todo.due_date as string) || null,
        daysLeft,
        amount: amount ?? null,
        currency: (aiExtra.currency as string) || (amount ? 'THB' : null),
        notes: (todo.description as string) || null,
      },
      realtime: {
        weather: weatherResult
          ? {
            condition: weatherResult.condition,
            hasRain: weatherResult.hasRain,
            temp: weatherResult.temp,
            rainProbability: weatherResult.rainProbability,
          }
          : null,
        exchange: exchangeResult
          ? {
            rates: exchangeResult.rates,
            trend: exchangeResult.trend,
            trendText: exchangeResult.trendText,
            savingsTip: exchangeResult.savingsTip,
          }
          : null,
        currentHour: now.getHours(),
        dayOfWeek: DOW_ZH[now.getDay()],
      },
      localInfo: {},
      location,
      upcomingEvents: [],
      packingMemory: [],
      familyMemory: {
        childPatterns: { forgetItems: [], tiredDays: [], healthTrend: 'stable', averageEnergy: 70 },
        familyRhythm: { todoCompletionHour: 21, preferredPaymentDay: 15, activeWeekdays: [] },
        momPreferences: { interestedTopics: [], ignoredTopics: [], languageStyle: 'casual' },
        packingMemory: [],
      },
      mcp: { gmail: false, calendar: false },
    }

    console.log('[deep-analyze] context built', Date.now() - startTime, 'ms')

    const decision = await makeDecisionFast(slimContext)

    console.log('[deep-analyze] decision done', Date.now() - startTime, 'ms')

    const cachedAt = new Date().toISOString()
    await supabase
      .from('todo_items')
      .update({
        ai_action_data: {
          ...(aiExtra || {}),
          root_decision: { ...decision, isPartial: false },
          prepared_at: cachedAt,
          cached_at: cachedAt,
          deep_analysis_pending: false,
        },
      })
      .eq('id', todoId)
      .eq('user_id', user.id)

    await recordUsage(user.id, 'one_tap')

    console.log('[deep-analyze] complete', Date.now() - startTime, 'ms')

    return NextResponse.json({
      ok: true,
      decision: { ...decision, isPartial: false },
      autoCompleted: [],
      fromCache: false,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Deep analysis failed'
    console.error('[deep-analyze] error', Date.now() - startTime, 'ms', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
