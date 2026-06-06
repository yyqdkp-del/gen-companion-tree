'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Accordion from '@/app/_shared/_components/Accordion'
import ChildSwitcher from '@/app/_shared/_components/child/ChildSwitcher'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { useChildSchedule } from '@/app/_shared/_hooks/useChildSchedule'
import { useChildDailyLog } from '@/app/_shared/_hooks/useChildDailyLog'
import { calculateEnergy } from '@/app/_shared/_engine/energy'
import ChildEnergyCard from '@/app/_shared/_components/ChildEnergyCard'
import { TimelineSegment, buildTimelineSegments } from '@/app/_shared/_components/design'
import { buildPackingRows, countPendingPackingRows } from '@/lib/packing/buildPackingRows'
import type { PackingPreferencesMap } from '@/lib/packing/packingPreferences'
import type { HealthStatus, MoodStatus } from '@/app/_shared/_types'
import type { WeeklyScheduleIntelligence } from '@/lib/ai/scheduleIntelligence'
import { isRealScheduleClass, type ScheduleClass } from '@/app/_shared/_engine/momentCard'
import { useApp } from '@/app/context/AppContext'
import {
  dedupeCalendarEvents,
  FG3,
  getTodayKey,
  loadBroughtMap,
  PackingSection,
  StatusEditor,
} from '@/app/_shared/_components/child/childScheduleShared'

const SHEET_EASE = [0.16, 1, 0.3, 1] as const
const FG2 = '#5B615E'

function countMondayClasses(classSchedule: Record<string, unknown> | undefined): number {
  const raw = classSchedule?.mon
  if (!Array.isArray(raw)) return 0
  return raw.filter((item) => {
    if (typeof item === 'object' && item !== null) {
      return isRealScheduleClass(item as ScheduleClass)
    }
    return String(item).trim().length > 0
  }).length
}

type Props = {
  onClose: () => void
  onAdd: () => void
  onStatusSaved?: () => void | Promise<void>
}

export default function ChildSheet({ onClose, onAdd, onStatusSaved }: Props) {
  const router = useRouter()
  const { userId, kids, activeKid } = useApp()
  const sel = activeKid
  const today = getTodayKey()

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

  const { dailyLog, saveStatus } = useChildDailyLog(sel?.id, userId, today)
  const [showStatusEditor, setShowStatusEditor] = useState(false)

  const isWeekend = [0, 6].includes(new Date().getDay())
  const scheduleIntelligence = (sel?.schedule_intelligence as WeeklyScheduleIntelligence | null | undefined) ?? undefined
  const energyResult = calculateEnergy({
    healthStatus: dailyLog.health_status,
    moodStatus: dailyLog.mood_status,
    usualBedtime: sel?.usual_bedtime,
    weekendBedtime: sel?.weekend_bedtime,
    schoolStartTime: sel?.school_start_time,
    isWeekend,
    intelligence: scheduleIntelligence,
    todayEvents: timeline.map((t) => ({
      event_type: t.type,
      subject: t.event?.subject || t.title,
      requires_action: t.event?.requires_action,
      requires_payment: t.event?.requires_payment,
      title: t.title,
    })),
  })

  const handleSaveStatus = async (h: HealthStatus, m: MoodStatus) => {
    await saveStatus(h, m)
    setShowStatusEditor(false)
    await onStatusSaved?.()
  }

  const isNonEmptyTitle = (e: { title?: string }) => typeof e?.title === 'string' && e.title.trim().length > 0
  const todayEvents = dedupeCalendarEvents(calendar.filter((e) => e.date_start === today).filter(isNonEmptyTitle))

  const broughtStorageKey = sel ? `packing_brought_${sel.id}_${today}` : ''
  const packingRows = useMemo(() => {
    if (!sel) return []
    return buildPackingRows(timeline, todayEvents, packingItems, packPrefs)
  }, [sel, timeline, todayEvents, packingItems, packPrefs])

  const todayPackCount = useMemo(() => {
    if (!sel) return 0
    const brought = loadBroughtMap(broughtStorageKey)
    return countPendingPackingRows(packingRows, brought)
  }, [sel, packingRows, broughtStorageKey])

  const timelineSegments = useMemo(
    () => buildTimelineSegments(timeline, todayEvents, sel?.school_start_time),
    [timeline, todayEvents, sel?.school_start_time],
  )
  const timelineSegmentCount = useMemo(
    () => timelineSegments.reduce((n, seg) => n + seg.items.length, 0),
    [timelineSegments],
  )

  const hasLoggedStatus = dailyLog.health_status != null && dailyLog.mood_status != null
  const profileIncomplete = Boolean(sel && !sel.usual_bedtime && !sel.school_start_time)
  const mondayClassCount = useMemo(
    () => countMondayClasses(sel?.class_schedule as Record<string, unknown> | undefined),
    [sel?.class_schedule],
  )
  const nextSchoolDay = mondayClassCount > 0

  const openFullProfile = () => {
    onClose()
    router.push('/growth')
  }

  const openProfileSetup = () => {
    if (!sel) return
    onClose()
    router.push(`/children/${sel.id}/profile`)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: `max(${FLOAT_SHEET_BOTTOM}, max(env(safe-area-inset-bottom), 20px))`,
          background: 'rgba(45,50,47,0.32)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.42, ease: SHEET_EASE }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 430,
            background: 'var(--canvas-light)',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -10px 60px rgba(0,0,0,0.18)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{
            width: 38, height: 4, borderRadius: 2,
            background: 'rgba(45,50,47,0.16)', margin: '10px auto 12px', flexShrink: 0,
          }} />

          <div style={{
            overflowY: 'auto', flex: 1, padding: '0 22px 20px',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          }}>
            {kids.length === 0 ? (
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="关闭"
                    style={{
                      border: 'none', background: 'rgba(45,50,47,0.05)', width: 34, height: 34,
                      borderRadius: '50%', cursor: 'pointer', color: FG3,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>

                <ChildSwitcher mode="bar" onAdd={onAdd} />

                {!sel ? (
                  <div style={{ textAlign: 'center', opacity: 0.45, padding: '24px 0',
                    fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--fg1)' }}>
                    选择孩子查看状态
                  </div>
                ) : loading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.45,
                    fontFamily: 'var(--font-body)', fontSize: 12, color: FG3 }}>
                    加载中...
                  </div>
                ) : (
                  <>
                    {profileIncomplete ? (
                      <div style={{
                        background: '#FCFAF7',
                        borderRadius: 16,
                        padding: '16px 20px',
                        marginBottom: 12,
                      }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: '#2d322f' }}>
                          根还不太了解 {sel.name} 的日常作息
                        </div>
                        <div style={{ fontSize: 13, color: FG2, marginTop: 4, lineHeight: 1.6 }}>
                          填写睡觉时间和上课时间
                          <br />
                          根就能每天告诉你孩子的状态
                        </div>
                        <button
                          type="button"
                          onClick={openProfileSetup}
                          style={{
                            marginTop: 12,
                            background: 'var(--accent-clay)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            fontSize: 14,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          30秒完成设置
                        </button>
                      </div>
                    ) : (
                      <>
                        <ChildEnergyCard
                          name={sel.name}
                          energy={energyResult}
                          onClick={() => setShowStatusEditor(true)}
                        />
                        {!hasLoggedStatus ? (
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, textAlign: 'center', margin: '0 0 12px' }}>
                            今天未记录
                          </p>
                        ) : null}
                      </>
                    )}

                    {isWeekend ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #d9e6da, #f0f6ef)',
                        borderRadius: 16,
                        padding: '20px',
                        textAlign: 'center',
                        marginBottom: 12,
                      }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
                        <div style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 16,
                          color: '#2d322f',
                          fontWeight: 500,
                        }}>
                          今天周末，好好休息
                        </div>
                        {nextSchoolDay ? (
                          <div style={{ fontSize: 13, color: FG2, marginTop: 8 }}>
                            下周一有{mondayClassCount}节课
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Accordion variant="gc" title="今日时间线" count={timelineSegmentCount} defaultOpen>
                        <TimelineSegment segments={timelineSegments} />
                      </Accordion>
                    )}

                    {!isWeekend && (
                      packingRows.length === 0 ? (
                        <div style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 13,
                          color: FG2,
                          textAlign: 'center',
                          padding: '14px 0 4px',
                        }}>
                          今天没有特别需要带的东西 ✓
                        </div>
                      ) : (
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
                      )
                    )}

                  </>
                )}
              </>
            )}
          </div>

          {kids.length > 0 ? (
            <div style={{
              flexShrink: 0,
              background: 'white',
              borderTop: '1px solid rgba(45,50,47,0.06)',
              padding: '12px 20px',
              display: 'flex',
              gap: 10,
            }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={openFullProfile}
                className="gc-btn gc-btn--ghost"
                style={{ flex: 1 }}
              >
                查看完整档案 →
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => sel && setShowStatusEditor(true)}
                className="gc-btn"
                style={{ flex: 1, opacity: sel ? 1 : 0.45 }}
                disabled={!sel}
              >
                记录今日状态
              </motion.button>
            </div>
          ) : null}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showStatusEditor ? (
          <StatusEditor log={dailyLog} onSave={handleSaveStatus} onClose={() => setShowStatusEditor(false)} />
        ) : null}
      </AnimatePresence>
    </>
  )
}
