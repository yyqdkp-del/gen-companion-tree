import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserLocation as getGeofenceUserLocation } from '@/lib/geofence'
import { resolveResidentCity } from '@/lib/family/resolveResidentCity'
import { geminiGenerateContentUrl } from '@/lib/ai/models'

export interface UserLocation {
  city: string
  country: string
  timezone: string
  lat: number
  lng: number
  source: 'geofence' | 'profile' | 'default'
}

export interface PlaceResult {
  name: string
  name_zh?: string
  address: string
  phone: string | null
  lat?: number
  lng?: number
  rating?: number
  open_now?: boolean
  place_id?: string
  google_maps_url?: string
  has_chinese?: boolean
  has_english?: boolean
}

const COMMON_COORDS: Record<string, { lat: number; lng: number }> = {
  'chiang mai': { lat: 18.7883, lng: 98.9853 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  'kuala lumpur': { lat: 3.139, lng: 101.6869 },
  london: { lat: 51.5074, lng: -0.1278 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  'new york': { lat: 40.7128, lng: -74.006 },
  dubai: { lat: 25.2048, lng: 55.2708 },
}

const COMMON_TIMEZONES: Record<string, string> = {
  'chiang mai': 'Asia/Bangkok',
  bangkok: 'Asia/Bangkok',
  singapore: 'Asia/Singapore',
  'kuala lumpur': 'Asia/Kuala_Lumpur',
  london: 'Europe/London',
  sydney: 'Australia/Sydney',
  tokyo: 'Asia/Tokyo',
  'new york': 'America/New_York',
  dubai: 'Asia/Dubai',
}

function geminiKey(): string | null {
  return process.env.GOOGLE_AI_API_KEY || null
}

function normalizeCityKey(city: string): string {
  return city.toLowerCase().trim()
}

function parseJsonFromText<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim()
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    const objectMatch = cleaned.match(/\{[\s\S]*\}/)
    const raw = arrayMatch?.[0] || objectMatch?.[0] || cleaned
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizePlace(raw: Record<string, unknown>, query: string, city: string): PlaceResult {
  const name = String(raw.name || raw.name_zh || query)
  const mapsFallback =
    `https://maps.google.com/?q=${encodeURIComponent(name)}+${encodeURIComponent(city)}`

  return {
    name,
    name_zh: raw.name_zh ? String(raw.name_zh) : undefined,
    address: String(raw.address || city),
    phone: raw.phone ? String(raw.phone) : null,
    lat: typeof raw.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw.lng === 'number' ? raw.lng : undefined,
    open_now: typeof raw.open_now === 'boolean' ? raw.open_now : undefined,
    google_maps_url: raw.google_maps_url
      ? String(raw.google_maps_url)
      : mapsFallback,
    has_chinese: typeof raw.has_chinese === 'boolean' ? raw.has_chinese : undefined,
    has_english: typeof raw.has_english === 'boolean' ? raw.has_english : undefined,
    place_id: raw.place_id ? String(raw.place_id) : undefined,
  }
}

export async function searchNearby(params: {
  query: string
  location: { lat?: number; lng?: number }
  city: string
  urgency?: 'emergency' | 'normal'
}): Promise<PlaceResult[]> {
  const key = geminiKey()
  const city = params.city.trim()
  const limit = params.urgency === 'emergency' ? 1 : 3
  const mapsSearchUrl =
    `https://maps.google.com/?q=${encodeURIComponent(params.query)}+${encodeURIComponent(city)}`

  if (!key || !city) {
    return [{
      name: `搜索${params.query}`,
      address: city || '',
      phone: null,
      google_maps_url: mapsSearchUrl,
      has_chinese: false,
      has_english: true,
    }]
  }

  const prompt = `搜索${city}的${params.query}。

请返回${limit}个真实的结果，格式为JSON数组：
[{
  "name": "医院或地点名称",
  "name_zh": "中文名（如有）",
  "address": "详细地址",
  "phone": "电话号码",
  "has_chinese": true/false,
  "has_english": true/false,
  "open_now": true/false,
  "google_maps_url": "https://maps.google.com/?q=地点名+城市名"
}]

只返回真实存在的地点，不能编造。
如果不确定，google_maps_url 用搜索链接代替：
${mapsSearchUrl}`

  try {
    const response = await fetch(geminiGenerateContentUrl(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 1000 },
      }),
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      console.error('[searchNearby] gemini error:', response.status)
      return [{
        name: `搜索${params.query}`,
        address: city,
        phone: null,
        google_maps_url: mapsSearchUrl,
        has_chinese: false,
        has_english: true,
      }]
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = parseJsonFromText<Array<Record<string, unknown>>>(text)

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, limit).map((item) => normalizePlace(item, params.query, city))
    }
  } catch (e) {
    console.error('[searchNearby]', e)
  }

  return [{
    name: `搜索${params.query}`,
    address: city,
    phone: null,
    google_maps_url: mapsSearchUrl,
    has_chinese: false,
    has_english: true,
  }]
}

export async function searchRealtimeInfo(
  query: string,
  location: string,
): Promise<string> {
  const key = geminiKey()
  if (!key) return ''

  try {
    const response = await fetch(geminiGenerateContentUrl(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `搜索${location}的以下信息，只返回事实，不要编造：\n${query}`,
          }],
        }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 1000 },
      }),
    })

    if (!response.ok) return ''

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (e) {
    console.error('[searchRealtimeInfo]', e)
    return ''
  }
}

async function geocodeCity(city: string): Promise<{ lat: number; lng: number }> {
  const key = normalizeCityKey(city)
  if (COMMON_COORDS[key]) return COMMON_COORDS[key]

  const apiKey = geminiKey()
  if (!apiKey || !city.trim()) return { lat: 13.7563, lng: 100.5018 }

  try {
    const response = await fetch(geminiGenerateContentUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${city}的经纬度是多少？只返回JSON：{"lat": 数字, "lng": 数字}` }],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 100 },
      }),
      next: { revalidate: 86400 },
    })

    if (!response.ok) return { lat: 13.7563, lng: 100.5018 }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = parseJsonFromText<{ lat?: number; lng?: number }>(text)
    if (parsed?.lat != null && parsed?.lng != null) {
      return { lat: parsed.lat, lng: parsed.lng }
    }
  } catch {
    /* fall through */
  }

  return { lat: 13.7563, lng: 100.5018 }
}

async function getTimezone(city: string): Promise<string> {
  const key = normalizeCityKey(city)
  if (COMMON_TIMEZONES[key]) return COMMON_TIMEZONES[key]

  const apiKey = geminiKey()
  if (!apiKey || !city.trim()) return 'Asia/Bangkok'

  try {
    const response = await fetch(geminiGenerateContentUrl(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${city}的IANA时区名是什么？只返回时区名，如Asia/Singapore` }],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 50 },
      }),
      next: { revalidate: 86400 },
    })

    if (!response.ok) return 'Asia/Bangkok'

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const tz = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (tz && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(tz)) return tz
  } catch {
    /* fall through */
  }

  return 'Asia/Bangkok'
}

export async function getUserLocation(
  userId: string,
  supabase: SupabaseClient,
): Promise<UserLocation> {
  const { data: geofenceRow } = await supabase
    .from('user_locations')
    .select('city, lat, lng, country, timezone, updated_at, source')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (geofenceRow?.lat && geofenceRow?.lng) {
    const age = Date.now() - new Date(String(geofenceRow.updated_at)).getTime()
    if (age < 24 * 60 * 60 * 1000 && geofenceRow.source !== 'default') {
      return {
        city: String(geofenceRow.city || ''),
        lat: Number(geofenceRow.lat),
        lng: Number(geofenceRow.lng),
        country: String(geofenceRow.country || ''),
        timezone: String(geofenceRow.timezone || 'UTC'),
        source: 'geofence',
      }
    }
  }

  const geofenceLoc = await getGeofenceUserLocation(userId)
  if (geofenceLoc?.lat && geofenceLoc.lng) {
    return {
      city: geofenceLoc.city,
      country: geofenceLoc.country,
      timezone: geofenceLoc.timezone,
      lat: geofenceLoc.lat,
      lng: geofenceLoc.lng,
      source: 'geofence',
    }
  }

  const { data: profile } = await supabase
    .from('family_profile')
    .select('resident_city, resident_city_custom, member_nationality')
    .eq('user_id', userId)
    .maybeSingle()

  const city = resolveResidentCity(profile)
  if (city) {
    const coords = await geocodeCity(city)
    const timezone = await getTimezone(city)
    return {
      city,
      country: String(profile?.member_nationality || ''),
      timezone,
      ...coords,
      source: 'profile',
    }
  }

  return {
    city: '',
    country: '',
    timezone: 'UTC',
    lat: 0,
    lng: 0,
    source: 'default',
  }
}

export async function generateLocalPhrase(params: {
  situation: string
  targetLanguage: string
  keyPoints: string[]
}): Promise<string> {
  const key = geminiKey()
  if (!key) return ''

  try {
    const response = await fetch(geminiGenerateContentUrl(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `请生成${params.targetLanguage}沟通话术：
场景：${params.situation}
需要传达：${params.keyPoints.join('、')}

格式：
${params.targetLanguage}（大字给对方看）：
[内容]

中文对照：
[翻译]

要求：礼貌地道，不超过3句`,
          }],
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
    })

    if (!response.ok) return ''

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (e) {
    console.error('[generateLocalPhrase]', e)
    return ''
  }
}

export function getLocalLanguage(country: string): string {
  const langMap: Record<string, string> = {
    Thailand: '泰语',
    Singapore: '英语',
    Malaysia: '马来语',
    Indonesia: '印尼语',
    Vietnam: '越南语',
    Japan: '日语',
    Korea: '韩语',
    'United Kingdom': '英语',
    'United States': '英语',
    Australia: '英语',
    Canada: '英语',
  }
  return langMap[country] || '英语'
}
