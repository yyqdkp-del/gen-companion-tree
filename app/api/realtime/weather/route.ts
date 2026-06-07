export const dynamic = 'force-dynamic'

import { getTodayWeather } from '@/lib/realtime/weather'

export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get('city') || 'Chiang Mai'
  const data = await getTodayWeather(city)
  return Response.json(data)
}
