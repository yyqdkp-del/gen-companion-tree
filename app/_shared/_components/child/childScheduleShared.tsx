'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { THEME, GREEN } from '@/app/_shared/_constants/theme'
import { EVENT_TYPE_EMOJI } from '@/app/_shared/_constants/categories'
import { packingSubjectKey } from '@/lib/packing/packingPreferences'
import {
  addManualPackingMemory,
  recordAllPackingConfirmed,
  recordPackingAction,
  type SmartPackingItem,
} from '@/lib/packing/packingMemory'
import type { Child, TimelineItem, HealthStatus, MoodStatus } from '@/app/_shared/_types'
import { addDaysStr, getTodayStr } from '@/lib/date/localDate'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { toast } from '@/app/components/Toast'

export const CLAY = 'var(--clay, #a46355)'
export const FG1 = 'var(--fg1, #2d322f)'
export const FG3 = 'var(--fg3, rgba(45,50,47,0.45))'

export function getTodayKey() { return getTodayStr() }
export function getTomorrow() { return addDaysStr(new Date(), 1) }
export function getIn7Days() { return addDaysStr(new Date(), 7) }
export function getIn30Days() { return addDaysStr(new Date(), 30) }

export function formatCalendarDate(d: string) {
  const date = new Date(d)
  const today = new Date()
  const tmr = new Date(today)
  tmr.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return '今天'
  if (date.toDateString() === tmr.toDateString()) return '明天'
  return `${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`
}

export function dedupeCalendarEvents<T extends { date_start?: string; title?: string }>(events: T[]): T[] {
  const seen = new Set<string>()
  return events.filter((e) => {
    const key = `${e.date_start}|${String(e.title || '').trim().toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function loadBroughtMap(storageKey: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

export function parseDisplayAge(child: Child): number | null {
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

export function buildChildSubtitle(child: Child): string {
  const parts: string[] = []
  const age = parseDisplayAge(child)
  if (age != null) parts.push(`${age} 岁`)
  if (child.school_name) parts.push(child.school_name)
  if (child.grade) parts.push(child.grade)
  return parts.join(' · ')
}

const healthOptions = [
  { value: 'normal', label: '健康', color: GREEN.dark, bg: GREEN.bg },
  { value: 'recovering', label: '恢复中', color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  { value: 'sick', label: '生病中', color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
]
const moodOptions = [
  { value: 'happy', label: '开心', emoji: '😊', color: '#D97706' },
  { value: 'calm', label: '平静', emoji: '😌', color: GREEN.dark },
  { value: 'anxious', label: '焦虑', emoji: '😟', color: '#7C3AED' },
  { value: 'upset', label: '低落', emoji: '😔', color: '#6B8BAA' },
]

export function PackingSection({
  childId,
  userId,
  smartItems,
  timeline,
  onRefresh,
}: {
  childId: string
  userId: string
  smartItems: SmartPackingItem[]
  timeline: TimelineItem[]
  onRefresh: () => void | Promise<void>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCourse, setAddCourse] = useState('__once__')
  const [busy, setBusy] = useState(false)

  const courseOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [{ key: '__once__', label: '不关联课程' }]
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

  const pendingItems = smartItems.filter((i) => !i.isConfirmed)
  const allConfirmed = smartItems.length > 0 && pendingItems.length === 0

  const handleConfirm = async (item: SmartPackingItem) => {
    setBusy(true)
    try {
      await recordPackingAction(childId, userId, item.itemName, item.course, 'confirmed')
      await onRefresh()
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = async (item: SmartPackingItem) => {
    const label = item.course || item.itemName
    if (!window.confirm(`不再提醒「${item.itemName}」${item.course ? `（${label}）` : ''}吗？`)) return
    setBusy(true)
    try {
      await recordPackingAction(childId, userId, item.itemName, item.course, 'dismissed')
      toast('已设为不再提示', 'info')
      await onRefresh()
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setBusy(false)
    }
  }

  const handleAllConfirmed = async () => {
    setBusy(true)
    try {
      await recordAllPackingConfirmed(childId, userId, smartItems)
      toast('太棒了，全部带好了 ✓', 'success')
      await onRefresh()
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
      const course = addCourse === '__once__' ? null : addCourse
      await addManualPackingMemory(childId, userId, name, course)
      setAddName('')
      setShowAdd(false)
      toast('已添加', 'info')
      await onRefresh()
    } catch (e) {
      logOrAlertNetworkError(e)
    } finally {
      setBusy(false)
    }
  }

  if (!smartItems.length && !showAdd) {
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
      {allConfirmed ? (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--accent-jade, #5c7a5e)', textAlign: 'center', padding: '8px 0', fontWeight: 600 }}>
          今日携带已全部确认 ✓
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 8 }}>
          {smartItems.map((item) => {
            const confirmed = item.isConfirmed
            const dotColor = confirmed ? '#8ca88d' : item.isHighRisk ? '#EA580C' : CLAY
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
                borderRadius: 13, background: '#fff',
                boxShadow: 'var(--sh-soft)',
                opacity: confirmed ? 0.72 : 1,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: dotColor, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500,
                    color: confirmed ? FG3 : FG1,
                    textDecoration: confirmed ? 'line-through' : 'none',
                  }}>
                    {confirmed ? '✓ ' : ''}{item.itemName}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, marginTop: 2 }}>
                    {item.isHighRisk ? (
                      <span style={{ color: '#EA580C' }}>⚠️ 上次忘带过</span>
                    ) : item.course ? (
                      item.course
                    ) : (
                      '今天额外'
                    )}
                  </div>
                </div>
                {!confirmed ? (
                  <>
                    <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                      onClick={() => { void handleConfirm(item) }}
                      className="gc-btn gc-btn--ghost"
                      style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}>
                      ✓ 带了
                    </motion.button>
                    <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                      onClick={() => { void handleDismiss(item) }}
                      className="gc-btn gc-btn--ghost"
                      style={{ padding: '5px 8px', fontSize: 11, flexShrink: 0, color: FG3 }}>
                      ✗ 不需要
                    </motion.button>
                  </>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {pendingItems.length > 0 ? (
        <motion.button type="button" whileTap={{ scale: 0.97 }} disabled={busy}
          onClick={() => { void handleAllConfirmed() }}
          className="gc-btn"
          style={{ width: '100%', marginBottom: 8, padding: '10px' }}>
          全部带好了
        </motion.button>
      ) : null}

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
              <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy} onClick={() => { void submitManualAdd() }}
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

export function EventList({ events, onSelect }: { events: any[]; onSelect: (e: any) => void }) {
  if (!events.length) {
    return (
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, opacity: 0.7, textAlign: 'center', padding: '8px 0' }}>
        暂无安排
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {events.map((event, i) => (
        <motion.div key={i} whileTap={{ scale: 0.98 }} onClick={() => onSelect(event)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
            borderRadius: 13, background: '#fff',
            boxShadow: 'var(--sh-soft)', cursor: 'pointer',
          }}>
          <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{EVENT_TYPE_EMOJI[event.event_type] || '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, color: FG1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {event.title}
            </div>
            {event.date_start ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, marginTop: 2 }}>
                {formatCalendarDate(event.date_start)}
              </div>
            ) : null}
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

export function StatusEditor({ log, onSave, onClose }: {
  log: { health_status?: string | null; mood_status?: string | null }
  onSave: (h: HealthStatus, m: MoodStatus) => void
  onClose: () => void
}) {
  const [health, setHealth] = useState<string | null>(log.health_status || null)
  const [mood, setMood] = useState<string | null>(log.mood_status || null)
  const canSave = health != null && mood != null

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
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: 'var(--canvas-light)', borderRadius: 20, padding: '24px 20px',
          boxShadow: 'var(--sh-warm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: FG1 }}>今天状态</div>
          <motion.div whileTap={{ scale: 0.86 }} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.4 }}>
            <X size={18} />
          </motion.div>
        </div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, fontWeight: 600 }}>健康状态</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {healthOptions.map((o) => (
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
          {moodOptions.map((o) => (
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
          className="gc-btn"
          style={{ width: '100%', opacity: canSave ? 1 : 0.5 }}>
          {canSave ? '保存' : '请选择健康与心情'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
