import { createClient } from '@/lib/supabase/client'
import { calculateEnergy, getEnergyColor } from '../_engine/energy'
import type { TimelineItem, HealthStatus, MoodStatus } from '../_types'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'

const supabase = createClient()

export async function fetchChildSchedule(childId: string, today: string) {
  const dow = new Date(`${today}T12:00:00`).getDay()
  const dowKey = ['sun','mon','tue','wed','thu','fri','sat'][dow]
  const y = new Date().getFullYear()
  const yearEnd = getTodayStr(new Date(y, 11, 31))

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
      const [logRes, evtRes, profRes, actsRes] = await Promise.allSettled([
        supabase.from('child_daily_log')
          .select('*').eq('child_id', c.id)
          .eq('user_id', uid).eq('date', today).maybeSingle(),
        supabase.from('child_school_calendar')
          .select('*').eq('child_id', c.id)
          .eq('user_id', uid)
          .gte('date_start', today)
          .lte('date_start', addDaysStr(new Date(), 7))
          .order('date_start'),
        supabase.from('child_profiles')
          .select('activities').eq('child_id', c.id).maybeSingle(),
        supabase.from('child_activities')
          .select('name, days, is_active').eq('child_id', c.id).eq('user_id', uid),
      ])
      const log  = logRes.status === 'fulfilled' ? logRes.value.data : null
      const evts = evtRes.status === 'fulfilled' ? (evtRes.value.data || []) : []

      const profileActsRaw =
        profRes.status === 'fulfilled' ? (profRes.value.data?.activities ?? []) : []
      const profileActivities = Array.isArray(profileActsRaw) ? profileActsRaw : []

      const normalizeActDays = (raw: unknown): string[] => {
        if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
        if (typeof raw === 'string') {
          try {
            const j = JSON.parse(raw)
            return Array.isArray(j) ? j.map(String).filter(Boolean) : []
          } catch { return [] }
        }
        return []
      }
      const tableRows = actsRes.status === 'fulfilled' ? (actsRes.value.data || []) : []
      const tableActivities = tableRows.map((row: any) => ({
        name: row.name,
        title: row.name,
        days: normalizeActDays(row.days),
        is_active: row.is_active !== false,
      }))
      const activities = [...profileActivities, ...tableActivities]

      // 推导 urgent_items（按 title+日期去重）
      const todayEvts = evts.filter((e: any) => e.date_start === today)
      const weekEvts  = evts.filter((e: any) => e.date_start > today)
      const urgent_items: { title: string; level: 'red' | 'orange' | 'yellow' }[] = []
      const seenUrgent = new Set<string>()
      const addUrgent = (
        item: { title: string; level: 'red' | 'orange' | 'yellow' },
        dateKey?: string,
      ) => {
        const key = `${item.title}-${dateKey ?? ''}`
        if (seenUrgent.has(key)) return
        seenUrgent.add(key)
        urgent_items.push(item)
      }

      // 生病 → red
      if (log?.health_status === 'sick') {
        addUrgent({ title: '生病中，注意休息', level: 'red' }, '')
      }

      // 今日需要行动 → orange
      todayEvts.filter((e: any) => e.requires_action).forEach((e: any) => {
        addUrgent({ title: e.title, level: 'orange' }, e.date_start)
      })

      // 今日需要付款 → orange
      todayEvts.filter((e: any) => e.requires_payment).forEach((e: any) => {
        addUrgent({ title: `💰 ${e.title} ฿${e.requires_payment}`, level: 'orange' }, e.date_start)
      })

      // 今日考试或体检 → orange
      todayEvts.filter((e: any) => ['exam', 'medical'].includes(e.event_type)).forEach((e: any) => {
        addUrgent({ title: e.title, level: 'orange' }, e.date_start)
      })

      // 7天内需要行动 → yellow
      weekEvts.filter((e: any) => e.requires_action || e.requires_payment).forEach((e: any) => {
        addUrgent({ title: e.title, level: 'yellow' }, e.date_start)
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
        school_name: c.school_name,
        grade: c.grade,
        school_end_time: c.school_end_time ?? null,
        activities,
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
