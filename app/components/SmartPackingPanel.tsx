'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  addManualPackingMemory,
  recordAllPackingConfirmed,
  recordPackingAction,
  type SmartPackingItem,
} from '@/lib/packing/packingMemory'
import { packingSubjectKey } from '@/lib/packing/packingPreferences'
import type { TimelineItem } from '@/app/_shared/_types'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { toast } from '@/app/components/Toast'

const CLAY = 'var(--clay, #a46355)'
const FG1 = 'var(--fg1, #2d322f)'
const FG3 = 'var(--fg3, rgba(45,50,47,0.45))'
const HIGH_RISK = '#EA580C'

export type SmartPackingPanelProps = {
  childId: string
  userId: string
  items: SmartPackingItem[]
  onRefresh: () => void | Promise<void>
  /** full：孩子详情；compact：首页卡片 / 一键办 */
  variant?: 'full' | 'compact'
  timeline?: TimelineItem[]
  showManualAdd?: boolean
  title?: string
}

function sortItems(items: SmartPackingItem[]): SmartPackingItem[] {
  return [...items].sort((a, b) => {
    if (a.isHighRisk && !b.isHighRisk) return -1
    if (!a.isHighRisk && b.isHighRisk) return 1
    if (!a.isConfirmed && b.isConfirmed) return -1
    if (a.isConfirmed && !b.isConfirmed) return 1
    return b.forgetCount - a.forgetCount
  })
}

export default function SmartPackingPanel({
  childId,
  userId,
  items,
  onRefresh,
  variant = 'full',
  timeline = [],
  showManualAdd = true,
  title,
}: SmartPackingPanelProps) {
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCourse, setAddCourse] = useState('__once__')

  const sorted = useMemo(() => sortItems(items), [items])
  const pending = sorted.filter((i) => !i.isConfirmed)
  const allConfirmed = sorted.length > 0 && pending.length === 0
  const compact = variant === 'compact'

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

  const runAction = async (item: SmartPackingItem, action: 'confirmed' | 'forgotten' | 'dismissed') => {
    setBusy(true)
    try {
      await recordPackingAction(childId, userId, item.itemName, item.course, action)
      if (action === 'confirmed') toast('已记录 ✓', 'success')
      if (action === 'forgotten') toast('下次会重点提醒', 'info')
      if (action === 'dismissed') toast('已设为不再提示', 'info')
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
    await runAction(item, 'dismissed')
  }

  const handleAllConfirmed = async () => {
    setBusy(true)
    try {
      await recordAllPackingConfirmed(childId, userId, sorted)
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

  if (!sorted.length && !showAdd) {
    if (!showManualAdd) return null
    return (
      <div>
        {title ? (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: FG3,
            marginBottom: 8,
            letterSpacing: '0.06em',
          }}>
            {title}
          </div>
        ) : null}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: FG3,
          opacity: 0.7,
          textAlign: 'center',
          padding: compact ? '4px 0' : '8px 0',
        }}>
          今天没有需要携带的物品
        </div>
        <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '6px 0',
            border: 'none',
            background: 'transparent',
            color: CLAY,
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
          + 手动添加
        </motion.button>
      </div>
    )
  }

  return (
    <div>
      {title ? (
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: FG3,
          marginBottom: compact ? 6 : 8,
          letterSpacing: '0.06em',
        }}>
          {title}
        </div>
      ) : null}

      {allConfirmed ? (
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--accent-jade, #5c7a5e)',
          textAlign: 'center',
          padding: compact ? '4px 0' : '8px 0',
          fontWeight: 600,
        }}>
          今日携带已全部确认 ✓
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 6 : 7,
          marginBottom: compact ? 6 : 8,
        }}>
          {sorted.map((item) => {
            const confirmed = item.isConfirmed
            const dotColor = confirmed ? '#8ca88d' : item.isHighRisk ? HIGH_RISK : CLAY
            return (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: compact ? 'flex-start' : 'center',
                gap: compact ? 8 : 10,
                padding: compact ? '8px 10px' : '10px 13px',
                borderRadius: compact ? 10 : 13,
                background: compact ? 'rgba(251,249,246,0.9)' : '#fff',
                boxShadow: compact ? 'none' : 'var(--sh-soft)',
                border: compact ? '0.5px solid rgba(45,50,47,0.08)' : 'none',
                opacity: confirmed ? 0.72 : 1,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: dotColor,
                  flexShrink: 0,
                  marginTop: compact ? 6 : 0,
                }} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: compact ? 14 : 14,
                    fontWeight: 500,
                    color: confirmed ? FG3 : FG1,
                    textDecoration: confirmed ? 'line-through' : 'none',
                  }}>
                    {confirmed ? '✓ ' : ''}{item.itemName}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, marginTop: 2 }}>
                    {item.isHighRisk ? (
                      <span style={{ color: HIGH_RISK, fontWeight: 600 }}>上次忘了</span>
                    ) : item.course ? (
                      <span style={{ color: FG3 }}>{item.course}</span>
                    ) : (
                      <span style={{ color: FG3 }}>今天额外</span>
                    )}
                  </div>
                </div>
                {!confirmed ? (
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    flexShrink: 0,
                    flexWrap: 'wrap',
                    marginLeft: compact ? 'auto' : undefined,
                  }}>
                    <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                      onClick={() => { void runAction(item, 'confirmed') }}
                      className="gc-btn gc-btn--ghost"
                      style={{ padding: compact ? '4px 8px' : '5px 10px', fontSize: 11 }}>
                      ✓ 带了
                    </motion.button>
                    <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                      onClick={() => { void runAction(item, 'forgotten') }}
                      className="gc-btn gc-btn--ghost"
                      style={{ padding: compact ? '4px 8px' : '5px 10px', fontSize: 11, color: HIGH_RISK }}>
                      忘了
                    </motion.button>
                    <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                      onClick={() => { void handleDismiss(item) }}
                      className="gc-btn gc-btn--ghost"
                      style={{ padding: compact ? '4px 6px' : '5px 8px', fontSize: 11, color: FG3 }}>
                      不需要
                    </motion.button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {pending.length > 0 ? (
        <motion.button type="button" whileTap={{ scale: 0.97 }} disabled={busy}
          onClick={() => { void handleAllConfirmed() }}
          className="gc-btn"
          style={{ width: '100%', marginBottom: compact ? 4 : 8, padding: compact ? '8px' : '10px' }}>
          全部带好了
        </motion.button>
      ) : null}

      {showManualAdd && !compact ? (
        <>
          <AnimatePresence>
            {showAdd ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: 8 }}>
                <input value={addName} onChange={(e) => setAddName(e.target.value)}
                  placeholder="物品名称，如：泳衣"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                    border: '1px solid rgba(45,50,47,0.1)', background: '#fff',
                    color: FG1, outline: 'none', boxSizing: 'border-box', marginBottom: 6,
                  }} />
                <select value={addCourse} onChange={(e) => setAddCourse(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                    border: '1px solid rgba(45,50,47,0.1)', background: '#fff',
                    color: FG1, marginBottom: 8, boxSizing: 'border-box',
                  }}>
                  {courseOptions.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button type="button" whileTap={{ scale: 0.92 }} disabled={busy}
                    onClick={() => { void submitManualAdd() }}
                    className="gc-btn" style={{ flex: 1, padding: '10px' }}>
                    保存
                  </motion.button>
                  <motion.button type="button" whileTap={{ scale: 0.92 }}
                    onClick={() => { setShowAdd(false); setAddName('') }}
                    className="gc-btn gc-btn--ghost" style={{ padding: '10px 16px' }}>
                    取消
                  </motion.button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {!showAdd && (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => setShowAdd(true)}
              style={{
                width: '100%', padding: '6px 0', border: 'none', background: 'transparent',
                color: CLAY, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
              + 手动添加
            </motion.button>
          )}
        </>
      ) : null}
    </div>
  )
}
