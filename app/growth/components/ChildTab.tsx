'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Accordion from '@/app/_shared/_components/Accordion'
import {
  buildChildSubtitle,
  dedupeCalendarEvents,
  EventList,
  getIn7Days,
  getTodayKey,
  loadBroughtMap,
  PackingSection,
  StatusEditor,
} from '@/app/_shared/_components/child/childScheduleShared'
import { TimelineSegment, buildTimelineSegments } from '@/app/_shared/_components/design'
import { calculateEnergy } from '@/app/_shared/_engine/energy'
import { useChildDailyLog } from '@/app/_shared/_hooks/useChildDailyLog'
import { useChildSchedule } from '@/app/_shared/_hooks/useChildSchedule'
import ChildActionSheet, { ChildEvent } from '@/app/rian/ChildActionSheet'
import { buildPackingRows, countPendingPackingRows } from '@/lib/packing/buildPackingRows'
import type { PackingPreferencesMap } from '@/lib/packing/packingPreferences'
import type { Child, HealthStatus, MoodStatus } from '@/app/_shared/_types'
import {
  CARD,
  ENERGY_DOT,
  SectionTitle,
  childAvatarStyle,
  firstChar,
} from './growthShared'

type Props = {
  child: Child
  userId: string
  onStatusSaved?: () => void | Promise<void>
}

export default function ChildTab({ child, userId, onStatusSaved }: Props) {
  const today = getTodayKey()
  const in7days = getIn7Days()

  const {
    timeline,
    calendar,
    packingItems,
    packingPreferences,
    loading,
    reload: reloadSchedule,
  } = useChildSchedule(child.id, userId, today)

  const [packPrefs, setPackPrefs] = useState<PackingPreferencesMap>({})
  useEffect(() => {
    setPackPrefs(packingPreferences)
  }, [packingPreferences, child.id])

  const { dailyLog, saveStatus } = useChildDailyLog(child.id, userId, today)
  const [showStatusEditor, setShowStatusEditor] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<ChildEvent | null>(null)

  const isWeekend = [0, 6].includes(new Date().getDay())
  const energyResult = calculateEnergy({
    healthStatus: dailyLog.health_status,
    moodStatus: dailyLog.mood_status,
    usualBedtime: child.usual_bedtime,
    weekendBedtime: child.weekend_bedtime,
    schoolStartTime: child.school_start_time,
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
  const weekEvents = dedupeCalendarEvents(calendar.filter((e) => e.date_start > today && e.date_start <= in7days).filter(isNonEmptyTitle))

  const broughtStorageKey = `packing_brought_${child.id}_${today}`
  const todayPackCount = useMemo(() => {
    const brought = loadBroughtMap(broughtStorageKey)
    const rows = buildPackingRows(timeline, todayEvents, packingItems, packPrefs)
    return countPendingPackingRows(rows, brought)
  }, [child.id, timeline, todayEvents, packingItems, packPrefs, broughtStorageKey])

  const hasPackingItems = useMemo(() => {
    const rows = buildPackingRows(timeline, todayEvents, packingItems, packPrefs)
    return rows.length > 0
  }, [timeline, todayEvents, packingItems, packPrefs])

  const timelineSegments = useMemo(
    () => buildTimelineSegments(timeline, todayEvents, child.school_start_time),
    [timeline, todayEvents, child.school_start_time],
  )

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--fg3)' }}>
        加载中…
      </div>
    )
  }

  return (
    <>
      <section style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={childAvatarStyle(54)}>{firstChar(child.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--fg1)',
              lineHeight: 1.3,
            }}>
              {child.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--fg3)',
              marginTop: 4,
              lineHeight: 1.4,
            }}>
              {buildChildSubtitle(child) || '完善档案后显示更多信息'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowStatusEditor(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 0 4px 8px',
              flexShrink: 0,
            }}
          >
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg2)',
            }}>
              {energyResult.label}
            </span>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: ENERGY_DOT[energyResult.level],
              boxShadow: `0 0 0 2px ${ENERGY_DOT[energyResult.level]}33`,
            }} />
          </button>
        </div>
      </section>

      <section style={CARD}>
        <SectionTitle>今日时间线</SectionTitle>
        <TimelineSegment segments={timelineSegments} />
      </section>

      <section style={CARD}>
        <SectionTitle>
          今日携带
          {(hasPackingItems && todayPackCount > 0) ? (
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--clay)',
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(164,99,85,0.08)',
            }}>
              需确认
            </span>
          ) : null}
        </SectionTitle>
        <PackingSection
          childId={child.id}
          userId={userId}
          today={today}
          timeline={timeline}
          calendarToday={todayEvents}
          packingItems={packingItems}
          packingPreferences={packPrefs}
          onPrefsChange={setPackPrefs}
          onReload={reloadSchedule}
        />
      </section>

      {todayEvents.length > 0 ? (
        <section style={CARD}>
          <SectionTitle>今日安排</SectionTitle>
          <EventList events={todayEvents} onSelect={setSelectedEvent} />
        </section>
      ) : null}

      {weekEvents.length > 0 ? (
        <Accordion variant="gc" title="本周大事" count={weekEvents.length} defaultOpen={false}>
          <EventList events={weekEvents} onSelect={setSelectedEvent} />
        </Accordion>
      ) : null}

      {timeline.length === 0 && calendar.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--fg3)' }}>
          还没有日程安排 🌸
        </div>
      ) : null}

      <AnimatePresence>
        {showStatusEditor ? (
          <StatusEditor log={dailyLog} onSave={handleSaveStatus} onClose={() => setShowStatusEditor(false)} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent ? (
          <ChildActionSheet
            event={selectedEvent}
            childName={child.name}
            userId={userId}
            onClose={() => setSelectedEvent(null)}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}
