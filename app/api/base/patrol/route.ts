export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const MAKE_PATROL_WEBHOOK = 'https://hook.us2.make.com/5qi1044vykcxqc7pqyib0sbsbqy9s6qq'

async function getDefaultUserId(): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return data?.users?.[0]?.id || null
}

async function getFamilySnapshot(userId: string) {
  const [
    { data: children },
    { data: places },
    { data: interests },
    { data: habits },
  ] = await Promise.all([
    supabase.from('children').select('name, school_name, grade').eq('user_id', userId).limit(5),
    supabase.from('family_places').select('name, city, lat, lng, is_primary, visit_frequency').eq('user_id', userId).limit(20),
    supabase.from('interest_weights').select('topic, weight').eq('user_id', userId).gte('weight', 20).order('weight', { ascending: false }).limit(10),
    supabase.from('family_habits').select('notes').eq('user_id', userId).limit(10),
  ])
  return { children, places, interests, habits }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.user_id || await getDefaultUserId()
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'no user found' }, { status: 400 })
    }

    const hour = new Date().getHours()
    const patrolTime = hour < 10 ? '早安巡逻' : hour < 14 ? '午间巡逻' : hour < 18 ? '放学巡逻' : '晚间巡逻'

    // 获取家庭快照
    const snapshot = await getFamilySnapshot(userId)
    const primaryPlace = snapshot.places?.find((p: any) => p.is_primary) || snapshot.places?.[0]
    const topInterests = snapshot.interests?.map((i: any) => i.topic).slice(0, 5) || []
    const habitNotes = snapshot.habits?.filter((h: any) => h.notes).map((h: any) => h.notes).slice(0, 3) || []

    // 触发 Make webhook
    const makeRes = await fetch(MAKE_PATROL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        type: 'patrol',
trigger: patrolTime,
        location: primaryPlace?.city || primaryPlace?.name || 'Chiang Mai, Thailand',
        lat: primaryPlace?.lat,
        lng: primaryPlace?.lng,
        local_media: ['Chiang Mai 108', 'Citylife Chiang Mai', 'The Thaiger'],
        family_snapshot: {
          children: snapshot.children?.map((c: any) => ({
            name: c.name,
            school: c.school_name,
            grade: c.grade,
          })),
          interests: topInterests,
          habit_notes: habitNotes,
          frequent_places: snapshot.places
            ?.filter((p: any) => ['weekly', 'daily'].includes(p.visit_frequency))
            ?.map((p: any) => p.name)
            ?.slice(0, 5) || [],
        }
      })
    })

    console.log(`根${patrolTime}已触发 Make，状态：${makeRes.status}`)

    return NextResponse.json({
      ok: true,
      message: `${patrolTime}已触发`,
      make_status: makeRes.status
    })

  } catch (e: any) {
    console.error('巡逻触发错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function GET() {
  const userId = await getDefaultUserId()
  if (!userId) return NextResponse.json({ error: 'no user' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data: hotspots } = await supabase
    .from('hotspot_items')
    .select('id, title, urgency, category, created_at, status')
    .eq('user_id', userId)
    .neq('status', 'dismissed')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    unread_hotspots: hotspots?.filter(h => h.status === 'unread') || [],
    unread_count: hotspots?.filter(h => h.status === 'unread').length || 0,
    total_today: hotspots?.length || 0,
  })
}
