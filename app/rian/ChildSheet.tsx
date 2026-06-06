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
  const energyResult = calculateEnergy({
    healthStatus: dailyLog.health_status,
    moodStatus: dailyLog.mood_status,
    usualBedtime: sel?.usual_bedtime,
    weekendBedtime: sel?.weekend_bedtime,
    schoolStartTime: sel?.school_start_time,
    isWeekend,
    todayEvents: timeline.map((t) => ({
      event_type: t.type,
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

  const openFullProfile = () => {
    onClose()
    router.push('/growth')
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
            overflowY: 'auto', flex: 1, padding: '0 22px 28px',
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

                    <Accordion variant="gc" title="今日时间线" count={timelineSegmentCount} defaultOpen>
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

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={openFullProfile}
                      className="gc-btn gc-btn--ghost"
                      style={{ width: '100%', marginTop: 8 }}
                    >
                      查看完整档案 →
                    </motion.button>
                  </>
                )}
              </>
            )}
          </div>
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
