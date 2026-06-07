import type { SupabaseClient } from '@supabase/supabase-js'
import type { FamilyDataForCorrelation } from '@/lib/brain/correlate'

const DOW_KEY_BY_NUM: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
}

function daysBetweenYmd(fromYmd: string, toYmd: string): number {
  const from = new Date(`${fromYmd}T12:00:00`)
  const to = new Date(`${toYmd}T12:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

function isFlightEvent(e: { title?: string; event_type?: string; category?: string }): boolean {
  const title = String(e.title || '')
  const type = String(e.event_type || e.category || '').toLowerCase()
  return type === 'travel' || type === 'flight' || /航班|flight|✈|出行|机票/i.test(title)
}

export async function gatherFamilyDataForCorrelations(
  db: SupabaseClient,
  userId: string,
  todayYmd: string,
): Promise<FamilyDataForCorrelation> {
  const dowKey = DOW_KEY_BY_NUM[new Date(`${todayYmd}T12:00:00`).getDay()]

  const [
    { data: profile },
    { data: todos },
    { data: calendar },
    { data: children },
  ] = await Promise.all([
    db.from('family_profile')
      .select('visa_expiry, visa_type, member_nationality')
      .eq('user_id', userId)
      .maybeSingle(),
    db.from('todo_items')
      .select('id, title, category, status, due_date')
      .eq('user_id', userId)
      .not('status', 'in', '("done","dismissed")')
      .limit(80),
    db.from('child_school_calendar')
      .select('id, title, event_type, date_start, date_end, requires_items, description, category')
      .eq('user_id', userId)
      .gte('date_start', todayYmd)
      .order('date_start', { ascending: true })
      .limit(60),
    db.from('children')
      .select('id, name, grade')
      .eq('user_id', userId)
      .limit(8),
  ])

  let visaDaysLeft = 999
  if (profile?.visa_expiry) {
    const d = daysBetweenYmd(todayYmd, String(profile.visa_expiry).slice(0, 10))
    if (d >= 0) visaDaysLeft = Math.min(visaDaysLeft, d)
  }

  const visaTodo = (todos || []).find((t) =>
    t.due_date && (String(t.title || '').includes('签证') || t.category === 'compliance'),
  )
  if (visaTodo?.due_date) {
    const d = daysBetweenYmd(todayYmd, String(visaTodo.due_date).slice(0, 10))
    if (d >= 0) visaDaysLeft = Math.min(visaDaysLeft, d)
  }

  const childIds = (children || []).map((c) => c.id).filter(Boolean)
  const profilesByChild = new Map<string, { class_schedule?: Record<string, unknown[]> }>()
  const healthByChild = new Map<string, string>()

  if (childIds.length) {
    const [{ data: profiles }, { data: logs }] = await Promise.all([
      db.from('child_profiles')
        .select('child_id, class_schedule')
        .in('child_id', childIds),
      db.from('child_daily_log')
        .select('child_id, health_status, date')
        .eq('user_id', userId)
        .eq('date', todayYmd)
        .in('child_id', childIds),
    ])
    for (const p of profiles || []) {
      if (p.child_id) profilesByChild.set(p.child_id, p as { class_schedule?: Record<string, unknown[]> })
    }
    for (const log of logs || []) {
      if (log.child_id && log.health_status) {
        healthByChild.set(log.child_id, log.health_status)
      }
    }
  }

  const enrichedKids = (children || []).map((child) => {
    const prof = profilesByChild.get(child.id)
    const schedule = prof?.class_schedule?.[dowKey]
    const today_classes = Array.isArray(schedule)
      ? schedule.filter((c) => typeof c === 'object' && c !== null) as Array<{ subject?: string; category?: string }>
      : []
    return {
      id: child.id,
      name: child.name,
      display_health: healthByChild.get(child.id) || 'normal',
      teacher_email: '',
      today_classes,
    }
  })

  const schoolCalendar = (calendar || []).map((e) => ({
    id: e.id,
    event_type: e.event_type || e.category,
    title: e.title,
    date_start: e.date_start,
    requires_items: Array.isArray(e.requires_items) ? e.requires_items.map(String) : undefined,
    description: e.description,
  }))

  const flights = schoolCalendar.filter(isFlightEvent)

  return {
    visa: {
      daysLeft: visaDaysLeft === 999 ? 0 : visaDaysLeft,
      type: String(profile?.visa_type || ''),
      country: String(profile?.member_nationality || ''),
    },
    schoolCalendar,
    todos: todos || [],
    children: enrichedKids,
    flights,
  }
}
