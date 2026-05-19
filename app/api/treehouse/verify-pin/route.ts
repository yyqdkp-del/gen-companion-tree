export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { getAuthUser } from '@/lib/auth/getAuthUser'

/** riqi_access 未纳入 generated Database 类型时使用 */
type RiqiAccessRow = { password_hash: string | null }

function looksLikeBcrypt(stored: string) {
  return /^\$2[aby]\$/.test(stored)
}

async function resolveStoredHash(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: mineRaw } = await admin
    .from('riqi_access')
    .select('password_hash')
    .eq('user_id', userId)
    .maybeSingle()

  const mine = mineRaw as RiqiAccessRow | null
  if (mine?.password_hash) return mine.password_hash

  const { data: legacyRowsRaw } = await admin
    .from('riqi_access')
    .select('password_hash')
    .is('user_id', null)
    .limit(1)

  const legacyRows = legacyRowsRaw as RiqiAccessRow[] | null
  return legacyRows?.[0]?.password_hash ?? null
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { pin?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const pin = typeof body.pin === 'string' ? body.pin : ''
  if (!pin) {
    return NextResponse.json({ ok: false, error: 'Missing pin' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const stored = await resolveStoredHash(admin, user.id)
  if (!stored) {
    return NextResponse.json({ ok: false })
  }

  let ok = false
  if (looksLikeBcrypt(stored)) {
    ok = await bcrypt.compare(pin, stored)
  } else {
    ok = stored === pin
  }

  return NextResponse.json({ ok })
}
