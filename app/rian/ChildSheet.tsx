'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ChevronRight } from 'lucide-react'
import VoiceBtn from '@/app/components/VoiceBtn'
import PackCheckItem from '@/app/components/PackCheckItem'
import ChildActionSheet, { ChildEvent } from '@/app/rian/ChildActionSheet'
import Accordion from '@/app/_shared/_components/Accordion'
import { THEME, GREEN } from '@/app/_shared/_constants/theme'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { EVENT_TYPE_EMOJI } from '@/app/_shared/_constants/categories'
import { useChildSchedule } from '@/app/_shared/_hooks/useChildSchedule'
import { useChildDailyLog } from '@/app/_shared/_hooks/useChildDailyLog'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { calculateEnergy, getEnergyColor } from '@/app/_shared/_engine/energy'
import ChildEnergyCard from '@/app/_shared/_components/ChildEnergyCard'
import { formatSubjectDisplay } from '@/app/_shared/_services/childService'
import { isPlaceholderSubject } from '@/lib/schedule/placeholderSubject'
import type { Child, TimelineItem, HealthStatus, MoodStatus } from '@/app/_shared/_types'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'
import { toast } from '@/app/components/Toast'

const healthOptions = [
  { value: 'normal',     label: '健康',   color: GREEN.dark, bg: GREEN.bg },
  { value: 'recovering', label: '恢复中', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  { value: 'sick',       label: '生病中', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
]
const moodOptions = [
  { value: 'happy',   label: '开心', emoji: '😊', color: '#D97706' },
  { value: 'calm',    label: '平静', emoji: '😌', color: GREEN.dark },
  { value: 'anxious', label: '焦虑', emoji: '😟', color: '#7C3AED' },
  { value: 'upset',   label: '低落', emoji: '😔', color: '#6B8BAA' },
]

function getTodayKey() { return getTodayStr() }
function getTomorrow() { return addDaysStr(new Date(), 1) }
function getIn7Days() { return addDaysStr(new Date(), 7) }
function getIn30Days() { return addDaysStr(new Date(), 30) }
// getEnergyColor 来自 _engine/energy
function formatDate(d: string) {
  const date = new Date(d), today = new Date(), tmr = new Date(today)
  tmr.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === tmr.toDateString()) return '明天'
  return ['周日','周一','周二','周三','周四','周五','周六'][date.getDay()] + ` ${date.getMonth()+1}/${date.getDate()}`
}
function timelineToMin(time: string | undefined): number {
  if (!time) return -1
  const parts = time.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return -1
  return parts[0] * 60 + (parts[1] || 0)
}

function getNowMinInTimeZone(timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
    const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
    const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10)
    return h * 60 + m
  } catch {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  }
}

function Timeline({ items, timeZone }: { items: TimelineItem[]; timeZone: string }) {
  const [showCompleted, setShowCompleted] = useState(false)
  const nowMin = getNowMinInTimeZone(timeZone)
  console.log('Timeline timezone/nowMin:', timeZone, nowMin)

  const validItems = items
    .filter((it) => timelineToMin(it.time) !== -1)
    .filter((it) => it.title?.trim())
    .filter((it) => !isPlaceholderSubject(it.title))

  const sorted = [...validItems].sort((a, b) => timelineToMin(a.time) - timelineToMin(b.time))

  const current = sorted.filter((item) => {
    const itemMin = timelineToMin(item.time)
    return itemMin <= nowMin && itemMin + 45 > nowMin
  })
  const upcoming = sorted.filter((item) => timelineToMin(item.time) > nowMin)
  const past = sorted.filter((item) => timelineToMin(item.time) + 45 <= nowMin)

  if (!sorted.length) {
    return (
      <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
        今天暂无课程安排
      </div>
    )
  }

  const renderItem = (item: TimelineItem, opts?: { isCurrent?: boolean; isPast?: boolean }) => {
    const isCurrent = !!opts?.isCurrent
    const isPast = !!opts?.isPast
    const title = formatSubjectDisplay(String(item.title || ''))
    return (
      <div key={item.id} style={{ position: 'relative', marginBottom: 8, opacity: isPast ? 0.5 : 1 }}>
        <div style={{
          position: 'absolute',
          left: -24,
          top: 6,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isCurrent ? '#DC2626' : GREEN.mid,
          boxShadow: isCurrent ? '0 0 0 4px rgba(220,38,38,0.18)' : 'none',
        }} />
        <div style={{
          padding: '7px 10px',
          borderRadius: 9,
          background: isCurrent ? 'rgba(220,38,38,0.07)' : 'rgba(255,255,255,0.7)',
          border: `0.5px solid ${isCurrent ? 'rgba(220,38,38,0.28)' : 'rgba(0,0,0,0.05)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10,
              color: isCurrent ? '#DC2626' : THEME.muted,
              fontWeight: isCurrent ? 700 : 400,
              minWidth: 32,
              flexShrink: 0,
            }}>
              {item.time}
            </span>
            <span style={{ fontSize: 13 }}>{EVENT_TYPE_EMOJI[item.type] || '📌'}</span>
            <span style={{
              fontSize: 12,
              fontWeight: isCurrent ? 700 : 400,
              color: THEME.text,
              flex: 1,
            }}>
              {title || '课程'}
            </span>
            {isCurrent && (
              <span style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 8,
                background: '#DC2626',
                color: '#fff',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                进行中
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // current + upcoming 为空，但有 past：显示完成提示 + 仍可展开已完成
  if (current.length === 0 && upcoming.length === 0 && past.length > 0) {
    return (
      <div style={{ position: 'relative', paddingLeft: 30 }}>
        <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6,
          width: 2, background: 'linear-gradient(180deg,#cddce5,#e8e4dc)', borderRadius: 1 }} />
        <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0 10px' }}>
          今天课程已全部完成 ✓
        </div>
        <div>
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              marginBottom: showCompleted ? 8 : 0,
              cursor: 'pointer',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.03)',
              border: '0.5px solid rgba(0,0,0,0.05)',
            }}
          >
            ✓ 已完成 {past.length} 节 {showCompleted ? '▴' : '▾'}
          </motion.div>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 8 }}
              >
                {past.map((it) => renderItem(it, { isPast: true }))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 30 }}>
      <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6,
        width: 2, background: 'linear-gradient(180deg,#cddce5,#e8e4dc)', borderRadius: 1 }} />
      {current.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>🔴 进行中</div>
          {current.map((it) => renderItem(it, { isCurrent: true }))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: past.length > 0 ? 10 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 6 }}>⏰ 接下来</div>
          {upcoming.map((it) => renderItem(it))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              marginBottom: showCompleted ? 8 : 0,
              cursor: 'pointer',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.03)',
              border: '0.5px solid rgba(0,0,0,0.05)',
            }}
          >
            ✓ 已完成 {past.length} 节 {showCompleted ? '▴' : '▾'}
          </motion.div>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 8 }}
              >
                {past.map((it) => renderItem(it, { isPast: true }))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/** 今日日程手风琴计数：仅统计未结束项 */
function countUpcomingTimeline(items: TimelineItem[], timeZone: string): number {
  const nowMin = getNowMinInTimeZone(timeZone)
  return items.filter(item => timelineToMin(item.time) + 45 >= nowMin).length
}

function PackingSection({ childId, userId, events, eventType }: {
  childId: string; userId: string; events: any[]; eventType: string
}) {
  const today = getTodayKey()
  const storageKey = `packing_${childId}_${today}`
  const [extraInput, setExtraInput] = useState('')
  const [extraItems, setExtraItems] = useState<string[]>([])
  const [askHabit, setAskHabit] = useState<string | null>(null)
  const baseItems = [...new Set(events.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : []))]
  const allItems  = [...new Set([...baseItems, ...extraItems])]

  const saveHabit = async (item: string, pref: 'always' | 'never') => {
    try {
      await supabase.from('child_packing_habits').upsert({
        user_id: userId, child_id: childId,
        event_type: eventType, item_name: item, preference: pref,
      }, { onConflict: 'child_id,event_type,item_name' })
    } catch (e) { logOrAlertNetworkError(e) }
    setAskHabit(null)
  }

  const addExtra = () => {
    const trimmed = extraInput.trim()
    if (!trimmed) return
    setExtraItems(prev => [...prev, trimmed])
    setExtraInput('')
    setAskHabit(trimmed)
  }

  if (!allItems.length && !extraInput && !extraItems.length) return (
    <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
      今天没有需要携带的物品
    </div>
  )
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {allItems.map((item, i) => (
          <PackCheckItem key={i} item={item} storageKey={storageKey}
            itemKey={`${eventType}-${item}`} size="md" />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={extraInput} onChange={e => setExtraInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addExtra()}
          placeholder="添加其他物品..."
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12,
            border: '0.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)',
            color: THEME.text, outline: 'none' }} />
        <motion.button whileTap={{ scale: 0.88 }} onClick={addExtra}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none',
            background: GREEN.dark, color: '#fff', fontSize: 12, cursor: 'pointer' }}>
          添加
        </motion.button>
      </div>
      <AnimatePresence>
        {askHabit && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10,
              background: GREEN.bg, border: `0.5px solid ${GREEN.border}` }}>
            <div style={{ fontSize: 11, color: GREEN.dark, marginBottom: 6 }}>
              「{askHabit}」下次也要提醒吗？
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => saveHabit(askHabit, 'always')}
                style={{ flex: 1, padding: '5px', borderRadius: 7,
                  border: `0.5px solid ${GREEN.mid}`, background: GREEN.bg,
                  color: GREEN.dark, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                是，下次提醒
              </motion.button>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => saveHabit(askHabit, 'never')}
                style={{ flex: 1, padding: '5px', borderRadius: 7,
                  border: '0.5px solid rgba(0,0,0,0.1)', background: 'transparent',
                  color: THEME.muted, fontSize: 11, cursor: 'pointer' }}>
                只用这次
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EventList({ events, onSelect }: { events: any[]; onSelect: (e: any) => void }) {
  if (!events.length) return (
    <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
      暂无安排
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {events.map((event, i) => (
        <motion.div key={i} whileTap={{ scale: 0.97 }} onClick={() => onSelect(event)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 10, background: 'rgba(255,255,255,0.7)',
            border: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{EVENT_TYPE_EMOJI[event.event_type] || '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: THEME.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.title}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 1 }}>
              {event.date_start && formatDate(event.date_start)}
              {event.requires_payment ? ` · 💰฿${event.requires_payment}` : ''}
              {event.requires_action  ? ' · ⚠需行动' : ''}
            </div>
          </div>
          <ChevronRight size={13} color={THEME.muted} style={{ flexShrink: 0 }} />
        </motion.div>
      ))}
    </div>
  )
}

function StatusEditor({ log, onSave, onClose }: {
  log: { health_status?: string | null; mood_status?: string | null }
  onSave: (h: HealthStatus, m: MoodStatus) => void
  onClose: () => void
}) {
  const [health, setHealth] = useState<string | null>(log.health_status || null)
  const [mood, setMood] = useState<string | null>(log.mood_status || null)
  const canSave = health != null && mood != null

  // 两项都选完 → 防抖自动保存（保留手动按钮作为兜底）
  useEffect(() => {
    if (!canSave) return
    const timer = setTimeout(() => {
      onSave(health as HealthStatus, mood as MoodStatus)
      toast('今日状态已记录 ✓', 'success')
    }, 500)
    return () => clearTimeout(timer)
  }, [canSave, health, mood, onSave])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', padding: 20 }}
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 20, padding: '24px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text }}>今天状态</div>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.4 }}>
            <X size={18} />
          </motion.div>
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>健康状态</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {healthOptions.map(o => (
            <motion.div key={o.value} whileTap={{ scale: 0.92 }} onClick={() => setHealth(o.value)}
              style={{ flex: 1, padding: '10px 0', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                background: health === o.value ? o.bg : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${health === o.value ? o.color : 'rgba(0,0,0,0.08)'}`,
                fontSize: 13, fontWeight: health === o.value ? 600 : 400,
                color: health === o.value ? o.color : THEME.muted, transition: 'all 0.15s' }}>
              {o.label}
            </motion.div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>今日心情</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
          {moodOptions.map(o => (
            <motion.div key={o.value} whileTap={{ scale: 0.92 }} onClick={() => setMood(o.value)}
              style={{ padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: mood === o.value ? `${o.color}12` : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${mood === o.value ? o.color : 'rgba(0,0,0,0.08)'}`,
                transition: 'all 0.15s' }}>
              <span style={{ fontSize: 20 }}>{o.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: mood === o.value ? 600 : 400,
                color: mood === o.value ? o.color : THEME.muted }}>{o.label}</span>
            </motion.div>
          ))}
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => { if (canSave) onSave(health as HealthStatus, mood as MoodStatus) }}
          disabled={!canSave}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: canSave ? '#2d322f' : 'rgba(45,50,47,0.2)', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: canSave ? 'pointer' : 'not-allowed' }}>
          {canSave ? '保存' : '请选择健康与心情'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

type Props = {
  childList: Child[]; sel: Child | null; onSel: (c: Child) => void
  onClose: () => void; onAdd: () => void; userId: string
  todos?: any[]; onOneTap?: (todo: any) => void
  onStatusSaved?: () => void | Promise<void>
}

export default function ChildSheet({ childList, sel, onSel, onClose, onAdd, userId, onStatusSaved }: Props) {
  const today    = getTodayKey()
  const tomorrow = getTomorrow()
  const in7days  = getIn7Days()
  const in30days = getIn30Days()

  const { timeline, calendar, packingItems, loading } = useChildSchedule(sel?.id, userId, today)
  const { dailyLog, saveStatus }        = useChildDailyLog(
    sel?.id, userId, today,
  )

  const timeZoneRef = useRef<string>('')
  if (!timeZoneRef.current) {
    try {
      timeZoneRef.current = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      timeZoneRef.current = 'UTC'
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadTz = async () => {
      if (!userId) return
      try {
        const { data } = await supabase
          .from('user_locations')
          .select('timezone')
          .eq('user_id', userId)
          .maybeSingle()
        const tz = (data as any)?.timezone
        if (!cancelled && typeof tz === 'string' && tz.trim()) {
          timeZoneRef.current = tz.trim()
          return
        }
      } catch (e) {
        // ignore; fallback to browser tz
      }
    }
    void loadTz()
    return () => { cancelled = true }
  }, [userId])

  const timeZone = timeZoneRef.current

  const [showStatusEditor, setShowStatusEditor] = useState(false)
  const [selectedEvent,    setSelectedEvent]    = useState<ChildEvent | null>(null)

  const isWeekend = [0, 6].includes(new Date().getDay())
  const energyResult = calculateEnergy({
    healthStatus:    dailyLog.health_status,
    moodStatus:      dailyLog.mood_status,
    usualBedtime:    sel?.usual_bedtime,
    weekendBedtime:  sel?.weekend_bedtime,
    schoolStartTime: sel?.school_start_time,
    isWeekend,
    todayEvents:  timeline.map(t => ({
      event_type:       t.type,
      requires_action:  t.event?.requires_action,
      requires_payment: t.event?.requires_payment,
      title:            t.title,
    })),
  })
  const computedEnergy = energyResult.score
  const handleSel = useCallback((c: Child) => { onSel(c) }, [onSel])
  const handleSaveStatus = async (h: HealthStatus, m: MoodStatus) => {
    await saveStatus(h, m)
    setShowStatusEditor(false)
    await onStatusSaved?.()
  }

  const isNonEmptyTitle = (e: any) => typeof e?.title === 'string' && e.title.trim().length > 0
  const todayEvents      = calendar.filter(e => e.date_start === today).filter(isNonEmptyTitle)
  const eveningEvents    = calendar.filter(e => e.date_start === tomorrow).filter(isNonEmptyTitle)
  const weekEvents       = calendar.filter(e => e.date_start > tomorrow  && e.date_start <= in7days).filter(isNonEmptyTitle)
  const monthEvents      = calendar.filter(e => e.date_start > in7days   && e.date_start <= in30days).filter(isNonEmptyTitle)
  const yearEvents       = calendar.filter(e => e.date_start > in30days).filter(isNonEmptyTitle)
  const calendarPackEvents = todayEvents.filter(
    e => Array.isArray(e.requires_items) && e.requires_items.length > 0,
  )
  const schedulePackEvents = timeline
    .filter(t => t.source === 'schedule')
    .map(t => t.event || {})
    .filter(e => Array.isArray(e.requires_items) && e.requires_items.length > 0)
  const packingListEvents = packingItems.length
    ? [{ requires_items: packingItems, _source: 'packing_list' as const }]
    : []
  const todayPackEvents  = [...calendarPackEvents, ...schedulePackEvents, ...packingListEvents]
  const tomorrowPack     = [...new Set(eveningEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : []))]
  const todayMainEventType = todayEvents[0]?.event_type || 'class'
  const todayPackCount   = [...new Set(todayPackEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : []))].length
  const upcomingTimelineCount = countUpcomingTimeline(timeline, timeZone)

  const hasLoggedStatus = dailyLog.health_status != null && dailyLog.mood_status != null

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 16px',
          paddingBottom: `max(${FLOAT_SHEET_BOTTOM}, max(env(safe-area-inset-bottom), 20px))`,
          background: 'rgba(180,200,210,0.35)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}>
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 430, margin: '0 10px',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(40px)',
            borderRadius: '24px 24px 0 0', overflow: 'hidden',
            maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

          <div style={{ height: 4, background: 'linear-gradient(90deg,#cddce5,#e8e4dc)', flexShrink: 0 }} />
          <div style={{ width: 32, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '10px auto 0' }} />

          <div style={{ padding: '8px 14px 0', flexShrink: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: THEME.text }}>孩子</span>
            <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', padding: 4 }}>
              <X size={18} color={THEME.muted} />
            </motion.div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px 20px',
            WebkitOverflowScrolling: 'touch' as any }}>
            {childList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px 28px' }}>
                <div style={{ fontSize: 14, color: THEME.muted, marginBottom: 16, lineHeight: 1.6 }}>
                  暂无孩子档案，添加后即可查看日程与状态
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onAdd}
                  style={{
                    padding: '12px 22px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#2d322f',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                  添加孩子
                </motion.button>
              </div>
            ) : (
            <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {childList.map(c => (
                <motion.div key={c.id} whileTap={{ scale: 0.88 }} onClick={() => handleSel(c)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 3, cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ width: c.id === sel?.id ? 52 : 40, height: c.id === sel?.id ? 52 : 40,
                    borderRadius: '50%', background: 'rgba(164,99,85,0.08)',
                    border: `2px solid ${c.id === sel?.id ? '#8a7355' : 'transparent'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: c.id === sel?.id ? 28 : 22, transition: 'all 0.18s',
                    boxShadow: c.id === sel?.id ? '0 0 0 3px rgba(164,99,85,0.18)' : 'none' }}>
                    {c.emoji}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: c.id === sel?.id ? 700 : 400,
                    color: c.id === sel?.id ? '#8a7355' : THEME.muted }}>
                    {c.name}
                  </span>
                </motion.div>
              ))}
              <motion.div whileTap={{ scale: 0.88 }} onClick={onAdd}
                style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px dashed rgba(0,0,0,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: THEME.muted }}>
                <Plus size={14} />
              </motion.div>
            </div>

            {!sel ? (
              <div style={{ textAlign: 'center', opacity: 0.35, padding: '30px 0',
                fontSize: 14, color: THEME.text }}>
                选择孩子查看状态
              </div>
            ) : (
              <>
                <ChildEnergyCard
                  name={sel.name}
                  energy={energyResult}
                  onClick={() => setShowStatusEditor(true)}
                />
                {!hasLoggedStatus && (
                  <p style={{ fontSize: 11, color: 'rgba(45,50,47,0.4)', textAlign: 'center', margin: '-4px 0 10px' }}>
                    今天未记录
                  </p>
                )}

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0',
                    opacity: 0.4, fontSize: 12, color: THEME.muted }}>
                    加载中...
                  </div>
                ) : (
                  <>
                    <Accordion title="📅 今日日程" count={upcomingTimelineCount} defaultOpen={true}>
                      <Timeline items={timeline} timeZone={timeZone} />
                    </Accordion>
                    <Accordion title="🎒 今日携带" count={todayPackCount}
                      badge={todayPackCount > 0 ? '需确认' : undefined}
                      defaultOpen={todayPackCount > 0}>
                      <PackingSection childId={sel.id} userId={userId}
                        events={todayPackEvents} eventType={todayMainEventType} />
                    </Accordion>
                    <Accordion title="📋 今日安排" count={todayEvents.length}
                      defaultOpen={todayEvents.length > 0}>
                      <EventList events={todayEvents} onSelect={setSelectedEvent} />
                    </Accordion>
                    <Accordion title="🌙 今晚准备"
                      count={eveningEvents.length + tomorrowPack.length} defaultOpen={false}>
                      {eveningEvents.length > 0 && (
                        <div style={{ marginBottom: tomorrowPack.length > 0 ? 12 : 0 }}>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>
                            明天的安排
                          </div>
                          <EventList events={eveningEvents} onSelect={setSelectedEvent} />
                        </div>
                      )}
                      {tomorrowPack.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>
                            明天要带（今晚装好）
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {tomorrowPack.map((item, i) => (
                              <PackCheckItem key={i} item={item}
                                storageKey={`packing_${sel.id}_${tomorrow}`}
                                itemKey={`tomorrow-${item}`} size="md" />
                            ))}
                          </div>
                        </div>
                      )}
                      {eveningEvents.length === 0 && tomorrowPack.length === 0 && (
                        <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6,
                          textAlign: 'center', padding: '8px 0' }}>
                          明天没有特别安排
                        </div>
                      )}
                    </Accordion>
                    <Accordion title="📆 本周安排" count={weekEvents.length} defaultOpen={false}>
                      <EventList events={weekEvents} onSelect={setSelectedEvent} />
                    </Accordion>
                    {monthEvents.length > 0 && (
                      <Accordion title="🗓 本月安排" count={monthEvents.length} defaultOpen={false}>
                        <EventList events={monthEvents} onSelect={setSelectedEvent} />
                      </Accordion>
                    )}
                    {yearEvents.length > 0 && (
                      <Accordion title="🎓 学年大事" count={yearEvents.length} defaultOpen={false}>
                        <EventList events={yearEvents} onSelect={setSelectedEvent} />
                      </Accordion>
                    )}
                    {timeline.length === 0 && calendar.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ opacity: 0.32, fontSize: 13, color: THEME.text, marginBottom: 12 }}>
                          还没有日程安排 🌸
                        </div>

                      </div>
                    )}

                  </>
                )}
              </>
            )}
            </>
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showStatusEditor && (
          <StatusEditor log={dailyLog} onSave={handleSaveStatus}
            onClose={() => setShowStatusEditor(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && sel && (
          <ChildActionSheet event={selectedEvent} childName={sel.name}
            userId={userId} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
