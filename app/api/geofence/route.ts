export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getUserLocation, updateUserLocationByGPS } from '@/lib/geofence'

export async function POST(req: NextRequest) {
  const { userId, lat, lng } = await req.json()

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
