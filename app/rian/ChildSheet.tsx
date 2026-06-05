'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
import { TimelineSegment, buildTimelineSegments } from '@/app/_shared/_components/design'
import { buildPackingRows, countPendingPackingRows } from '@/lib/packing/buildPackingRows'
import {
  mergeDismissedItem,
  mergeManualItem,
  packingSubjectKey,
  type PackingPreferencesMap,
} from '@/lib/packing/packingPreferences'
import { isPlaceholderSubject } from '@/lib/schedule/placeholderSubject'
import {
  appendPackingListItem,
  savePackingPreferences,
} from '@/app/_shared/_services/childService'
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
function dedupeCalendarEvents<T extends { date_start?: string; title?: string }>(events: T[]): T[] {
  const seen = new Set<string>()
  return events.filter((e) => {
    const key = `${e.date_start}|${String(e.title || '').trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function loadBroughtMap(storageKey: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

function PackingSection({
  childId,
  userId,
  today,
  timeline,
  calendarToday,
  packingItems,
  packingPreferences,
  onPrefsChange,
  onReload,
}: {
  childId: string
  userId: string
  today: string
  timeline: TimelineItem[]
  calendarToday: { title?: string; requires_items?: unknown }[]
  packingItems: string[]
  packingPreferences: PackingPreferencesMap
  onPrefsChange: (p: PackingPreferencesMap) => void
  onReload: () => void
}) {
  const broughtKey = `packing_brought_${childId}_${today}`
  const [brought, setBrought] = useState<Record<string, boolean>>(() => loadBroughtMap(broughtKey))
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCourse, setAddCourse] = useState('__once__')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setBrought(loadBroughtMap(broughtKey))
  }, [broughtKey, childId, today])

  const rows = useMemo(
    () => buildPackingRows(timeline, calendarToday, packingItems, packingPreferences),
    [timeline, calendarToday, packingItems, packingPreferences],
  )

  const courseOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [{ key: '__once__', label: '今天一次性' }]
    const seen = new Set<string>()
    for (const t of timeline.filter((x) => x.source === 'schedule')) {
      const ev = (t.event || {}) as { subject?: string }
      const key = packingSubjectKey(ev.subject)
      if (!key || seen.has(key)) continue
      seen.add(key)
      opts.push({ key, label: t.title || key })
    }
    return opts
  }, [timeline])

  const markBrought = (rowId: string) => {
    setBrought((prev) => {
      const next = { ...prev, [rowId]: true }
      try {
        localStorage.setItem(broughtKey, JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
  }

  const dismissItem = async (row: { id: string; item: string; courseLabel: string; subjectKey: string | null }) => {
    if (!row.subjectKey) {
      if (!window.confirm(`今天不再提示「${row.item}」吗？`)) return
      markBrought(row.id)
      return
    }
    if (!window.confirm(`不再为「${row.courseLabel}」提示「${row.item}」吗？`)) return
    setBusy(true)
    try {
      const next = mergeDismissedItem(packingPreferences, row.subjectKey, row.item)
      await savePackingPreferences(childId, userId, next)
      onPrefsChange(next)
      toast('已设为不再提示', 'info')
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setBusy(false)
    }
  }

  const submitManualAdd = async () => {
    const name = addName.trim()
    if (!name) return
    setBusy(true)
    try {
      if (addCourse === '__once__') {
        await appendPackingListItem(childId, userId, today, name)
        onReload()
      } else {
        const next = mergeManualItem(packingPreferences, addCourse, name)
        await savePackingPreferences(childId, userId, next)
        onPrefsChange(next)
      }
      setAddName('')
      setShowAdd(false)
      toast('已添加', 'info')
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setBusy(false)
    }
  }

  const visibleRows = rows.filter((r) => !brought[r.id])

  if (!rows.length && !showAdd) {
    return (
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.6, textAlign: 'center', padding: '8px 0' }}>
          今天没有需要携带的物品
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
          style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 10,
            border: `0.5px dashed ${GREEN.mid}`, background: 'transparent',
            color: GREEN.dark, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + 手动添加
        </motion.button>
      </div>
    )
  }

  return (
    <div>
      {visibleRows.length === 0 && rows.length > 0 ? (
        <div style={{ fontSize: 12, color: GREEN.dark, textAlign: 'center', padding: '8px 0', fontWeight: 600 }}>
          今日携带已全部确认 ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {visibleRows.map((row) => (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 10, background: 'rgba(255,255,255,0.75)',
              border: '0.5px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{row.item}</div>
                <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>{row.courseLabel}</div>
              </div>
              <motion.button whileTap={{ scale: 0.92 }} disabled={busy}
                onClick={() => markBrought(row.id)}
                style={{ padding: '5px 10px', borderRadius: 8, border: 'none',
                  background: GREEN.dark, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                ✓ 带了
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} disabled={busy}
                onClick={() => dismissItem(row)}
                style={{ padding: '5px 10px', borderRadius: 8,
                  border: '0.5px solid rgba(0,0,0,0.12)', background: 'transparent',
                  color: THEME.muted, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                ✗ 不需要
              </motion.button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 8 }}>
            <input value={addName} onChange={(e) => setAddName(e.target.value)}
              placeholder="物品名称，如：泳衣"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                border: '0.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)',
                color: THEME.text, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <select value={addCourse} onChange={(e) => setAddCourse(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                border: '0.5px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)',
                color: THEME.text, marginBottom: 8, boxSizing: 'border-box' }}>
              {courseOptions.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button whileTap={{ scale: 0.92 }} disabled={busy} onClick={submitManualAdd}
                style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none',
                  background: GREEN.dark, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                保存
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => { setShowAdd(false); setAddName('') }}
                style={{ padding: '7px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.1)',
                  background: 'transparent', color: THEME.muted, fontSize: 12, cursor: 'pointer' }}>
                取消
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!showAdd && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 10,
            border: `0.5px dashed ${GREEN.mid}`, background: 'transparent',
            color: GREEN.dark, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + 手动添加
        </motion.button>
      )}
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

  const {
    timeline,
    calendar,
    packingItems,
    packingPreferences,
    loading,
    reload: reloadSchedule,
  } = useChildSchedule(sel?.id, userId, today)
  const [packPrefs, setPackPrefs] = useState<PackingPreferencesMap>({})
  useEffect(() => {
    setPackPrefs(packingPreferences)
  }, [packingPreferences, sel?.id])
  const { dailyLog, saveStatus }        = useChildDailyLog(
    sel?.id, userId, today,
  )

  const [timeZone, setTimeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok'
    } catch {
      return 'Asia/Bangkok'
    }
  })

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
          setTimeZone(tz.trim())
        }
      } catch (e) {
        // ignore; fallback to browser tz
      }
    }
    void loadTz()
    return () => { cancelled = true }
  }, [userId])

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
  const todayEvents      = dedupeCalendarEvents(calendar.filter(e => e.date_start === today).filter(isNonEmptyTitle))
  const eveningEvents    = dedupeCalendarEvents(calendar.filter(e => e.date_start === tomorrow).filter(isNonEmptyTitle))
  const weekEvents       = dedupeCalendarEvents(calendar.filter(e => e.date_start > tomorrow  && e.date_start <= in7days).filter(isNonEmptyTitle))
  const monthEvents      = dedupeCalendarEvents(calendar.filter(e => e.date_start > in7days   && e.date_start <= in30days).filter(isNonEmptyTitle))
  const yearEvents       = dedupeCalendarEvents(calendar.filter(e => e.date_start > in30days).filter(isNonEmptyTitle))
  const tomorrowPack     = [...new Set(eveningEvents.flatMap(e => Array.isArray(e.requires_items) ? e.requires_items : []))]
  const broughtStorageKey = sel ? `packing_brought_${sel.id}_${today}` : ''
  const todayPackCount = useMemo(() => {
    if (!sel) return 0
    const brought = loadBroughtMap(broughtStorageKey)
    const rows = buildPackingRows(timeline, todayEvents, packingItems, packPrefs)
    return countPendingPackingRows(rows, brought)
  }, [sel, timeline, todayEvents, packingItems, packPrefs, broughtStorageKey])
  const timelineSegments = useMemo(
    () => buildTimelineSegments(timeline, todayEvents, sel?.school_start_time),
    [timeline, todayEvents, sel?.school_start_time],
  )
  const timelineSegmentCount = useMemo(
    () => timelineSegments.reduce((n, seg) => n + seg.items.length, 0),
    [timelineSegments],
  )

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
                    <Accordion title="📅 今日时间线" count={timelineSegmentCount} defaultOpen={true}>
                      <div className="gc-eyebrow" style={{ margin: '4px 2px 0' }}>今日时间线</div>
                      <TimelineSegment segments={timelineSegments} />
                    </Accordion>
                    <Accordion title="🎒 今日携带" count={todayPackCount}
                      badge={todayPackCount > 0 ? '需确认' : undefined}
                      defaultOpen={todayPackCount > 0}>
                      <PackingSection
                        childId={sel.id}
                        userId={userId}
                        today={today}
                        timeline={timeline}
                        calendarToday={todayEvents}
                        packingItems={packingItems}
                        packingPreferences={packPrefs}
                        onPrefsChange={setPackPrefs}
                        onReload={reloadSchedule}
                      />
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
