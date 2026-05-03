import { createClient } from '@/lib/supabase/client'
import { calculateEnergy, getEnergyColor } from '../_engine/energy'
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

export async function enrichChildren(
  uid: string,
  today: string,
): Promise<any[]> {
  const { data: childData, error } = await supabase
    .from('children').select('*').eq('user_id', uid)
  if (error || !childData?.length) return []

  const results = await Promise.allSettled(
    childData.map(async (c: any) => {
      const [logRes, evtRes] = await Promise.allSettled([
        supabase.from('child_daily_log')
          .select('*').eq('child_id', c.id)
          .eq('user_id', uid).eq('date', today).maybeSingle(),
        supabase.from('child_school_calendar')
          .select('*').eq('child_id', c.id)
          .eq('user_id', uid)
          .gte('date_start', today)
          .lte('date_start', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
          .order('date_start'),
      ])
      const log  = logRes.status === 'fulfilled' ? logRes.value.data : null
      const evts = evtRes.status === 'fulfilled' ? (evtRes.value.data || []) : []

      // 推导 urgent_items
      const todayEvts = evts.filter((e: any) => e.date_start === today)
      const weekEvts  = evts.filter((e: any) => e.date_start > today)
      const urgent_items: { title: string; level: 'red' | 'orange' | 'yellow' }[] = []

      // 生病 → red
      if (log?.health_status === 'sick') {
        urgent_items.push({ title: '生病中，注意休息', level: 'red' })
      }

      // 今日需要行动 → orange
      todayEvts.filter((e: any) => e.requires_action).forEach((e: any) => {
        urgent_items.push({ title: e.title, level: 'orange' })
      })

      // 今日需要付款 → orange
      todayEvts.filter((e: any) => e.requires_payment).forEach((e: any) => {
        urgent_items.push({ title: `💰 ${e.title} ฿${e.requires_payment}`, level: 'orange' })
      })

      // 今日考试或体检 → orange
      todayEvts.filter((e: any) => ['exam', 'medical'].includes(e.event_type)).forEach((e: any) => {
        if (!urgent_items.find(u => u.title === e.title)) {
          urgent_items.push({ title: e.title, level: 'orange' })
        }
      })

      // 7天内需要行动 → yellow
      weekEvts.filter((e: any) => e.requires_action || e.requires_payment).forEach((e: any) => {
        urgent_items.push({ title: e.title, level: 'yellow' })
      })

      // energy 计算 — 使用精力引擎
      const isWeekend = [0, 6].includes(new Date().getDay())
      const energyResult = calculateEnergy({
        healthStatus:    log?.health_status,
        moodStatus:      log?.mood_status,
        todayEvents:     todayEvts,
        usualBedtime:    c.usual_bedtime,
        weekendBedtime:  c.weekend_bedtime,
        schoolStartTime: c.school_start_time,
        isWeekend,
      })
      const energy = energyResult.score

      return {
        id: c.id, name: c.name || '孩子',
        emoji: c.emoji || '👶🏻',
        avatar_url: c.avatar_url || null,
        energy: energy,
        health_status: log?.health_status || 'normal',
        mood_status: log?.mood_status || 'calm',
        school_name: c.school_name, grade: c.grade,
        urgent_items,
        today_schedule: todayEvts.map((e: any) => ({
          time: '', title: e.title,
          requires_action: e.requires_action,
        })),
      }
    })
  )

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<any>).value)
}

export async function addChild(
  uid: string,
  d: { name: string; emoji: string; school_name?: string; grade?: string; avatar_url?: string | null },
): Promise<string | null> {
  const { data } = await supabase.from('children').insert({
    user_id: uid, name: d.name, emoji: d.emoji || '👶🏻',
    avatar_url: d.avatar_url || null,
    energy: 75, status: 'active',
    school_name: d.school_name, grade: d.grade,
  }).select().single()
  return data?.id ?? null
}
