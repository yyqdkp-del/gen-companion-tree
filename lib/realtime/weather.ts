const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Chiang Mai': { lat: 18.7883, lon: 98.9853 },
  Bangkok: { lat: 13.7563, lon: 100.5018 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  'Kuala Lumpur': { lat: 3.139, lon: 101.6869 },
}

const WMO_CODES: Record<number, { text: string; hasRain: boolean }> = {
  0: { text: '晴', hasRain: false },
  1: { text: '晴', hasRain: false },
  2: { text: '多云', hasRain: false },
  3: { text: '阴', hasRain: false },
  51: { text: '小雨', hasRain: true },
  53: { text: '中雨', hasRain: true },
  55: { text: '大雨', hasRain: true },
  61: { text: '小雨', hasRain: true },
  63: { text: '中雨', hasRain: true },
  65: { text: '大雨', hasRain: true },
  80: { text: '阵雨', hasRain: true },
  81: { text: '阵雨', hasRain: true },
  82: { text: '暴雨', hasRain: true },
  95: { text: '雷暴', hasRain: true },
  99: { text: '强雷暴', hasRain: true },
}

export interface SimpleWeather {
  condition: string
  hasRain: boolean
  rainProbability: number
  temp: number
}

export function resolveWeatherCity(city?: string | null): string {
  const trimmed = city?.trim()
  if (!trimmed) return 'Chiang Mai'
  if (CITY_COORDS[trimmed]) return trimmed

  const lower = trimmed.toLowerCase()
  for (const key of Object.keys(CITY_COORDS)) {
    if (key.toLowerCase() === lower) return key
  }

  return 'Chiang Mai'
}

export function isRainyWeather(weather?: SimpleWeather | null): boolean {
  if (!weather) return false
  return weather.hasRain || weather.rainProbability > 50
}

export async function getTodayWeather(
  city: string = 'Chiang Mai',
): Promise<SimpleWeather | null> {
  try {
    const resolved = resolveWeatherCity(city)
    const coords = CITY_COORDS[resolved] || CITY_COORDS['Chiang Mai']
    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${coords.lat}&longitude=${coords.lon}` +
      `&current=temperature_2m,weathercode` +
      `&daily=precipitation_probability_max` +
      `&timezone=auto&forecast_days=1`

    const res = await fetch(url, {
      next: { revalidate: 1800 },
    })
    if (!res.ok) return null

    const data = await res.json()
    const code = data?.current?.weathercode
    const weather = WMO_CODES[code] || { text: '未知', hasRain: false }

    return {
      condition: weather.text,
      hasRain: weather.hasRain,
      rainProbability: data?.daily?.precipitation_probability_max?.[0] || 0,
      temp: Math.round(data?.current?.temperature_2m ?? 0),
    }
  } catch {
    return null
  }
}
