import type { SupabaseClient } from '@supabase/supabase-js'
import { getExchangeRate } from '@/lib/action/exchangeForPlanner'
import type { FamilyContext, LocalInfo } from '@/lib/action/rootBrain'
import {
  getUserLocation,
  searchNearby,
  searchRealtimeInfo,
  type UserLocation,
} from '@/lib/intelligence/realtime'
import { lookupAirlinePhone, THAI_FORMS } from '@/lib/knowledge/base'
import { checkMCPConnection } from '@/lib/mcp/googleMcp'
import { getUserHour } from '@/lib/geofence'
import { getTodayWeather } from '@/lib/realtime/weather'
import { parseThbAmount } from '@/lib/realtime/exchangeRate'
import { FamilyService } from '@/lib/services/FamilyService'

const DOW_KEY_BY_NUM: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
}

const DOW_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function calculateAge(birthdate?: string | null): number | null {
  if (!birthdate) return null
  const birth = new Date(`${birthdate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function getDaysLeft(dueDate?: string | null): number | null {
  if (!dueDate) return null
  const due = new Date(`${dueDate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

async function enrichChildContext(
  supabase: SupabaseClient,
  userId: string,
  childId: string | undefined,
  familyChild: {
    id: string
    name: string
    grade?: string | null
    school_name?: string | null
    school?: string | null
    birthdate?: string | null
  } | null,
): Promise<FamilyContext['child']> {
  const todayYmd = new Date().toISOString().slice(0, 10)
  const dowKey = DOW_KEY_BY_NUM[new Date(`${todayYmd}T12:00:00`).getDay()]

  let teacherName = ''
  let teacherEmail = ''
  let nameEn = familyChild?.name || ''
  let todayClasses: Array<{ subject?: string; category?: string }> = []
  let healthStatus = 'normal'

  if (childId) {
    const [{ data: profile }, { data: log }] = await Promise.all([
      supabase
        .from('child_profiles')
        .select('class_schedule, teacher_name, teacher_email, name_en')
        .eq('child_id', childId)
        .maybeSingle(),
      supabase
        .from('child_daily_log')
        .select('health_status')
        .eq('user_id', userId)
        .eq('child_id', childId)
        .eq('date', todayYmd)
        .maybeSingle(),
    ])

    teacherName = String(profile?.teacher_name || '')
    teacherEmail = String(profile?.teacher_email || '')
    nameEn = String(profile?.name_en || familyChild?.name || '')
    healthStatus = String(log?.health_status || 'normal')

    const schedule = profile?.class_schedule?.[dowKey]
    if (Array.isArray(schedule)) {
      todayClasses = schedule.filter((c) => typeof c === 'object' && c !== null) as Array<{ subject?: string; category?: string }>
    }
  }

  return {
    name: familyChild?.name || '',
    nameEn,
    age: calculateAge(familyChild?.birthdate),
    grade: String(familyChild?.grade || ''),
    school: String(familyChild?.school_name || familyChild?.school || ''),
    teacherName,
    teacherEmail,
    todayClasses,
    healthStatus,
  }
}

async function getLocalInfo(
  dimension: string,
  title: string,
  location: UserLocation,
): Promise<LocalInfo> {
  const info: LocalInfo = {}
  const searches: Promise<void>[] = []
  const city = location.city || location.country || ''

  const flightMatch = title.match(/([A-Z]{2})\d+/i)
  if (flightMatch) {
    info.airlinePhone = lookupAirlinePhone(flightMatch[0])
  }

  if (/泰国|Thailand/i.test(location.country) || location.country === '') {
    if (dimension === 'compliance' || /签证|移民|报到/.test(title)) {
      info.thaiForms = { ...THAI_FORMS }
    }
  }

  if (
    dimension === 'medical'
    || title.includes('生病')
    || title.includes('急诊')
    || title.includes('医院')
  ) {
    searches.push(
      searchNearby({
        query: 'hospital emergency chinese speaking',
        location: { lat: location.lat, lng: location.lng },
        city,
        urgency: /急诊|emergency/i.test(title) ? 'emergency' : 'normal',
      }).then((hospitals) => { info.hospitals = hospitals }),
    )
  }

  if (
    dimension === 'compliance'
    || title.includes('签证')
    || title.includes('移民')
    || title.includes('报到')
  ) {
    searches.push(
      searchNearby({
        query: 'immigration office',
        location: { lat: location.lat, lng: location.lng },
        city,
      }).then((offices) => { info.immigrationOffices = offices }),
      searchRealtimeInfo(
        `${location.city} 华人陪读签证续签流程和所需材料 ${new Date().getFullYear()}年最新`,
        location.city || location.country,
      ).then((policy) => { if (policy) info.visaPolicy = policy }),
    )
  }

  if (
    title.includes('泰服')
    || title.includes('游泳')
    || title.includes('运动')
    || title.includes('装备')
    || title.includes('购物')
  ) {
    const searchQuery = /泳|运动/.test(title)
      ? 'sports store swimming equipment'
      : 'traditional clothing market local'

    searches.push(
      searchNearby({
        query: searchQuery,
        location: { lat: location.lat, lng: location.lng },
        city,
      }).then((shops) => { info.shops = shops }),
    )
  }

  if (
    dimension === 'mobility'
    || title.includes('航班')
    || title.includes('机场')
  ) {
    searches.push(
      searchNearby({
        query: 'international airport',
        location: { lat: location.lat, lng: location.lng },
        city,
      }).then((airports) => { info.airports = airports }),
    )
  }

  await Promise.allSettled(searches)
  return info
}

export async function buildFamilyContext(
  userId: string,
  todoId: string,
  supabase: SupabaseClient,
): Promise<FamilyContext> {
  const location = await getUserLocation(userId, supabase)

  const [
    familyData,
    todoResult,
    packingResult,
    gmailConnected,
    calendarConnected,
  ] = await Promise.all([
    FamilyService.getData(userId, {
      includeTodos: true,
      includeCalendar: true,
      daysAhead: 30,
      client: supabase,
    }),
    supabase.from('todo_items').select('*').eq('id', todoId).eq('user_id', userId).single(),
    supabase
      .from('family_packing_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(20),
    checkMCPConnection(userId, 'gmail'),
    checkMCPConnection(userId, 'calendar'),
  ])

  const todo = todoResult.data as Record<string, unknown> | null
  const activeChild = familyData.activeChild
  const childId = String(todo?.child_id || activeChild?.id || '')
  const dimension = String(todo?.category || todo?.dimension || 'education')
  const title = String(todo?.title || '')

  const childContext = await enrichChildContext(
    supabase,
    userId,
    childId || undefined,
    activeChild,
  )

  const weatherCity = location.city || undefined
  const [weather, exchange, localInfo] = await Promise.all([
    weatherCity ? getTodayWeather(weatherCity) : Promise.resolve(null),
    getExchangeRate(),
    getLocalInfo(dimension, title, location),
  ])

  const aiExtra = (todo?.ai_action_data || {}) as Record<string, unknown>
  const amount = (aiExtra.amount as number | undefined) ?? parseThbAmount(title)
  const currentHour = getUserHour(location.timezone)

  return {
    mom: {
      city: location.city,
      country: location.country,
      language: 'zh',
      alone: true,
      timezone: location.timezone,
      coordinates: { lat: location.lat, lng: location.lng },
    },
    child: childContext,
    todo: {
      id: String(todo?.id || todoId),
      title,
      dimension,
      priority: (todo?.priority as string) || null,
      dueDate: (todo?.due_date as string) || null,
      daysLeft: getDaysLeft(todo?.due_date as string | undefined),
      amount: amount ?? null,
      currency: (aiExtra.currency as string) || (amount ? 'THB' : null),
      notes: (todo?.description as string) || (aiExtra.notes as string) || null,
    },
    upcomingEvents: familyData.calendar as unknown as Record<string, unknown>[],
    realtime: {
      weather: weather
        ? {
          condition: weather.condition,
          hasRain: weather.hasRain,
          temp: weather.temp,
          rainProbability: weather.rainProbability,
        }
        : null,
      exchange: exchange
        ? {
          rates: exchange.rates,
          trend: exchange.trend,
          trendText: exchange.trendText,
          savingsTip: exchange.savingsTip,
        }
        : null,
      currentHour,
      dayOfWeek: DOW_ZH[new Date().getDay()],
    },
    localInfo,
    location,
    packingMemory: (packingResult.data || []) as Record<string, unknown>[],
    mcp: {
      gmail: gmailConnected,
      calendar: calendarConnected,
    },
  }
}