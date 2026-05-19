export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function mergeExecutionPack(
  prevPack: unknown,
  execution_pack: unknown,
  checklist: unknown,
  carry_items: unknown,
): Record<string, unknown> {
  if (execution_pack !== undefined && execution_pack !== null && typeof execution_pack === 'object') {
    return execution_pack as Record<string, unknown>
  }
  const base =
    prevPack !== undefined && prevPack !== null && typeof prevPack === 'object'
      ? { ...(prevPack as Record<string, unknown>) }
      : {}
  if (checklist !== undefined) base.checklist = checklist
  if (carry_items !== undefined) base.carry_items = carry_items
  return base
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    source_id?: string
    source_type?: string
    execution_pack?: unknown
    checklist?: unknown
    carry_items?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { source_id, source_type, execution_pack, checklist, carry_items } = body

  if (!source_id || !source_type) {
    return NextResponse.json({ error: 'Missing source_id or source_type' }, { status: 400 })
  }

  if (
    (execution_pack === undefined || execution_pack === null) &&
    checklist === undefined &&
    carry_items === undefined
  ) {
    return NextResponse.json(
      { error: 'Missing execution_pack or checklist/carry_items' },
      { status: 400 },
    )
  }

  if (source_type === 'todo') {
    const { data: todo } = await supabase
      .from('todo_items')
      .select('id, ai_action_data')
      .eq('id', source_id)
      .eq('user_id', user.id)
      .single()

    if (!todo) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const prevAi =
      todo.ai_action_data !== undefined &&
      todo.ai_action_data !== null &&
      typeof todo.ai_action_data === 'object'
        ? (todo.ai_action_data as Record<string, unknown>)
        : {}

    const prevPack = prevAi.execution_pack
    const nextPack = mergeExecutionPack(prevPack, execution_pack, checklist, carry_items)

    const updated = { ...prevAi, execution_pack: nextPack }

    await supabase
      .from('todo_items')
      .update({ ai_action_data: updated })
      .eq('id', source_id)
      .eq('user_id', user.id)
  } else if (source_type === 'schedule') {
    const { data: event } = await supabase
      .from('child_school_calendar')
      .select('id, ai_action_data')
      .eq('id', source_id)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const prevAi =
      event.ai_action_data !== undefined &&
      event.ai_action_data !== null &&
      typeof event.ai_action_data === 'object'
        ? (event.ai_action_data as Record<string, unknown>)
        : {}

    const prevPack = prevAi.execution_pack
    const nextPack = mergeExecutionPack(prevPack, execution_pack, checklist, carry_items)

    const updated = { ...prevAi, execution_pack: nextPack }

    await supabase
      .from('child_school_calendar')
      .update({ ai_action_data: updated })
      .eq('id', source_id)
      .eq('user_id', user.id)
  } else if (source_type === 'hotspot') {
    const { data: queue } = await supabase
      .from('action_queue')
      .select('id, execution_pack')
      .eq('source_id', source_id)
      .eq('source_type', 'hotspot')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!queue) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const pack = queue.execution_pack
    const prevPack =
      pack !== undefined && pack !== null && typeof pack === 'object'
        ? pack
        : {}
    const updated = mergeExecutionPack(prevPack, execution_pack, checklist, carry_items)

    await supabase
      .from('action_queue')
      .update({ execution_pack: updated })
      .eq('id', queue.id)
      .eq('user_id', user.id)
  } else {
    return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 })
  }

  if (source_type !== 'hotspot') {
    const { data: queue } = await supabase
      .from('action_queue')
      .select('id, execution_pack')
      .eq('source_id', source_id)
      .eq('source_type', source_type)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queue) {
      const pack = queue.execution_pack
      const prevPack =
        pack !== undefined && pack !== null && typeof pack === 'object'
          ? pack
          : {}
      const updated = mergeExecutionPack(prevPack, execution_pack, checklist, carry_items)

      await supabase
        .from('action_queue')
        .update({ execution_pack: updated })
        .eq('id', queue.id)
        .eq('user_id', user.id)
    }
  }

  return NextResponse.json({ ok: true })
}
