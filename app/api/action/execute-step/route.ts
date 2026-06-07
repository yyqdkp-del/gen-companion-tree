export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { executeAction } from '@/lib/action/executor'
import type { RootAction } from '@/lib/action/rootBrain'

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: RootAction }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  if (!action?.executor) {
    return NextResponse.json({ ok: false, error: 'Missing action' }, { status: 400 })
  }

  try {
    const result = await executeAction(action, user.id)
    return NextResponse.json(result)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '执行失败'
    console.error('[execute-step]', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
