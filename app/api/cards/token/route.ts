export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createSignedUserId } from '@/lib/auth/signedUrl'

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = req.nextUrl.searchParams.get('type') || 'medical'
  const type = raw === 'visa' ? 'visa' : 'medical'
  const childId = req.nextUrl.searchParams.get('child_id')?.trim() || ''

  const token = createSignedUserId(user.id)
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const baseUrl = origin.replace(/\/$/, '')

  const url = childId
    ? `${baseUrl}/api/cards/${type}?token=${encodeURIComponent(token)}&child_id=${encodeURIComponent(childId)}`
    : `${baseUrl}/api/cards/${type}?token=${encodeURIComponent(token)}`

  return NextResponse.json({ url })
}
