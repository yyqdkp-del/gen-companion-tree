export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserLocation, updateUserLocationByGPS } from '@/lib/geofence'
import { getAuthUser } from '@/lib/auth/getAuthUser'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const { lat, lng } = body

  try {
    let location
    if (lat && lng) {
      location = await updateUserLocationByGPS(userId, lat, lng)
    } else {
      location = await getUserLocation(userId)
    }
    return NextResponse.json(location)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
