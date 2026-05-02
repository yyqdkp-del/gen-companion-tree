import { createClient } from '@/lib/supabase/client'
import type { TimelineItem, HealthStatus, MoodStatus } from '../_types'

const supabase = createClient()

export async function fetchChildSchedule(childId: string, today: string) {
  const dow = new Date().getDay()
  const dowKey = ['sun','mon','tue','wed','thu','fri','sat'][dow]
  const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]

  const [profileRes, calRes, healthRes] = await Promise.all([
    supabase.from('child_profiles')
      .select('class_schedule, activities')
      .eq('child_id', childId).single(),
    supabase.from('child_school_calendar')
      .select('*').eq('child_id', childId)
      .gte('date_start', today).lte('date_start', yearEnd)
      .order('date_start'),
    supabase.from('child_health_records')
      .select('*').eq('child_id', childId).eq('follow_up_date', today),
  ])

  const schedData  = profileRes.data
  const calData    = calRes.data    ?? []
  const healthData = healthRes.data ?? []
  const activities = schedData?.activities ?? []
  const items: TimelineItem[] = []

  const daySchedule = schedData?.class_schedule?.[dowKey] ?? []
  daySchedule.forEach((item: any, i: number) => {
    const isObject = typeof item === 'object'
    items.push({
      id: `sched_${i}`,
      time:  isObject ? item.time    : '08:00',
      title: isObject ? item.subject : item,
      type: 'class', source: 'schedule', event: item,
    })
  })

  calData.filter((e: any) => e.date_start === today).forEach((e: any) => {
    const m = (e.description || e.title || '').match(/(\d{1,2}):(\d{2})/)
    items.push({
      id: `cal_${e.id}`,
      time: m ? `${m[1].padStart(2,'0')}:${m[2]}` : '08:00',
      title: e.title, type: 'special', source: 'calendar', event: e,
    })
  })

  healthData.forEach((h: any) => {
    items.push({
      id: `health_${h.id}`, time: '09:00',
      title: `复诊：${h.description || h.type}`,
      type: 'medical', source: 'health', event: h,
    })
  })

  if (Array.isArray(activities)) {
    activities.forEach((a: any, i: number) => {
      if (a.day_of_week === dow || a.day === dow) {
        items.push({
          id: `act_${i}`, time: a.time || a.start_time || '15:00',
          end_time: a.end_time, title: a.name || a.title,
          type: 'extracurricular', source: 'profile', event: a,
        })
      }
    })
  }

  return { timeline: items, calendar: calData }
}

export async function fetchDailyLog(childId: string, date: string) {
  const { data } = await supabase
    .from('child_daily_log')
    .select('id, health_status, mood_status')
    .eq('child_id', childId)
    .eq('date', date)
    .maybeSingle()
  return data
}

export async function saveDailyLog(
  childId: string, userId: string, date: string,
  health: HealthStatus, mood: MoodStatus,
  existingId?: string,
): Promise<string | undefined> {
  const payload = {
    child_id: childId, date,
    health_status: health, mood_status: mood,
    updated_at: new Date().toISOString(),
  }
  if (existingId) {
    await supabase.from('child_daily_log').update(payload).eq('id', existingId)
    return existingId
  }
  const { data } = await supabase
    .from('child_daily_log')
    .insert({ ...payload, user_id: userId })
    .select().single()
  return data?.id
}
