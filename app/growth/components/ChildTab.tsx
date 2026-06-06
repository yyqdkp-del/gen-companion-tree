'use client'

import React, { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Accordion from '@/app/_shared/_components/Accordion'
import ChildEnergyCard from '@/app/_shared/_components/ChildEnergyCard'
import {
  dedupeCalendarEvents,
  FG3,
  getTodayKey,
  PackingSection,
  StatusEditor,
} from '@/app/_shared/_components/child/childScheduleShared'
import { TimelineSegment, buildTimelineSegments } from '@/app/_shared/_components/design'
import { calculateEnergy } from '@/app/_shared/_engine/energy'
import { useChildDailyLog } from '@/app/_shared/_hooks/useChildDailyLog'
import { useChildSchedule } from '@/app/_shared/_hooks/useChildSchedule'
import { useApp } from '@/app/context/AppContext'
import { countPendingSmartItems } from '@/lib/packing/packingMemory'
import { useSmartPacking } from '@/lib/packing/useSmartPacking'
import type { HealthStatus, MoodStatus } from '@/app/_shared/_types'

type Props = {
  onStatusSaved?: () => void | Promise<void>
}

export default function ChildTab({ onStatusSaved }: Props) {
  const { userId, activeKid } = useApp()
  const sel = activeKid
  const today = getTodayKey()
  const todayClasses = (sel as { today_classes?: unknown[] })?.today_classes ?? []

  const { timeline, calendar, loading } = useChildSchedule(sel?.id, userId ?? undefined, today)
  const { smartPacking, reloadSmartPacking } = useSmartPacking(
    sel?.id,
    userId ?? undefined,
    todayClasses,
    sel?.class_schedule as Record<string, unknown[]> | undefined,
  )

  const { dailyLog, saveStatus } = useChildDailyLog(sel?.id, userId ?? undefined, today)
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

  const todayPackCount = useMemo(
    () => countPendingSmartItems(smartPacking),
    [smartPacking],
  )

  const timelineSegments = useMemo(
    () => buildTimelineSegments(timeline, todayEvents, sel?.school_start_time),
    [timeline, todayEvents, sel?.school_start_time],
  )
  const timelineSegmentCount = useMemo(
    () => timelineSegments.reduce((n, seg) => n + seg.items.length, 0),
    [timelineSegments],
  )

  const hasLoggedStatus = dailyLog.health_status != null && dailyLog.mood_status != null

  if (!sel) {
    return (
      <div style={{
        textAlign: 'center',
        opacity: 0.45,
        padding: '24px 0',
        fontFamily: 'var(--font-serif)',
        fontSize: 14,
        color: 'var(--fg1)',
      }}>
        选择孩子查看状态
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px 0',
        opacity: 0.45,
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        color: FG3,
      }}>
        加载中...
      </div>
    )
  }

  return (
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

      <Accordion
        variant="gc"
        title="今日携带"
        count={todayPackCount}
        badge={todayPackCount > 0 ? '需确认' : undefined}
        defaultOpen={todayPackCount > 0}
      >
        <PackingSection
          childId={sel.id}
          userId={userId!}
          smartItems={smartPacking}
          timeline={timeline}
          onRefresh={reloadSmartPacking}
        />
      </Accordion>

      <AnimatePresence>
        {showStatusEditor ? (
          <StatusEditor log={dailyLog} onSave={handleSaveStatus} onClose={() => setShowStatusEditor(false)} />
        ) : null}
      </AnimatePresence>
    </>
  )
}
