import { createClient } from '@supabase/supabase-js'
import { Geofence, UserLocation } from './types'
import { GEOFENCES, DEFAULT_GEOFENCE } from './data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ══ 距离计算（Haversine）══
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // 地球半径 km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ══ 坐标匹配围栏 ══
function matchGeofence(lat: number, lng: number): Geofence {
  let best: Geofence | null = null
  let bestDistance = Infinity

  for (const fence of GEOFENCES) {
    const dist = calcDistance(lat, lng, fence.lat, fence.lng)
    if (dist <= fence.radius_km && dist < bestDistance) {
      best = fence
      bestDistance = dist
    }
  }

  if (best) return best

  // 没有精确匹配，找最近的
  for (const fence of GEOFENCES) {
    const dist = calcDistance(lat, lng, fence.lat, fence.lng)
    if (dist < bestDistance) {
      best = fence
      bestDistance = dist
    }
  }

  return best || DEFAULT_GEOFENCE
}

// ══ 城市名匹配围栏 ══
function matchGeofenceByCity(city: string, countryCode?: string): Geofence {
  const cityLower = city.toLowerCase()

  // 精确匹配
  const exact = GEOFENCES.find(f =>
    f.city.toLowerCase() === cityLower ||
    f.name.toLowerCase() === cityLower
  )
  if (exact) return exact

  // 模糊匹配
  const fuzzy = GEOFENCES.find(f =>
    f.city.toLowerCase().includes(cityLower) ||
    cityLower.includes(f.city.toLowerCase())
  )
  if (fuzzy) return fuzzy

  // 同国家首都
  if (countryCode) {
    const sameCountry = GEOFENCES.filter(f => f.country_code === countryCode)
    if (sameCountry.length) return sameCountry[0]
  }

  return DEFAULT_GEOFENCE
}

// ══ 从 family_places 解析位置 ══
async function resolveFromFamilyPlaces(userId: string): Promise<{ lat: number; lng: number; city: string } | null> {
  const { data: places } = await supabase
    .from('family_places')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .limit(5)

  if (!places?.length) return null

  const primary = places.find(p => p.is_primary) || places[0]

  // 有坐标直接用
  if (primary.lat && primary.lng) {
    return { lat: primary.lat, lng: primary.lng, city: primary.city || primary.name }
  }

  // 有城市名
  if (primary.city || primary.name) {
    return { lat: 0, lng: 0, city: primary.city || primary.name }
  }

  return null
}

// ══ 构建 UserLocation ══
function buildUserLocation(
  userId: string,
  fence: Geofence,
  source: UserLocation['source'],
  accuracy: UserLocation['accuracy'],
  lat?: number,
  lng?: number
): UserLocation {
  return {
    user_id: userId,
    city: fence.city,
    country: fence.country,
    country_code: fence.country_code,
    timezone: fence.timezone,
    lat: lat || fence.lat,
    lng: lng || fence.lng,
    geofence_id: fence.id,
    geofence_name: fence.name,
    local_config: {
      news_keywords: fence.local_sources.news_keywords,
      official_sites: fence.local_sources.official_sites,
      patrol_prompt: fence.local_sources.patrol_prompt,
      emergency: fence.local_sources.emergency,
      form_types: fence.form_types,
      currency: fence.currency,
      currency_symbol: fence.currency_symbol,
      calling_code: fence.calling_code,
    },
    source,
    accuracy,
  }
}

// ══ 保存到数据库 ══
async function saveUserLocation(location: UserLocation): Promise<void> {
  await supabase.from('user_locations').upsert({
    ...location,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

// ══ 主接口：获取用户位置 ══
export async function getUserLocation(userId: string): Promise<UserLocation> {
  // 1. 先读缓存
  const { data: cached } = await supabase
    .from('user_locations')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (cached) {
    const ageHours = (Date.now() - new Date(cached.updated_at).getTime()) / 3600000
    if (ageHours < 24) {
      return cached as UserLocation
    }
  }

  // 2. 从 family_places 解析
  const placesResult = await resolveFromFamilyPlaces(userId)

  if (placesResult) {
    let fence: Geofence

    if (placesResult.lat && placesResult.lng) {
      // 有坐标，精确匹配
      fence = matchGeofence(placesResult.lat, placesResult.lng)
      const location = buildUserLocation(userId, fence, 'manual', 'high', placesResult.lat, placesResult.lng)
      await saveUserLocation(location)
      return location
    } else if (placesResult.city) {
      // 只有城市名，模糊匹配
      fence = matchGeofenceByCity(placesResult.city)
      const location = buildUserLocation(userId, fence, 'manual', 'medium')
      await saveUserLocation(location)
      return location
    }
  }

  // 3. 降级：用默认围栏（清迈，因为产品主要用户在清迈）
  const defaultFence = GEOFENCES.find(f => f.id === 'th-chiangmai') || DEFAULT_GEOFENCE
  const location = buildUserLocation(userId, defaultFence, 'default', 'low')
  await saveUserLocation(location)
  return location
}

// ══ 更新位置（GPS）══
export async function updateUserLocationByGPS(
  userId: string,
  lat: number,
  lng: number
): Promise<UserLocation> {
  const fence = matchGeofence(lat, lng)
  const location = buildUserLocation(userId, fence, 'gps', 'high', lat, lng)
  await saveUserLocation(location)
  return location
}

// ══ 工具函数 ══

// 获取用户当前小时（按时区）
export function getUserHour(timezone: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    return parseInt(formatter.format(now))
  } catch {
    return new Date().getHours()
  }
}

// 获取用户当前时间字符串
export function getUserTimeString(timezone: string): string {
  try {
    return new Date().toLocaleString('zh-CN', { timeZone: timezone })
  } catch {
    return new Date().toLocaleString('zh-CN')
  }
}

// 判断是否是晨报时间（用户时区的 6:25-6:35）
export function isMorningReportTime(timezone: string): boolean {
  const hour = getUserHour(timezone)
  const now = new Date()
  const minute = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, minute: 'numeric',
  }).format(now))
  return hour === 6 && minute >= 25 && minute <= 35
}

// 判断是否是晚报时间（用户时区的 20:55-21:05）
export function isEveningReportTime(timezone: string): boolean {
  const hour = getUserHour(timezone)
  const now = new Date()
  const minute = parseInt(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, minute: 'numeric',
  }).format(now))
  return hour === 21 && minute <= 5
}

// 获取所有支持的围栏列表
export function getAllGeofences(): Geofence[] {
  return GEOFENCES
}

// 根据 country_code 筛选表格
export function getFormTypesForCountry(countryCode: string): string[] {
  const fence = GEOFENCES.find(f => f.country_code === countryCode)
  return fence?.form_types || DEFAULT_GEOFENCE.form_types
}
