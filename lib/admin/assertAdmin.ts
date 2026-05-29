import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin/constants'
import { getSessionUser } from '@/lib/admin/getSessionUser'

export async function assertAdmin(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || !isAdminEmail(user.email)) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}
