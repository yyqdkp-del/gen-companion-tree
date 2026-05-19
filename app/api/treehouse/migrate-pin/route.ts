/**
 * 一次性迁移：将 `riqi_access.password_hash` 中的明文转为 bcrypt。
 * 迁移完成后请删除本文件并移除对应路由。
 *
 * 调用：POST /api/treehouse/migrate-pin
 * Header: x-treehouse-migrate-secret: <与服务器环境变量 TREEHOUSE_PIN_MIGRATE_SECRET 相同>
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

function looksLikeBcrypt(stored: string) {
  return /^\$2[aby]\$/.test(stored)
}

export async function POST(req: NextRequest) {
  const secret = process.env.TREEHOUSE_PIN_MIGRATE_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Migration not configured' }, { status: 503 })
  }

  const header = req.headers.get('x-treehouse-migrate-secret')
  if (header !== secret) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rows, error } = await admin.from('riqi_access').select('*')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let updated = 0
  for (const row of rows || []) {
    const ph = row.password_hash as string | null | undefined
    if (!ph || looksLikeBcrypt(ph)) continue

    const hashed = await bcrypt.hash(ph, 10)
    let q = admin.from('riqi_access').update({ password_hash: hashed })
    if (row.id != null && row.id !== '') q = q.eq('id', row.id)
    else if (row.user_id != null && row.user_id !== '') q = q.eq('user_id', row.user_id)
    else continue

    const { error: upErr } = await q
    if (!upErr) updated += 1
  }

  return NextResponse.json({ ok: true, updated })
}
