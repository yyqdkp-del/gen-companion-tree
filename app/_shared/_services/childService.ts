import { createClient } from '@/lib/supabase/client'
import { calculateEnergy } from '../_engine/energy'
import type { TimelineItem, HealthStatus, MoodStatus } from '../_types'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'

const supabase = createClient()

const DOW_KEY_BY_NUM: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
}

function parseChildAge(child: { birthdate?: string | null; grade?: string | null }): number | undefined {
  if (child.birthdate) {
    const birth = new Date(child.birthdate)
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date()
      let age = now.getFullYear() - birth.getFullYear()
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
        age -= 1
      }
      return age > 0 ? age : undefined
    }
  }
  if (child.grade) {
    const m = String(child.grade).match(/(\d+)/)
    if (m) {
      const g = parseInt(m[1], 10)
      if (g >= 1 && g <= 12) return g + 5
    }
  }
  return undefined
}

function parseGradeNumber(grade?: string | null): number | undefined {
  if (!grade) return undefined
  const m = String(grade).match(/(\d+)/)
  return m ? parseInt(m[1], 10) : undefined
}

export async function fetchChildSchedule(childId: string, today: string) {
  const dow = new Date(`${today}T12:00:00`).getDay()
  const dowKey = DOW_KEY_BY_NUM[dow]
  const y = new Date().getFullYear()
  const yearEnd = getTodayStr(new Date(y, 11, 31))

  const [profileRes, calRes, healthRes] = await Promise.all([
    supabase.from('child_profiles')
      .select('class_schedule, activities')
      .eq('child_id', childId)
      .maybeSingle(),
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
      const dayList = Array.isArray(a.days) ? a.days.map(String) : []
      if (
        a.day_of_week === dow ||
        a.day === dow ||
        dayList.includes(dowKey)
      ) {
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
  existingKids?: any[],
): Promise<any[]> {
  let childData = existingKids?.length ? existingKids : null
  if (!childData?.length) {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('user_id', uid)
    if (error || !data?.length) return []
    childData = data
  }

  const results = await Promise.allSettled(
    childData.map(async (c: any) => {
      const sevenDaysAgo = addDaysStr(new Date(`${today}T12:00:00`), -7)
      const [logRes, evtRes, profRes, actsRes, weeklyRes] = await Promise.allSettled([
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
          .select('activities, class_schedule').eq('child_id', c.id).maybeSingle(),
        supabase.from('child_activities')
          .select('name, days, is_active').eq('child_id', c.id).eq('user_id', uid),
        supabase.from('child_daily_log')
          .select('sleep_start, sleep_end, mood_status, health_status, date')
          .eq('child_id', c.id)
          .gte('date', sevenDaysAgo)
          .order('date', { ascending: false }),
      ])
      const log  = logRes.status === 'fulfilled' ? logRes.value.data : null
      const evts = evtRes.status === 'fulfilled' ? (evtRes.value.data || []) : []
      const weeklyLogs = weeklyRes.status === 'fulfilled' ? (weeklyRes.value.data || []) : []

      const profile =
        profRes.status === 'fulfilled' ? profRes.value.data : null
      const profileActsRaw = profile?.activities ?? []
      const profileActivities = Array.isArray(profileActsRaw) ? profileActsRaw : []
      const classSchedule = (profile?.class_schedule as Record<string, unknown>) || {}
      const todayDow = new Date(`${today}T12:00:00`).getDay()
      const todayKey = DOW_KEY_BY_NUM[todayDow]
      const todayClassesRaw = classSchedule[todayKey]
      const today_classes = Array.isArray(todayClassesRaw) ? todayClassesRaw : []

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
      const todayActivities = activities.filter((a: any) => {
        if (a.is_active === false) return false
        if (Array.isArray(a.days) && a.days.includes(todayKey)) return true
        if (typeof a.day_of_week === 'number' && a.day_of_week === todayDow) return true
        if (typeof a.day === 'number' && a.day === todayDow) return true
        return false
      })

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

      if (log?.mood_status === 'upset') {
        addUrgent({ title: '今天情绪不太好，多关注', level: 'orange' }, '')
      }

      // 考试当天 → red
      todayEvts
        .filter((e: any) => e.event_type === 'exam')
        .forEach((e: any) => {
          addUrgent({ title: `考试：${e.title}`, level: 'red' }, e.date_start)
        })

      // 今日需要行动 → orange
      todayEvts.filter((e: any) => e.requires_action).forEach((e: any) => {
        addUrgent({ title: e.title, level: 'orange' }, e.date_start)
      })

      // 今日需要付款 → orange
      todayEvts.filter((e: any) => e.requires_payment).forEach((e: any) => {
        addUrgent({ title: `💰 ${e.title} ฿${e.requires_payment}`, level: 'orange' }, e.date_start)
      })

      // 今日医疗 → orange
      todayEvts.filter((e: any) => e.event_type === 'medical').forEach((e: any) => {
        addUrgent({ title: e.title, level: 'orange' }, e.date_start)
      })

      // 7天内需要行动 → yellow
      weekEvts.filter((e: any) => e.requires_action || e.requires_payment).forEach((e: any) => {
        addUrgent({ title: e.title, level: 'yellow' }, e.date_start)
      })

      const classEvents = today_classes.map((cls: any) => ({
        event_type: 'class' as const,
        title: typeof cls === 'object' ? (cls.subject || cls.title || '课程') : String(cls),
      }))
      const activityEvents = todayActivities.map((a: any) => ({
        event_type: 'extracurricular' as const,
        title: a.name || a.title || '活动',
      }))
      const allTodayEvents = [...todayEvts, ...classEvents, ...activityEvents]

      // energy 计算 — 使用精力引擎
      const isWeekend = [0, 6].includes(new Date(`${today}T12:00:00`).getDay())
      const childAge = parseChildAge(c)
      const energyResult = calculateEnergy({
        age: childAge,
        grade: parseGradeNumber(c.grade),
        healthStatus: log?.health_status,
        moodStatus: log?.mood_status,
        sleepStart: log?.sleep_start,
        sleepEnd: log?.sleep_end,
        todayEvents: allTodayEvents,
        usualBedtime: c.usual_bedtime,
        weekendBedtime: c.weekend_bedtime,
        schoolStartTime: c.school_start_time,
        isWeekend,
        weeklyLogs: weeklyLogs || [],
      })

      return {
        id: c.id, name: c.name || '孩子',
        emoji: c.emoji || '👶🏻',
        avatar_url: c.avatar_url || null,
        energy: energyResult.score,
        energy_level: energyResult.level,
        energy_label: energyResult.label,
        energy_focus: energyResult.focus,
        energy_advice: energyResult.advice,
        weekly_fatigue: energyResult.weeklyFatigue,
        display_health: log?.health_status || 'normal',
        display_mood: log?.mood_status || 'calm',
        health_status: log?.health_status,
        mood_status: log?.mood_status,
        school_name: c.school_name,
        grade: c.grade,
        school_end_time: c.school_end_time ?? null,
        activities,
        class_schedule: classSchedule,
        today_classes,
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
  const trimmedName = d.name?.trim()
  if (!trimmedName) {
    console.error('addChild: name is empty')
    return null
  }

  const { data } = await supabase.from('children').insert({
    user_id: uid, name: trimmedName, emoji: d.emoji || '👶🏻',
    avatar_url: d.avatar_url || null,
    energy: null, status: 'active',
    school_name: d.school_name, grade: d.grade,
  }).select().single()
  if (!data?.id) return null

  await supabase.from('child_profiles').upsert(
    {
      child_id: data.id,
      user_id: uid,
      class_schedule: {},
      activities: [],
    },
    { onConflict: 'child_id' },
  )

  return data.id
}
