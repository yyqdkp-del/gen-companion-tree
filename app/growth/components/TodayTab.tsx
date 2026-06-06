'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Accordion from '@/app/_shared/_components/Accordion'
import ChildEnergyCard from '@/app/_shared/_components/ChildEnergyCard'
import {
  dedupeCalendarEvents,
  EventList,
  getIn30Days,
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

const CARD: React.CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: 'var(--sh-warm)',
  padding: 20,
  marginBottom: 16,
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      margin: '0 0 14px',
      fontFamily: 'var(--font-serif)',
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--fg1)',
    }}>
      {children}
    </h3>
  )
}

type Props = {
  child: Child
  userId: string
  onStatusSaved?: () => void | Promise<void>
}

export default function TodayTab({ child, userId, onStatusSaved }: Props) {
  const today = getTodayKey()
  const in7days = getIn7Days()
  const in30days = getIn30Days()

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
  const monthEvents = dedupeCalendarEvents(calendar.filter((e) => e.date_start > in7days && e.date_start <= in30days).filter(isNonEmptyTitle))
  const yearEvents = dedupeCalendarEvents(calendar.filter((e) => e.date_start > in30days).filter(isNonEmptyTitle))

  const broughtStorageKey = `packing_brought_${child.id}_${today}`
  const todayPackCount = useMemo(() => {
    const brought = loadBroughtMap(broughtStorageKey)
    const rows = buildPackingRows(timeline, todayEvents, packingItems, packPrefs)
    return countPendingPackingRows(rows, brought)
  }, [child.id, timeline, todayEvents, packingItems, packPrefs, broughtStorageKey])

  const timelineSegments = useMemo(
    () => buildTimelineSegments(timeline, todayEvents, child.school_start_time),
    [timeline, todayEvents, child.school_start_time],
  )

  const hasLoggedStatus = dailyLog.health_status != null && dailyLog.mood_status != null

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
        <ChildEnergyCard
          name={child.name}
          energy={energyResult}
          onClick={() => setShowStatusEditor(true)}
        />
        {!hasLoggedStatus ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg3)', textAlign: 'center', margin: '8px 0 0' }}>
            今天未记录
          </p>
        ) : null}
      </section>

      <section style={CARD}>
        <SectionTitle>今日时间线</SectionTitle>
        <TimelineSegment segments={timelineSegments} />
      </section>

      <section style={CARD}>
        <SectionTitle>
          今日携带
          {todayPackCount > 0 ? (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--clay)', fontWeight: 600 }}>需确认 {todayPackCount}</span>
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

      <section style={CARD}>
        <SectionTitle>本周安排</SectionTitle>
        <EventList events={weekEvents} onSelect={setSelectedEvent} />
      </section>

      {(monthEvents.length > 0 || yearEvents.length > 0) ? (
        <div style={{ marginBottom: 16 }}>
          {monthEvents.length > 0 ? (
            <Accordion variant="gc" title="本月安排" count={monthEvents.length} defaultOpen={false}>
              <EventList events={monthEvents} onSelect={setSelectedEvent} />
            </Accordion>
          ) : null}
          {yearEvents.length > 0 ? (
            <Accordion variant="gc" title="学年大事" count={yearEvents.length} defaultOpen={false}>
              <EventList events={yearEvents} onSelect={setSelectedEvent} />
            </Accordion>
          ) : null}
        </div>
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
