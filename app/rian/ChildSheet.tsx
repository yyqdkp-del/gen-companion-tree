'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import ChildActionSheet, { ChildEvent } from '@/app/rian/ChildActionSheet'
import Accordion from '@/app/_shared/_components/Accordion'
import { THEME, GREEN } from '@/app/_shared/_constants/theme'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { EVENT_TYPE_EMOJI } from '@/app/_shared/_constants/categories'
import { useChildSchedule } from '@/app/_shared/_hooks/useChildSchedule'
import { useChildDailyLog } from '@/app/_shared/_hooks/useChildDailyLog'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { calculateEnergy } from '@/app/_shared/_engine/energy'
import ChildEnergyCard from '@/app/_shared/_components/ChildEnergyCard'
import { TimelineSegment, buildTimelineSegments } from '@/app/_shared/_components/design'
import { buildPackingRows, countPendingPackingRows } from '@/lib/packing/buildPackingRows'
import {
  mergeDismissedItem,
  mergeManualItem,
  packingSubjectKey,
  type PackingPreferencesMap,
} from '@/lib/packing/packingPreferences'
import {
  appendPackingListItem,
  savePackingPreferences,
} from '@/app/_shared/_services/childService'
import type { Child, TimelineItem, HealthStatus, MoodStatus } from '@/app/_shared/_types'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'
import { toast } from '@/app/components/Toast'

const SHEET_EASE = [0.16, 1, 0.3, 1] as const
const CLAY = '#a46355'
const FG1 = '#2d322f'
const FG3 = 'rgba(45,50,47,0.45)'

function firstChineseChar(name: string): string {
  const m = name.match(/[\u4e00-\u9fff]/)
  return m ? m[0] : (name.trim().charAt(0) || '?')
}

function parseDisplayAge(child: Child): number | null {
  if (child.birthdate) {
    const birth = new Date(child.birthdate)
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date()
      let age = now.getFullYear() - birth.getFullYear()
      if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
        age -= 1
      }
      return age > 0 ? age : null
    }
  }
  if (child.grade) {
    const m = String(child.grade).match(/(\d+)/)
    if (m) {
      const g = parseInt(m[1], 10)
      if (g >= 1 && g <= 12) return g + 5
    }
  }
  return null
}

function buildChildSubtitle(child: Child): string {
  const parts: string[] = []
  const age = parseDisplayAge(child)
  if (age != null) parts.push(`${age} 岁`)
  if (child.school_name) parts.push(child.school_name)
  if (child.grade) parts.push(child.grade)
  return parts.join(' · ')
}

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
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, opacity: 0.7, textAlign: 'center', padding: '8px 0' }}>
          今天没有需要携带的物品
        </div>
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
          style={{ width: '100%', marginTop: 8, padding: '6px 0', border: 'none', background: 'transparent',
            color: CLAY, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + 手动添加
        </motion.button>
      </div>
    )
  }

  return (
    <div>
      {visibleRows.length === 0 && rows.length > 0 ? (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#5c7a5e', textAlign: 'center', padding: '8px 0', fontWeight: 600 }}>
          今日携带已全部确认 ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
          {visibleRows.map((row) => (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
              borderRadius: 13, background: '#fff',
              boxShadow: '0 3px 14px rgba(45,50,47,0.03)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: CLAY, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, color: FG1 }}>{row.item}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, marginTop: 2 }}>{row.courseLabel}</div>
              </div>
              <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                onClick={() => markBrought(row.id)}
                className="gc-btn gc-btn--ghost"
                style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
                ✓ 带了
              </motion.button>
              <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                onClick={() => dismissItem(row)}
                aria-label="不需要"
                style={{ padding: 4, border: 'none', background: 'transparent',
                  color: FG3, cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
                <X size={16} />
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
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                border: '1px solid rgba(45,50,47,0.1)', background: '#fff',
                color: FG1, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
            <select value={addCourse} onChange={(e) => setAddCourse(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                border: '1px solid rgba(45,50,47,0.1)', background: '#fff',
                color: FG1, marginBottom: 8, boxSizing: 'border-box' }}>
              {courseOptions.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy} onClick={submitManualAdd}
                className="gc-btn" style={{ flex: 1, padding: '10px' }}>
                保存
              </motion.button>
              <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => { setShowAdd(false); setAddName('') }}
                className="gc-btn gc-btn--ghost" style={{ padding: '10px 16px' }}>
                取消
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!showAdd && (
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
          style={{ width: '100%', padding: '6px 0', border: 'none', background: 'transparent',
            color: CLAY, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          + 手动添加
        </motion.button>
      )}
    </div>
  )
}

function EventList({ events, onSelect }: { events: any[]; onSelect: (e: any) => void }) {
  if (!events.length) return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, opacity: 0.7, textAlign: 'center', padding: '8px 0' }}>
      暂无安排
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {events.map((event, i) => (
        <motion.div key={i} whileTap={{ scale: 0.98 }} onClick={() => onSelect(event)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
            borderRadius: 13, background: '#fff',
            boxShadow: '0 3px 14px rgba(45,50,47,0.03)', cursor: 'pointer',
          }}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{EVENT_TYPE_EMOJI[event.event_type] || '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, color: FG1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {event.title}
            </div>
            {event.date_start && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, marginTop: 2 }}>
                {formatDate(event.date_start)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
            {event.requires_payment ? (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(164,99,85,0.1)', color: CLAY,
              }}>
                ฿{event.requires_payment}
              </span>
            ) : null}
            {event.requires_action ? (
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                padding: '3px 8px', borderRadius: 8,
                background: 'rgba(234,88,12,0.1)', color: '#ea580c',
              }}>
                需行动
              </span>
            ) : null}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function TomorrowPackRow({ item, storageKey, itemKey }: { item: string; storageKey: string; itemKey: string }) {
  const [done, setDone] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
      return !!stored[itemKey]
    } catch { return false }
  })

  const toggle = () => {
    setDone((prev) => {
      const next = !prev
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
        stored[itemKey] = next
        localStorage.setItem(storageKey, JSON.stringify(stored))
      } catch { /* ignore */ }
      return next
    })
  }

  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
        borderRadius: 13, background: done ? 'rgba(140,168,141,0.08)' : '#fff',
        boxShadow: '0 3px 14px rgba(45,50,47,0.03)', cursor: 'pointer',
        opacity: done ? 0.75 : 1,
      }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>🎒</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, color: FG1,
          textDecoration: done ? 'line-through' : 'none',
        }}>
          {item}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, marginTop: 2 }}>
          明天要带 · 今晚装好
        </div>
      </div>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        border: done ? 'none' : '1.5px solid rgba(45,50,47,0.2)',
        background: done ? '#8ca88d' : 'transparent',
        color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done ? '✓' : ''}
      </span>
    </motion.div>
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
        style={{ width: '100%', maxWidth: 360, background: '#fbf9f6', borderRadius: 20, padding: '24px 20px',
          boxShadow: '0 10px 40px rgba(45,50,47,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: FG1 }}>今天状态</div>
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
  const handleSel = useCallback((c: Child) => { onSel(c) }, [onSel])
  const switcherRef = useRef<HTMLDivElement>(null)
  const activeChipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [sel?.id])
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
          paddingBottom: `max(${FLOAT_SHEET_BOTTOM}, max(env(safe-area-inset-bottom), 20px))`,
          background: 'rgba(45,50,47,0.32)' }}
        onClick={onClose}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ duration: 0.42, ease: SHEET_EASE }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 430,
            background: '#fbf9f6',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -10px 60px rgba(0,0,0,0.18)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>

          <div style={{
            width: 38, height: 4, borderRadius: 2,
            background: 'rgba(45,50,47,0.16)', margin: '10px auto 12px', flexShrink: 0,
          }} />

          <div style={{
            overflowY: 'auto', flex: 1, padding: '0 22px 28px',
            WebkitOverflowScrolling: 'touch' as any,
          }}>
            {childList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px 28px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: FG3, marginBottom: 16, lineHeight: 1.6 }}>
                  暂无孩子档案，添加后即可查看日程与状态
                </div>
                <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onAdd} className="gc-btn">
                  添加孩子
                </motion.button>
              </div>
            ) : (
            <>
            <div ref={switcherRef} style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
              overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none',
              scrollSnapType: 'x mandatory',
            }}>
              {childList.map(c => {
                const active = c.id === sel?.id
                return (
                  <motion.div
                    key={c.id}
                    ref={active ? activeChipRef : undefined}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSel(c)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 4, cursor: 'pointer', flexShrink: 0, scrollSnapAlign: 'center',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'rgba(164,99,85,0.06)',
                      border: `2px solid ${active ? CLAY : 'transparent'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, transition: 'border-color 0.18s',
                    }}>
                      {c.emoji}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: 10,
                      fontWeight: active ? 600 : 400,
                      color: active ? CLAY : FG3,
                      maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.name}
                    </span>
                  </motion.div>
                )
              })}
              <motion.div whileTap={{ scale: 0.9 }} onClick={onAdd}
                style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px dashed rgba(45,50,47,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: FG3, scrollSnapAlign: 'center',
                }}>
                <Plus size={16} />
              </motion.div>
            </div>

            {!sel ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button type="button" onClick={onClose} aria-label="关闭"
                  style={{
                    border: 'none', background: 'rgba(45,50,47,0.05)', width: 34, height: 34,
                    borderRadius: '50%', cursor: 'pointer', color: FG3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <X size={17} />
                </button>
              </div>
            ) : null}

            {!sel ? (
              <div style={{ textAlign: 'center', opacity: 0.45, padding: '24px 0',
                fontFamily: 'var(--font-serif)', fontSize: 14, color: FG1 }}>
                选择孩子查看状态
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 4 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 18, flexShrink: 0,
                    background: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-serif)', fontSize: 22, color: '#2f4030',
                  }}>
                    {firstChineseChar(sel.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: FG1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {sel.name}
                    </div>
                    {buildChildSubtitle(sel) ? (
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, marginTop: 2 }}>
                        {buildChildSubtitle(sel)}
                      </div>
                    ) : null}
                  </div>
                  <button type="button" onClick={onClose} aria-label="关闭"
                    style={{
                      border: 'none', background: 'rgba(45,50,47,0.05)', width: 34, height: 34,
                      borderRadius: '50%', cursor: 'pointer', color: FG3, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <X size={17} />
                  </button>
                </div>

                <ChildEnergyCard
                  name={sel.name}
                  energy={energyResult}
                  onClick={() => setShowStatusEditor(true)}
                />
                {!hasLoggedStatus && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, textAlign: 'center', margin: '0 0 12px' }}>
                    今天未记录
                  </p>
                )}

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.45,
                    fontFamily: 'var(--font-body)', fontSize: 12, color: FG3 }}>
                    加载中...
                  </div>
                ) : (
                  <>
                    <Accordion variant="gc" title="今日时间线" count={timelineSegmentCount} defaultOpen={true}>
                      <TimelineSegment segments={timelineSegments} />
                    </Accordion>
                    <Accordion variant="gc" title="今日携带" count={todayPackCount}
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
                    <Accordion variant="gc" title="今日安排" count={todayEvents.length}
                      defaultOpen={todayEvents.length > 0}>
                      <EventList events={todayEvents} onSelect={setSelectedEvent} />
                    </Accordion>
                    <Accordion variant="gc" title="今晚准备"
                      count={eveningEvents.length + tomorrowPack.length} defaultOpen={false}>
                      {eveningEvents.length > 0 && (
                        <div style={{ marginBottom: tomorrowPack.length > 0 ? 12 : 0 }}>
                          <div className="gc-eyebrow" style={{ margin: '0 0 8px' }}>明天的安排</div>
                          <EventList events={eveningEvents} onSelect={setSelectedEvent} />
                        </div>
                      )}
                      {tomorrowPack.length > 0 && (
                        <div>
                          <div className="gc-eyebrow" style={{ margin: '0 0 8px' }}>明天要带（今晚装好）</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {tomorrowPack.map((item, i) => (
                              <TomorrowPackRow key={i} item={item}
                                storageKey={`packing_${sel.id}_${tomorrow}`}
                                itemKey={`tomorrow-${item}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      {eveningEvents.length === 0 && tomorrowPack.length === 0 && (
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, opacity: 0.7,
                          textAlign: 'center', padding: '8px 0' }}>
                          明天没有特别安排
                        </div>
                      )}
                    </Accordion>
                    <Accordion variant="gc" title="本周安排" count={weekEvents.length} defaultOpen={false}>
                      <EventList events={weekEvents} onSelect={setSelectedEvent} />
                    </Accordion>
                    {monthEvents.length > 0 && (
                      <Accordion variant="gc" title="本月安排" count={monthEvents.length} defaultOpen={false}>
                        <EventList events={monthEvents} onSelect={setSelectedEvent} />
                      </Accordion>
                    )}
                    {yearEvents.length > 0 && (
                      <Accordion variant="gc" title="学年大事" count={yearEvents.length} defaultOpen={false}>
                        <EventList events={yearEvents} onSelect={setSelectedEvent} />
                      </Accordion>
                    )}
                    {timeline.length === 0 && calendar.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ opacity: 0.4, fontFamily: 'var(--font-serif)', fontSize: 13, color: FG1 }}>
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
